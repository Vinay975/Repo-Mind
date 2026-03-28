from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class GeneratedContent(Base):
    __tablename__ = "generated_contents"
    
    id = Column(Integer, primary_key=True, index=True)
    repo_session_id = Column(Integer, ForeignKey("repo_sessions.id"), nullable=False)
    
    # Content Type: 'readme', 'documentation', 'report'
    content_type = Column(String(50), nullable=False)
    
    # Version tracking
    version = Column(Integer, default=1)
    
    # Content
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)  # Markdown content
    
    # AI Generation metadata
    generation_params = Column(JSON, nullable=True)  # model used, prompts, etc.
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    repo_session = relationship("RepoSession", back_populates="generated_contents")
    
    def __repr__(self):
        return f"<GeneratedContent(id={self.id}, type={self.content_type}, version={self.version})>"


