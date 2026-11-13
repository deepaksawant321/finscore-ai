import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.infra.errors import AppError

log = structlog.get_logger()
PROBLEM = "application/problem+json"


def _problem(request: Request, status: int, code: str, title: str, detail: str | None, **extra: object) -> JSONResponse:
    body: dict[str, object] = {
        "type": f"https://finscore.5nance.com/problems/{code}",
        "title": title,
        "status": status,
        "code": code,
        "request_id": getattr(request.state, "request_id", None),
        **extra,
    }
    if detail:
        body["detail"] = detail
    return JSONResponse(body, status_code=status, media_type=PROBLEM)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError) -> JSONResponse:
        resp = _problem(request, exc.status, exc.code, exc.title, exc.detail)
        resp.headers.update(exc.headers)
        return resp

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
        return _problem(request, 422, "validation_error", "Request validation failed", None, errors=errors)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = {404: "not_found", 405: "method_not_allowed"}.get(exc.status_code, "http_error")
        return _problem(request, exc.status_code, code, str(exc.detail), None)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        log.error("unhandled_exception", error_type=type(exc).__name__, path=request.url.path)
        return _problem(request, 500, "internal_error", "Internal server error", None)
