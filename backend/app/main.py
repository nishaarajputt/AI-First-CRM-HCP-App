from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import chat, compliance, interactions

settings = get_settings()

app = FastAPI(
    title="AI-First CRM — HCP Log Interaction API",
    version="1.0.0",
    description=(
        "Backend for the AI-first CRM HCP module. Provides interaction CRUD and a "
        "LangGraph + Groq (llama-3.1-8b-instant) agent that logs interactions from natural "
        "language."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health", tags=["health"])
def health() -> dict:
    key = settings.groq_api_key.strip()
    groq_ready = bool(key) and key != "your_groq_api_key_here"
    return {
        "status": "ok",
        "model": settings.groq_model,
        "groq_configured": groq_ready,
    }


app.include_router(interactions.router)
app.include_router(chat.router)
app.include_router(compliance.router)
