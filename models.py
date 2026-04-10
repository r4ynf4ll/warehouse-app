from sqlmodel import Field, SQLModel, create_engine

DATABASE_URL = "sqlite:///warehouse.db"

# SQLite is commonly used with FastAPI's threadpool workers.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

class Inventory(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    product_name: str
    category: str
    quantity: int
    price: float
    supplier: str | None = None


class InventoryCreate(SQLModel):
    product_name: str
    category: str
    quantity: int
    price: float
    supplier: str | None = None


class InventoryUpdate(SQLModel):
    product_name: str
    category: str
    quantity: int
    price: float
    supplier: str | None = None


class User(SQLModel, table=True):
    username: str = Field(primary_key=True)
    password_hash: str


class UserRegister(SQLModel):
    username: str
    password: str


class UserLogin(SQLModel):
    username: str
    password: str
