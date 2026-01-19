#!/usr/bin/env python3
"""Check users in database."""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
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
    
    with engine.connect() as conn:
        # Check users table
        result = conn.execute(text("SELECT COUNT(*) FROM users;"))
        user_count = result.scalar()
        print(f"✅ Total users in database: {user_count}")
        print()
        
        if user_count > 0:
            # Get all users
            result = conn.execute(text("""
                SELECT id, auth0_id, email, nickname, created_at 
                FROM users 
                ORDER BY created_at DESC 
                LIMIT 10;
            """))
            users = result.fetchall()
            
            print("Users in database:")
            for user in users:
                print(f"  - ID: {user[0]}")
                print(f"    Auth0 ID: {user[1]}")
                print(f"    Email: {user[2]}")
                print(f"    Nickname: {user[3]}")
                print(f"    Created: {user[4]}")
                print()
        else:
            print("⚠️  No users found in database")
            print("   Users need to be created through the registration flow.")
        
        # Check Auth0 configuration
        print("-" * 60)
        auth0_domain = os.getenv("AUTH0_DOMAIN")
        auth0_audience = os.getenv("AUTH0_AUDIENCE")
        print(f"AUTH0_DOMAIN: {auth0_domain if auth0_domain else '❌ NOT SET'}")
        print(f"AUTH0_AUDIENCE: {auth0_audience if auth0_audience else '❌ NOT SET'}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
