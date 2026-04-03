import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.connect import lifespan
from app.routers import auth, match, users

logger = logging.getLogger(__name__)

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        "422 VALIDATION ERROR on %s %s | Body: %s | Errors: %s",
        request.method,
        request.url,
        exc.body,
        exc.errors(),
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": exc.errors()},
    )


# Final user router path is "/api/users"
# grouping users endpoints in one


# ROUTES
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(match.router, prefix="/api", tags=["match"])


@app.get("/")
def read_root():
    """Simple root endpoint to verify the API is up."""
    return {"Hello": "World"}
