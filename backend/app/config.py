from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment / .env file."""

    groq_api_key: str = ""
    # gemma2-9b-it was decommissioned by Groq (Oct 2025); llama-3.1-8b-instant is the
    # official replacement with similar speed. llama-3.3-70b-versatile for richer reasoning.
    groq_model: str = "llama-3.1-8b-instant"
    groq_fallback_model: str = "llama-3.3-70b-versatile"

    database_url: str = "sqlite:///./hcp_crm.db"
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
