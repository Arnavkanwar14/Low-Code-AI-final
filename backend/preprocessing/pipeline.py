class MLPipeline:
    def __init__(self, steps):
        self.steps = steps

    def fit(self, X):
        if X is None:
            return None
        for step in self.steps:
            X = step.fit_transform(X)
        return X

    def fit_transform(self, X):
        """Fit and transform in one step, matching sklearn's interface"""
        if X is None:
            return None
        for step in self.steps:
            X = step.fit_transform(X)
        return X

    def transform(self, X):
        if X is None:
            return None
        for step in self.steps:
            X = step.transform(X)
        return X
