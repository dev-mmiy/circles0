"""
Configuration settings for different environments.
"""

import os


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
            return (
                "postgresql://postgres:postgres@postgres:5432/disease_community"
            )
        elif self.environment == "production":
            # Cloud Run production database
            return (
                "postgresql://postgres:postgres@postgres:5432/disease_community"
            )
        elif self.environment == "test":
            return (
                "postgresql://postgres:postgres@postgres:5432/disease_community"
            )
        else:
            # Default to development
            return "postgresql://postgres:postgres@postgres:5432/disease_community"


# Global settings instance
settings = Settings()
