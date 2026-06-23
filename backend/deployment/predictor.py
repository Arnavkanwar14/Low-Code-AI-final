"""
Model Predictor - Handles predictions using deployed models
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Union
from deployment.registry import ModelRegistry
from scipy import sparse

class ModelPredictor:
    """Handles predictions using registered models"""
    
    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self.loaded_models = {}  # Cache for loaded models
        self.loaded_pipelines = {}  # Cache for loaded pipelines
    
    def _load_model_if_needed(self, model_id: str):
        """Lazy load model into cache"""
        if model_id not in self.loaded_models:
            self.loaded_models[model_id] = self.registry.get_model(model_id)
        return self.loaded_models[model_id]
    
    def _load_pipelines_if_needed(self, model_id: str):
        """Lazy load pipelines into cache"""
        # If not in cache or if it was cached as None, try loading again
        if model_id not in self.loaded_pipelines or self.loaded_pipelines[model_id] is None:
            print(f"[PREDICTOR DEBUG] Loading pipelines for {model_id}...")
            pipelines = self.registry.get_pipelines(model_id)
            self.loaded_pipelines[model_id] = pipelines
            if pipelines:
                print(f"[PREDICTOR DEBUG] ✅ Pipelines loaded successfully: {list(pipelines.keys())}")
            else:
                print(f"[PREDICTOR DEBUG] ⚠️ Pipelines loaded as NONE")
        return self.loaded_pipelines[model_id]
    
    def preprocess_data(
        self,
        data: Union[pd.DataFrame, Dict, List[Dict]],
        feature_map: Dict,
        pipelines: Optional[Dict] = None
    ) -> np.ndarray:
        """
        Preprocess input data using the same pipelines used during training
        
        Args:
            data: Input data (DataFrame, dict, or list of dicts)
            feature_map: Feature mapping from model metadata
            pipelines: Preprocessing pipelines (if None, will use default)
        
        Returns:
            Preprocessed numpy array ready for prediction
        """
        print(f"[PREPROCESS DEBUG] Pipelines received: {pipelines if pipelines is not None else 'NONE!'}")
        print(f"[PREPROCESS DEBUG] Pipeline keys: {pipelines.keys() if pipelines else 'NO KEYS'}")
        print(f"[PREPROCESS DEBUG] Feature map: {feature_map}")
        
        # Convert to DataFrame if needed
        if isinstance(data, (dict, list)):
            df = pd.DataFrame(data if isinstance(data, list) else [data])
        else:
            df = data.copy()
        
        # If no pipelines provided, return raw features (basic case)
        if pipelines is None:
            print(f"[PREPROCESS DEBUG] ⚠️ NO PIPELINES - Using fallback (THIS IS THE BUG!)")
            # Simple preprocessing: select features and convert to numeric
            feature_cols = []
            for col_type in ['numerical', 'categorical', 'text']:
                feature_cols.extend(feature_map.get(col_type, []))
            
            # Select only available columns and fill missing ones with defaults
            X_list = []
            for col in feature_cols:
                if col in df.columns:
                    X_list.append(df[[col]].values)
                else:
                    # Fill missing feature with zeros
                    X_list.append(np.zeros((len(df), 1)))
            
            if not X_list:
                raise ValueError("No matching features found in input data")
            
            X = np.hstack(X_list)
            return X
        
        print(f"[PREPROCESS DEBUG] ✅ Pipelines exist - proceeding with proper preprocessing")
        # Apply preprocessing pipelines
        X_num = None
        X_cat = None
        X_txt = None
        
        # Numerical features - ONLY process columns listed as numerical
        if feature_map.get('numerical') and pipelines.get('numerical'):
            num_data_list = []
            
            # Process ONLY the numerical features in order
            for col in feature_map['numerical']:
                if col in df.columns:
                    # Get the column value
                    col_data = df[[col]].copy()
                    # Ensure it's numeric - convert string numbers to float
                    col_numeric = pd.to_numeric(col_data.iloc[:, 0], errors='coerce')
                    # If all values failed conversion, use 0
                    if col_numeric.isna().all():
                        num_data_list.append(np.zeros((len(df), 1)))
                    else:
                        # Fill any NaN with 0
                        col_numeric = col_numeric.fillna(0)
                        num_data_list.append(col_numeric.values.reshape(-1, 1))
                else:
                    # Column not in input - use default 0
                    num_data_list.append(np.zeros((len(df), 1)))
            
            # Concatenate all numerical columns and ensure float type
            if num_data_list:
                num_data = np.hstack(num_data_list).astype(np.float64)
                X_num = pipelines['numerical'].transform(num_data)
        
        # Categorical features - ONLY process columns listed as categorical
        if feature_map.get('categorical'):
            if not pipelines or not pipelines.get('categorical'):
                print(f"[PREPROCESS DEBUG] ❌ MISSING CATEGORICAL PIPELINE for features: {feature_map['categorical']}")
                # We can't proceed without the encoder for these strings
                raise ValueError(f"Model requires categorical encoding for {feature_map['categorical']} but no categorical pipeline was found.")
            
            print(f"\n{'='*60}")
            print(f"[CATEGORICAL DEBUG] Features: {feature_map['categorical']}")
            print(f"[CATEGORICAL DEBUG] Pipeline type: {type(pipelines.get('categorical'))}")
            cat_data_list = []
            
            # Process ONLY the categorical features in order
            for col in feature_map['categorical']:
                if col in df.columns:
                    # Get categorical values, convert to string, handle NaN/None
                    col_values = df[col].fillna('unknown').astype(str).values
                    print(f"[CATEGORICAL DEBUG] Column '{col}': values={col_values}, dtype={col_values.dtype}")
                    # Reshape to 2D array (rows x 1)
                    cat_data_list.append(col_values.reshape(-1, 1))
                else:
                    print(f"[CATEGORICAL DEBUG] Column '{col}' NOT FOUND in input!")
                    # Column not in input - use default 'unknown'
                    cat_data_list.append(np.array(['unknown'] * len(df)).reshape(-1, 1))
            
            # Concatenate all categorical columns (should be 2D: rows x features)
            if cat_data_list:
                cat_data = np.hstack(cat_data_list)
                print(f"[CATEGORICAL DEBUG] Combined cat_data shape: {cat_data.shape}, dtype: {cat_data.dtype}")
                print(f"[CATEGORICAL DEBUG] Sample values: {cat_data[0] if len(cat_data) > 0 else 'EMPTY'}")
                # Ensure all values are strings (critical for OneHotEncoder)
                cat_data = cat_data.astype(str)
                print(f"[CATEGORICAL DEBUG] After .astype(str), dtype: {cat_data.dtype}")
                print(f"[CATEGORICAL DEBUG] Calling transform on pipeline...")
                try:
                    X_cat = pipelines['categorical'].transform(cat_data)
                    print(f"[CATEGORICAL DEBUG] ✅ SUCCESS! Encoded shape: {X_cat.shape}")
                except Exception as e:
                    print(f"[CATEGORICAL DEBUG] ❌ TRANSFORM FAILED!")
                    print(f"[CATEGORICAL DEBUG] Error type: {type(e).__name__}")
                    print(f"[CATEGORICAL DEBUG] Error message: {str(e)}")
                    import traceback
                    print(f"[CATEGORICAL DEBUG] Traceback:\n{traceback.format_exc()}")
                    raise
            print(f"{'='*60}\n")
        
        # Text features - handle missing columns
        if feature_map.get('text') and pipelines and pipelines.get('text') is not None:
            txt_list = []
            for col in feature_map['text']:
                if col in df.columns:
                    col_data = df[col].astype(str).values
                    embedded = pipelines['text'].transform(col_data)
                    txt_list.append(embedded)
            
            if txt_list:
                X_txt = np.hstack(txt_list)
        
        # Concatenate all features
        features = [x for x in [X_num, X_cat, X_txt] if x is not None]
        if not features:
            raise ValueError("No features could be extracted from input data")
        
        def _to_sparse(x):
            return x if sparse.issparse(x) else sparse.csr_matrix(x)

        X = sparse.hstack([_to_sparse(x) for x in features]).tocsr()

        # Optional reducer (e.g., TruncatedSVD) saved during training
        reducer = pipelines.get('reducer') if pipelines else None
        if reducer is not None:
            X = reducer.transform(X)

        return X
    
    def predict(
        self,
        model_id: str,
        data: Union[pd.DataFrame, Dict, List[Dict]],
        return_proba: bool = False
    ) -> Union[List, np.ndarray]:
        """
        Make predictions using a deployed model
        
        Args:
            model_id: ID of the deployed model
            data: Input data to predict on
            return_proba: For classification, return probabilities
        
        Returns:
            Predictions (and optionally probabilities)
        """
        # Get model metadata
        metadata = self.registry.get_metadata(model_id)
        
        # Load model and pipelines
        model = self._load_model_if_needed(model_id)
        pipelines = self._load_pipelines_if_needed(model_id)
        
        # Preprocess data
        X = self.preprocess_data(data, metadata['feature_map'], pipelines)
        
        # Make predictions
        predictions = model.predict(X)
        
        # Convert to list for JSON serialization
        if isinstance(predictions, np.ndarray):
            predictions = predictions.tolist()
        elif not isinstance(predictions, list):
            predictions = [predictions]
        
        result = {'predictions': predictions}
        
        # Add probabilities for classification models if requested
        if return_proba and hasattr(model, 'predict_proba'):
            try:
                probabilities = model.predict_proba(X)
                if isinstance(probabilities, np.ndarray):
                    probabilities = probabilities.tolist()
                result['probabilities'] = probabilities
            except:
                pass
        
        return result
    
    def predict_batch(
        self,
        model_id: str,
        data: List[Dict],
        return_proba: bool = False
    ) -> Dict:
        """Make batch predictions"""
        return self.predict(model_id, data, return_proba)
