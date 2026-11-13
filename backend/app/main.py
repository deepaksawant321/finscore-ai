import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.ai.gateway import LLMProvider, build_provider
from app.api.errors import register_error_handlers
from app.api.v1.router import api_router
from app.config import Settings, get_settings
from app.domains.privacy.scheduler import PurgeScheduler, for_privacy
from app.infra.crypto import configure_encryption
from app.infra.db import make_engine, make_sessionmaker
from app.infra.logging import configure_logging
from app.infra.mailer import FileMailer, LogMailer, Mailer, SmtpMailer

log = structlog.get_logger()


def create_app(settings: Settings | None = None, mailer: Mailer | None = None, llm: LLMProvider | None = None) -> FastAPI:
    cfg = settings or get_settings()
    configure_logging(cfg.env)
    configure_encryption(cfg.data_encryption_key.get_secret_value())

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = make_engine(cfg.database_url)
        app.state.engine = engine
        app.state.sessionmaker = make_sessionmaker(engine)
        scheduler: PurgeScheduler | None = None
        if cfg.purge_scheduler_enabled:
            scheduler = for_privacy(app.state.sessionmaker, cfg)
            scheduler.start()
        app.state.purge_scheduler = scheduler
        yield
        if scheduler is not None:
            await scheduler.stop()
        await engine.dispose()

    app = FastAPI(
        title="FinScore AI API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None if cfg.env == "production" else "/docs",
        redoc_url=None,
        openapi_url=None if cfg.env == "production" else "/openapi.json",
    )
    app.state.settings = cfg
    default_mailer: Mailer = LogMailer()
    if cfg.smtp_host:
        default_mailer = SmtpMailer(cfg.smtp_host, cfg.smtp_port, cfg.mail_from)
    elif cfg.mail_dir:
        default_mailer = FileMailer(cfg.mail_dir)
    app.state.mailer = mailer or default_mailer
    app.state.llm = llm or build_provider(cfg)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.request_id = rid
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=rid)
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        if cfg.cookie_secure:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        log.info("request", method=request.method, path=request.url.path, status=response.status_code)
        return response

    register_error_handlers(app)
    app.include_router(api_router)
    return app
