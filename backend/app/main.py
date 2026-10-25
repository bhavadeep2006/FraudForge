from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.api.health import router as health_router
from app.api.generation import router as generation_router
from app.api.evaluation import router as evaluation_router
from app.api.dataset import router as dataset_router

# Configure safe logging without dumping raw transactions
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cgan_backend")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Conditional GAN backend for generating and evaluating synthetic financial transactions.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if not settings.DEBUG else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Transaction contents are preserved securely."}
    )

# Include routers under /api prefix
app.include_router(health_router, prefix="/api")
app.include_router(generation_router, prefix="/api")
app.include_router(evaluation_router, prefix="/api")
app.include_router(dataset_router, prefix="/api")

@app.get("/")
def root():
    return {
        "title": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "api_health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
