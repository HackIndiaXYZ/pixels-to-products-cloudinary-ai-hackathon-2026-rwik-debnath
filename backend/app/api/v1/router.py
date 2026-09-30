from fastapi import APIRouter
from app.api.v1.endpoints import intake, editorial, packaging, search

api_router = APIRouter()
api_router.include_router(intake.router, prefix="/intake", tags=["Field Intake"])
api_router.include_router(editorial.router, prefix="/editorial", tags=["Editorial Desk"])
api_router.include_router(packaging.router, prefix="/packaging", tags=["Broadcast Packaging"])
api_router.include_router(search.router, prefix="/search", tags=["Wire Search"])
