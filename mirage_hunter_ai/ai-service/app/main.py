from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.core.logging import configure_logging
from app.core.settings import get_settings

configure_logging()
settings = get_settings()

app = FastAPI(
    title="H2T-MirageHunter AI Service",
    version="0.1.0",
    description="Connectivity scaffold; inference is intentionally not implemented.",
)
app.include_router(health_router)
