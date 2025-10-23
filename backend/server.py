from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Security
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    role: str = "user"  # admin or user
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # income, expense, saving
    user_id: str
    color: str = "#3b82f6"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CategoryCreate(BaseModel):
    name: str
    type: str
    color: str = "#3b82f6"

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    description: str
    date: str
    category_id: str
    type: str  # income, expense, saving
    user_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TransactionCreate(BaseModel):
    amount: float
    description: str
    date: str
    category_id: str
    type: str

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[str] = None
    category_id: Optional[str] = None

class Statistics(BaseModel):
    total_income: float
    total_expenses: float
    total_savings: float
    balance: float
    by_category: dict
    recent_transactions: List[Transaction]

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_current_user(token_data: dict = Depends(verify_token)):
    user = await db.users.find_one({"id": token_data["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return User(**user)

async def create_default_categories(user_id: str):
    default_categories = [
        {"name": "Salario", "type": "income", "color": "#10b981"},
        {"name": "Freelance", "type": "income", "color": "#34d399"},
        {"name": "Alimentación", "type": "expense", "color": "#ef4444"},
        {"name": "Transporte", "type": "expense", "color": "#f59e0b"},
        {"name": "Vivienda", "type": "expense", "color": "#8b5cf6"},
        {"name": "Entretenimiento", "type": "expense", "color": "#ec4899"},
        {"name": "Ahorro de emergencia", "type": "saving", "color": "#3b82f6"},
        {"name": "Inversiones", "type": "saving", "color": "#06b6d4"},
    ]
    
    for cat in default_categories:
        category = Category(
            name=cat["name"],
            type=cat["type"],
            user_id=user_id,
            color=cat["color"]
        )
        await db.categories.insert_one(category.model_dump())

# Auth endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # Create user
    hashed_password = pwd_context.hash(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        role="user"
    )
    
    user_doc = user.model_dump()
    user_doc["password"] = hashed_password
    await db.users.insert_one(user_doc)
    
    # Create default categories
    await create_default_categories(user.id)
    
    # Create token
    access_token = create_access_token({"user_id": user.id, "role": user.role})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not pwd_context.verify(credentials.password, user_doc["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    user = User(**{k: v for k, v in user_doc.items() if k != "password"})
    access_token = create_access_token({"user_id": user.id, "role": user.role})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Category endpoints
@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: User = Depends(get_current_user)):
    category = Category(
        name=category_data.name,
        type=category_data.type,
        user_id=current_user.id,
        color=category_data.color
    )
    await db.categories.insert_one(category.model_dump())
    return category

@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: User = Depends(get_current_user)):
    categories = await db.categories.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    return categories

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryUpdate, current_user: User = Depends(get_current_user)):
    category = await db.categories.find_one({"id": category_id, "user_id": current_user.id})
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    update_data = {k: v for k, v in category_data.model_dump().items() if v is not None}
    await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated_category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return Category(**updated_category)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: User = Depends(get_current_user)):
    result = await db.categories.delete_one({"id": category_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    # Delete associated transactions
    await db.transactions.delete_many({"category_id": category_id})
    return {"message": "Category deleted"}

# Transaction endpoints
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    # Verify category belongs to user
    category = await db.categories.find_one({"id": transaction_data.category_id, "user_id": current_user.id})
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    transaction = Transaction(
        amount=transaction_data.amount,
        description=transaction_data.description,
        date=transaction_data.date,
        category_id=transaction_data.category_id,
        type=transaction_data.type,
        user_id=current_user.id
    )
    await db.transactions.insert_one(transaction.model_dump())
    return transaction

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    else:
        transactions = await db.transactions.find({"user_id": current_user.id}, {"_id": 0}).to_list(10000)
    return transactions

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    else:
        transaction = await db.transactions.find_one({"id": transaction_id, "user_id": current_user.id}, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return Transaction(**transaction)

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction_data: TransactionUpdate, current_user: User = Depends(get_current_user)):
    transaction = await db.transactions.find_one({"id": transaction_id, "user_id": current_user.id})
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    
    update_data = {k: v for k, v in transaction_data.model_dump().items() if v is not None}
    if update_data:
        await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    
    updated_transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    return Transaction(**updated_transaction)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: User = Depends(get_current_user)):
    result = await db.transactions.delete_one({"id": transaction_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return {"message": "Transaction deleted"}

# Statistics endpoints
@api_router.get("/statistics", response_model=Statistics)
async def get_statistics(current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    else:
        transactions = await db.transactions.find({"user_id": current_user.id}, {"_id": 0}).to_list(10000)
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    total_savings = sum(t["amount"] for t in transactions if t["type"] == "saving")
    
    # Group by category
    by_category = defaultdict(lambda: {"total": 0, "count": 0, "name": "", "color": ""})
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    cat_map = {c["id"]: c for c in categories}
    
    for t in transactions:
        cat_id = t["category_id"]
        if cat_id in cat_map:
            by_category[cat_id]["total"] += t["amount"]
            by_category[cat_id]["count"] += 1
            by_category[cat_id]["name"] = cat_map[cat_id]["name"]
            by_category[cat_id]["color"] = cat_map[cat_id]["color"]
            by_category[cat_id]["type"] = cat_map[cat_id]["type"]
    
    # Recent transactions
    recent = sorted(transactions, key=lambda x: x["date"], reverse=True)[:10]
    
    return Statistics(
        total_income=total_income,
        total_expenses=total_expenses,
        total_savings=total_savings,
        balance=total_income - total_expenses - total_savings,
        by_category=dict(by_category),
        recent_transactions=[Transaction(**t) for t in recent]
    )

# Admin endpoints
@api_router.get("/admin/users", response_model=List[User])
async def get_all_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [User(**u) for u in users]

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()