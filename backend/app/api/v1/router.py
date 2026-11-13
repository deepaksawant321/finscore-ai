from fastapi import APIRouter

from app.api.v1 import auth, goals, governance, health, intelligence, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(intelligence.router)
api_router.include_router(governance.router)
api_router.include_router(goals.router)
