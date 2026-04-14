from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
import json
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import resend
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse, CheckoutStatusResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Env variables
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
JWT_SECRET = os.environ.get('JWT_SECRET')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Configure Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Create the main app
app = FastAPI(title="ViralIQ API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: Optional[str] = None
    subscription_tier: str = "free"  # free, pro, agency
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class SigninRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class UsageLimit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    generations_this_week: int = 0
    analyses_this_week: int = 0
    week_start: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GenerateIdeasRequest(BaseModel):
    niche: str
    target_audience: str
    language: str

class VideoIdea(BaseModel):
    title: str
    hook: str
    thumbnail_concept: str
    viral_score: float
    best_upload_day: str
    best_upload_time: str

class GenerateIdeasResponse(BaseModel):
    ideas: List[VideoIdea]

class AnalyzeVideoRequest(BaseModel):
    video_url: str

class VideoAnalysisResponse(BaseModel):
    score: int
    reasons: List[Dict[str, str]]
    improved_title: str
    better_thumbnail: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    amount: float
    plan: str
    payment_status: str = "initiated"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CancelSubscriptionRequest(BaseModel):
    confirm: bool = True

# ============ EMAIL HELPER ============

async def send_email_notification(to_email: str, subject: str, html_content: str):
    """Send email via Resend. Falls back to logging if no API key."""
    if not RESEND_API_KEY:
        logger.info(f"[EMAIL LOG] To: {to_email} | Subject: {subject}")
        # Store in DB as notification record
        await db.email_notifications.insert_one({
            "to": to_email,
            "subject": subject,
            "html": html_content,
            "status": "logged_only",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"status": "logged", "message": "No RESEND_API_KEY configured, email logged only"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        await db.email_notifications.insert_one({
            "to": to_email,
            "subject": subject,
            "status": "sent",
            "email_id": email.get("id"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Email sent to {to_email}: {subject}")
        return {"status": "sent", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        await db.email_notifications.insert_one({
            "to": to_email,
            "subject": subject,
            "status": "failed",
            "error": str(e),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"status": "failed", "error": str(e)}

def build_payment_success_email(user_name: str, plan: str, amount: float) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #FFFFFF; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FF0000; font-size: 28px; margin: 0;">ViralIQ</h1>
        </div>
        <h2 style="color: #FFFFFF; font-size: 22px; text-align: center;">Payment Successful!</h2>
        <p style="color: #A1A1AA; text-align: center; font-size: 16px;">Hey {user_name or 'Creator'},</p>
        <div style="background: #141414; border: 1px solid #262626; border-radius: 8px; padding: 24px; margin: 20px 0;">
            <p style="color: #A1A1AA; margin: 8px 0;">Plan: <strong style="color: #FFFFFF;">{plan.title()} Plan</strong></p>
            <p style="color: #A1A1AA; margin: 8px 0;">Amount: <strong style="color: #FFFFFF;">${amount}/month</strong></p>
            <p style="color: #A1A1AA; margin: 8px 0;">Status: <strong style="color: #10B981;">Active</strong></p>
        </div>
        <p style="color: #A1A1AA; text-align: center;">You now have unlimited access to all ViralIQ features. Go create some viral content!</p>
        <div style="text-align: center; margin-top: 30px;">
            <p style="color: #71717A; font-size: 12px;">ViralIQ - AI-Powered YouTube Growth</p>
        </div>
    </div>
    """

def build_cancellation_email(user_name: str, plan: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #FFFFFF; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FF0000; font-size: 28px; margin: 0;">ViralIQ</h1>
        </div>
        <h2 style="color: #FFFFFF; font-size: 22px; text-align: center;">Subscription Cancelled</h2>
        <p style="color: #A1A1AA; text-align: center; font-size: 16px;">Hey {user_name or 'Creator'},</p>
        <div style="background: #141414; border: 1px solid #262626; border-radius: 8px; padding: 24px; margin: 20px 0;">
            <p style="color: #A1A1AA; margin: 8px 0;">Previous Plan: <strong style="color: #FFFFFF;">{plan.title()}</strong></p>
            <p style="color: #A1A1AA; margin: 8px 0;">Current Plan: <strong style="color: #FFFFFF;">Free</strong></p>
            <p style="color: #A1A1AA; margin: 8px 0;">Status: <strong style="color: #F59E0B;">Downgraded</strong></p>
        </div>
        <p style="color: #A1A1AA; text-align: center;">Your subscription has been cancelled and you've been moved to the Free plan. You can upgrade again anytime.</p>
        <p style="color: #A1A1AA; text-align: center; font-size: 14px;">Free plan includes: 3 generations/week, 1 analysis/week</p>
        <div style="text-align: center; margin-top: 30px;">
            <p style="color: #71717A; font-size: 12px;">ViralIQ - AI-Powered YouTube Growth</p>
        </div>
    </div>
    """

def build_welcome_email(user_name: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #FFFFFF; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FF0000; font-size: 28px; margin: 0;">ViralIQ</h1>
        </div>
        <h2 style="color: #FFFFFF; font-size: 22px; text-align: center;">Welcome to ViralIQ!</h2>
        <p style="color: #A1A1AA; text-align: center; font-size: 16px;">Hey {user_name or 'Creator'},</p>
        <p style="color: #A1A1AA; text-align: center;">Your account is ready. Start generating viral video ideas and analyzing your content today.</p>
        <div style="background: #141414; border: 1px solid #262626; border-radius: 8px; padding: 24px; margin: 20px 0;">
            <p style="color: #FFFFFF; font-weight: bold; margin: 8px 0;">Your Free Plan includes:</p>
            <p style="color: #A1A1AA; margin: 8px 0;">&#8226; 3 viral idea generations per week</p>
            <p style="color: #A1A1AA; margin: 8px 0;">&#8226; 1 video analysis per week</p>
            <p style="color: #A1A1AA; margin: 8px 0;">&#8226; Multi-language support</p>
        </div>
        <p style="color: #A1A1AA; text-align: center;">Upgrade to Pro for unlimited access!</p>
        <div style="text-align: center; margin-top: 30px;">
            <p style="color: #71717A; font-size: 12px;">ViralIQ - AI-Powered YouTube Growth</p>
        </div>
    </div>
    """

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = verify_token(token)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============ AUTH ROUTES ============

@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    existing = await db.users.find_one({"email": request.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(email=request.email, full_name=request.full_name)
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['password_hash'] = hash_password(request.password)
    
    await db.users.insert_one(user_dict)
    
    # Initialize usage limits
    usage = UsageLimit(user_id=user.id)
    usage_dict = usage.model_dump()
    usage_dict['week_start'] = usage_dict['week_start'].isoformat()
    await db.usage_limits.insert_one(usage_dict)
    
    token = create_access_token(user.id, user.email)
    
    # Send welcome email (non-blocking)
    asyncio.create_task(
        send_email_notification(
            to_email=request.email,
            subject="Welcome to ViralIQ!",
            html_content=build_welcome_email(request.full_name)
        )
    )
    
    return AuthResponse(access_token=token, user=user)

@api_router.post("/auth/signin", response_model=AuthResponse)
async def signin(request: SigninRequest):
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc or not verify_password(request.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    user = User(**user_doc)
    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user['created_at'] = datetime.fromisoformat(current_user['created_at'])
    return User(**current_user)

@api_router.post("/auth/signout")
async def signout(current_user: dict = Depends(get_current_user)):
    return {"message": "Signed out successfully"}

# ============ USAGE LIMIT HELPERS ============

async def check_and_update_usage(user_id: str, operation: str) -> bool:
    usage = await db.usage_limits.find_one({"user_id": user_id}, {"_id": 0})
    if not usage:
        usage = UsageLimit(user_id=user_id).model_dump()
        usage['week_start'] = usage['week_start'].isoformat()
        await db.usage_limits.insert_one(usage)
        usage = await db.usage_limits.find_one({"user_id": user_id}, {"_id": 0})
    
    week_start = datetime.fromisoformat(usage['week_start'])
    now = datetime.now(timezone.utc)
    
    # Reset weekly limits if new week
    if (now - week_start).days >= 7:
        await db.usage_limits.update_one(
            {"user_id": user_id},
            {"$set": {
                "generations_this_week": 0,
                "analyses_this_week": 0,
                "week_start": now.isoformat()
            }}
        )
        usage['generations_this_week'] = 0
        usage['analyses_this_week'] = 0
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    tier = user.get('subscription_tier', 'free')
    
    # Check if test mode is enabled for this user
    test_mode = await db.test_mode.find_one({"enabled": True}, {"_id": 0})
    if test_mode and user.get('email') == test_mode.get('email'):
        return True
    
    # Check limits based on subscription tier
    if tier == 'free':
        if operation == 'generation' and usage['generations_this_week'] >= 3:
            return False
        if operation == 'analysis' and usage['analyses_this_week'] >= 1:
            return False
    # Pro and Agency have unlimited access
    
    # Update usage
    if operation == 'generation':
        await db.usage_limits.update_one(
            {"user_id": user_id},
            {"$inc": {"generations_this_week": 1}}
        )
    elif operation == 'analysis':
        await db.usage_limits.update_one(
            {"user_id": user_id},
            {"$inc": {"analyses_this_week": 1}}
        )
    
    return True

@api_router.get("/usage")
async def get_usage(current_user: dict = Depends(get_current_user)):
    usage = await db.usage_limits.find_one({"user_id": current_user['id']}, {"_id": 0})
    tier = current_user.get('subscription_tier', 'free')
    if not usage:
        return {
            "generations_this_week": 0,
            "analyses_this_week": 0,
            "tier": tier,
            "generation_limit": 3 if tier == "free" else -1,
            "analysis_limit": 1 if tier == "free" else -1
        }
    return {
        "generations_this_week": usage.get('generations_this_week', 0),
        "analyses_this_week": usage.get('analyses_this_week', 0),
        "tier": tier,
        "generation_limit": 3 if tier == "free" else -1,
        "analysis_limit": 1 if tier == "free" else -1
    }

# ============ FEATURE ROUTES ============

@api_router.post("/generate-ideas", response_model=GenerateIdeasResponse)
async def generate_ideas(request: GenerateIdeasRequest, current_user: dict = Depends(get_current_user)):
    can_use = await check_and_update_usage(current_user['id'], 'generation')
    if not can_use:
        raise HTTPException(status_code=403, detail="Weekly generation limit reached. Upgrade to Pro for unlimited access.")
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"gen_{current_user['id']}_{datetime.now().timestamp()}",
        system_message=f"You are an expert YouTube content strategist. Generate viral video ideas for the {request.language} speaking market."
    )
    chat.with_model("openai", "gpt-4o")
    
    prompt = f"""Generate 10 viral YouTube video ideas for:
Niche: {request.niche}
Target Audience: {request.target_audience}
Language: {request.language}

For EACH idea, provide:
1. Title (catchy, clickable)
2. Hook (first 15 seconds script)
3. Thumbnail concept (visual description)
4. Viral score (integer 1-10, must be a whole number)
5. Best upload day
6. Best upload time

IMPORTANT: viral_score MUST be an integer (whole number like 7 or 8, NOT 7.5).
Format as JSON array with keys: title, hook, thumbnail_concept, viral_score, best_upload_day, best_upload_time
Return ONLY the JSON array, no other text."""
    
    message = UserMessage(text=prompt)
    response = await chat.send_message(message)
    
    try:
        response_text = response.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        ideas_data = json.loads(response_text)
        # Coerce viral_score to float (model accepts float now)
        for idea in ideas_data:
            idea['viral_score'] = float(idea.get('viral_score', 5))
        
        ideas = [VideoIdea(**idea) for idea in ideas_data]
        
        # Store in database
        for idea in ideas:
            idea_doc = idea.model_dump()
            idea_doc['user_id'] = current_user['id']
            idea_doc['created_at'] = datetime.now(timezone.utc).isoformat()
            await db.viral_ideas.insert_one(idea_doc)
        
        return GenerateIdeasResponse(ideas=ideas)
    except Exception as e:
        logger.error(f"Error parsing AI response: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate ideas. Please try again.")

@api_router.post("/analyze-video", response_model=VideoAnalysisResponse)
async def analyze_video(request: AnalyzeVideoRequest, current_user: dict = Depends(get_current_user)):
    can_use = await check_and_update_usage(current_user['id'], 'analysis')
    if not can_use:
        raise HTTPException(status_code=403, detail="Weekly analysis limit reached. Upgrade to Pro for unlimited access.")
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"analysis_{current_user['id']}_{datetime.now().timestamp()}",
        system_message="You are an expert YouTube algorithm analyst and content strategist."
    )
    chat.with_model("openai", "gpt-4o")
    
    prompt = f"""Analyze this YouTube video: {request.video_url}

Provide:
1. Overall performance score (integer 0-100)
2. 3-5 specific reasons why it underperformed
3. For each reason, provide an actionable fix
4. Suggest an improved title
5. Suggest a better thumbnail concept

Format as JSON with keys: score (integer), reasons (array of objects with 'reason' and 'fix'), improved_title, better_thumbnail
Return ONLY the JSON object, no other text."""
    
    message = UserMessage(text=prompt)
    response = await chat.send_message(message)
    
    try:
        response_text = response.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        analysis_data = json.loads(response_text)
        analysis_data['score'] = int(analysis_data.get('score', 50))
        analysis = VideoAnalysisResponse(**analysis_data)
        
        # Store in database
        analysis_doc = analysis.model_dump()
        analysis_doc['user_id'] = current_user['id']
        analysis_doc['video_url'] = request.video_url
        analysis_doc['created_at'] = datetime.now(timezone.utc).isoformat()
        await db.video_analyses.insert_one(analysis_doc)
        
        return analysis
    except Exception as e:
        logger.error(f"Error parsing AI analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze video. Please try again.")

# ============ PAYMENT ROUTES ============

PRICING_PLANS = {
    "pro": {"amount": 9.0, "name": "Pro"},
    "agency": {"amount": 29.0, "name": "Agency"}
}

@api_router.post("/checkout/session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    plan: str,
    origin_url: str,
    current_user: dict = Depends(get_current_user)
):
    if plan not in PRICING_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    plan_info = PRICING_PLANS[plan]
    
    host_url = origin_url.rstrip('/')
    webhook_url = f"{os.environ.get('REACT_APP_BACKEND_URL', host_url)}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{host_url}/payment-success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
    cancel_url = f"{host_url}/pricing"
    
    checkout_request = CheckoutSessionRequest(
        amount=plan_info["amount"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": current_user['id'],
            "plan": plan,
            "email": current_user['email']
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        user_id=current_user['id'],
        session_id=session.session_id,
        amount=plan_info["amount"],
        plan=plan,
        payment_status="initiated"
    )
    transaction_dict = transaction.model_dump()
    transaction_dict['created_at'] = transaction_dict['created_at'].isoformat()
    await db.payment_transactions.insert_one(transaction_dict)
    
    return session

@api_router.get("/checkout/status/{session_id}", response_model=CheckoutStatusResponse)
async def get_checkout_status(session_id: str, current_user: dict = Depends(get_current_user)):
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction if completed
    if status.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if transaction and transaction['payment_status'] != "completed":
            plan = transaction['plan']
            await db.users.update_one(
                {"id": current_user['id']},
                {"$set": {"subscription_tier": plan}}
            )
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "completed"}}
            )
            # Send payment success email
            plan_info = PRICING_PLANS.get(plan, {"amount": 0})
            asyncio.create_task(
                send_email_notification(
                    to_email=current_user['email'],
                    subject=f"ViralIQ - {plan.title()} Plan Activated!",
                    html_content=build_payment_success_email(
                        current_user.get('full_name'),
                        plan,
                        plan_info['amount']
                    )
                )
            )
    
    return status

@api_router.post("/webhook/stripe")
async def stripe_webhook(stripe_signature: str = Header(None)):
    return {"status": "received"}

# ============ SUBSCRIPTION CANCELLATION ============

@api_router.post("/subscription/cancel")
async def cancel_subscription(request: CancelSubscriptionRequest, current_user: dict = Depends(get_current_user)):
    if not request.confirm:
        raise HTTPException(status_code=400, detail="Please confirm cancellation")
    
    tier = current_user.get('subscription_tier', 'free')
    if tier == 'free':
        raise HTTPException(status_code=400, detail="You are already on the Free plan")
    
    # Downgrade to free
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {"subscription_tier": "free"}}
    )
    
    # Reset usage limits
    await db.usage_limits.update_one(
        {"user_id": current_user['id']},
        {"$set": {
            "generations_this_week": 0,
            "analyses_this_week": 0,
            "week_start": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Record cancellation
    await db.cancellations.insert_one({
        "user_id": current_user['id'],
        "email": current_user['email'],
        "previous_plan": tier,
        "cancelled_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send cancellation email
    asyncio.create_task(
        send_email_notification(
            to_email=current_user['email'],
            subject="ViralIQ - Subscription Cancelled",
            html_content=build_cancellation_email(current_user.get('full_name'), tier)
        )
    )
    
    return {"message": f"{tier.title()} subscription cancelled. You are now on the Free plan.", "new_tier": "free"}

# ============ EMAIL NOTIFICATIONS ROUTES ============

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.email_notifications.find(
        {"to": current_user['email']},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    return {"notifications": notifications}

# ============ ADMIN TESTING ============

class TestModeRequest(BaseModel):
    enabled: bool
    email: EmailStr

@api_router.post("/admin/test-mode")
async def toggle_test_mode(request: TestModeRequest):
    await db.test_mode.delete_many({})
    
    if request.enabled:
        await db.test_mode.insert_one({
            "enabled": True,
            "email": request.email,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": f"Test mode enabled for {request.email}", "enabled": True}
    else:
        return {"message": "Test mode disabled", "enabled": False}

@api_router.get("/admin/test-mode/status")
async def get_test_mode_status():
    test_mode = await db.test_mode.find_one({"enabled": True}, {"_id": 0})
    if test_mode:
        return {"enabled": True, "email": test_mode.get("email")}
    return {"enabled": False, "email": None}

# ============ ROOT ============

@api_router.get("/")
async def root():
    return {"message": "ViralIQ API is running"}

app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
