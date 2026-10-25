from fastapi import APIRouter
from app.schemas import DatasetInfoResponse
from app.services.dataset_service import DatasetService

router = APIRouter(tags=["Dataset"])
dataset_service = DatasetService()

@router.get("/dataset/info", response_model=DatasetInfoResponse)
def get_dataset_info():
    return dataset_service.get_info()
