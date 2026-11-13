class AppError(Exception):
    def __init__(
        self, status: int, code: str, title: str, detail: str | None = None, headers: dict[str, str] | None = None
    ) -> None:
        self.status, self.code, self.title, self.detail, self.headers = status, code, title, detail, headers or {}
