"""
Database integration tests for the Disease Community API
"""
import pytest
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


class TestDatabaseIntegration:
    """Integration tests for database connectivity"""
    
    def setup_method(self):
        """Set up database connection for each test"""
        # Get database URL from environment or use default
        database_url = os.getenv(
            "DATABASE_URL", 
            "postgresql://postgres:postgres@postgres:5432/test_db"
        )
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def test_database_connection(self):
        """Test basic database connectivity"""
        with self.engine.connect() as connection:
            result = connection.execute(text("SELECT 1 as test"))
            assert result.fetchone()[0] == 1
    
    def test_database_version(self):
        """Test PostgreSQL version information"""
        with self.engine.connect() as connection:
            result = connection.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            assert "PostgreSQL" in version
    
    def test_database_permissions(self):
        """Test database permissions and access"""
        with self.engine.connect() as connection:
            # Test if we can create a simple table
            connection.execute(text("""
                CREATE TEMPORARY TABLE test_table (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50)
                )
            """))
            
            # Test if we can insert data
            connection.execute(text("INSERT INTO test_table (name) VALUES ('test')"))
            
            # Test if we can query data
            result = connection.execute(text("SELECT * FROM test_table"))
            rows = result.fetchall()
            assert len(rows) == 1
            assert rows[0][1] == 'test'
    
    def test_database_health_check(self):
        """Test database health check functionality"""
        with self.engine.connect() as connection:
            # Test database is responsive
            result = connection.execute(text("SELECT pg_is_in_recovery()"))
            is_recovery = result.fetchone()[0]
            assert isinstance(is_recovery, bool)
    
    def teardown_method(self):
        """Clean up database connections"""
        if hasattr(self, 'engine'):
            self.engine.dispose()
