import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd
import joblib

PCA_COLS = [f"V{i}" for i in range(1, 29)]
RAW_COLUMNS = ["Time"] + PCA_COLS + ["Amount", "Class"]
FEATURE_COLS = PCA_COLS + ["Amount_norm", "Time_sin", "Time_cos"]  # 28 + 1 + 2 = 31

class TabularPreprocessor:
    """
    Handles forward and inverse transformations for the credit card fraud dataset.
    Features:
      - 28 PCA features (V1-V28): Min-max / Quantile scaled to [-1, 1]
      - Amount: log1p transformed, scaled to [-1, 1]
      - Time: cyclic sin and cos encoding of hour (24h period) in [-1, 1]
      - Condition (5 dims): [Class, Tier_Q1, Tier_Q2, Tier_Q3, Tier_Q4]
    """
    def __init__(self):
        self.is_fitted: bool = False
        self.amount_min_log: float = 0.0
        self.amount_max_log: float = np.log1p(25000.0)  # max reasonable amount
        self.amount_quantiles: List[float] = [5.0, 22.0, 77.0]  # default benchmark quartiles (25%, 50%, 75%)
        self.pca_mins: np.ndarray = np.full(28, -5.0)
        self.pca_maxs: np.ndarray = np.full(28, 5.0)
        self.max_time: float = 172800.0  # 48 hours in benchmark dataset

    def fit(self, df: pd.DataFrame) -> "TabularPreprocessor":
        """Fit preprocessor parameters on a raw credit card transaction dataframe."""
        # 1. Fit Amount bounds on log1p
        amounts = df["Amount"].values
        log_amounts = np.log1p(np.maximum(amounts, 0))
        self.amount_min_log = float(np.min(log_amounts))
        # 99.9th percentile for robust normalization
        self.amount_max_log = float(np.percentile(log_amounts, 99.9))
        if self.amount_max_log <= self.amount_min_log:
            self.amount_max_log = self.amount_min_log + 1.0

        # Amount quartiles for 4-tier conditioning
        q25, q50, q75 = np.percentile(amounts, [25, 50, 75])
        self.amount_quantiles = [float(q25), float(q50), float(q75)]

        # 2. Fit PCA components bounds (99.5% clip to avoid extreme outliers)
        pca_data = df[PCA_COLS].values
        self.pca_mins = np.percentile(pca_data, 0.5, axis=0)
        self.pca_maxs = np.percentile(pca_data, 99.5, axis=0)
        # Avoid division by zero
        diff = self.pca_maxs - self.pca_mins
        diff[diff == 0] = 1.0
        self.pca_maxs = self.pca_mins + diff

        # 3. Fit Time max
        if "Time" in df.columns:
            self.max_time = float(max(df["Time"].max(), 172800.0))

        self.is_fitted = True
        return self

    def _amount_to_tier(self, amounts: np.ndarray) -> np.ndarray:
        """Convert amounts to 4-tier one-hot encoding [N, 4]."""
        n = len(amounts)
        tiers = np.zeros((n, 4), dtype=np.float32)
        q25, q50, q75 = self.amount_quantiles
        for i, a in enumerate(amounts):
            if a <= q25:
                tiers[i, 0] = 1.0
            elif a <= q50:
                tiers[i, 1] = 1.0
            elif a <= q75:
                tiers[i, 2] = 1.0
            else:
                tiers[i, 3] = 1.0
        return tiers

    def transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Transforms raw DataFrame into:
          X: [N, 31] float32 values in [-1, 1]
          c: [N, 5] condition vectors (1-dim class + 4-dim amount tier)
        """
        n = len(df)
        # 1. PCA features normalized to [-1, 1]
        pca_vals = df[PCA_COLS].values
        pca_norm = 2.0 * (pca_vals - self.pca_mins) / (self.pca_maxs - self.pca_mins) - 1.0
        pca_norm = np.clip(pca_norm, -1.0, 1.0).astype(np.float32)

        # 2. Amount log1p normalized to [-1, 1]
        raw_amounts = df["Amount"].values
        log_amounts = np.log1p(np.maximum(raw_amounts, 0))
        amt_norm = 2.0 * (log_amounts - self.amount_min_log) / (self.amount_max_log - self.amount_min_log) - 1.0
        amt_norm = np.clip(amt_norm, -1.0, 1.0).reshape(-1, 1).astype(np.float32)

        # 3. Cyclic Time encoding
        time_vals = df["Time"].values if "Time" in df.columns else np.random.uniform(0, self.max_time, n)
        hours = (time_vals / 3600.0) % 24.0
        angles = 2.0 * np.pi * (hours / 24.0)
        time_sin = np.sin(angles).reshape(-1, 1).astype(np.float32)
        time_cos = np.cos(angles).reshape(-1, 1).astype(np.float32)

        # Concatenate 28 + 1 + 2 = 31 features
        x_trans = np.hstack([pca_norm, amt_norm, time_sin, time_cos])

        # 4. Condition vector: Class (1 dim) + Amount Tier (4 dims) = 5 dims
        classes = df["Class"].values.reshape(-1, 1).astype(np.float32)
        amount_tiers = self._amount_to_tier(raw_amounts)
        conditions = np.hstack([classes, amount_tiers])

        return x_trans, conditions

    def inverse_transform(
        self,
        x_trans: np.ndarray,
        conditions: np.ndarray,
        rng: Optional[np.random.RandomState] = None
    ) -> pd.DataFrame:
        """
        Inverts transformed representation [N, 31] and conditions [N, 5] back to
        original tabular schema: Time, V1..V28, Amount, Class
        """
        if rng is None:
            rng = np.random.RandomState(42)

        n = x_trans.shape[0]
        # 1. Invert 28 PCA features
        pca_norm = np.clip(x_trans[:, :28], -1.0, 1.0)
        pca_orig = ((pca_norm + 1.0) / 2.0) * (self.pca_maxs - self.pca_mins) + self.pca_mins

        # 2. Invert Amount
        amt_norm = np.clip(x_trans[:, 28], -1.0, 1.0)
        log_amt = ((amt_norm + 1.0) / 2.0) * (self.amount_max_log - self.amount_min_log) + self.amount_min_log
        amount_orig = np.expm1(log_amt)
        amount_orig = np.maximum(amount_orig, 0.0)
        amount_orig = np.round(amount_orig, 2)

        # 3. Invert Time (Hour from cyclic sin/cos)
        sin_vals = x_trans[:, 29]
        cos_vals = x_trans[:, 30]
        angles = np.arctan2(sin_vals, cos_vals)  # [-pi, pi]
        angles = np.where(angles < 0, angles + 2 * np.pi, angles)  # [0, 2*pi]
        hours = angles * (24.0 / (2.0 * np.pi))
        # Reconstruct Time in seconds across 2 days (48 hours)
        day_offset = rng.choice([0.0, 86400.0], size=n)
        seconds_within_day = hours * 3600.0
        time_orig = np.round(day_offset + seconds_within_day, 1)

        # 4. Class from condition vector (first element)
        classes = np.round(conditions[:, 0]).astype(int)

        # Construct DataFrame
        data: Dict[str, Any] = {"Time": time_orig.astype(float)}
        for i, col in enumerate(PCA_COLS):
            data[col] = np.round(pca_orig[:, i], 6).astype(float)
        data["Amount"] = amount_orig.astype(float)
        data["Class"] = classes.astype(int)

        return pd.DataFrame(data)

    def save(self, filepath: str | Path) -> None:
        """Saves fitted preprocessor state."""
        state = {
            "amount_min_log": self.amount_min_log,
            "amount_max_log": self.amount_max_log,
            "amount_quantiles": self.amount_quantiles,
            "pca_mins": self.pca_mins.tolist(),
            "pca_maxs": self.pca_maxs.tolist(),
            "max_time": self.max_time,
            "is_fitted": self.is_fitted
        }
        with open(filepath, "w") as f:
            json.dump(state, f, indent=2)

    @classmethod
    def load(cls, filepath: str | Path) -> "TabularPreprocessor":
        """Loads preprocessor state from file."""
        prep = cls()
        with open(filepath, "r") as f:
            state = json.load(f)
        prep.amount_min_log = state["amount_min_log"]
        prep.amount_max_log = state["amount_max_log"]
        prep.amount_quantiles = state["amount_quantiles"]
        prep.pca_mins = np.array(state["pca_mins"], dtype=np.float64)
        prep.pca_maxs = np.array(state["pca_maxs"], dtype=np.float64)
        prep.max_time = state.get("max_time", 172800.0)
        prep.is_fitted = state.get("is_fitted", True)
        return prep
