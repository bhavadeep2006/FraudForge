from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = "healthy"
    model_status: str
    backend_version: str
    device: str
    artifacts_available: bool
    dataset_available: bool

class ModelInfoResponse(BaseModel):
    architecture: str
    latent_dim: int
    condition_dim: int
    hidden_units: int
    num_res_blocks: int
    feature_dim: int
    output_schema: List[str]
    artifacts_loaded: bool
    device: str
    description: str

class DatasetInfoResponse(BaseModel):
    available: bool
    path: str
    total_rows: Optional[int] = None
    fraud_rows: Optional[int] = None
    legitimate_rows: Optional[int] = None
    fraud_percentage: Optional[float] = None
    features: List[str] = []
    message: str

class GenerateRequest(BaseModel):
    num_rows: int = Field(default=1000, ge=1, le=50000, description="Number of synthetic rows to generate")
    fraud_percentage: float = Field(default=5.0, ge=0.0, le=100.0, description="Target percentage of fraud transactions (0-100)")
    seed: Optional[int] = Field(default=42, ge=0, description="Random seed for reproducibility")

class GenerationSummary(BaseModel):
    total_rows: int
    fraud_count: int
    legitimate_count: int
    requested_fraud_percentage: float
    actual_fraud_percentage: float
    seed: int
    generated_at: str
    model_version: str
    is_simulation: bool

class GenerateResponse(BaseModel):
    generation_id: str
    summary: GenerationSummary
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_count: int

class KSMetric(BaseModel):
    statistic: float
    p_value: float

class FidelityMetrics(BaseModel):
    mean_ks: float
    correlation_difference: float
    per_feature_ks: Dict[str, KSMetric]

class TSTRMetrics(BaseModel):
    auprc: float
    roc_auc: float
    fraud_recall: float
    fraud_f1: float

class UtilityMetrics(BaseModel):
    tstr: TSTRMetrics
    baseline_real: Optional[TSTRMetrics] = None
    smote_comparison: Optional[TSTRMetrics] = None

class PrivacyMetrics(BaseModel):
    mean_dcr_synthetic_vs_train: float
    mean_dcr_synthetic_vs_holdout: float
    min_dcr: float
    exact_copies_count: int
    exact_copies_percentage: float

class EvaluateRequest(BaseModel):
    generation_id: Optional[str] = None
    sample_size: int = Field(default=1000, ge=100, le=10000)

class EvaluationResponse(BaseModel):
    evaluation_id: str
    evaluated_at: str
    data_source: str
    sample_size: int
    fidelity: FidelityMetrics
    utility: UtilityMetrics
    privacy: PrivacyMetrics
    limitations: List[str]
    notes: str
