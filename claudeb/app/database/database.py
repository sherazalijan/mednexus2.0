# Kept only for backward compatibility with any old imports.
# The real engine/session/Base now live in app.database.base — this file
# used to define a SECOND, separate SQLAlchemy engine, which meant the app
# was silently running two independent connection pools against the same
# database. Delete this file once you've confirmed nothing else imports it.
from app.database.base import engine, SessionLocal, Base, get_db  # noqa: F401
