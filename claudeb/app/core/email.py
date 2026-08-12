import logging

logger = logging.getLogger("mednexus.email")


def send_email(to: str, subject: str, body: str) -> None:
    """
    STUB — replace this function's body with a real provider call
    (Resend, Postmark, SES, etc.) when you pick one. Every call site in
    this codebase (password reset, future: new-device alerts,
    announcements) already calls this same function, so wiring up a real
    provider is a one-file change, not a hunt through every route.

    For now, this logs the email so password reset is testable in
    staging without any provider configured.
    """
    logger.info("=== EMAIL (stub — not actually sent) ===")
    logger.info("To: %s", to)
    logger.info("Subject: %s", subject)
    logger.info("Body:\n%s", body)
    logger.info("=========================================")
