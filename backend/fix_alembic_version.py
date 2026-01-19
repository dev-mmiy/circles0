#!/usr/bin/env python3
"""Fix alembic_version table to support longer revision IDs."""

import os
import sys
from sqlalchemy import create_engine, text

# Set DATABASE_URL
database_url = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/disease_community"
)

def fix_alembic_version():
    """Fix alembic_version table column size."""
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        # Check if alembic_version table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'alembic_version'
            );
        """))
        table_exists = result.scalar()
        
        if not table_exists:
            print("✅ alembic_version table does not exist yet. It will be created by Alembic.")
            return
        
        # Check current column size
        result = conn.execute(text("""
            SELECT character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'alembic_version' 
            AND column_name = 'version_num';
        """))
        current_size = result.scalar()
        
        print(f"Current version_num column size: {current_size}")
        
        if current_size and current_size < 50:
            print(f"⚠️ Column size is too small ({current_size}). Expanding to 50 characters...")
            conn.execute(text("""
                ALTER TABLE alembic_version 
                ALTER COLUMN version_num TYPE VARCHAR(50);
            """))
            conn.commit()
            print("✅ Column size expanded successfully")
        else:
            print(f"✅ Column size is already sufficient ({current_size})")
        
        # Check current version
        result = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1;"))
        current_version = result.scalar()
        if current_version:
            print(f"Current migration version: {current_version}")
        else:
            print("No migration version recorded yet")

if __name__ == "__main__":
    try:
        fix_alembic_version()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
