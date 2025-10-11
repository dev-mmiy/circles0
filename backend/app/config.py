"""
Configuration settings for different environments.
"""
import os
from typing import Optional


class Settings:
    """Application settings."""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.database_url = self._get_database_url()
        self.debug = os.getenv("DEBUG", "false").lower() == "true"
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
    
    def _get_database_url(self) -> str:
        """Get database URL based on environment."""
        # If DATABASE_URL is explicitly set, use it
        if os.getenv("DATABASE_URL"):
            return os.getenv("DATABASE_URL")
        
        # Environment-specific database URLs
        if self.environment == "development":
            return "postgresql://circles_dev:circles_dev_password@localhost:5432/circles_db_dev"
        elif self.environment == "production":
            return "postgresql://circles_prod:circles_prod_password@localhost:5432/circles_db_prod"
        elif self.environment == "test":
            return "postgresql://circles_test:circles_test_password@localhost:5432/circles_db_test"
        else:
            # Default to development
            return "postgresql://postgres:postgres@localhost:5432/test_db"


# Global settings instance
settings = Settings()


