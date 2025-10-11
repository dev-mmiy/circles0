"""
Member ID generation utilities.
"""
import random
import string
from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User


def generate_member_id(length: int = 12) -> str:
    """
    Generate a unique 12-digit member ID.
    
    Args:
        length: Length of the member ID (default: 12)
    
    Returns:
        A unique member ID string
    """
    # Use alphanumeric characters (excluding confusing ones)
    characters = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    
    while True:
        # Generate random member ID
        member_id = "".join(random.choices(characters, k=length))
        
        # Check if it's unique (this will be checked in the database)
        return member_id


def generate_unique_member_id(db: Session, length: int = 12) -> str:
    """
    Generate a unique member ID that doesn't exist in the database.
    
    Args:
        db: Database session
        length: Length of the member ID (default: 12)
    
    Returns:
        A unique member ID string
    """
    max_attempts = 1000  # Prevent infinite loop
    
    for _ in range(max_attempts):
        member_id = generate_member_id(length)
        
        # Check if member ID already exists
        existing_user = db.query(User).filter(User.member_id == member_id).first()
        if not existing_user:
            return member_id
    
    # If we can't generate a unique ID after max_attempts, raise an error
    raise RuntimeError(f"Could not generate unique member ID after {max_attempts} attempts")


def format_member_id(member_id: str) -> str:
    """
    Format member ID for display (e.g., add dashes).
    
    Args:
        member_id: Raw member ID string
    
    Returns:
        Formatted member ID string
    """
    if len(member_id) == 12:
        # Format as XXX-XXX-XXX-XXX
        return f"{member_id[:3]}-{member_id[3:6]}-{member_id[6:9]}-{member_id[9:12]}"
    return member_id


def validate_member_id(member_id: str) -> bool:
    """
    Validate member ID format.
    
    Args:
        member_id: Member ID string to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not member_id:
        return False
    
    # Remove any formatting characters
    clean_id = member_id.replace("-", "").replace(" ", "")
    
    # Check length
    if len(clean_id) != 12:
        return False
    
    # Check if all characters are valid
    valid_chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    return all(char in valid_chars for char in clean_id.upper())


def clean_member_id(member_id: str) -> str:
    """
    Clean member ID by removing formatting characters.
    
    Args:
        member_id: Member ID string to clean
    
    Returns:
        Clean member ID string
    """
    return member_id.replace("-", "").replace(" ", "").upper()
