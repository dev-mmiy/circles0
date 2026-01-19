#!/usr/bin/env python3
"""Check database status: tables and alembic version."""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

# Load .env file
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=str(env_file.resolve()))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/disease_community"
)

print(f"Connecting to database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")
print("-" * 60)

try:
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    # Check if database is accessible
    with engine.connect() as conn:
        # Get all tables
        tables = inspector.get_table_names()
        print(f"✅ Total tables found: {len(tables)}")
        print()
        
        # Check for users table specifically
        if 'users' in tables:
            print("✅ 'users' table EXISTS")
        else:
            print("❌ 'users' table DOES NOT EXIST")
        
        print()
        print("All tables:")
        for table in sorted(tables):
            print(f"  - {table}")
        
        print()
        print("-" * 60)
        
        # Check alembic version
        try:
            result = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1;"))
            current_version = result.scalar()
            if current_version:
                print(f"✅ Current Alembic version: {current_version}")
            else:
                print("⚠️  Alembic version table exists but is empty")
        except Exception as e:
            print(f"❌ Could not read Alembic version: {e}")
            print("   This might mean migrations haven't been run yet.")
        
        print()
        print("-" * 60)
        
        # Check if alembic_version table exists
        if 'alembic_version' in tables:
            print("✅ 'alembic_version' table EXISTS")
        else:
            print("❌ 'alembic_version' table DOES NOT EXIST")
            print("   This means migrations have never been run.")
        
except Exception as e:
    print(f"❌ Error connecting to database: {e}")
    sys.exit(1)
