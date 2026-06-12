from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    DATABASE_URL: str = Field(
        default="mysql+pymysql://root:password@localhost:3306/research_agent"
    )
    LLM_PROVIDER: str = Field(default="deepseek")
    LLM_API_KEY: str = Field(default="")
    LLM_BASE_URL: str = Field(default="https://api.deepseek.com/v1")
    LLM_MODEL: str = Field(default="deepseek-chat")
    STORAGE_PATH: str = Field(default="./uploads")
    MOCK_LLM: bool = Field(default=True)
    PDF_PARSE_BACKEND: str = "pymupdf"
    MAX_UPLOAD_SIZE_MB: int = 50
    EXPORT_PATH: str = "./exports"
    LATEX_COMPILER: str = "pdflatex"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
