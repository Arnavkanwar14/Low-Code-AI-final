from sklearn.impute import SimpleImputer
import sklearn.preprocessing

class MeanImputer:
    def __init__(self):
        self.imputer = SimpleImputer(strategy='mean')
        
    def fit(self, X):
        self.imputer.fit(X)
        return self

    def transform(self, X):
        return self.imputer.transform(X)
        
    def fit_transform(self, X):
        return self.imputer.fit_transform(X)


class StandardScaler:
    def __init__(self):
        self.scaler = sklearn.preprocessing.StandardScaler()
        
    def fit(self, X):
        self.scaler.fit(X)
        return self

    def transform(self, X):
        return self.scaler.transform(X)
        
    def fit_transform(self, X):
        return self.scaler.fit_transform(X)
