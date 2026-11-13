import asyncio
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Protocol

import structlog

log = structlog.get_logger()


@dataclass
class Mail:
    to: str
    subject: str
    body: str


class Mailer(Protocol):
    async def send(self, mail: Mail) -> None: ...


class LogMailer:
    """Used when no SMTP host is configured. Never logs the body (it contains tokens)."""

    async def send(self, mail: Mail) -> None:
        log.info("mail_not_sent_no_smtp", subject=mail.subject)


class FileMailer:
    """Local-dev only: writes each mail to a file so verification links can be opened without an SMTP server."""

    def __init__(self, directory: str) -> None:
        from pathlib import Path

        self.dir = Path(directory)
        self.dir.mkdir(parents=True, exist_ok=True)

    async def send(self, mail: Mail) -> None:
        import time

        name = f"{time.time_ns()}-{mail.to.replace('@', '_at_')}.txt"
        content = chr(10).join([f"To: {mail.to}", f"Subject: {mail.subject}", "", mail.body, ""])
        (self.dir / name).write_text(content, encoding="utf-8")


class SmtpMailer:
    def __init__(self, host: str, port: int, sender: str) -> None:
        self.host, self.port, self.sender = host, port, sender

    def _send_sync(self, mail: Mail) -> None:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = self.sender, mail.to, mail.subject
        msg.set_content(mail.body)
        with smtplib.SMTP(self.host, self.port, timeout=10) as s:
            s.send_message(msg)

    async def send(self, mail: Mail) -> None:
        try:
            await asyncio.to_thread(self._send_sync, mail)
        except OSError:
            log.error("smtp_send_failed", subject=mail.subject)


class MemoryMailer:
    """Test double capturing outgoing mail."""

    def __init__(self) -> None:
        self.sent: list[Mail] = []

    async def send(self, mail: Mail) -> None:
        self.sent.append(mail)
