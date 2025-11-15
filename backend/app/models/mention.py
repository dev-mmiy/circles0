"""
Mention models for user mentions in posts and comments.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship

from app.database import Base


class PostMention(Base):
    """
    Post mention model.

    Tracks which users are mentioned in which posts.
    """

    __tablename__ = "post_mentions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mentioned_user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="mentions")
    mentioned_user = relationship("User", foreign_keys=[mentioned_user_id])

    def __repr__(self):
        return f"<PostMention post_id={self.post_id} mentioned_user_id={self.mentioned_user_id}>"


class CommentMention(Base):
    """
    Comment mention model.

    Tracks which users are mentioned in which comments.
    """

    __tablename__ = "comment_mentions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    comment_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("post_comments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mentioned_user_id = Column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    comment = relationship("PostComment")
    mentioned_user = relationship("User", foreign_keys=[mentioned_user_id])

    def __repr__(self):
        return f"<CommentMention comment_id={self.comment_id} mentioned_user_id={self.mentioned_user_id}>"
