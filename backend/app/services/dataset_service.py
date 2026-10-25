from pathlib import Path
from typing import Optional, Tuple
import pandas as pd
from sklearn.model_selection import train_test_split
from app.config import settings
from app.schemas import DatasetInfoResponse

class DatasetService:
    def __init__(self):
        self.dataset_path: Path = settings.DATASET_PATH

    def get_info(self) -> DatasetInfoResponse:
        """
        Returns summary info about real dataset without exposing individual rows.
        """
        if not self.dataset_path.exists():
            return DatasetInfoResponse(
                available=False,
                path=str(self.dataset_path),
                features=[],
                message=(
                    "Real credit card dataset not found at configured path. "
                    "To enable real-data training and baseline evaluation, download creditcard.csv "
                    "from Kaggle (ULB Machine Learning Group - Credit Card Fraud Detection) "
                    "and place it in backend/data/creditcard.csv."
                )
            )

        try:
            # Read only header and Class column to be memory efficient
            df = pd.read_csv(self.dataset_path, usecols=["Class"])
            total_rows = len(df)
            fraud_rows = int((df["Class"] == 1).sum())
            legit_rows = total_rows - fraud_rows
            fraud_pct = (fraud_rows / total_rows) * 100.0 if total_rows > 0 else 0.0

            # Get full header
            header_df = pd.read_csv(self.dataset_path, nrows=1)
            features = list(header_df.columns)

            return DatasetInfoResponse(
                available=True,
                path=str(self.dataset_path),
                total_rows=total_rows,
                fraud_rows=fraud_rows,
                legitimate_rows=legit_rows,
                fraud_percentage=round(fraud_pct, 4),
                features=features,
                message="Credit Card Fraud Detection dataset is loaded and available for training and evaluation."
            )
        except Exception as e:
            return DatasetInfoResponse(
                available=False,
                path=str(self.dataset_path),
                features=[],
                message=f"Error reading dataset at {self.dataset_path}: {str(e)}"
            )

    def load_splits(
        self,
        test_size: float = 0.2,
        seed: int = 42
    ) -> Tuple[Optional[pd.DataFrame], Optional[pd.DataFrame]]:
        """
        Safely loads dataset and splits into train and held-out test splits.
        Preserves test integrity; preprocessing is fitted ONLY on train split.
        """
        if not self.dataset_path.exists():
            return None, None

        df = pd.read_csv(self.dataset_path)
        train_df, test_df = train_test_split(
            df,
            test_size=test_size,
            random_state=seed,
            stratify=df["Class"]
        )
        return train_df.reset_index(drop=True), test_df.reset_index(drop=True)
