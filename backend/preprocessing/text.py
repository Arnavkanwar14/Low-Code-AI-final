import numpy as np

class TextEmbedder:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(model_name)

    def fit(self, X):
        return self

    def transform(self, X):
        if not isinstance(X, np.ndarray):
            X = np.array(X)
        if len(X.shape) == 1:
            X = X.reshape(-1, 1)
            
        embedded_cols = []
        for i in range(X.shape[1]):
            # Extract column as list of strings
            texts = [str(val) for val in X[:, i]]
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            embedded_cols.append(embeddings)
            
        return np.concatenate(embedded_cols, axis=1)
        
    def fit_transform(self, X):
        return self.transform(X)
