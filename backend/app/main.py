import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from app.core.config import settings
from app.api.v1.router import api_router
from app.core.cloudinary_client import init_cloudinary
from app.db.session import init_db
from app.services.intake_service import WIRE_STORE, PACKAGE_STORE
from app.services.seed_data import seed_initial_assets, check_and_refresh_seed_assets

init_cloudinary()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite schema if not created
    await init_db()
    # 2. Load persisted state from database into in-memory stores
    await WIRE_STORE.load_from_db()
    await PACKAGE_STORE.load_from_db()
    # Newsroom desk starts empty and ready for incoming live dispatches
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous breaking newsroom intake, telemetry audit, selective face redaction, and syndication pipeline powered by Cloudinary.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/healthz")
@app.get("/api/health")
def health_check():
    import cloudinary
    from app.services import intake_service
    cfg = cloudinary.config()
    from app.services.ocr_service import OCRService
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "cloud_name": cfg.cloud_name or settings.CLOUDINARY_CLOUD_NAME,
        "has_api_key": bool(cfg.api_key or settings.CLOUDINARY_API_KEY),
        "has_api_secret": bool(cfg.api_secret or settings.CLOUDINARY_API_SECRET),
        "ocr_ready": OCRService.get_engine() is not None,
        "ocr_error": OCRService._engine_error,
        "last_cloudinary_error": intake_service.LAST_CLOUDINARY_ERROR,
        "docs": "/docs"
    }

# Check possible locations for built frontend dist directory
possible_dist_dirs = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")),
    os.path.abspath(os.path.join(os.getcwd(), "frontend", "dist")),
    os.path.abspath(os.path.join(os.getcwd(), "dist")),
    "/app/frontend/dist",
    "/app/dist"
]

frontend_dist = next((p for p in possible_dist_dirs if os.path.exists(p) and os.path.isdir(p)), None)

if frontend_dist:
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path in ("docs", "redoc", "openapi.json", "healthz"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "online",
            "cloud_name": settings.CLOUDINARY_CLOUD_NAME,
            "docs": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
