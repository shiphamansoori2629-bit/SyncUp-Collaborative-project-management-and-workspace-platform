import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import sync_database
from app.routers import (
    analytics,
    auth,
    comments,
    projects,
    tasks,
    users,
    workspaces,
)
from app.services.uploads import STATIC_DIR, ensure_upload_dirs

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[1]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Lifespan startup: ensuring upload dirs...")
    ensure_upload_dirs()
    
    # Run database sync in a background thread to avoid blocking startup
    logger.info("Lifespan startup: spawning database sync task...")
    asyncio.create_task(asyncio.to_thread(sync_database))
    
    logger.info("Lifespan startup: complete (DB sync running in background)")
    yield
    logger.info("Lifespan shutdown")


app = FastAPI(
    title="SyncUp API",
    version="0.2.1",
    description="Project management API with Clerk auth and workspace collaboration",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

API_PREFIX = "/api"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(workspaces.router, prefix=API_PREFIX)
app.include_router(projects.router, prefix=API_PREFIX)
app.include_router(tasks.router, prefix=API_PREFIX)
app.include_router(comments.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
