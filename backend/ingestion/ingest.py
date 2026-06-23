import pandas as pd
import os

class MLIngestor:
    def __init__(self, target_column: str, feature_columns: list = None):
        self.target_column = target_column
        self.feature_columns = feature_columns

    def ingest_csv(self, file_path: str):
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        if os.path.getsize(file_path) == 0:
            raise ValueError("The selected file is empty. Please upload a valid dataset.")

        try:
            # Try to read with common delimiters if comma fails or produces 1 column
            df = pd.read_csv(file_path)
            if df.shape[1] <= 1:
                # Re-try with semicolon if likely
                df_semi = pd.read_csv(file_path, sep=';')
                if df_semi.shape[1] > df.shape[1]:
                    df = df_semi
        except pd.errors.EmptyDataError:
            raise ValueError("No data found in the file. Please ensure it has columns and rows.")
        except Exception as e:
            raise ValueError(f"Failed to parse file: {str(e)}")
            
        return self._analyze_dataframe(df)

    def _analyze_dataframe(self, df: pd.DataFrame):
        if self.target_column and self.target_column not in df.columns:
            # Fallback check for similar names (case-insensitive)
            cols_lower = {c.lower(): c for c in df.columns}
            if self.target_column.lower() in cols_lower:
                self.target_column = cols_lower[self.target_column.lower()]
            else:
                raise ValueError(f"Target column '{self.target_column}' not found in dataset")

        if self.feature_columns:
            # Filter only existing columns
            valid_features = [c for c in self.feature_columns if c in df.columns]
            if not valid_features:
                 # Fallback to all minus target
                 X = df.drop(columns=[self.target_column]) if self.target_column else df
            else:
                 X = df[valid_features]
        else:
            X = df.drop(columns=[self.target_column]) if self.target_column else df

        y = df[self.target_column].values if self.target_column else None

        feature_map = {
            "numerical": [],
            "categorical": [],
            "text": []
        }
        feature_stats = {}

        for col in X.columns:
            col_data = X[col]
            missing_ratio = col_data.isna().mean()
            
            if len(col_data) == 0:
                unique_ratio = 0
            else:
                unique_ratio = col_data.nunique() / len(col_data)

            if pd.api.types.is_numeric_dtype(col_data):
                feature_type = "numerical"
            else:
                feature_type = "categorical" if unique_ratio < 0.7 else "text"

            feature_map[feature_type].append(col)

            feature_stats[col] = {
                "type": feature_type,
                "missing_ratio": missing_ratio,
                "unique_ratio": unique_ratio
            }

        return {
            "X_df": X,
            "y": y,
            "feature_map": feature_map,
            "feature_stats": feature_stats
        }
