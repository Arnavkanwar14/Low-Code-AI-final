import numpy as np
import pandas as pd
from ingestion.ingest import MLIngestor
from preprocessing.factory import build_pipeline
from preprocessing.auto_config import build_auto_preprocessing_config
from training.factory import ModelFactory
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, r2_score, mean_squared_error, silhouette_score
from sklearn.preprocessing import LabelEncoder
from sklearn.decomposition import TruncatedSVD
from scipy import sparse

def _detect_target_leakage_columns(X_df: pd.DataFrame, y, target_column: str):
    """
    Detect obvious target leakage columns.

    Current heuristics focus on columns that:
    1. Have suspicious names (for example fraud type or loss columns), or
    2. Deterministically map feature values to target values while not looking
       like row identifiers with near-unique values.
    """
    if X_df is None or X_df.empty or y is None:
        return []

    y_series = pd.Series(y, name=target_column)
    y_key = y_series.astype(str).fillna("__nan__")
    leakage_columns = []
    suspicious_tokens = (
        "label",
        "target",
        "class",
        "outcome",
        "fraud_type",
        "financial_loss",
        "chargeback",
        "is_fraud",
    )

    for col in X_df.columns:
        col_lower = str(col).lower()
        unique_ratio = X_df[col].nunique(dropna=False) / max(len(X_df), 1)

        # Explicit name-based guardrails for obvious post-outcome columns.
        if any(token in col_lower for token in suspicious_tokens):
            leakage_columns.append(col)
            continue

        # Skip likely identifiers and free-form text columns; they can overfit,
        # but they are not deterministic label mirrors in the same way.
        if unique_ratio > 0.2:
            continue

        feature_key = X_df[col].astype(str).fillna("__nan__")
        mapping_nunique = pd.DataFrame({"feature": feature_key, "target": y_key}).groupby(
            "feature", dropna=False
        )["target"].nunique(dropna=False)

        if not mapping_nunique.empty and int(mapping_nunique.max()) == 1:
            leakage_columns.append(col)

    return sorted(set(leakage_columns))

def _detect_identifier_columns(X_df: pd.DataFrame):
    """
    Detect high-cardinality identifier columns that commonly cause memorization.

    These columns are not always "target leakage" in the strict sense, but they
    frequently yield unrealistically high offline metrics when the same entity
    appears in both train and test splits (customer_id/device_id/transaction_id).
    """
    if X_df is None or X_df.empty:
        return []

    # Keep this conservative: only drop columns that look like true identifiers.
    explicit_id_names = {
        "transaction_id",
        "txn_id",
        "customer_id",
        "account_id",
        "user_id",
        "member_id",
        "merchant_id",
        "device_id",
        "session_id",
        "order_id",
    }
    id_tokens = ("uuid", "guid")

    identifier_cols = []
    n = max(int(len(X_df)), 1)
    for col in X_df.columns:
        col_lower = str(col).lower()
        unique_ratio = X_df[col].nunique(dropna=False) / n

        name_looks_like_id = (
            col_lower in explicit_id_names
            or col_lower.endswith("_id")
            or any(tok in col_lower for tok in id_tokens)
        )
        if not name_looks_like_id:
            continue

        # Only treat as identifier when cardinality is high.
        # This avoids dropping continuous fields like txn_lat/transaction_amount.
        if unique_ratio < 0.3:
            continue

        # Object/string columns with high cardinality are almost always IDs.
        # Integers can also be IDs (customer_id), but floats are more likely continuous.
        try:
            is_objecty = pd.api.types.is_object_dtype(X_df[col]) or pd.api.types.is_string_dtype(X_df[col])
            is_integer = pd.api.types.is_integer_dtype(X_df[col])
            is_float = pd.api.types.is_float_dtype(X_df[col])
        except Exception:
            is_objecty, is_integer, is_float = False, False, False

        if is_objecty or is_integer:
            identifier_cols.append(col)
        elif not is_float and unique_ratio >= 0.8:
            # Fallback for odd dtypes that still look near-unique.
            identifier_cols.append(col)

    return sorted(set(identifier_cols))

def _choose_group_split_column(X_df: pd.DataFrame, candidate: str | None):
    if X_df is None or X_df.empty:
        return None
    if candidate and candidate in X_df.columns:
        return candidate
    preferred = [
        "customer_id",
        "account_id",
        "user_id",
        "member_id",
        "device_id",
        "merchant_id",
    ]
    cols_lower = {str(c).lower(): c for c in X_df.columns}
    for key in preferred:
        if key in cols_lower:
            return cols_lower[key]
    return None

def _choose_time_split_column(X_df: pd.DataFrame, candidate: str | None):
    if X_df is None or X_df.empty:
        return None
    if candidate and candidate in X_df.columns:
        return candidate
    preferred = ["timestamp", "event_time", "datetime", "date", "created_at", "occurred_at"]
    cols_lower = {str(c).lower(): c for c in X_df.columns}
    for key in preferred:
        if key in cols_lower:
            return cols_lower[key]
    return None

def auto_ingest_and_preprocess(data_path: str, target_column: str, feature_columns: list = None, task_type: str = 'supervised', algorithm: str = 'auto', hyperparameters: dict = None):
    if hyperparameters is None:
        hyperparameters = {}
        
    ingestor = MLIngestor(target_column, feature_columns=feature_columns)
    data = ingestor.ingest_csv(data_path)

    auto_config = build_auto_preprocessing_config(
        data["feature_map"],
        data["feature_stats"],
        n_rows=len(data["X_df"]) if data.get("X_df") is not None else None,
        hyperparameters=hyperparameters
    )

    X_df = data["X_df"]
    y = data["y"]
    leakage_columns = _detect_target_leakage_columns(X_df, y, target_column)

    # Drop identifier-like columns by default to prevent memorization.
    # Can be disabled via hyperparameters.dropIdentifierColumns = false
    identifier_columns = []
    if bool(hyperparameters.get("dropIdentifierColumns", True)):
        identifier_columns = _detect_identifier_columns(X_df)
        # If the user explicitly provided feature_columns, respect it and only
        # drop identifiers that were NOT explicitly requested.
        if feature_columns:
            identifier_columns = [c for c in identifier_columns if c not in feature_columns]
        leakage_columns = sorted(set(leakage_columns).union(identifier_columns))

    if leakage_columns:
        X_df = X_df.drop(columns=leakage_columns, errors='ignore')
        for feature_type in ("numerical", "categorical", "text"):
            data["feature_map"][feature_type] = [
                col for col in data["feature_map"][feature_type] if col not in leakage_columns
            ]
        for col in leakage_columns:
            data["feature_stats"].pop(col, None)
    
    # --- Label Encoding for Target (y) if categorical ---
    y_encoder = None
    if y is not None:
        # Check if y is non-numeric
        y_series = pd.Series(y)
        if not pd.api.types.is_numeric_dtype(y_series):
            y_encoder = LabelEncoder()
            y = y_encoder.fit_transform(y_series.astype(str))
    
    # --- Vectorized Cleaning ---
    full_df = X_df.copy()
    if y is not None:
        full_df[target_column] = y
        
    # 1. Shuffling (if requested)
    if hyperparameters.get('shuffleData', True):
        full_df = full_df.sample(frac=1, random_state=hyperparameters.get('randomSeed', 42)).reset_index(drop=True)

    # 2. Duplicates
    if hyperparameters.get('removeDuplicates', True):
        full_df = full_df.drop_duplicates()
    
    # 3. Outliers (Numerical only) - Vectorized
    if hyperparameters.get('handleOutliers', False) and data["feature_map"]["numerical"]:
        num_cols = [c for c in data["feature_map"]["numerical"] if c in full_df.columns]
        if num_cols:
            Q1 = full_df[num_cols].quantile(0.25)
            Q3 = full_df[num_cols].quantile(0.75)
            IQR = Q3 - Q1
            lower_bounds = Q1 - 1.5 * IQR
            upper_bounds = Q3 + 1.5 * IQR
            
            # Mask of valid rows matching condition for all numerical columns
            mask = ~((full_df[num_cols] < lower_bounds) | (full_df[num_cols] > upper_bounds)).any(axis=1)
            full_df = full_df[mask]
    
    # 4. Drop NaN targets
    if y is not None:
        full_df = full_df.dropna(subset=[target_column])

    # Re-separate X and y after cleaning
    if y is not None:
        y = full_df[target_column].reset_index(drop=True)
        X_df = full_df.drop(columns=[target_column]).reset_index(drop=True)
    else:
        X_df = full_df.reset_index(drop=True)


    # Store column information for later preprocessing
    num_cols = data["feature_map"]["numerical"] if data["feature_map"]["numerical"] else []
    cat_cols = data["feature_map"]["categorical"] if data["feature_map"]["categorical"] else []
    txt_cols = data["feature_map"]["text"] if data["feature_map"]["text"] else []

    # --- Training Logic ---
    model = None
    metrics = {}
    num_pipe, cat_pipe, txt_pipe = None, None, None
    
    real_task_type = task_type
    if algorithm == 'auto' or not algorithm:
        if task_type == 'clustering':
            algorithm = 'kmeans'
        elif y is not None:
            # Simple heuristic for classification vs regression
            unique_y = np.unique(y)
            # Check original data type from data map to avoid label encoder confusing the type
            orig_type = data["feature_stats"].get(target_column, {}).get("type", "categorical")
            
            if orig_type == 'numerical' and len(unique_y) > 10:
                real_task_type = 'regression'
                algorithm = 'random_forest'
            elif orig_type == 'categorical' or len(unique_y) <= 10:
                real_task_type = 'classification'
                algorithm = 'random_forest'
            else:
                real_task_type = 'regression'
                algorithm = 'random_forest'
        else:
            real_task_type = 'clustering'
            algorithm = 'kmeans'

    if real_task_type == 'supervised' and y is not None:
        unique_y = np.unique(y)
        orig_type = data["feature_stats"].get(target_column, {}).get("type", "categorical")
        if orig_type == 'numerical' and len(unique_y) > 10:
            real_task_type = 'regression'
        else:
            real_task_type = 'classification'

    # Wide-data safety: prefer linear/incremental models by default
    # (5k columns is a common failure mode for trees/KNN/SVC in memory/time)
    if (algorithm == 'auto' or not algorithm) and real_task_type in ['classification', 'regression']:
        algorithm = 'sgd_classification' if real_task_type == 'classification' else 'sgd_regression'
    else:
        try:
            n_rows = int(len(X_df))
            n_cols = int(X_df.shape[1])
        except Exception:
            n_rows, n_cols = None, None

        if real_task_type in ['classification', 'regression'] and n_cols is not None:
            wide_threshold = int(hyperparameters.get('wideFeatureThreshold', 500))
            if n_cols >= wide_threshold:
                algorithm = 'sgd_classification' if real_task_type == 'classification' else 'sgd_regression'
        if real_task_type == 'clustering' and n_cols is not None:
            if n_cols >= int(hyperparameters.get('wideFeatureThreshold', 500)):
                algorithm = 'minibatch_kmeans'
    
    model_params = hyperparameters.copy()
    
    if real_task_type == 'clustering':
        # For clustering, preprocess the entire dataset
        X_num, X_cat, X_txt = None, None, None
        
        if num_cols:
            num_pipe = build_pipeline(auto_config["numerical"])
            X_num = num_pipe.fit_transform(X_df[num_cols].values)
        
        if cat_cols:
            cat_pipe = build_pipeline(auto_config["categorical"])
            # Ensure categorical data is strings before encoding
            # Use fillna('unknown') for consistency
            X_cat = cat_pipe.fit_transform(X_df[cat_cols].fillna('unknown').astype(str).values)
        
        if txt_cols and auto_config.get("text"):
            txt_pipe = build_pipeline(auto_config["text"])
            if txt_pipe is not None:
                X_txt = txt_pipe.fit_transform(X_df[txt_cols].values)
        
        features_to_concat = [x for x in [X_num, X_cat, X_txt] if x is not None]
        if not features_to_concat:
            raise ValueError("No features remaining after preprocessing")
        # Keep sparse when possible (categorical one-hot is sparse)
        sparse_parts = []
        for part in features_to_concat:
            if sparse.issparse(part):
                sparse_parts.append(part)
            else:
                sparse_parts.append(sparse.csr_matrix(part))
        X = sparse.hstack(sparse_parts).tocsr()
        
        model = ModelFactory.get_model('clustering', algorithm, params=model_params)
        model.fit(X)
        labels = model.labels_
        try:
            s_score = silhouette_score(X, labels)
            metrics['silhouette_score'] = float(s_score)
        except:
            metrics['silhouette_score'] = 0.0
            
    elif real_task_type in ['classification', 'regression']:
        if y is None:
            raise ValueError("Target column required for supervised learning")
            
        val_split = float(hyperparameters.get('validationSplit', 0.2))
        random_seed = int(hyperparameters.get('randomSeed', 42))

        # Split BEFORE preprocessing to prevent leakage.
        # Prefer group-based split when an entity id exists to prevent memorization.
        split_info = {"mode": "random", "group_column": None, "time_column": None}

        time_split_col = _choose_time_split_column(X_df, hyperparameters.get("timeSplitColumn"))
        use_time_split = bool(hyperparameters.get("timeSplit", False)) and time_split_col is not None

        group_split_col = _choose_group_split_column(X_df, hyperparameters.get("groupSplitColumn"))
        use_group_split = bool(hyperparameters.get("groupSplit", True)) and group_split_col is not None

        if use_time_split:
            split_info["mode"] = "time"
            split_info["time_column"] = time_split_col
            # Sort by time and take the most recent fraction as test.
            # Best-effort parsing for common datetime strings.
            try:
                ts = pd.to_datetime(X_df[time_split_col], errors="coerce", utc=True)
                order = ts.sort_values(kind="mergesort").index
            except Exception:
                order = X_df[time_split_col].sort_values(kind="mergesort").index
            n = len(X_df)
            n_test = max(1, int(round(val_split * n)))
            test_idx = order[-n_test:]
            train_idx = order[:-n_test]
            X_df_train, X_df_test = X_df.loc[train_idx], X_df.loc[test_idx]
            y_series = pd.Series(y)
            y_train, y_test = y_series.loc[train_idx], y_series.loc[test_idx]
        elif use_group_split:
            from sklearn.model_selection import GroupShuffleSplit
            groups = X_df[group_split_col]
            splitter = GroupShuffleSplit(n_splits=1, test_size=val_split, random_state=random_seed)
            train_idx, test_idx = next(splitter.split(X_df, y, groups=groups))
            X_df_train, X_df_test = X_df.iloc[train_idx], X_df.iloc[test_idx]
            y_train, y_test = pd.Series(y).iloc[train_idx], pd.Series(y).iloc[test_idx]
            split_info["mode"] = "group"
            split_info["group_column"] = group_split_col
        else:
            stratify = None
            if real_task_type == "classification":
                try:
                    y_series = pd.Series(y)
                    # Stratify only when classes have enough samples.
                    vc = y_series.value_counts(dropna=False)
                    if not vc.empty and int(vc.min()) >= 2:
                        stratify = y_series
                except Exception:
                    stratify = None

            X_df_train, X_df_test, y_train, y_test = train_test_split(
                X_df, y, test_size=val_split, random_state=random_seed, stratify=stratify
            )
        
        # Now preprocess train and test separately
        # Build pipelines and FIT on training data only
        train_features = []
        test_features = []
        
        if num_cols:
            num_pipe = build_pipeline(auto_config["numerical"])
            X_num_train = num_pipe.fit_transform(X_df_train[num_cols].values)
            X_num_test = num_pipe.transform(X_df_test[num_cols].values)
            train_features.append(X_num_train)
            test_features.append(X_num_test)
        
        
        if cat_cols:
            cat_pipe = build_pipeline(auto_config["categorical"])
            # CRITICAL: Ensure categorical data is strings before encoding
            # Use fillna('unknown') to match the prediction logic in predictor.py
            X_cat_train_data = X_df_train[cat_cols].fillna('unknown').astype(str).values
            X_cat_test_data = X_df_test[cat_cols].fillna('unknown').astype(str).values
            X_cat_train = cat_pipe.fit_transform(X_cat_train_data)
            X_cat_test = cat_pipe.transform(X_cat_test_data)
            train_features.append(X_cat_train)
            test_features.append(X_cat_test)
        
        if txt_cols and auto_config.get("text"):
            txt_pipe = build_pipeline(auto_config["text"])
            if txt_pipe is not None:
                X_txt_train = txt_pipe.fit_transform(X_df_train[txt_cols].values)
                X_txt_test = txt_pipe.transform(X_df_test[txt_cols].values)
                train_features.append(X_txt_train)
                test_features.append(X_txt_test)
        
        if not train_features:
            raise ValueError("No features remaining after preprocessing")
        
        # Sparse-safe stacking
        def _to_sparse(x):
            return x if sparse.issparse(x) else sparse.csr_matrix(x)

        X_train = sparse.hstack([_to_sparse(x) for x in train_features]).tocsr()
        X_test = sparse.hstack([_to_sparse(x) for x in test_features]).tocsr()

        # Optional dimensionality reduction for very wide data
        reducer = None
        reduce_dims = hyperparameters.get('reduceDimensionality', True)
        try:
            n_features_train = int(X_train.shape[1])
        except Exception:
            n_features_train = None

        if reduce_dims and n_features_train is not None:
            reduce_threshold = int(hyperparameters.get('reduceThreshold', 2000))
            n_components = int(hyperparameters.get('nComponents', 300))
            if n_features_train >= reduce_threshold:
                # TruncatedSVD works with sparse matrices
                n_components = max(2, min(n_components, n_features_train - 1))
                reducer = TruncatedSVD(n_components=n_components, random_state=int(hyperparameters.get('randomSeed', 42)))
                X_train = reducer.fit_transform(X_train)
                X_test = reducer.transform(X_test)
        
        # Combine for return value (should not be used for training!)
        if sparse.issparse(X_train) or sparse.issparse(X_test):
            X = sparse.vstack([_to_sparse(X_train), _to_sparse(X_test)]).tocsr()
        else:
            X = np.concatenate([X_train, X_test], axis=0)
        
        model = ModelFactory.get_model(real_task_type, algorithm, params=model_params)
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        
        if real_task_type == 'classification':
            acc = accuracy_score(y_test, y_pred)
            metrics['accuracy'] = float(acc)
            try:
                cm = confusion_matrix(y_test, y_pred)
                metrics['confusion_matrix'] = cm.tolist()
            except:
                pass
        else: # Regression
            r2 = r2_score(y_test, y_pred)
            mse = mean_squared_error(y_test, y_pred)
            metrics['r2_score'] = float(r2)
            metrics['mse'] = float(mse)

    return {
        "X": X,
        "y": y,
        "auto_config": auto_config,
        "feature_map": data["feature_map"],
        "leakage_columns": leakage_columns,
        "identifier_columns": identifier_columns,
        "split_info": split_info if real_task_type in ['classification', 'regression'] else None,
        "pipelines": {
            "numerical": num_pipe,
            "categorical": cat_pipe,
            "text": txt_pipe,
            "reducer": reducer
        },
        "model": model,
        "metrics": metrics,
        "task_type": real_task_type,
        "algorithm": algorithm
    }
