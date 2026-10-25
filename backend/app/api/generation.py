from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.schemas import GenerateRequest, GenerateResponse
from app.services.generation_service import GenerationService

router = APIRouter(tags=["Generation"])
gen_service = GenerationService()

@router.post("/generate", response_model=GenerateResponse)
def generate_transactions(req: GenerateRequest):
    try:
        return gen_service.generate(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.get("/generations/{generation_id}", response_model=GenerateResponse)
def get_generation(generation_id: str):
    gen_data = gen_service.get_generation(generation_id)
    if gen_data is None:
        raise HTTPException(status_code=404, detail="Generation not found.")
    
    df = gen_data["df"]
    summary = gen_data["summary"]
    preview_rows = df.head(100).to_dict(orient="records")
    
    return GenerateResponse(
        generation_id=generation_id,
        summary=summary,
        columns=list(df.columns),
        rows=preview_rows,
        total_count=len(df)
    )

@router.get("/export/{generation_id}")
def export_csv(generation_id: str):
    csv_content = gen_service.get_csv(generation_id)
    if csv_content is None:
        raise HTTPException(status_code=404, detail="Generation dataset not found.")
    
    filename = f"synthetic_transactions_{generation_id[:8]}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
