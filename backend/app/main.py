from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.core.cloudinary_client import init_cloudinary
from app.db.session import init_db
from app.services.intake_service import WIRE_STORE, PACKAGE_STORE
from app.services.seed_data import seed_initial_assets

init_cloudinary()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite schema if not created
    await init_db()
    # 2. Load persisted state from database into in-memory stores
    await WIRE_STORE.load_from_db()
    await PACKAGE_STORE.load_from_db()
    # 3. Seed realistic demo assets ONLY if database is empty
    if len(WIRE_STORE) == 0:
        await seed_initial_assets()
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
