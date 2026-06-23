def build_auto_preprocessing_config(feature_map, feature_stats, n_rows=None, hyperparameters=None):
    if hyperparameters is None:
        hyperparameters = {}

    config = {
        "numerical": [],
        "categorical": [],
        "text": []
    }

    if feature_map["numerical"]:
        if any(feature_stats[c]["missing_ratio"] > 0 for c in feature_map["numerical"]):
            config["numerical"].append({"op": "impute"})
        config["numerical"].append({"op": "scale"})

    if feature_map["categorical"]:
        config["categorical"].append({"op": "one_hot"})

    if feature_map["text"]:
        # SentenceTransformer embedding is expensive. Default to OFF for wide/large datasets
        # unless explicitly enabled.
        enable_text = bool(hyperparameters.get("enableTextEmbedding", False))
        wide_cols_threshold = int(hyperparameters.get("wideTextDisableThreshold", 500))
        n_cols = (
            len(feature_map.get("numerical", []))
            + len(feature_map.get("categorical", []))
            + len(feature_map.get("text", []))
        )

        if enable_text:
            config["text"].append({"op": "embed"})
        else:
            # Disable embed by default when data is wide or row count is large.
            if (n_rows is not None and int(n_rows) > int(hyperparameters.get("textDisableRowThreshold", 5000))) or (n_cols >= wide_cols_threshold):
                config["text"] = []
            else:
                config["text"].append({"op": "embed"})

    return config
