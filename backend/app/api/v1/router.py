from fastapi import APIRouter

from app.api.v1 import (
    actions,
    auth,
    coach,
    copilot,
    goals,
    governance,
    health,
    health_monitor,
    intelligence,
    journey,
    matrix_score,
    nudges,
    orgs,
    partner,
    quick,
    simulations,
    users,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(intelligence.router)
api_router.include_router(matrix_score.router)
api_router.include_router(quick.router)
api_router.include_router(journey.router)
api_router.include_router(governance.router)
api_router.include_router(goals.router)
api_router.include_router(coach.router)
api_router.include_router(simulations.router)
api_router.include_router(actions.router)
api_router.include_router(nudges.router)
api_router.include_router(health_monitor.router)
api_router.include_router(copilot.router)
api_router.include_router(orgs.router)
api_router.include_router(partner.router)
