import logging
from pyexpat.errors import messages

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.connect import lifespan
from app.routers import auth, groups, users

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


# ROUTES
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])


@app.get("/")
def read_root():
    """Simple root endpoint to verify the API is up."""
    return {"Hello": "World"}
