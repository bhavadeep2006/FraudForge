from fastapi import APIRouter
from app.config import settings
from app.schemas import HealthResponse
from app.services.model_service import ModelService
from app.services.dataset_service import DatasetService

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def get_health():
    model_svc = ModelService.get_instance()
    dataset_svc = DatasetService()
    dataset_info = dataset_svc.get_info()
    
    return HealthResponse(
        status="healthy",
        model_status=model_svc.model_type,
        backend_version=settings.VERSION,
        device=str(model_svc.device),
        artifacts_available=model_svc.is_trained,
        dataset_available=dataset_info.available
    )

@router.get("/model/info")
def get_model_info():
    model_svc = ModelService.get_instance()
    return {
        "architecture": "Conditional WGAN-GP (cGAN V2)",
        "latent_dim": settings.LATENT_DIM,
        "condition_dim": settings.CONDITION_DIM,
        "hidden_units": settings.HIDDEN_UNITS,
        "num_res_blocks": settings.NUM_RES_BLOCKS,
        "feature_dim": settings.FEATURE_DIM,
        "output_schema": ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount", "Class"],
        "artifacts_loaded": model_svc.is_trained,
        "device": str(model_svc.device),
        "description": (
            "Generator maps 128-dim Gaussian noise + 5-dim condition (fraud class + amount tier) "
            "through 2 residual blocks (256 units) to 31 transformed tabular features, "
            "inverted to realistic credit card transactions."
        )
    }
