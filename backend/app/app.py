from fastapi import FastAPI

from app.routers import users

app = FastAPI()

# Final  router path will be "/api/users"
# grouping users endpoints in one


# ROUTES
app.include_router(users.router, prefix="/api", tags=["users"])


@app.get("/")
def read_root():
    """Simple root endpoint to verify the API is up."""
    return {"Hello": "World"}
