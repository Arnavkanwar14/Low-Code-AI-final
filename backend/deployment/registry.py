"""
Model Registry - Manages model storage, versioning, and metadata
"""
import os
import json
import pickle
import joblib
from datetime import datetime
from typing import Dict, List, Optional
import uuid

class ModelRegistry:
    """Manages model storage and metadata"""
    
    def __init__(self, models_dir: str = 'models'):
        self.models_dir = models_dir
        self.metadata_file = os.path.join(models_dir, 'metadata.json')
        
        # Create directories if they don't exist
        if not os.path.exists(models_dir):
            os.makedirs(models_dir)
        
        # Load existing metadata
        self.metadata = self._load_metadata()
    
    def _load_metadata(self) -> Dict:
        """Load metadata from file"""
        if os.path.exists(self.metadata_file):
            try:
                with open(self.metadata_file, 'r') as f:
                    data = json.load(f)

                # Backward-compatibility: older metadata entries may be missing
                # model_path / pipelines_path. Reconstruct them when possible.
                changed = False
                for model_id, entry in list(data.items()):
                    if not isinstance(entry, dict):
                        continue

                    model_dir = os.path.join(self.models_dir, model_id)
                    default_model_path = os.path.join(model_dir, 'model.pkl')
                    default_pipelines_path = os.path.join(model_dir, 'pipelines.pkl')

                    if 'model_path' not in entry and os.path.exists(default_model_path):
                        entry['model_path'] = default_model_path
                        changed = True

                    if 'pipelines_path' not in entry:
                        entry['pipelines_path'] = default_pipelines_path if os.path.exists(default_pipelines_path) else None
                        changed = True

                if changed:
                    # write back repaired metadata
                    self.metadata = data
                    self._save_metadata()

                return data
            except:
                return {}
        return {}
    
    def _save_metadata(self):
        """Save metadata to file"""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
    
    def register_model(
        self,
        model,
        model_name: str,
        algorithm: str,
        task_type: str,
        metrics: Dict,
        feature_map: Dict,
        auto_config: Dict,
        target_column: Optional[str] = None,
        leakage_columns: Optional[List[str]] = None,
        pipelines: Optional[Dict] = None,
        version: Optional[str] = None
    ) -> str:
        """Register a trained model in the registry"""
        # Generate model ID
        model_id = str(uuid.uuid4())
        
        # Create version if not provided
        if version is None:
            version = "1.0.0"
        
        # Create model directory
        model_dir = os.path.join(self.models_dir, model_id)
        os.makedirs(model_dir, exist_ok=True)
        
        # Save model
        model_path = os.path.join(model_dir, 'model.pkl')
        joblib.dump(model, model_path)
        
        # Save pipelines if provided
        pipelines_path = None
        if pipelines:
            pipelines_path = os.path.join(model_dir, 'pipelines.pkl')
            try:
                joblib.dump(pipelines, pipelines_path)
            except Exception as e:
                print(f"[REGISTRY] Error saving pipelines: {e}")
                pipelines_path = None
        
        # Create metadata entry
        metadata_entry = {
            'model_id': model_id,
            'model_name': model_name,
            'version': version,
            'algorithm': algorithm,
            'task_type': task_type,
            'target_column': target_column,
            'metrics': metrics,
            'feature_map': feature_map,
            'auto_config': auto_config,
            'leakage_columns': leakage_columns or [],
            'model_path': model_path,
            'pipelines_path': pipelines_path,
            'status': 'trained',
            'deployed': False,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Store metadata
        self.metadata[model_id] = metadata_entry
        self._save_metadata()
        
        return model_id
    
    def get_model(self, model_id: str):
        """Load a model by ID"""
        if model_id not in self.metadata:
            raise ValueError(f"Model {model_id} not found")
        
        entry = self.metadata[model_id]
        model_path = entry.get('model_path') or os.path.join(self.models_dir, model_id, 'model.pkl')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model file not found for {model_id}. Expected at: {model_path}. "
                f"If this model was created before deployment was added, retrain it."
            )
        
        return joblib.load(model_path)
    
    def get_pipelines(self, model_id: str):
        """Load preprocessing pipelines for a model"""
        if model_id not in self.metadata:
            raise ValueError(f"Model {model_id} not found")
        
        entry = self.metadata[model_id]
        pipelines_path = entry.get('pipelines_path')
        
        # If path not in metadata, try default location
        if not pipelines_path:
            model_dir = os.path.join(self.models_dir, model_id)
            pipelines_path = os.path.join(model_dir, 'pipelines.pkl')
        
        print(f"[REGISTRY DEBUG] get_pipelines for {model_id}, path: {pipelines_path}")
        
        if not pipelines_path or not os.path.exists(pipelines_path):
            print(f"[REGISTRY DEBUG] ⚠️ Pipelines file not found at {pipelines_path}")
            return None
        
        try:
            return joblib.load(pipelines_path)
        except Exception as e:
            print(f"[REGISTRY DEBUG] ❌ Error loading pipelines: {e}")
            return None
    
    def get_metadata(self, model_id: str) -> Dict:
        """Get metadata for a model"""
        if model_id not in self.metadata:
            raise ValueError(f"Model {model_id} not found")
        return self.metadata[model_id]
    
    def list_models(self, deployed_only: bool = False) -> List[Dict]:
        """List all registered models"""
        models = list(self.metadata.values())
        
        if deployed_only:
            models = [m for m in models if m.get('deployed', False)]
        
        # Sort by created_at (newest first)
        models.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return models
    
    def update_model_status(self, model_id: str, deployed: bool = True):
        """Update deployment status of a model"""
        if model_id not in self.metadata:
            raise ValueError(f"Model {model_id} not found")
        
        self.metadata[model_id]['deployed'] = deployed
        self.metadata[model_id]['updated_at'] = datetime.now().isoformat()
        self._save_metadata()
    
    def delete_model(self, model_id: str):
        """Delete a model and its files"""
        if model_id not in self.metadata:
            raise ValueError(f"Model {model_id} not found")
        
        # Prefer deterministic directory structure
        model_dir = os.path.join(self.models_dir, model_id)
        
        # Remove directory
        if os.path.exists(model_dir):
            import shutil
            shutil.rmtree(model_dir)
        
        # Remove from metadata
        del self.metadata[model_id]
        self._save_metadata()
