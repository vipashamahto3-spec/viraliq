from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Env variables
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
JWT_SECRET = os.environ.get('JWT_SECRET')

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
    viral_score: int
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
    
    token = create_access_token(user.id, user.email)
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

# ============ FEATURE ROUTES ============

@api_router.post("/generate-ideas", response_model=GenerateIdeasResponse)
async def generate_ideas(request: GenerateIdeasRequest, current_user: dict = Depends(get_current_user)):
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
4. Viral score (1-10)
5. Best upload day
6. Best upload time

Format as JSON array with keys: title, hook, thumbnail_concept, viral_score, best_upload_day, best_upload_time"""
    
    message = UserMessage(text=prompt)
    response = await chat.send_message(message)
    
    import json
    try:
        response_text = response.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        ideas_data = json.loads(response_text)
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
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"analysis_{current_user['id']}_{datetime.now().timestamp()}",
        system_message="You are an expert YouTube algorithm analyst and content strategist."
    )
    chat.with_model("openai", "gpt-4o")
    
    prompt = f"""Analyze this YouTube video: {request.video_url}

Provide:
1. Overall performance score (0-100)
2. 3-5 specific reasons why it underperformed
3. For each reason, provide an actionable fix
4. Suggest an improved title
5. Suggest a better thumbnail concept

Format as JSON with keys: score, reasons (array of objects with 'reason' and 'fix'), improved_title, better_thumbnail"""
    
    message = UserMessage(text=prompt)
    response = await chat.send_message(message)
    
    import json
    try:
        response_text = response.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        analysis_data = json.loads(response_text)
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

# ============ ADMIN TESTING ============

class TestModeRequest(BaseModel):
    enabled: bool
    email: EmailStr

@api_router.post("/admin/test-mode")
async def toggle_test_mode(request: TestModeRequest):
    # Remove any existing test mode settings
    await db.test_mode.delete_many({})
    
    if request.enabled:
        # Enable test mode for specific email
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
