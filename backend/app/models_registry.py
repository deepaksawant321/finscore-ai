"""Imports every ORM model so Alembic autogenerate and Base.metadata see them."""

from app.domains.actions import models as _actions  # noqa: F401
from app.domains.analytics import models as _analytics  # noqa: F401
from app.domains.coach import models as _coach  # noqa: F401
from app.domains.events import models as _events  # noqa: F401
from app.domains.goals import models as _goals  # noqa: F401
from app.domains.governance import models as _governance  # noqa: F401
from app.domains.health import models as _health  # noqa: F401
from app.domains.identity import models as _identity  # noqa: F401
from app.domains.interview import models as _interview  # noqa: F401
from app.domains.journey import models as _journey  # noqa: F401
from app.domains.nudges import models as _nudges  # noqa: F401
from app.domains.organizations import models as _organizations  # noqa: F401
from app.domains.profile import models as _profile  # noqa: F401
from app.domains.scoring import models as _scoring  # noqa: F401
from app.domains.simulation import models as _simulation  # noqa: F401
from app.infra.db import Base

__all__ = ["Base"]
