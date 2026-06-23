from sklearn.linear_model import LinearRegression, LogisticRegression, SGDRegressor, SGDClassifier
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering, MiniBatchKMeans
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

class ModelFactory:
    @staticmethod
    def get_model(task_type, algorithm_name, params=None):
        if params is None:
            params = {}
            
        # Filter out UI-specific params that don't belong to Scikit-learn models
        ui_params = [
            'epochs', 'batchSize', 'learningRate', 'validationSplit', 
            'normalizeData', 'augmentData', 'randomSeed', 'shuffleData',
            'target_column', 'feature_columns', 'task_type', 'algorithm',
            'handleOutliers', 'removeDuplicates', 'imputeMissing',
            # leakage / evaluation guardrails
            'dropIdentifierColumns', 'groupSplit', 'groupSplitColumn',
            'timeSplit', 'timeSplitColumn',
            # preprocessing wide-data helpers
            'wideFeatureThreshold', 'reduceDimensionality', 'reduceThreshold', 'nComponents',
            'enableTextEmbedding', 'wideTextDisableThreshold', 'textDisableRowThreshold'
        ]
        
        filtered_params = {k: v for k, v in params.items() if k not in ui_params}
        
        # Handle specific parameter mappings
        if 'randomSeed' in params:
            filtered_params['random_state'] = params['randomSeed']

        if task_type == 'regression':
            if algorithm_name == 'linear_regression':
                # LinearRegression doesn't take random_state
                filtered_params.pop('random_state', None)
                return LinearRegression(**filtered_params)
            elif algorithm_name == 'random_forest':
                return RandomForestRegressor(**filtered_params)
            elif algorithm_name == 'svm':
                return SVR(**filtered_params)
            elif algorithm_name == 'decision_tree':
                 return DecisionTreeRegressor(**filtered_params)
            elif algorithm_name == 'knn':
                 return KNeighborsRegressor(**filtered_params)
            elif algorithm_name == 'sgd_regression':
                 return SGDRegressor(**filtered_params)
                 
        elif task_type == 'classification':
            if algorithm_name == 'logistic_regression':
                return LogisticRegression(**filtered_params)
            elif algorithm_name == 'random_forest':
                return RandomForestClassifier(**filtered_params)
            elif algorithm_name == 'svm':
                return SVC(**filtered_params)
            elif algorithm_name == 'decision_tree':
                 return DecisionTreeClassifier(**filtered_params)
            elif algorithm_name == 'knn':
                 return KNeighborsClassifier(**filtered_params)
            elif algorithm_name == 'sgd_classification':
                 return SGDClassifier(**filtered_params)
                 
        elif task_type == 'clustering':
            if algorithm_name == 'kmeans':
                # Rename randomSeed to random_state for KMeans
                if 'random_state' not in filtered_params and 'randomSeed' in params:
                    filtered_params['random_state'] = params['randomSeed']
                return KMeans(**filtered_params)
            elif algorithm_name == 'minibatch_kmeans':
                if 'random_state' not in filtered_params and 'randomSeed' in params:
                    filtered_params['random_state'] = params['randomSeed']
                return MiniBatchKMeans(**filtered_params)
            elif algorithm_name == 'dbscan':
                filtered_params.pop('random_state', None)
                return DBSCAN(**filtered_params)
            elif algorithm_name == 'hierarchical':
                filtered_params.pop('random_state', None)
                return AgglomerativeClustering(**filtered_params)
                
        raise ValueError(f"Unsupported algorithm '{algorithm_name}' for task '{task_type}'")
