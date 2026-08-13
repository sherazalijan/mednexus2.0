import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.rate_limit import limiter
from app.routes.auth import router as auth_router
from app.routes.books import router as books_router
from app.routes.chapters import router as chapters_router
from app.routes.mcqs import router as mcqs_router
from app.routes.quiz import router as quiz_router
from app.routes.users import router as users_router
from app.routes.admin import router as admin_router
from app.routes.bulk_upload import router as bulk_upload_router
from app.routes.progress import router as progress_router
from app.routes.bookmarks import router as bookmarks_router
from app.routes.flags import router as flags_router
from app.routes.announcements import router as announcements_router
from app.routes.revision import router as revision_router
from app.routes.payments import router as payments_router
from app.routes.contact import router as contact_router
from app.routes.leads import router as leads_router
from app.routes.coming_soon_books import router as coming_soon_router

app = FastAPI(title="MedNexus API")

from fastapi import Request
from fastapi.responses import JSONResponse

@app.middleware("http")
async def log_request_paths(request: Request, call_next):
    if request.query_params.get("debug") == "1" or "debug" in request.url.path:
        from app.core.security import pwd_context
        return JSONResponse({
            "url_path": request.url.path,
            "scope_path": request.scope.get("path"),
            "scope_root_path": request.scope.get("root_path"),
            "query_params": dict(request.query_params),
            "method": request.method,
            "pwd_context_loaded": pwd_context is not None,
            "pwd_context_schemes": pwd_context.schemes() if pwd_context else None,
        })
    return await call_next(request)



# Rate limiting (slowapi). Individual limits are set per-route with
# @limiter.limit(...) — see auth.py (/login, /password-reset/request) and
# flags.py (/mcqs/{id}/flag). This just wires the shared limiter + a
# handler that returns a clean 429 instead of an unhandled exception.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# BEFORE: allow_origins=["*"] with allow_credentials=False. That combo is
# tolerable *only* because credentials aren't used, but it means literally
# any website can call this API from a user's browser. Now that requests
# carry a bearer token in a header (not a cookie), it's not a CSRF vector,
# but you should still restrict this to your real frontend origin(s) in
# production instead of "*".
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS_RAW.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Response

@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400",
        }
    )


app.include_router(auth_router)
app.include_router(books_router)
app.include_router(chapters_router)
app.include_router(mcqs_router)
app.include_router(quiz_router)
app.include_router(users_router)
app.include_router(admin_router)
app.include_router(bulk_upload_router)
app.include_router(progress_router)
app.include_router(bookmarks_router)
app.include_router(flags_router)
app.include_router(announcements_router)
app.include_router(revision_router)
app.include_router(payments_router)
app.include_router(contact_router)
app.include_router(leads_router)
app.include_router(coming_soon_router)


@app.get("/")
def home():
    return {"message": "MedNexus Backend Running"}
