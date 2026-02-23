import os

from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

load_dotenv()

db_user = os.getenv("DB_USER")
db_pass = os.getenv("DB_PASS")


def connectToDb():
    uri = f"mongodb+srv://{db_user}:{db_pass}@group-matchmaker-csce34.hw6u9in.mongodb.net/?appName=group-matchmaker-csce3444"

    # create client
    client = MongoClient(uri, server_api=ServerApi("1"))

    # send a ping to confirm successful connection
    try:
        client.admin.command("ping")
        print("Pinged your deployment, successful connect")
    except Exception as e:
        print(e)
