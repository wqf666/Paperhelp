"""Alembic environment configuration for the Research Paper Writing Agent."""

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Ensure the project root (backend/) is importable so that ``app`` can be
# resolved as a package.
_backend_root = str(Path(__file__).resolve().parents[1])
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

from app.config import settings  # noqa: E402
from app.database import Base  # noqa: E402

# Import all models so that their tables are registered on Base.metadata
# before Alembic generates or applies migrations.
from app.models import (  # noqa: E402, F401
    ExperimentPlan,
    ManuscriptState,
    Paper,
    PaperCard,
    Project,
    ResearchIdea,
)

# Alembic Config object – provides access to alembic.ini values.
config = context.config

# Override the sqlalchemy.url with the runtime value from settings so that
# migrations always target the correct database even when alembic.ini still
# contains the placeholder.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Set up Python logging from the alembic.ini [loggers] section.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData object used for autogenerate support.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    In this mode Alembic generates SQL scripts without connecting to the
    database.  This is useful for reviewing migration DDL before applying it.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates a live database engine and executes migrations inside a
    transaction.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
