import sys
import os

# Add parent directory of api/ to sys.path so app modules can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from app.main import app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="MedNexus API (Startup Diagnostic)")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    def startup_error(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend Startup Exception",
                "detail": str(e),
                "exception_type": type(e).__name__,
            },
        )
