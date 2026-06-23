import time
import pandas as pd
import numpy as np
import os
import sys

# Add backend to path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from training.orchestrator import auto_ingest_and_preprocess

def generate_sample_data(rows=100000, filename="large_sample.csv"):
    print(f"Generating {rows} rows of sample data...")
    df = pd.DataFrame({
        "num1": np.random.randn(rows),
        "num2": np.random.randn(rows) * 10,
        "cat1": np.random.choice(["A", "B", "C"], size=rows),
        "cat2": np.random.choice(["X", "Y"], size=rows),
        "target": np.random.choice([0, 1], size=rows)
    })
    
    # Introduce some outliers
    df.loc[0:100, 'num1'] = 1000
    df.to_csv(filename, index=False)
    print(f"Data saved to {filename}")
    return filename

if __name__ == "__main__":
    file_path = generate_sample_data(100000)
    
    hyperparameters = {
        'handleOutliers': True, 
        'removeDuplicates': True,
        'shuffleData': True
    }
    
    print("Starting optimized data cleaning and training pipeline...")
    start_time = time.time()
    
    # Run the orchestrator
    result = auto_ingest_and_preprocess(
        data_path=file_path,
        target_column="target",
        task_type="classification",
        algorithm="random_forest",
        hyperparameters=hyperparameters
    )
    
    end_time = time.time()
    
    print(f"\nPipeline completed in {end_time - start_time:.2f} seconds.")
    print(f"Model trained: {result['algorithm']}")
    print(f"Metrics: {result['metrics']}")
    
    # Check if SGD works
    print("\nTesting SGD incremental model...")
    start_time_sgd = time.time()
    result_sgd = auto_ingest_and_preprocess(
        data_path=file_path,
        target_column="target",
        task_type="classification",
        algorithm="sgd_classification",
        hyperparameters=hyperparameters
    )
    end_time_sgd = time.time()
    
    print(f"SGD Pipeline completed in {end_time_sgd - start_time_sgd:.2f} seconds.")
    print(f"Model trained: {result_sgd['algorithm']}")
    print(f"Metrics: {result_sgd['metrics']}")
    
    # Cleanup
    if os.path.exists(file_path):
        os.remove(file_path)
