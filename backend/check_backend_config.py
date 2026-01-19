#!/usr/bin/env python3
"""Check backend configuration: DATABASE_URL and connection."""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load .env file (same way as backend does)
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=str(env_file.resolve()))
    print(f"✅ Loaded .env file from: {env_file}")
else:
    print(f"⚠️  .env file not found at: {env_file}")

# Check DATABASE_URL
database_url = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/disease_community"
)

print(f"📋 DATABASE_URL: {database_url}")
print()

# Try to connect and check users table
try:
    engine = create_engine(database_url)
    with engine.connect() as conn:
        # Check if users table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        """))
        users_exists = result.scalar()
        
        if users_exists:
            print("✅ 'users' table EXISTS in the database")
            
            # Count users
            result = conn.execute(text("SELECT COUNT(*) FROM users;"))
            count = result.scalar()
            print(f"   Total users: {count}")
        else:
            print("❌ 'users' table DOES NOT EXIST in the database")
        
        # Check database name
        result = conn.execute(text("SELECT current_database();"))
        db_name = result.scalar()
        print(f"📊 Connected to database: {db_name}")
        
        # Check host
        result = conn.execute(text("SELECT inet_server_addr(), inet_server_port();"))
        host_info = result.fetchone()
        if host_info[0]:
            print(f"📡 Database host: {host_info[0]}:{host_info[1]}")
        else:
            print(f"📡 Database host: localhost (local connection)")
        
except Exception as e:
    print(f"❌ Error connecting to database: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
