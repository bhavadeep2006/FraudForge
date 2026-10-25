from fastapi import APIRouter, HTTPException
from app.schemas import EvaluateRequest, EvaluationResponse
from app.services.evaluation_service import EvaluationService

router = APIRouter(tags=["Evaluation"])
eval_service = EvaluationService()

@router.post("/evaluate", response_model=EvaluationResponse)
def evaluate_synthetic_data(req: EvaluateRequest):
    try:
        return eval_service.evaluate(
            generation_id=req.generation_id,
            sample_size=req.sample_size
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation calculation failed: {str(e)}")

@router.get("/evaluation/{evaluation_id}", response_model=EvaluationResponse)
def get_evaluation(evaluation_id: str):
    res = eval_service.get_evaluation(evaluation_id)
    if res is None:
        raise HTTPException(status_code=404, detail="Evaluation result not found.")
    return res
