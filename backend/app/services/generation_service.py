import datetime
import uuid
from typing import Dict, Optional, Tuple, Any
import numpy as np
import pandas as pd
import torch

from app.config import settings
from app.schemas import GenerateRequest, GenerateResponse, GenerationSummary
from app.services.model_service import ModelService

class GenerationService:
    def __init__(self):
        self.model_service = ModelService.get_instance()
        # In-memory store for recent generations (keyed by generation_id)
        self._history: Dict[str, Dict[str, Any]] = {}

    def calculate_counts(self, num_rows: int, fraud_percentage: float) -> Tuple[int, int]:
        """
        Documented rounding rule:
        fraud_count = round((fraud_percentage / 100.0) * num_rows)
        legit_count = num_rows - fraud_count
        Clamped to [0, num_rows].
        """
        fraud_count = int(round((fraud_percentage / 100.0) * num_rows))
        fraud_count = max(0, min(num_rows, fraud_count))
        legit_count = num_rows - fraud_count
        return fraud_count, legit_count

    def generate(self, req: GenerateRequest) -> GenerateResponse:
        num_rows = req.num_rows
        fraud_percentage = req.fraud_percentage
        seed = req.seed if req.seed is not None else settings.DEFAULT_SEED

        fraud_count, legit_count = self.calculate_counts(num_rows, fraud_percentage)
        actual_fraud_pct = (fraud_count / num_rows) * 100.0 if num_rows > 0 else 0.0

        # Construct condition vector: [N, 5]
        # Column 0: Class (1 for fraud, 0 for legit)
        # Columns 1-4: Amount tier one-hot
        rng = np.random.RandomState(seed)
        torch_rng = torch.Generator().manual_seed(seed)

        conditions = np.zeros((num_rows, 5), dtype=np.float32)
        # Set classes
        conditions[:fraud_count, 0] = 1.0
        conditions[fraud_count:, 0] = 0.0

        # Set realistic amount tiers:
        # Fraud transactions tend toward mid-to-high amounts (tiers 2 and 3)
        for i in range(num_rows):
            is_fraud = conditions[i, 0] == 1.0
            if is_fraud:
                tier_idx = rng.choice([0, 1, 2, 3], p=[0.1, 0.2, 0.35, 0.35])
            else:
                tier_idx = rng.choice([0, 1, 2, 3], p=[0.25, 0.25, 0.25, 0.25])
            conditions[i, 1 + tier_idx] = 1.0

        # Check if trained model is available
        if self.model_service.is_trained and self.model_service.generator is not None:
            # Latent noise [N, 128]
            z = torch.randn(num_rows, settings.LATENT_DIM, generator=torch_rng, dtype=torch.float32)
            c_tensor = torch.from_numpy(conditions)

            # Generate 31 transformed features
            features = self.model_service.generate_features(z, c_tensor).cpu().numpy()

            # Inverse transformation with deterministic rng
            df = self.model_service.preprocessor.inverse_transform(features, conditions, rng=rng)
            is_simulation = False
            model_ver = "cWGAN-GP V2 (Trained PyTorch Generator)"
        else:
            # Documented simulation fallback when trained model checkpoint is not yet generated
            df = self._generate_simulation(num_rows, fraud_count, conditions, rng)
            is_simulation = True
            model_ver = "Statistical Simulation (Trained Checkpoint Missing)"

        # Shuffle rows reproducibly so fraud rows are interspersed
        shuffle_idx = rng.permutation(num_rows)
        df = df.iloc[shuffle_idx].reset_index(drop=True)

        gen_id = str(uuid.uuid4())
        timestamp = datetime.datetime.utcnow().isoformat() + "Z"

        summary = GenerationSummary(
            total_rows=num_rows,
            fraud_count=fraud_count,
            legitimate_count=legit_count,
            requested_fraud_percentage=fraud_percentage,
            actual_fraud_percentage=round(actual_fraud_pct, 3),
            seed=seed,
            generated_at=timestamp,
            model_version=model_ver,
            is_simulation=is_simulation
        )

        # Store in history
        self._history[gen_id] = {
            "df": df,
            "summary": summary,
            "columns": list(df.columns)
        }

        # Keep memory footprint bounded (keep last 20 generations)
        if len(self._history) > 20:
            oldest = next(iter(self._history))
            del self._history[oldest]

        # Convert preview / rows
        # Return first 100 rows for preview to keep payload fast and responsive
        preview_rows = df.head(100).to_dict(orient="records")

        return GenerateResponse(
            generation_id=gen_id,
            summary=summary,
            columns=list(df.columns),
            rows=preview_rows,
            total_count=num_rows
        )

    def _generate_simulation(
        self,
        num_rows: int,
        fraud_count: int,
        conditions: np.ndarray,
        rng: np.random.RandomState
    ) -> pd.DataFrame:
        """
        Explicitly labeled simulation generator used ONLY when trained PyTorch
        checkpoint has not yet been fitted on data. Never disguised as neural cGAN.
        """
        pca_cols = [f"V{i}" for i in range(1, 29)]
        data: Dict[str, Any] = {}

        # Synthetic Time across 48h
        hours = rng.uniform(0, 48, size=num_rows)
        data["Time"] = np.round(hours * 3600.0, 1)

        # V1-V28 with differentiated distributions per class
        classes = conditions[:, 0]
        for col in pca_cols:
            fraud_mean = rng.uniform(-1.5, 1.5)
            fraud_std = rng.uniform(1.2, 2.5)
            legit_mean = rng.uniform(-0.3, 0.3)
            legit_std = rng.uniform(0.8, 1.2)

            vals = np.where(
                classes == 1.0,
                rng.normal(fraud_mean, fraud_std, size=num_rows),
                rng.normal(legit_mean, legit_std, size=num_rows)
            )
            data[col] = np.round(vals, 6)

        # Amount with log-normal distribution
        fraud_amt = np.exp(rng.normal(np.log(140.0), 1.3, size=num_rows))
        legit_amt = np.exp(rng.normal(np.log(60.0), 0.9, size=num_rows))
        amounts = np.where(classes == 1.0, fraud_amt, legit_amt)
        data["Amount"] = np.round(np.maximum(amounts, 0.5), 2)
        data["Class"] = classes.astype(int)

        return pd.DataFrame(data)

    def get_generation(self, generation_id: str) -> Optional[Dict[str, Any]]:
        return self._history.get(generation_id)

    def get_csv(self, generation_id: str) -> Optional[str]:
        gen = self.get_generation(generation_id)
        if gen is None:
            return None
        df: pd.DataFrame = gen["df"]
        return df.to_csv(index=False)
