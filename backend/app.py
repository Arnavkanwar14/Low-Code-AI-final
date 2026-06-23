from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
import io
import json
from datetime import datetime
import os
import math
import zipfile
import uuid

# Import modular components
from preprocessing.factory import build_pipeline
from preprocessing.auto_config import build_auto_preprocessing_config
from training.orchestrator import auto_ingest_and_preprocess
from deployment.registry import ModelRegistry
from deployment.predictor import ModelPredictor

app = Flask(__name__)
CORS(app)

# Configure upload folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

PROJECTS_FILE = os.path.join(BASE_DIR, 'projects.json')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB max file size

# Helper for projects
def load_projects():
    if os.path.exists(PROJECTS_FILE):
        try:
            with open(PROJECTS_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_projects(projects):
    with open(PROJECTS_FILE, 'w') as f:
        json.dump(projects, f, indent=4)

# Initialize model registry and predictor
MODELS_DIR = os.path.join(BASE_DIR, 'models')
if not os.path.exists(MODELS_DIR):
    os.makedirs(MODELS_DIR)
registry = ModelRegistry(MODELS_DIR)
predictor = ModelPredictor(registry)

# -------------------- JSON sanitization helpers --------------------
def _to_json_safe(obj):
    """
    Convert objects to JSON-safe equivalents:
    - numpy scalar -> python scalar
    - NaN/inf -> None (valid JSON)
    - recursively handle dict/list/tuple
    """
    try:
        import numpy as _np
        if isinstance(obj, _np.generic):
            obj = obj.item()
    except Exception:
        pass

    if isinstance(obj, float):
        if not math.isfinite(obj):
            return None
        return obj
    if isinstance(obj, (int, str, bool)) or obj is None:
        return obj
    if isinstance(obj, dict):
        return {str(k): _to_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_json_safe(v) for v in obj]
    return str(obj)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'data-cleaning-api'
    })

@app.route('/api/projects', methods=['GET'])
def list_projects():
    return jsonify(load_projects())

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.json
    projects = load_projects()
    new_project = {
        'id': str(int(datetime.now().timestamp() * 1000)),
        'name': data.get('name', 'Untitled Project'),
        'created_at': datetime.now().isoformat()
    }
    projects.append(new_project)
    save_projects(projects)
    return jsonify(new_project)

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    projects = load_projects()
    projects = [p for p in projects if p['id'] != project_id]
    save_projects(projects)
    return jsonify({'success': True})

@app.route('/api/analyze-data', methods=['POST'])
def analyze_data():
    """Analyze uploaded data file and return statistics"""
    try:
        filepath = None
        if 'file' in request.files:
            file = request.files['file']
            if file.filename != '':
                filename = file.filename
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
        
        if not filepath:
            filename = request.form.get('filename')
            if filename:
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                if not os.path.exists(filepath):
                    return jsonify({'error': f'File {filename} not found'}), 404
            else:
                return jsonify({'error': 'No file or filename provided'}), 400
        
        # Read file based on type
        filename_low = filepath.lower()
        try:
            if filename_low.endswith('.csv'):
                df = pd.read_csv(filepath)
            elif filename_low.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(filepath)
            elif filename_low.endswith('.json'):
                df = pd.read_json(filepath)
            else:
                return jsonify({'error': 'Unsupported file format'}), 400
            
            if df.empty or len(df.columns) == 0:
                return jsonify({'error': 'The file contains no data or columns to parse.'}), 400
        except pd.errors.EmptyDataError:
            return jsonify({'error': 'The file is empty or has no columns to parse.'}), 400
        except Exception as e:
            return jsonify({'error': f'Failed to parse file: {str(e)}'}), 400
        
        # Calculate statistics
        stats = {
            'rows': len(df),
            'columns': len(df.columns),
            'missing_values': int(df.isnull().sum().sum()),
            'duplicates': int(df.duplicated().sum()),
            'column_info': {},
            'data_types': df.dtypes.astype(str).to_dict(),
            'memory_usage': int(df.memory_usage(deep=True).sum()),
            'file_size': os.path.getsize(filepath)
        }
        
        # Analyze each column
        for column in df.columns:
            col_stats = {
                'type': str(df[column].dtype),
                'missing_count': int(df[column].isnull().sum()),
                'unique_count': int(df[column].nunique()),
                'sample_values': df[column].dropna().head(5).tolist()
            }
            
            # Add numeric statistics if applicable
            if pd.api.types.is_numeric_dtype(df[column]):
                col_stats.update({
                    'min': float(df[column].min()) if not df[column].isnull().all() else None,
                    'max': float(df[column].max()) if not df[column].isnull().all() else None,
                    'mean': float(df[column].mean()) if not df[column].isnull().all() else None,
                    'std': float(df[column].std()) if not df[column].isnull().all() else None
                })
            
            stats['column_info'][column] = col_stats
        
        return jsonify({
            'success': True,
            'stats': stats,
            'preview': df.head(10).to_dict('records')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/clean-data', methods=['POST'])
def clean_data():
    """Clean data using factory-based pipelines"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        options = request.form.get('options', '{}')
        options = json.loads(options)
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read file
        filename_low = file.filename.lower()
        try:
            if filename_low.endswith('.csv'):
                df = pd.read_csv(file)
            elif filename_low.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file)
            elif filename_low.endswith('.json'):
                df = pd.read_json(file)
            else:
                return jsonify({'error': 'Unsupported file format'}), 400
            
            if df.empty or len(df.columns) == 0:
                return jsonify({'error': 'The file contains no data or columns to parse.'}), 400
        except pd.errors.EmptyDataError:
            return jsonify({'error': 'The file is empty or has no columns to parse.'}), 400
        except Exception as e:
            return jsonify({'error': f'Failed to parse file: {str(e)}'}), 400
        
        original_shape = df.shape
        cleaning_steps = []
        
        # Construct pipeline config from options
        # Note: The frontend options map to specific pipeline steps
        
        # 1. Missing Values (Row removal) - This is usually done before transformation pipelines
        if options.get('removeMissingValues', False):
            initial_missing = df.isnull().sum().sum()
            df = df.dropna()
            final_missing = df.isnull().sum().sum()
            cleaning_steps.append({
                'step': 'Remove Missing Values',
                'description': f'Removed {initial_missing - final_missing} missing values',
                'rows_removed': int(original_shape[0] - len(df))
            })
            
        # 2. Duplicates
        if options.get('removeDuplicates', False):
            initial_duplicates = df.duplicated().sum()
            df = df.drop_duplicates()
            cleaning_steps.append({
                'step': 'Remove Duplicates',
                'description': f'Removed {initial_duplicates} duplicate rows',
                'rows_removed': int(original_shape[0] - len(df)) # Logic check: this calc might be off if executed after missing
            })
            
        # 3. Numeric Transformations (Scaling, Imputation)
        # We can use the factory to build a numerical pipeline if requested
        numerical_config = []
        if options.get('handleOutliers', False):
            # The current factory doesn't have an explict 'outlier_removal' step that returns a dataframe subset easily
            # But the original code did it. Ideally we'd add an OutlierRemover to the factory.
            # For now, we'll keep the manual outlier removal or add it to the factory later.
            # Let's stick closer to the original logic for outliers but wrap it if possible.
            # Since factory.py only has scaler/imputer, let's leave outlier logic inline or create a new class.
            # For speed, I will leave the outlier logic inline but cleaner.
            outlier_removed = 0
            for column in df.select_dtypes(include=[np.number]).columns:
                Q1 = df[column].quantile(0.25)
                Q3 = df[column].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                mask = (df[column] >= lower_bound) & (df[column] <= upper_bound)
                outlier_removed += int(len(df) - int(mask.sum()))
                df = df[mask]
                
            if outlier_removed > 0:
                cleaning_steps.append({
                    'step': 'Handle Outliers',
                    'description': f'Removed {outlier_removed} outliers using IQR',
                    'rows_removed': int(outlier_removed)
                })

        # 4. Normalization (using factory)
        if options.get('normalizeData', False):
            numerical_config.append({"op": "scale"})
            
        # Apply numerical pipeline if config exists
        if numerical_config:
            # We need to apply this only to numeric columns and replace them in the DF
            num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if num_cols:
                pipeline = build_pipeline(numerical_config)
                # The factory pipeline returns a numpy array. We need to put it back into the DataFrame.
                
                X_num = df[num_cols].values
                X_transformed = pipeline.fit(X_num) # pipeline.fit acts as fit_transform in this implementation
                
                df[num_cols] = X_transformed
                
                cleaning_steps.append({
                    'step': 'Normalize Data',
                    'description': f'Normalized {len(num_cols)} numeric columns',
                    'columns_normalized': int(len(num_cols))
                })

        # Calculate final statistics
        final_stats = {
            'original_rows': int(original_shape[0]),
            'original_columns': int(original_shape[1]),
            'final_rows': int(len(df)),
            'final_columns': int(len(df.columns)),
            'rows_removed': int(original_shape[0] - len(df)),
            'missing_values': int(df.isnull().sum().sum()),
            'duplicates': int(df.duplicated().sum())
        }
        
        # Save cleaned data
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        cleaned_filename = f"cleaned_data_{timestamp}.csv"
        cleaned_filepath = os.path.join(app.config['UPLOAD_FOLDER'], cleaned_filename)
        df.to_csv(cleaned_filepath, index=False)

        # Ensure response payload is JSON-serializable (avoid numpy dtypes)
        preview = json.loads(df.head(10).to_json(orient='records'))
        
        return jsonify({
            'success': True,
            'cleaning_steps': cleaning_steps,
            'final_stats': final_stats,
            'preview': preview,
            'cleaned_file': cleaned_filename
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    """Download cleaned data file"""
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(filepath, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export-data', methods=['POST'])
def export_data():
    """Export data in specified format"""
    try:
        data = request.json.get('data')
        format_type = request.json.get('format', 'csv')
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        df = pd.DataFrame(data)
        
        # Create output buffer
        output = io.StringIO()
        
        if format_type == 'csv':
            df.to_csv(output, index=False)
            content = output.getvalue()
            mimetype = 'text/csv'
        elif format_type == 'json':
            content = df.to_json(orient='records', indent=2)
            mimetype = 'application/json'
        else:
            return jsonify({'error': 'Unsupported format'}), 400
        
        return jsonify({
            'success': True,
            'content': content,
            'format': format_type,
            'mimetype': mimetype
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/train', methods=['POST'])
def train_model():
    """Auto-detect features and train model"""
    try:
        filepath = None
        if 'file' in request.files:
            file = request.files['file']
            if file.filename != '':
                filename = file.filename
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
        
        if not filepath:
            filename = request.form.get('filename')
            if filename:
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                if not os.path.exists(filepath):
                    return jsonify({'error': f'File {filename} not found on server'}), 404
            else:
                return jsonify({'error': 'No file or filename provided'}), 400

        target_column = request.form.get('target_column')
        feature_columns = request.form.get('feature_columns')
        if feature_columns:
            feature_columns = [c.strip() for c in feature_columns.split(',') if c.strip()]
        else:
            feature_columns = None

        task_type = request.form.get('task_type', 'supervised')
        algorithm = request.form.get('algorithm', 'auto')
        
        # Extract hyperparameters
        hyperparameters = {}
        for key in ['epochs', 'batchSize', 'learningRate', 'validationSplit', 'randomSeed']:
            val = request.form.get(key)
            if val is not None:
                try:
                    hyperparameters[key] = float(val) if '.' in val else int(val)
                except:
                    hyperparameters[key] = val
        
        for key in ['normalizeData', 'augmentData', 'shuffleData']:
            val = request.form.get(key)
            if val is not None:
                hyperparameters[key] = val.lower() == 'true'

        # Auto-detect target column if not provided for supervised tasks
        if not target_column and task_type != 'clustering':
            temp_df = None
            filename_low = filepath.lower()
            try:
                if filename_low.endswith('.csv'):
                    temp_df = pd.read_csv(filepath)
                elif filename_low.endswith(('.xlsx', '.xls')):
                    temp_df = pd.read_excel(filepath)
                elif filename_low.endswith('.json'):
                    temp_df = pd.read_json(filepath)
                
                if temp_df is not None and not temp_df.empty:
                    # Prefer common label columns (classification datasets often include these)
                    cols_lower = {c.lower(): c for c in temp_df.columns}
                    preferred = [
                        'label', 'target', 'class', 'y',
                        'is_fraud', 'fraud', 'fraud_label', 'fraud_flag'
                    ]
                    for key in preferred:
                        if key in cols_lower:
                            target_column = cols_lower[key]
                            break
                    if not target_column:
                        # fallback: last column
                        target_column = temp_df.columns[-1]
            except:
                pass # Orchestrator will handle the error properly later
        
        # Use orchestrator
        result = auto_ingest_and_preprocess(
            filepath, 
            target_column, 
            feature_columns=feature_columns, 
            task_type=task_type, 
            algorithm=algorithm,
            hyperparameters=hyperparameters
        )
        
        # Register model in registry
        model_name = request.form.get('model_name', f"{algorithm}_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        model_id = registry.register_model(
            model=result['model'],
            model_name=model_name,
            algorithm=result['algorithm'],
            task_type=result['task_type'],
            metrics=result['metrics'],
            feature_map=result['feature_map'],
            auto_config=result['auto_config'],
            target_column=target_column,
            leakage_columns=result.get('leakage_columns'),
            pipelines=result.get('pipelines')
        )
        
        # Return success with metrics and config (skip heavy X/y return)
        return jsonify({
            'success': True,
            'message': 'Model trained successfully',
            'model_id': model_id,
            'auto_config': result['auto_config'],
            'feature_map': result['feature_map'],
            'leakage_columns': result.get('leakage_columns', []),
            'identifier_columns': result.get('identifier_columns', []),
            'split_info': result.get('split_info'),
            'metrics': result['metrics'],
            'data_shape': result['X'].shape,
            'task_type': result['task_type'],
            'algorithm': result['algorithm'],
            # Send back path for code generation reuse (simulated session)
            'data_path': filepath,
            'target_column': target_column
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/export-code', methods=['POST'])
def export_code():
    """Generate and export Python training script"""
    try:
        data = request.json
        # These fields should come from the frontend state which received them from /api/train
        data_path = data.get('data_path')
        target_column = data.get('target_column')
        auto_config = data.get('auto_config')
        feature_map = data.get('feature_map')
        task_type = data.get('task_type')
        algorithm = data.get('algorithm')
        
        from training.code_generator import generate_training_script
        code = generate_training_script(data_path, target_column, auto_config, task_type, algorithm, feature_map)
        
        return jsonify({
            'success': True,
            'code': code
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==================== MODEL DEPLOYMENT ENDPOINTS ====================

@app.route('/api/models', methods=['GET'])
def list_models():
    """List all registered models"""
    try:
        deployed_only = request.args.get('deployed_only', 'false').lower() == 'true'
        models = registry.list_models(deployed_only=deployed_only)
        
        # Remove file paths from response (not needed by frontend)
        for model in models:
            model.pop('model_path', None)
            model.pop('pipelines_path', None)
            # Ensure JSON validity (no NaN/inf)
            model['metrics'] = _to_json_safe(model.get('metrics'))
            model['auto_config'] = _to_json_safe(model.get('auto_config'))
            model['feature_map'] = _to_json_safe(model.get('feature_map'))
        
        return jsonify({
            'success': True,
            'models': _to_json_safe(models),
            'count': len(models)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/<model_id>', methods=['GET'])
def get_model_info(model_id):
    """Get information about a specific model"""
    try:
        metadata = registry.get_metadata(model_id)
        # Remove file paths
        metadata.pop('model_path', None)
        metadata.pop('pipelines_path', None)
        metadata = _to_json_safe(metadata)
        
        return jsonify({
            'success': True,
            'model': metadata
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/<model_id>/export', methods=['GET'])
def export_model(model_id):
    """Export a model (artifacts + metadata) as a zip for sharing/importing."""
    try:
        metadata = registry.get_metadata(model_id)
        model_dir = os.path.join(MODELS_DIR, model_id)
        if not os.path.isdir(model_dir):
            return jsonify({'error': f'Model directory not found for {model_id}'}), 404

        model_path = os.path.join(model_dir, 'model.pkl')
        if not os.path.exists(model_path):
            return jsonify({'error': f'Model file not found for {model_id}'}), 404

        # Build zip in-memory
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
            # Artifacts
            zf.write(model_path, arcname=f'{model_id}/model.pkl')
            pipelines_path = os.path.join(model_dir, 'pipelines.pkl')
            if os.path.exists(pipelines_path):
                zf.write(pipelines_path, arcname=f'{model_id}/pipelines.pkl')

            # Metadata entry
            safe_metadata = _to_json_safe(metadata)
            zf.writestr('metadata_entry.json', json.dumps(safe_metadata, indent=2))

        buf.seek(0)
        filename = f'model_export_{model_id}.zip'
        return send_file(
            buf,
            mimetype='application/zip',
            as_attachment=True,
            download_name=filename
        )
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/import', methods=['POST'])
def import_model():
    """Import a previously exported model zip into the registry."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        data = file.read()
        if not data:
            return jsonify({'error': 'Empty file'}), 400

        buf = io.BytesIO(data)
        with zipfile.ZipFile(buf, mode='r') as zf:
            # Read metadata entry
            try:
                metadata_entry = json.loads(zf.read('metadata_entry.json').decode('utf-8'))
            except KeyError:
                return jsonify({'error': 'Invalid export zip: missing metadata_entry.json'}), 400

            original_id = metadata_entry.get('model_id')
            if not original_id:
                return jsonify({'error': 'Invalid metadata: missing model_id'}), 400

            # Determine destination model_id (avoid collision)
            dest_id = original_id
            dest_dir = os.path.join(MODELS_DIR, dest_id)
            if os.path.exists(dest_dir):
                dest_id = str(uuid.uuid4())
                dest_dir = os.path.join(MODELS_DIR, dest_id)

            os.makedirs(dest_dir, exist_ok=True)

            # Extract artifacts for the original folder prefix
            expected_prefix = f'{original_id}/'
            members = [m for m in zf.namelist() if m.startswith(expected_prefix)]
            if not members:
                return jsonify({'error': f'Invalid export zip: missing folder {expected_prefix}'}), 400

            # Only allow model.pkl and pipelines.pkl within that folder
            allowed = {f'{original_id}/model.pkl', f'{original_id}/pipelines.pkl'}
            for member in members:
                if member.endswith('/'):
                    continue
                if member not in allowed:
                    continue
                target_name = os.path.basename(member)
                out_path = os.path.join(dest_dir, target_name)
                with zf.open(member) as src, open(out_path, 'wb') as dst:
                    dst.write(src.read())

            if not os.path.exists(os.path.join(dest_dir, 'model.pkl')):
                return jsonify({'error': 'Import failed: model.pkl missing in zip'}), 400

            # Update and store metadata
            metadata_entry['model_id'] = dest_id
            metadata_entry['model_path'] = os.path.join(dest_dir, 'model.pkl')
            pipelines_path = os.path.join(dest_dir, 'pipelines.pkl')
            metadata_entry['pipelines_path'] = pipelines_path if os.path.exists(pipelines_path) else None
            metadata_entry['updated_at'] = datetime.now().isoformat()
            metadata_entry.setdefault('created_at', datetime.now().isoformat())
            metadata_entry.setdefault('status', 'trained')

            registry.metadata[dest_id] = metadata_entry
            registry._save_metadata()

        return jsonify({
            'success': True,
            'message': 'Model imported successfully',
            'model_id': dest_id
        })
    except zipfile.BadZipFile:
        return jsonify({'error': 'Invalid zip file'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/<model_id>/deploy', methods=['POST'])
def deploy_model(model_id):
    """Deploy a model (mark as deployed)"""
    try:
        registry.update_model_status(model_id, deployed=True)
        metadata = registry.get_metadata(model_id)
        
        return jsonify({
            'success': True,
            'message': f'Model {model_id} deployed successfully',
            'model_id': model_id,
            'status': 'deployed'
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/<model_id>/undeploy', methods=['POST'])
def undeploy_model(model_id):
    """Undeploy a model (mark as not deployed)"""
    try:
        registry.update_model_status(model_id, deployed=False)
        
        return jsonify({
            'success': True,
            'message': f'Model {model_id} undeployed successfully',
            'model_id': model_id,
            'status': 'trained'
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/<model_id>', methods=['DELETE'])
def delete_model(model_id):
    """Delete a model"""
    try:
        registry.delete_model(model_id)
        
        return jsonify({
            'success': True,
            'message': f'Model {model_id} deleted successfully'
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models', methods=['DELETE'])
def delete_all_models():
    """Delete ALL trained models from the registry"""
    try:
        all_models = registry.list_models()
        deleted = 0
        errors = []
        for model in all_models:
            try:
                registry.delete_model(model['model_id'])
                deleted += 1
            except Exception as e:
                errors.append(str(e))

        return jsonify({
            'success': True,
            'message': f'Deleted {deleted} model(s) successfully',
            'deleted': deleted,
            'errors': errors
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/models/<model_id>/predict', methods=['POST'])
def predict(model_id):
    """Make predictions using a deployed model"""
    try:
        print(f"\n{'#'*70}")
        print(f"[PREDICT ENDPOINT] Model ID: {model_id}")
        data = request.json
        print(f"[PREDICT ENDPOINT] Request data keys: {data.keys() if data else 'NO DATA'}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Check if model is deployed
        metadata = registry.get_metadata(model_id)
        if not metadata.get('deployed', False):
            return jsonify({
                'error': 'Model is not deployed. Please deploy it first.',
                'model_id': model_id
            }), 400
        
        # Get input data
        input_data = data.get('data')
        print(f"[PREDICT ENDPOINT] Input data: {input_data}")
        if not input_data:
            # Provide helpful message about required features
            feature_map = metadata.get('feature_map', {})
            required_features = {
                'numerical': feature_map.get('numerical', []),
                'categorical': feature_map.get('categorical', [])
            }
            return jsonify({
                'error': 'No input data provided',
                'required_features': required_features,
                'example': {col: 'value' for cols in required_features.values() for col in cols}
            }), 400
        
        return_proba = data.get('return_proba', False)
        
        # Make prediction
        print(f"[PREDICT ENDPOINT] Calling predictor.predict()...")
        result = predictor.predict(model_id, input_data, return_proba=return_proba)
        print(f"[PREDICT ENDPOINT] ✅ Prediction successful!")
        print(f"{'#'*70}\n")
        
        return jsonify({
            'success': True,
            'model_id': model_id,
            **result
        })
    except ValueError as e:
        error_msg = str(e)
        print(f"[PREDICT ENDPOINT] ❌ ValueError: {error_msg}")
        import traceback
        print(f"[PREDICT ENDPOINT] Traceback:\n{traceback.format_exc()}")
        print(f"{'#'*70}\n")
        # Include feature map in error response
        try:
            metadata = registry.get_metadata(model_id)
            feature_map = metadata.get('feature_map', {})
            required_features = {
                'numerical': feature_map.get('numerical', []),
                'categorical': feature_map.get('categorical', [])
            }
            return jsonify({
                'error': error_msg,
                'required_features': required_features,
                'debug_info': f"Error details: {error_msg}"
            }), 400
        except:
            return jsonify({'error': error_msg}), 404
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[PREDICT ENDPOINT] ❌ Exception: {error_trace}")
        print(f"{'#'*70}\n")
        return jsonify({
            'error': str(e),
            'debug_trace': error_trace
        }), 500

@app.route('/api/models/<model_id>/predict/batch', methods=['POST'])
def predict_batch(model_id):
    """Make batch predictions using a deployed model"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Check if model is deployed
        metadata = registry.get_metadata(model_id)
        if not metadata.get('deployed', False):
            return jsonify({
                'error': 'Model is not deployed. Please deploy it first.',
                'model_id': model_id
            }), 400
        
        # Get input data (should be a list)
        input_data = data.get('data')
        if not input_data or not isinstance(input_data, list):
            return jsonify({'error': 'Input data must be a list'}), 400
        
        return_proba = data.get('return_proba', False)
        
        # Make batch prediction
        result = predictor.predict_batch(model_id, input_data, return_proba=return_proba)
        
        return jsonify({
            'success': True,
            'model_id': model_id,
            'count': len(input_data),
            **result
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
