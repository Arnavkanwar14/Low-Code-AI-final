import sklearn.preprocessing

class OneHotEncoder:
    def __init__(self):
        self.encoder = sklearn.preprocessing.OneHotEncoder(
            handle_unknown='ignore',
            sparse_output=True
        )
        
    def fit(self, X):
        self.encoder.fit(X)
        return self

    def transform(self, X):
        return self.encoder.transform(X)
        
    def fit_transform(self, X):
        return self.encoder.fit_transform(X)
