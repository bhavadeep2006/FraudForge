import os
from pathlib import Path
from typing import List

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    PROJECT_NAME: str = "Tabular Data Synthesizer for Finance (cGAN)"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1")
    
    # Server
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # CORS
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
    ]
    
    # Paths
    MODEL_DIR: Path = Path(os.getenv("MODEL_DIR", str(BASE_DIR / "models")))
    DATASET_PATH: Path = Path(os.getenv("DATASET_PATH", str(BASE_DIR / "data" / "creditcard.csv")))
    
    CHECKPOINT_NAME: str = os.getenv("CHECKPOINT_NAME", "cgan_generator.pt")
    TRANSFORMER_NAME: str = os.getenv("TRANSFORMER_NAME", "transformer.joblib")
    
    # Model parameters from specification
    LATENT_DIM: int = 128
    CONDITION_DIM: int = 5
    HIDDEN_UNITS: int = 256
    NUM_RES_BLOCKS: int = 2
    FEATURE_DIM: int = 31  # 28 PCA + Amount + 2 Cyclic Time (sin, cos)
    
    # Constraints
    MAX_GENERATION_ROWS: int = int(os.getenv("MAX_GENERATION_ROWS", "50000"))
    DEFAULT_GENERATION_ROWS: int = int(os.getenv("DEFAULT_GENERATION_ROWS", "1000"))
    DEFAULT_FRAUD_PERCENTAGE: float = float(os.getenv("DEFAULT_FRAUD_PERCENTAGE", "5.0"))
    DEFAULT_SEED: int = 42

settings = Settings()
