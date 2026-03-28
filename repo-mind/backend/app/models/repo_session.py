from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class RepoSession(Base):
    __tablename__ = "repo_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Repository Info
    repo_url = Column(String(500), nullable=False)
    repo_owner = Column(String(100), nullable=False)
    repo_name = Column(String(100), nullable=False)
    repo_description = Column(Text, nullable=True)
    
    # Analyzed Data (stored as JSON)
    repo_metadata = Column(JSON, nullable=True)  # stars, forks, watchers, etc.
    file_structure = Column(JSON, nullable=True)  # tree structure
    tech_stack = Column(JSON, nullable=True)  # detected languages, frameworks
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="repo_sessions")
    generated_contents = relationship("GeneratedContent", back_populates="repo_session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<RepoSession(id={self.id}, repo={self.repo_owner}/{self.repo_name})>"

