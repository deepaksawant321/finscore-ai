"""Imports every ORM model so Alembic autogenerate and Base.metadata see them."""

from app.domains.governance import models as _governance  # noqa: F401
from app.domains.identity import models as _identity  # noqa: F401
from app.domains.interview import models as _interview  # noqa: F401
from app.domains.profile import models as _profile  # noqa: F401
from app.domains.scoring import models as _scoring  # noqa: F401
from app.infra.db import Base

__all__ = ["Base"]
