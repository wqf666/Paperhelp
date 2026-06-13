from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
import logging
import os

from app.config_desktop import get_user_data_dir, load_settings, save_settings, get_default_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


# ── Provider Presets ──────────────────────────────────────────────
# Each provider ships with its base_url and a list of popular models
# so the frontend can auto-fill everything the user needs.

PROVIDER_PRESETS = [
    {
        "id": "deepseek",
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-reasoner"],
        "key_placeholder": "sk-...",
        "note": "推荐国内用户使用，性价比高",
    },
    {
        "id": "openai",
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        "key_placeholder": "sk-...",
        "note": "需要海外网络环境",
    },
    {
        "id": "zhipu",
        "name": "智谱 AI (GLM)",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "models": ["glm-4-plus", "glm-4", "glm-4-flash", "glm-4-long"],
        "key_placeholder": "请输入智谱 API Key",
        "note": "国内可直接访问",
    },
    {
        "id": "qwen",
        "name": "通义千问 (DashScope)",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "models": ["qwen-plus", "qwen-max", "qwen-turbo", "qwen-long"],
        "key_placeholder": "sk-...",
        "note": "阿里云百炼平台，国内直连",
    },
    {
        "id": "moonshot",
        "name": "Moonshot (Kimi)",
        "base_url": "https://api.moonshot.cn/v1",
        "models": ["moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"],
        "key_placeholder": "sk-...",
        "note": "支持超长上下文",
    },
    {
        "id": "ollama",
        "name": "Ollama (本地)",
        "base_url": "http://localhost:11434/v1",
        "models": ["qwen2.5:7b", "llama3.1:8b", "deepseek-r1:7b"],
        "key_placeholder": "ollama",
        "note": "本地运行，无需联网，需先安装 Ollama",
    },
    {
        "id": "custom",
        "name": "自定义 (OpenAI 兼容)",
        "base_url": "",
        "models": [],
        "key_placeholder": "请输入 API Key",
        "note": "任何兼容 OpenAI 接口的服务",
    },
]


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
    storage_path: Optional[str] = None
    export_path: Optional[str] = None


def mask_api_key(key: str) -> str:
    if not key or len(key) < 8:
        return "***"
    return key[:4] + "*" * (len(key) - 8) + key[-4:]


@router.get("/providers")
def list_providers():
    """Return available LLM provider presets for the frontend."""
    return {"providers": PROVIDER_PRESETS}


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

    # ── Directory paths ──
    if update.storage_path is not None:
        new_path = update.storage_path.strip()
        if new_path:
            p = Path(new_path)
            try:
                p.mkdir(parents=True, exist_ok=True)
                config['STORAGE_PATH'] = str(p.resolve())
            except OSError as e:
                raise HTTPException(status_code=400, detail=f"无法创建存储目录: {e}")

    if update.export_path is not None:
        new_path = update.export_path.strip()
        if new_path:
            p = Path(new_path)
            try:
                p.mkdir(parents=True, exist_ok=True)
                config['EXPORT_PATH'] = str(p.resolve())
            except OSError as e:
                raise HTTPException(status_code=400, detail=f"无法创建导出目录: {e}")

    save_settings(data_dir, config)

    # Reload settings in the running app
    _reload_app_settings()

    return {"status": "ok", "message": "Settings saved"}


@router.post("/test-connection")
def test_connection():
    """Quickly verify the current LLM configuration works."""
    try:
        from app.config import settings as app_settings
        if app_settings.MOCK_LLM:
            return {"status": "ok", "message": "Mock 模式已启用，跳过连接测试"}

        from openai import OpenAI
        client = OpenAI(
            api_key=app_settings.LLM_API_KEY,
            base_url=app_settings.LLM_BASE_URL,
            timeout=10,
        )
        # Minimal call — just list models or send a tiny completion
        resp = client.chat.completions.create(
            model=app_settings.LLM_MODEL,
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5,
        )
        return {
            "status": "ok",
            "message": f"连接成功！模型 {app_settings.LLM_MODEL} 响应正常",
        }
    except Exception as e:
        return {"status": "error", "message": f"连接失败: {str(e)[:200]}"}


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
