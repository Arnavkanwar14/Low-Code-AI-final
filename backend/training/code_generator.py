import json

def generate_training_script(data_path, target_column, auto_config, task_type, algorithm, feature_map):
    """
    Generates a Python script string that reproduces the ingestion, preprocessing, and training.
    """
    
    # Escape backslashes for string literal in generated code
    safe_data_path = data_path.replace("\\", "/")
    
    script = f'''import pandas as pd
import numpy as np
from scipy import sparse
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, FunctionTransformer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.decomposition import TruncatedSVD
from sentence_transformers import SentenceTransformer

# 1. Load Data
data_path = "{safe_data_path}"
df = pd.read_csv(data_path)
print(f"Loaded data from {{data_path}} with shape {{df.shape}}")

# 1.5 Data Cleaning & Outlier Removal
print("Starting data cleaning...")

# Remove Duplicates
initial_rows = len(df)
df = df.drop_duplicates()
print(f"Removed {{initial_rows - len(df)}} duplicate rows")

# Remove rows with missing target (if supervised)
if "{target_column}" in df.columns:
    df = df.dropna(subset=["{target_column}"])

# Outlier Removal using IQR (Interquartile Range)
# Applies to all numerical columns
numerical_cols = df.select_dtypes(include=[np.number]).columns
if "{target_column}" in numerical_cols:
    numerical_cols = numerical_cols.drop("{target_column}")

for col in numerical_cols:
    Q1 = df[col].quantile(0.25)
    Q3 = df[col].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    
    # Filter
    df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]

print(f"Data shape after cleaning and outlier removal: {{df.shape}}")

# 2. Preprocessing Configuration
# Detected Features
numerical_features = {json.dumps(feature_map['numerical'])}
categorical_features = {json.dumps(feature_map['categorical'])}
text_features = {json.dumps(feature_map['text'])}
target_column = "{target_column}"

# 3. Create Preprocessing Pipelines

transformers = []

# Numerical Pipeline
if numerical_features:
    num_steps = []
    # Hardcoded based on auto_config logic: Impute then Scale
    num_steps.append(('imputer', SimpleImputer(strategy='mean')))
    num_steps.append(('scaler', StandardScaler()))
    transformers.append(('num', Pipeline(num_steps), numerical_features))

# Categorical Pipeline
if categorical_features:
    cat_steps = []
    cat_steps.append(('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=True)))
    transformers.append(('cat', Pipeline(cat_steps), categorical_features))

# Text Pipeline (Custom Function for SentenceTransformer)
def text_embedder(text_data):
    # Flatten if necessary and embed
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = []
    # Assuming text_data comes in as a 2D array or dataframe slice
    for i in range(text_data.shape[1]):
        col_values = text_data[:, i].astype(str)
        embeddings.append(model.encode(col_values))
    if not embeddings:
        return np.array([])
    return np.hstack(embeddings)

if text_features:
    transformers.append(('text', FunctionTransformer(text_embedder), text_features))

# Combine all
preprocessor = ColumnTransformer(transformers=transformers, remainder='drop')

# 4. Prepare X and y
if "{target_column}" in df.columns:
    X = df.drop(columns=[target_column])
    y = df[target_column]
else:
    # Unsupervised or target not found
    X = df
    y = None

# Fit Preprocessor
print("Preprocessing data...")
X_processed = preprocessor.fit_transform(X)
print(f"Processed feature shape: {{X_processed.shape}}")

# Optional: reduce dimensionality for very wide sparse data
try:
    n_features = X_processed.shape[1]
except Exception:
    n_features = None

if n_features is not None and n_features >= 2000:
    print(f"Applying TruncatedSVD to reduce features from {{n_features}}...")
    reducer = TruncatedSVD(n_components=min(300, n_features - 1), random_state=42)
    X_processed = reducer.fit_transform(X_processed)
    print(f"Reduced feature shape: {{X_processed.shape}}")

# 5. Model Training
task_type = "{task_type}"
algorithm = "{algorithm}"

print(f"Training {{algorithm}} for {{task_type}}...")
model = None

if task_type == 'regression':
    if algorithm == 'linear_regression':
        model = LinearRegression()
    elif algorithm == 'random_forest':
        model = RandomForestRegressor()
    elif algorithm == 'svm':
        model = SVR()
    elif algorithm == 'decision_tree':
        model = DecisionTreeRegressor()
    elif algorithm == 'knn':
        model = KNeighborsRegressor()
        
elif task_type == 'classification':
    if algorithm == 'logistic_regression':
        model = LogisticRegression()
    elif algorithm == 'random_forest':
        model = RandomForestClassifier()
    elif algorithm == 'svm':
        model = SVC()
    elif algorithm == 'decision_tree':
        model = DecisionTreeClassifier()
    elif algorithm == 'knn':
        model = KNeighborsClassifier()

elif task_type == 'clustering':
    if algorithm == 'kmeans':
        model = KMeans(n_clusters=3) # Default

if model:
    if y is not None and task_type != 'clustering':
        model.fit(X_processed, y)
        print("Model trained successfully.")
        print("Score:", model.score(X_processed, y))
    else:
        model.fit(X_processed)
        print("Model trained successfully (Unsupervised).")
else:
    print("No model selected or supported.")

'''
    return script
