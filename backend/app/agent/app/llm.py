from functools import lru_cache

from langchain_groq import ChatGroq

from app.config import get_settings


@lru_cache
def get_llm(temperature: float = 0.1, use_fallback: bool = False) -> ChatGroq:
    """Return a cached ChatGroq client.

    Primary: llama-3.1-8b-instant (Groq's replacement for decommissioned gemma2-9b-it).
    Fallback: llama-3.3-70b-versatile for richer reasoning.
    """
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Create a token at "
            "https://console.groq.com/keys and add it to backend/.env"
        )
    model = settings.groq_fallback_model if use_fallback else settings.groq_model
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=model,
        temperature=temperature,
        max_retries=2,
    )
