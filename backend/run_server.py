"""
Entry point for the FastAPI sidecar server.
Used both in development (python run_server.py) and as PyInstaller bundle.
"""
import sys
import os
import signal
import logging
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("paperhelp.server")


def get_base_dir():
    """Get the base directory, handling PyInstaller bundling."""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def get_bundle_dir():
    """Get the directory where bundled data files (alembic/, templates/) live.

    In a PyInstaller --onefile bundle, data files are extracted to a temporary
    directory accessible via ``sys._MEIPASS``.  In development mode, data files
    are simply in the project directory (same as base_dir).
    """
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return get_base_dir()


def setup_desktop_env(base_dir: str):
    """Set up environment variables for desktop mode."""
    # Import desktop config
    sys.path.insert(0, base_dir)
    from app.config_desktop import get_desktop_config

    config = get_desktop_config()
    for key, value in config.items():
        if key not in os.environ:  # Don't override explicit env vars
            os.environ[key] = str(value)


def run_migrations(base_dir: str):
    """Run Alembic database migrations."""
    try:
        from alembic.config import Config as AlembicConfig
        from alembic import command

        alembic_ini = os.path.join(base_dir, 'alembic.ini')
        if not os.path.exists(alembic_ini):
            logger.warning(f"alembic.ini not found at {alembic_ini}, skipping migrations")
            return

        alembic_cfg = AlembicConfig(alembic_ini)
        script_location = os.path.join(base_dir, 'alembic')
        alembic_cfg.set_main_option('script_location', script_location)

        command.upgrade(alembic_cfg, 'head')
        logger.info("Database migrations completed successfully")
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise


def main():
    base_dir = get_base_dir()
    bundle_dir = get_bundle_dir()
    logger.info(f"Base directory: {base_dir}")
    logger.info(f"Bundle directory: {bundle_dir}")

    # Ensure the base dir is in sys.path so 'app' package can be found
    if base_dir not in sys.path:
        sys.path.insert(0, base_dir)

    # Setup desktop environment
    setup_desktop_env(base_dir)

    # Run migrations (alembic files live in the bundle dir)
    run_migrations(bundle_dir)

    # Get port
    port = int(os.environ.get('PORT', '18080'))

    logger.info(f"Starting FastAPI server on 127.0.0.1:{port}")

    # Import the app directly (not via string) so PyInstaller includes it
    from app.main import app as fastapi_app

    # Start uvicorn with the app object directly (avoids dynamic import issues)
    import uvicorn
    uvicorn.run(
        fastapi_app,
        host='127.0.0.1',
        port=port,
        log_level='info',
        access_log=True,
    )


if __name__ == '__main__':
    main()
