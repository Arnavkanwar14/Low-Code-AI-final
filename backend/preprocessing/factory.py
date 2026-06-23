from preprocessing.numerical import MeanImputer, StandardScaler
from preprocessing.categorical import OneHotEncoder
from preprocessing.text import TextEmbedder
from preprocessing.pipeline import MLPipeline


def build_pipeline(config):
    if not config:
        return None

    steps = []

    for step in config:
        if step["op"] == "impute":
            steps.append(MeanImputer())
        elif step["op"] == "scale":
            steps.append(StandardScaler())
        elif step["op"] == "one_hot":
            steps.append(OneHotEncoder())
        elif step["op"] == "embed":
            steps.append(TextEmbedder())

    return MLPipeline(steps)
