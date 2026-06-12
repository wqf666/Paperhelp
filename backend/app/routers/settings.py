from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from app.config_desktop import get_user_data_dir, load_settings, save_settings, get_default_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    mock_llm: bool
    llm_provider: str
    llm_api_key_masked: str
    llm_base_url: str
    llm_model: str
    storage_path: str
    export_path: str
    data_dir: str
    port: int


class SettingsUpdate(BaseModel):
    mock_llm: Optional[bool] = None
    llm_provider: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_base_url: Optional[str] = None
    llm_model: Optional[str] = None


def mask_api_key(key: str) -> str:
    if not key or len(key) < 8:
        return "***"
    return key[:4] + "*" * (len(key) - 8) + key[-4:]


@router.get("", response_model=SettingsResponse)
def get_settings():
    data_dir = get_user_data_dir()
    defaults = get_default_config(data_dir)
    user = load_settings(data_dir)
    config = {**defaults, **user}

    api_key = config.get('LLM_API_KEY', '')

    return SettingsResponse(
        mock_llm=config.get('MOCK_LLM', True),
        llm_provider=config.get('LLM_PROVIDER', 'deepseek'),
        llm_api_key_masked=mask_api_key(api_key),
        llm_base_url=config.get('LLM_BASE_URL', 'https://api.deepseek.com/v1'),
        llm_model=config.get('LLM_MODEL', 'deepseek-chat'),
        storage_path=config.get('STORAGE_PATH', ''),
        export_path=config.get('EXPORT_PATH', ''),
        data_dir=str(data_dir),
        port=config.get('PORT', 18080),
    )


@router.put("")
def update_settings(update: SettingsUpdate):
    data_dir = get_user_data_dir()
    current = load_settings(data_dir)
    defaults = get_default_config(data_dir)
    config = {**defaults, **current}

    if update.mock_llm is not None:
        config['MOCK_LLM'] = update.mock_llm
    if update.llm_provider is not None:
        config['LLM_PROVIDER'] = update.llm_provider
    if update.llm_api_key is not None and update.llm_api_key != "***":
        config['LLM_API_KEY'] = update.llm_api_key
    if update.llm_base_url is not None:
        config['LLM_BASE_URL'] = update.llm_base_url
    if update.llm_model is not None:
        config['LLM_MODEL'] = update.llm_model

    save_settings(data_dir, config)

    # Reload settings in the running app
    _reload_app_settings()

    return {"status": "ok", "message": "Settings saved"}


@router.post("/reload")
def reload_settings():
    _reload_app_settings()
    return {"status": "ok", "message": "Settings reloaded"}


def _reload_app_settings():
    """Reload settings into the running FastAPI app."""
    try:
        from app.config import settings
        from app.config_desktop import get_desktop_config

        config = get_desktop_config()

        # Update the settings singleton
        for key, value in config.items():
            if hasattr(settings, key):
                object.__setattr__(settings, key, value)

        # Reinitialize LLM service (it reads from settings)
        logger.info("Settings reloaded successfully")
    except Exception as e:
        logger.error(f"Failed to reload settings: {e}")
