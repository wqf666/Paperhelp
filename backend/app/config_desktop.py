"""
Desktop-specific configuration management.
Reads settings from a local JSON file in the user's data directory.
"""
import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger(__name__)

APP_NAME = "Paperhelp"


def get_user_data_dir() -> Path:
    """Get the cross-platform user data directory."""
    if sys.platform == 'win32':
        base = Path(os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming'))
    elif sys.platform == 'darwin':
        base = Path.home() / 'Library' / 'Application Support'
    else:
        base = Path(os.environ.get('XDG_DATA_HOME', Path.home() / '.local' / 'share'))

    data_dir = base / APP_NAME
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_default_config(data_dir: Path) -> Dict[str, Any]:
    """Get default configuration values."""
    return {
        'DATABASE_URL': f'sqlite:///{data_dir / "paperhelp.db"}',
        'STORAGE_PATH': str(data_dir / 'uploads'),
        'EXPORT_PATH': str(data_dir / 'exports'),
        'MOCK_LLM': True,
        'LLM_PROVIDER': 'deepseek',
        'LLM_API_KEY': '',
        'LLM_BASE_URL': 'https://api.deepseek.com/v1',
        'LLM_MODEL': 'deepseek-chat',
        'PDF_PARSE_BACKEND': 'pymupdf',
        'MAX_UPLOAD_SIZE_MB': 50,
        'LATEX_COMPILER': 'pdflatex',
        'PORT': 18080,
    }


def load_settings(data_dir: Path) -> Dict[str, Any]:
    """Load user settings from JSON file."""
    config_file = data_dir / 'settings.json'
    if config_file.exists():
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Failed to load settings: {e}")
    return {}


def save_settings(data_dir: Path, settings: Dict[str, Any]) -> None:
    """Save user settings to JSON file."""
    config_file = data_dir / 'settings.json'
    # Don't save internal keys
    saveable = {k: v for k, v in settings.items() if not k.startswith('_')}
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(saveable, f, indent=2, ensure_ascii=False)


def get_desktop_config() -> Dict[str, Any]:
    """
    Get the full desktop configuration.
    Merges defaults with user settings from settings.json.
    """
    data_dir = get_user_data_dir()
    defaults = get_default_config(data_dir)
    user_settings = load_settings(data_dir)

    # Merge: user settings override defaults
    config = {**defaults, **user_settings}

    # Ensure required directories exist
    for dir_key in ('STORAGE_PATH', 'EXPORT_PATH'):
        dir_path = Path(config[dir_key])
        dir_path.mkdir(parents=True, exist_ok=True)

    # Ensure log directory exists
    log_dir = data_dir / 'logs'
    log_dir.mkdir(parents=True, exist_ok=True)

    return config
