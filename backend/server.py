from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
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
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set in environment variables")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Email settings
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.hostinger.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '465'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', SMTP_USER)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://mymoneymanager-1.preview.emergentagent.com')
SUPER_ADMIN_EMAIL = os.environ.get('SUPER_ADMIN_EMAIL', 'conecta@vjrodriguez.dev')

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
    role: str = "user"  # user or admin
    email_verified: bool = False
    is_active: bool = True
    profile_image: Optional[str] = None
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

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

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

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class AdminPasswordChange(BaseModel):
    user_id: str
    new_password: str

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    profile_image: Optional[str] = None

# Email helper functions
async def send_email(to_email: str, subject: str, html_content: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        logging.warning("SMTP not configured, skipping email send")
        return
    
    try:
        message = MIMEMultipart('alternative')
        message['From'] = SMTP_FROM_EMAIL
        message['To'] = to_email
        message['Subject'] = subject
        
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        # For Hostinger SSL on port 465
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=True,
            start_tls=False,  # Don't use STARTTLS with port 465
            timeout=30
        )
        logging.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logging.error(f"Failed to send email to {to_email}: {str(e)}")
        # Don't raise exception, just log it

async def send_verification_email(email: str, token: str):
    verification_url = f"{FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>FinanzasApp</h1>
            </div>
            <div class="content">
                <h2>¡Bienvenido a FinanzasApp!</h2>
                <p>Gracias por registrarte. Por favor verifica tu correo electrónico haciendo clic en el botón de abajo:</p>
                <center>
                    <a href="{verification_url}" class="button">Verificar Email</a>
                </center>
                <p>O copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all; color: #667eea;">{verification_url}</p>
                <p>Este enlace expirará en 24 horas.</p>
            </div>
            <div class="footer">
                <p>Si no creaste una cuenta, puedes ignorar este email.</p>
                <p>&copy; 2025 FinanzasApp. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    """
    await send_email(email, "Verifica tu email - FinanzasApp", html)

async def send_password_reset_email(email: str, token: str):
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>FinanzasApp</h1>
            </div>
            <div class="content">
                <h2>Recuperación de Contraseña</h2>
                <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
                <center>
                    <a href="{reset_url}" class="button">Restablecer Contraseña</a>
                </center>
                <p>O copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all; color: #667eea;">{reset_url}</p>
                <p>Este enlace expirará en 1 hora.</p>
            </div>
            <div class="footer">
                <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este email.</p>
                <p>&copy; 2025 FinanzasApp. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    """
    await send_email(email, "Recuperación de Contraseña - FinanzasApp", html)

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

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

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


# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "FinanzasApp API - v2.0"}

# Auth endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister, background_tasks: BackgroundTasks):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # Check if this is the super admin
    is_super_admin = user_data.email == SUPER_ADMIN_EMAIL
    
    # Create user
    hashed_password = pwd_context.hash(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        role="admin" if is_super_admin else "user",
        email_verified=is_super_admin  # Auto-verify super admin
    )
    
    user_doc = user.model_dump()
    user_doc["password"] = hashed_password
    
    # Create verification token
    if not is_super_admin:
        verification_token = secrets.token_urlsafe(32)
        user_doc["verification_token"] = verification_token
        user_doc["verification_token_expires"] = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Create default categories
    await create_default_categories(user.id)
    
    # Send verification email
    if not is_super_admin:
        background_tasks.add_task(send_verification_email, user.email, verification_token)
    
    # Create token
    access_token = create_access_token({"user_id": user.id, "role": user.role})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not pwd_context.verify(credentials.password, user_doc["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    # Check if email is verified
    if not user_doc.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Email not verified. Please check your email for verification link."
        )
    
    # Check if account is active
    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact administrator."
        )
    
    user = User(**{k: v for k, v in user_doc.items() if k != "password"})
    access_token = create_access_token({"user_id": user.id, "role": user.role})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/verify-email/{token}")
async def verify_email(token: str):
    user_doc = await db.users.find_one({"verification_token": token})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid verification token")
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(user_doc["verification_token_expires"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token expired")
    
    # Verify email
    await db.users.update_one(
        {"id": user_doc["id"]},
        {"$set": {"email_verified": True}, "$unset": {"verification_token": "", "verification_token_expires": ""}}
    )
    
    return {"message": "Email verified successfully"}

@api_router.post("/auth/resend-verification")
async def resend_verification(email_data: PasswordReset, background_tasks: BackgroundTasks):
    user_doc = await db.users.find_one({"email": email_data.email})
    if not user_doc:
        # Don't reveal if email exists
        return {"message": "If the email exists, a verification link has been sent"}
    
    if user_doc.get("email_verified", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")
    
    # Generate new token
    verification_token = secrets.token_urlsafe(32)
    await db.users.update_one(
        {"id": user_doc["id"]},
        {"$set": {
            "verification_token": verification_token,
            "verification_token_expires": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        }}
    )
    
    background_tasks.add_task(send_verification_email, user_doc["email"], verification_token)
    return {"message": "Verification email sent"}

@api_router.post("/auth/forgot-password")
async def forgot_password(email_data: PasswordReset, background_tasks: BackgroundTasks):
    user_doc = await db.users.find_one({"email": email_data.email})
    if not user_doc:
        # Don't reveal if email exists
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    await db.users.update_one(
        {"id": user_doc["id"]},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expires": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        }}
    )
    
    background_tasks.add_task(send_password_reset_email, user_doc["email"], reset_token)
    return {"message": "Password reset email sent"}

@api_router.post("/auth/reset-password")
async def reset_password(reset_data: PasswordResetConfirm):
    user_doc = await db.users.find_one({"reset_token": reset_data.token})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid reset token")
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(user_doc["reset_token_expires"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token expired")
    
    # Update password and verify email automatically
    hashed_password = pwd_context.hash(reset_data.new_password)
    await db.users.update_one(
        {"id": user_doc["id"]},
        {
            "$set": {
                "password": hashed_password,
                "email_verified": True  # Auto-verify email when resetting password
            }, 
            "$unset": {
                "reset_token": "", 
                "reset_token_expires": "",
                "verification_token": "",
                "verification_token_expires": ""
            }
        }
    )
    
    return {"message": "Password reset successfully"}

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
async def get_all_users(current_user: User = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [User(**u) for u in users]

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    total_transactions = await db.transactions.count_documents({})
    total_categories = await db.categories.count_documents({})
    
    all_transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    total_income = sum(t["amount"] for t in all_transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in all_transactions if t["type"] == "expense")
    total_savings = sum(t["amount"] for t in all_transactions if t["type"] == "saving")
    
    return {
        "total_users": total_users,
        "total_transactions": total_transactions,
        "total_categories": total_categories,
        "platform_income": total_income,
        "platform_expenses": total_expenses,
        "platform_savings": total_savings
    }

@api_router.put("/admin/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, current_user: User = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return User(**updated_user)

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_admin_user)):
    # Prevent deleting yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Delete user's data
    await db.categories.delete_many({"user_id": user_id})
    await db.transactions.delete_many({"user_id": user_id})
    
    return {"message": "User deleted"}

@api_router.post("/admin/change-password")
async def admin_change_user_password(password_data: AdminPasswordChange, current_user: User = Depends(get_admin_user)):
    user = await db.users.find_one({"id": password_data.user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Hash new password
    hashed_password = pwd_context.hash(password_data.new_password)
    await db.users.update_one(
        {"id": password_data.user_id},
        {"$set": {"password": hashed_password}}
    )
    
    return {"message": "Password changed successfully"}

@api_router.post("/admin/toggle-user-status/{user_id}")
async def toggle_user_status(user_id: str, current_user: User = Depends(get_admin_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"message": f"User {'activated' if new_status else 'deactivated'} successfully", "is_active": new_status}

# Profile endpoints
@api_router.put("/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user)):
    update_fields = {}
    
    # Update username if provided
    if profile_data.username:
        update_fields["username"] = profile_data.username
    
    # Update profile image if provided
    if profile_data.profile_image:
        update_fields["profile_image"] = profile_data.profile_image
    
    # Update password if both current and new password are provided
    if profile_data.current_password and profile_data.new_password:
        user_doc = await db.users.find_one({"id": current_user.id})
        if not pwd_context.verify(profile_data.current_password, user_doc["password"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        
        update_fields["password"] = pwd_context.hash(profile_data.new_password)
    
    if update_fields:
        await db.users.update_one({"id": current_user.id}, {"$set": update_fields})
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    return User(**updated_user)

@api_router.get("/profile", response_model=User)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


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