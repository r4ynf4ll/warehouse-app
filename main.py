from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, SQLModel, select

from models import Inventory, engine

app = FastAPI()

@app.get("/inventory")
def get_inventory():
    with Session(engine) as session:
        statement = select(Inventory)
        records = session.exec(statement).all()
        return records

app.mount("/", StaticFiles(directory="static", html=True), name="static")