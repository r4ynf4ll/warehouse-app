from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, SQLModel, select

from models import Inventory, InventoryCreate, InventoryUpdate, engine

app = FastAPI()

@app.get("/inventory")
def get_inventory():
    with Session(engine) as session:
        statement = select(Inventory)
        records = session.exec(statement).all()
        return records


@app.post("/inventory")
def create_item(payload: InventoryCreate):
    with Session(engine) as session:
        record = Inventory(
            product_name=payload.product_name,
            category=payload.category,
            quantity=payload.quantity,
            price=payload.price,
            supplier=payload.supplier,
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record


@app.put("/inventory/{id}")
def update_item(id: int, payload: InventoryUpdate):
    with Session(engine) as session:
        statement = select(Inventory).where(Inventory.id == id)
        record = session.exec(statement).first()
        if record is None:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        record.product_name = payload.product_name
        record.category = payload.category
        record.quantity = payload.quantity
        record.price = payload.price
        record.supplier = payload.supplier
        session.add(record)
        session.commit()
        session.refresh(record)
        return record

@app.delete("/inventory/{id}")
def delete_item(id: int):
    with Session(engine) as session:
        statement = select(Inventory).where(Inventory.id == id)
        record = session.exec(statement).first()
        if record is None:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        session.delete(record)
        session.commit()

app.mount("/", StaticFiles(directory="static", html=True), name="static")