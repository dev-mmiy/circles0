#!/usr/bin/env python3
"""
Fix alembic version table to match current migration state.
"""
import os
import sys
from sqlalchemy import create_engine, text

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        # Check current alembic version
        print("\n=== Current Alembic Version ===")
        result = conn.execute(text("SELECT * FROM alembic_version"))
        rows = result.fetchall()
        if rows:
            for row in rows:
                print(f"Current version: {row[0]}")
        else:
            print("No version found in alembic_version table")
        
        # Check if users table has auth0_id column
        print("\n=== Checking users table structure ===")
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """))
        columns = result.fetchall()
        has_auth0_id = False
        print("Users table columns:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]} (nullable: {col[2]})")
            if col[0] == 'auth0_id':
                has_auth0_id = True
        
        # Determine correct version
        if has_auth0_id:
            print("\n✅ Users table already has auth0_id column")
            print("Setting alembic version to: 6b534d266a32 (latest)")
            target_version = '6b534d266a32'
        else:
            print("\n⚠️ Users table does NOT have auth0_id column")
            print("Setting alembic version to: 000000000000 (base)")
            target_version = '000000000000'
        
        # Update alembic version
        print(f"\n=== Updating alembic version to {target_version} ===")
        conn.execute(text("DELETE FROM alembic_version"))
        conn.execute(text(f"INSERT INTO alembic_version (version_num) VALUES ('{target_version}')"))
        conn.commit()
        
        # Verify update
        result = conn.execute(text("SELECT * FROM alembic_version"))
        new_version = result.fetchone()[0]
        print(f"✅ Updated alembic version to: {new_version}")
        
        if not has_auth0_id:
            print("\n⚠️ Note: You still need to run 'alembic upgrade head' to apply migrations")
        else:
            print("\n✅ Database is already up to date. No migrations needed.")

except Exception as e:
    print(f"❌ ERROR: {e}")
    sys.exit(1)

