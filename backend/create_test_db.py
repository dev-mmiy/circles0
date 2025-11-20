import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

try:
    # Connect to default 'postgres' database
    con = psycopg2.connect(
        dbname='postgres', 
        user='postgres', 
        host='localhost', 
        password='postgres'
    )
    con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = con.cursor()
    
    # Check if database exists
    cur.execute("SELECT 1 FROM pg_database WHERE datname = 'disease_community_test'")
    exists = cur.fetchone()
    
    if not exists:
        print("Creating database disease_community_test...")
        cur.execute('CREATE DATABASE disease_community_test')
        print("Database created successfully.")
    else:
        print("Database disease_community_test already exists.")
        
    cur.close()
    con.close()
except Exception as e:
    print(f"Error creating database: {e}")
    sys.exit(1)
