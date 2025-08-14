from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
from sqlalchemy import Text, Index
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)  # Added length constraint
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(128))
    conversations = relationship("ConversationHistory", back_populates="user")
    tasks = relationship("Task", back_populates="user")

class ConversationHistory(Base):
    __tablename__ = "conversation_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))  # Cascade delete
    message = Column(String(500), index=True)  # Added length
    response = Column(String(1000))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)  # Indexed for faster queries
    user = relationship("User", back_populates="conversations")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    task_name = Column(String(100), nullable=False)  # Required field
    completed = Column(Boolean, default=False)  # Changed to Boolean
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="tasks")