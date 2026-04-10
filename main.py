import bcrypt
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, SQLModel, select

from models import Inventory, InventoryCreate, InventoryUpdate, User, UserLogin, UserRegister, engine

app = FastAPI()

SESSION_COOKIE_NAME = "warehouse_session"
SESSION_COOKIE_MAX_AGE = 60 * 60 * 8
sessions: dict[str, str] = {}


def get_current_user(request: Request) -> str:
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    username = sessions.get(session_id)
    if username is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return username


@app.post("/register")
def register_user(payload: UserRegister):
    username = payload.username.strip()
    password = payload.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == username)).first()
        if existing is not None:
            raise HTTPException(status_code=400, detail="Username already exists")

        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user = User(username=username, password_hash=password_hash)
        session.add(user)
        session.commit()
        return {"username": user.username}


@app.post("/login")
def login_user(payload: UserLogin, response: Response):
    username = payload.username.strip()
    password = payload.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid username or password")

        is_valid_password = bcrypt.checkpw(
            password.encode("utf-8"),
            user.password_hash.encode("utf-8"),
        )
        if not is_valid_password:
            raise HTTPException(status_code=401, detail="Invalid username or password")

        session_id = uuid4().hex
        sessions[session_id] = user.username
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_id,
            httponly=True,
            samesite="lax",
            max_age=SESSION_COOKIE_MAX_AGE,
            path="/",
        )
        return {"username": user.username, "message": "Login successful"}


@app.post("/logout")
def logout_user(request: Request, response: Response):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if session_id:
        sessions.pop(session_id, None)

    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return {"message": "Logged out"}

@app.get("/inventory")
def get_inventory(current_user: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(Inventory)
        records = session.exec(statement).all()
        return records


@app.post("/inventory")
def create_item(payload: InventoryCreate, current_user: str = Depends(get_current_user)):
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
def update_item(id: int, payload: InventoryUpdate, current_user: str = Depends(get_current_user)):
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
def delete_item(id: int, current_user: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(Inventory).where(Inventory.id == id)
        record = session.exec(statement).first()
        if record is None:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        session.delete(record)
        session.commit()

app.mount("/", StaticFiles(directory="static", html=True), name="static")