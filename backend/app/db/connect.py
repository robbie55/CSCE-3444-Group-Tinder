import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from pymongo.database import Database as MongoDatabase
from pymongo.mongo_client import MongoClient

load_dotenv()

logger = logging.getLogger(__name__)


# Use a simple class or dictionary to hold the global state
# so it can be easily imported and modified
class DatabaseState:
    client: MongoClient | None = None
    db: MongoDatabase | None = None


db_state = DatabaseState()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASS")
    uri = f"mongodb+srv://{db_user}:{db_pass}@group-matchmaker-csce34.hw6u9in.mongodb.net/?appName=group-matchmaker-csce3444"

    db_client = MongoClient(uri)

    try:
        db_client.admin.command("ping")
        logger.info("Database connected successfully.")
    except Exception as e:
        logger.error("Failed to connect to the database: %s", e)
        raise

    db_state.client = db_client
    db_state.db = db_state.client["matchmaker_db"]

    yield  # App runs

    if db_state.client:
        # Shutdown
        db_state.client.close()
        logger.info("Database connection closed.")


def get_db():
    """Dependency to inject the database into routes."""
    if db_state.db is None:
        raise RuntimeError("DB is not initialized")

    return db_state.db
