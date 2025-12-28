import os

# Load environment variables from .env file (ignore if file doesn't exist)
import warnings
from logging.config import fileConfig
from pathlib import Path

# Import dotenv but don't call load_dotenv automatically
# We'll handle .env loading manually to prevent error messages
try:
    from dotenv import load_dotenv
except ImportError:
    # dotenv not available, define a dummy function
    def load_dotenv(*args, **kwargs):
        pass
from sqlalchemy import engine_from_config, pool

from alembic import context

# Load .env file only if it exists and is not empty
# Skip loading in CI/CD environments where .env file is not needed
# Disable python-dotenv's automatic .env file discovery to prevent error messages
os.environ.setdefault("DOTENV_SILENT", "1")
env_file = Path(__file__).parent.parent / ".env"
# Use absolute path to avoid path resolution issues
try:
    env_file_abs = env_file.resolve()
except (FileNotFoundError, OSError, RuntimeError):
    # Path resolution failed, skip .env loading
    env_file_abs = None

if env_file_abs:
    try:
        # Check if file exists and has content before attempting to load
        # Use try-except around exists() and stat() to prevent any error messages
        file_exists = False
        file_size = 0
        try:
            if env_file_abs.exists() and env_file_abs.is_file():
                file_exists = True
                file_size = env_file_abs.stat().st_size
        except (FileNotFoundError, OSError, PermissionError):
            # File doesn't exist or cannot be accessed - this is normal in CI/CD environments
            file_exists = False
            file_size = 0
        
        if file_exists and file_size > 0:
            # File exists and has content, load it with all output suppressed
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                try:
                    import contextlib
                    import logging
                    import sys

                    # Suppress dotenv logger completely
                    logging.getLogger("dotenv").setLevel(logging.CRITICAL)
                    # Redirect both stderr and stdout to /dev/null to suppress all messages
                    with open(os.devnull, 'w') as devnull:
                        with contextlib.redirect_stderr(devnull), contextlib.redirect_stdout(devnull):
                            load_dotenv(dotenv_path=str(env_file_abs), override=False, verbose=False)
                except (FileNotFoundError, OSError, PermissionError, Exception):
                    # Silently ignore errors if .env file cannot be loaded
                    pass
    except Exception:
        # Silently ignore any other errors
        pass

# add your model's MetaData object here
# for 'autogenerate' support
from app.models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set database URL from environment variable
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)
else:
    raise ValueError("DATABASE_URL environment variable is not set")

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Get database URL from config
    database_url = config.get_main_option("sqlalchemy.url")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    # Create engine configuration
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = database_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
