#main.py
from fastapi import FastAPI, HTTPException,Depends,APIRouter,Body,Request
from sqlalchemy.orm import Session
from . import models, database, security,crud
from pydantic import BaseModel
from .security import get_current_user
from .models import User
from fastapi.middleware.cors import CORSMiddleware
from .database import get_db,engine
from app import schemas
from app.llama_engine import llm_engine
from fastapi.responses import StreamingResponse
import io
import os
import requests
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs import Voice, VoiceSettings
import logging


from . import weather,news

from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Optional


load_dotenv()

app = FastAPI()
logger = logging.getLogger("uvicorn.error")
models.Base.metadata.create_all(bind=engine)
app.include_router(weather.router)
app.include_router(news.router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)

llm = None
client = ElevenLabs(api_key="sk_e6eb688be88f1399430f675260169c7184dadba119ccef70")  


#llama
@app.post("/chat/")
async def chat(prompt: str = Body(..., embed=True)):
    """Handle chat requests synchronously"""
    try:
        response = await llm_engine.generate_response(prompt)  # Sync call
        return {"response": response}
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}")
        return {"error": str(e)}
    

#elevenlabs
class TTSRequest(BaseModel):
    text: str
    voice_id: str = "EXAVITQu4vr4xnSDxMaL"  
    stability: float = 0.7
    similarity_boost: float = 0.7

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Endpoint for text-to-speech conversion"""
    try:
        audio_stream = client.generate(
            text=request.text,
            voice=Voice(
                voice_id=request.voice_id,
                settings=VoiceSettings(
                    stability=request.stability,
                    similarity_boost=request.similarity_boost
                )
            ),
            stream=True
        )
        
        audio_bytes = io.BytesIO()
        for chunk in audio_stream:
            if chunk:
                audio_bytes.write(chunk)
        audio_bytes.seek(0)
        
        return StreamingResponse(
            audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=tts_output.mp3"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

########################################################################
# Dependency to get DB session
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic model for user registration
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

@app.post("/register/")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # Hash the password before saving
    hashed_password = security.hash_password(user.password)

    # Create new user in the database
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"msg": "User registered successfully", "user_id": new_user.id}


class UserLogin(BaseModel):
    username: str
    password: str

@app.post("/login/")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid username or password")
    
    # Verify password
    if not security.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid username or password")
    
    # Create JWT token
    access_token = security.create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# Pydantic model for saving conversation history
class ConversationCreate(BaseModel):
    message: str
    response: str

@app.post("/save_conversation/") #saves conversations to the database
def save_conversation(conversation: ConversationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Create new conversation history entry
    db_conversation = models.ConversationHistory(user_id=current_user.id, message=conversation.message, response=conversation.response)
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return {"msg": "Conversation saved successfully"}

# Pydantic model for retrieving conversation history
class ConversationResponse(BaseModel):
    message: str
    response: str
    timestamp: str

@app.get("/get_conversations/") #retrieves a list of conversations for the current user
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Retrieve all conversations for the current user
    conversations = db.query(models.ConversationHistory).filter(models.ConversationHistory.user_id == current_user.id).all()
    return [ConversationResponse(message=conv.message, response=conv.response, timestamp=conv.timestamp.isoformat()) for conv in conversations]

# Pydantic model for adding tasks
class TaskCreate(BaseModel):
    task_name: str

@app.post("/add_task/")#adds new tasks to the users list 
def add_task(task: schemas.TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Create new task entry
    db_task = models.Task(user_id=current_user.id, task_name=task.task_name)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return {"msg": "Task added successfully"}

# Pydantic model for task status
class TaskResponse(BaseModel):
    task_name: str
    completed: bool
    timestamp: str

@app.get("/get_tasks/")#retrieves all tasks for the current user 
def get_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Retrieve all tasks for the current user
    tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    return [TaskResponse(task_name=task.task_name, completed=bool(task.completed), timestamp=task.timestamp.isoformat()) for task in tasks]

@app.post("/complete_task/{task_id}")#marks a specific tasks as completed
def complete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Mark the task as completed
    db_task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    db_task.completed = 1
    db.commit()
    db.refresh(db_task)
    return {"msg": "Task marked as completed"}


#route to handle task editing
@app.put("/edit_task/{task_id}")
def edit_task(
    task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    db_task = crud.get_task(db, task_id)
    if db_task and db_task.owner_id == current_user.id:
        return crud.update_task(db, task_id, task)
    else:
        raise HTTPException(status_code=404, detail="Task not found or not authorized")

# CRUD operations for task update
def update_task(db: Session, task_id: int, task: schemas.TaskUpdate):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    db_task.task_name = task.task_name
    db.commit()
    db.refresh(db_task)
    return db_task


@app.delete("/delete_task/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_task = crud.get_task(db, task_id)
    if db_task and db_task.owner_id == current_user.id:
        crud.delete_task(db, task_id)
        return {"msg": "Task deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Task not found or not authorized")

def delete_task(db: Session, task_id: int):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    db.delete(db_task)
    db.commit()