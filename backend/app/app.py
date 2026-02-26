from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.db.connect import lifespan
from app.routers import auth, users

app = FastAPI(lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # 1. Print the detailed error to your backend terminal (Dev Logging)
    print(f"\n--- 422 VALIDATION ERROR on {request.method} {request.url} ---")
    print(f"Invalid Body Sent: {exc.body}")
    print(f"Specific Errors: {exc.errors()}\n")

    # 2. Return the standard detailed 422 response to the client
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": exc.errors()},
    )


# Final  router path will be "/api/users"
# grouping users endpoints in one


# ROUTES
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])


@app.get("/")
def read_root():
    """Simple root endpoint to verify the API is up."""
    return {"Hello": "World"}
