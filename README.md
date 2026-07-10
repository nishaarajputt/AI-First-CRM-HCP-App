*Author: Nisha Rajput*
# AI-First CRM — HCP "Log Interaction" Module

An AI-first Customer Relationship Management (CRM) module for pharmaceutical /
life-science **field representatives**. It implements the **Log Interaction Screen** where
a rep can record an interaction with a **Healthcare Professional (HCP)** in two
interchangeable ways:

- **Left panel — Structured form:** HCP name, interaction type, date/time, attendees,
  topics, materials, samples, sentiment, outcomes, and follow-up actions.
- **Right panel — Conversational AI Assistant:** the rep describes what happened in
  plain English (or by voice). A **LangGraph** agent backed by a **Groq LLM** extracts
  structured fields and **auto-fills the form on the left in real time.**

Both panels stay in sync through **Redux Toolkit**, so the rep can start in chat and
finish in the form, or vice-versa.

> **Mandatory stack (task requirement):** **LangGraph** + **Groq LLM** + **FastAPI** (Python)
> + **React** + **Redux** + **Google Inter** font + **MySQL/PostgreSQL** support.

---

## Features

| Feature | Description |
|---------|-------------|
| **Chat auto-fill** | Type or speak an interaction summary → LangGraph extracts fields → form updates with blue highlight |
| **Multi-turn refine** | Edit via chat after logging: *"change sentiment to neutral"*, *"add Dr. Patel as attendee"* |
| **Compliance Coach** | Weighted completeness score (%), field checklist, rule-based warnings, optional LLM coaching tip |
| **Smart Follow-up Planner** | LangGraph suggests 2–3 follow-up actions; **Accept** fills Follow-up Actions and rescoring compliance |
| **Voice input** | Microphone in chat + voice note on Topics field (Web Speech API → text only to backend) |
| **Manual override** | Hand-edited form values are preserved when the AI merges new data |
| **Save to database** | **Log Interaction** persists via FastAPI → SQLAlchemy (SQLite default, Postgres/MySQL supported) |

---

## Architecture

```
┌──────────────────────────────┐        ┌────────────────────────────────────────────┐
│  React + Redux Toolkit (Vite) │  HTTP  │  FastAPI (Python)                           │
│                               │ ─────► │                                             │
│  ┌───────────┐ ┌────────────┐ │  /api  │  /api/interactions   (CRUD → DB)           │
│  │ Log form  │ │ AI chat    │ │        │  /api/chat           (→ LangGraph)           │
│  │ (left)    │ │ (right)    │ │        │  /api/compliance/score (re-score form)       │
│  └─────┬─────┘ └──────┬─────┘ │        │                                             │
│        │  Redux store  │      │        │  ┌─────────────────────────────────────┐   │
└────────┴───────────────┴──────┘        │  │  LangGraph StateGraph               │   │
                                         │  │  router → extract / refine          │   │
                                         │  │         → compliance → followup   │   │
                                         │  │         → confirm                 │   │
                                         │  │         └→ chat                   │   │
                                         │  │  Groq LLM (langchain-groq)        │   │
                                         │  └─────────────────────────────────────┘   │
                                         │  SQLAlchemy → SQLite / PostgreSQL / MySQL    │
                                         └────────────────────────────────────────────┘
```

### LangGraph agent (`backend/app/agent/`)

| Node | Type | Role |
|------|------|------|
| `router` | LLM | Classifies intent: `log_interaction`, `refine_interaction`, or `chat` |
| `extract` | LLM | Extracts structured fields from a new interaction note; merges with `current_form` |
| `refine` | LLM | Applies edit commands to existing form fields (multi-turn) |
| `compliance` | Python + LLM | Rule-based completeness score; LLM coaching tip if score &lt; 80% |
| `followup` | LLM | Suggests 2–3 actionable follow-ups with due days and reasons |
| `confirm` | LLM | Natural-language confirmation summarizing capture + compliance + follow-ups |
| `chat` | LLM | General help and CRM best-practice guidance |

```
START → router ─┬─(log_interaction)    → extract ─┐
                ├─(refine_interaction) → refine  ─┤→ compliance → followup → confirm → END
                └─(chat)                          → chat ─────────────────────────────→ END
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Redux Toolkit, Vite |
| Font | Google **Inter** (`frontend/index.html`) |
| Backend | Python 3.10+, **FastAPI**, SQLAlchemy 2, Pydantic |
| AI agent | **LangGraph** (`langgraph` + `langchain-core`) |
| LLM | **Groq** via `langchain-groq` |
| Database | SQLite (default) · PostgreSQL · MySQL |

### LLM models (Groq)

| Setting | Model | Notes |
|---------|-------|-------|
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Primary model (fast; Groq's replacement for decommissioned `gemma2-9b-it`) |
| `GROQ_FALLBACK_MODEL` | `llama-3.3-70b-versatile` | Optional heavier model for richer reasoning |

The original task specified **`gemma2-9b-it`**, but Groq decommissioned it (Oct 2025).
This project uses Groq's documented replacement while keeping **`llama-3.3-70b-versatile`**
as a configured fallback.

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Groq API key** (free tier) → https://console.groq.com/keys
- **Chrome or Edge** (recommended for voice input)

---

## Setup & Run

### 1. Clone / open project

```bash
cd Langgraph_work
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
```

Edit `backend/.env` and set your Groq key:

```env
GROQ_API_KEY=gsk_your_key_here
```

> **Important:** Put secrets in `backend/.env`, **not** in `.env.example`.

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Verify:

- Health: http://127.0.0.1:8000/api/health
- Swagger docs: http://127.0.0.1:8000/docs

### 3. Frontend

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

The Vite dev server proxies `/api` → `http://127.0.0.1:8000` (uses `127.0.0.1` to avoid
IPv6 localhost issues on macOS).

---

## Database options

Tables are created automatically on backend startup.

### SQLite (default — zero setup)

```env
DATABASE_URL=sqlite:///./hcp_crm.db
```

### PostgreSQL

```bash
docker compose up -d
```

Then in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://crm_user:crm_pass@localhost:5432/hcp_crm
```

Restart the backend after changing `DATABASE_URL`.

### MySQL

```bash
pip install pymysql
```

```env
DATABASE_URL=mysql+pymysql://crm_user:crm_pass@localhost:3306/hcp_crm
```

---

## Try it (quick walkthrough)

### 1. Log an interaction via chat

In the **AI Assistant** (right), type and click **Log**:

> *Today I met with Dr. Anita Rao on a virtual call about Prodo-X efficacy. Positive
> sentiment. Shared the clinical brochure and left 5 sample packs.*

Watch the **left form auto-fill** and fields briefly highlight.

### 2. Compliance Coach

Below the form header, see the **Compliance Coach** panel: completeness %, checklist,
and any warnings (e.g. missing follow-up when materials were shared).

### 3. Accept a follow-up suggestion

In the chat panel, **Suggested Follow-ups** appear. Click **Accept** — the Follow-up
Actions field fills and the compliance score recalculates.

### 4. Refine via chat

```
Change sentiment to neutral
Add Dr. Patel as attendee
```

The form updates incrementally; a yellow refine bubble shows which fields changed.

### 5. Voice input

Click **🎙️** in the chat bar (allow microphone), speak your interaction, stop, then **Log**.

### 6. Save to database

Click **Log Interaction** at the bottom of the form.

Verify saved records:

```bash
curl -s http://127.0.0.1:8000/api/interactions | python3 -m json.tool
```

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API status + configured Groq model |
| POST | `/api/chat` | Send message to LangGraph agent |
| POST | `/api/compliance/score` | Re-score current form (e.g. after accepting follow-up) |
| GET | `/api/interactions` | List logged interactions |
| POST | `/api/interactions` | Create interaction |
| GET | `/api/interactions/{id}` | Get one |
| PUT | `/api/interactions/{id}` | Update one |
| DELETE | `/api/interactions/{id}` | Delete one |

### `POST /api/chat`

**Request:**

```json
{
  "message": "Met Dr. Smith, discussed Prodo-X, shared brochure",
  "history": [{ "role": "user", "content": "..." }],
  "current_form": {
    "hcp_name": "",
    "interaction_type": "Meeting",
    "topics_discussed": null
  }
}
```

**Response:**

```json
{
  "reply": "Got it — I captured a meeting with Dr. Smith...",
  "intent": "log_interaction",
  "extracted": { "hcp_name": "Dr. Smith", "topics_discussed": "Prodo-X", "...": "..." },
  "ready_to_save": true,
  "updated_fields": ["hcp_name", "topics_discussed"],
  "completeness_score": 85,
  "missing_fields": [],
  "compliance_warnings": ["Materials were shared — consider documenting a follow-up action."],
  "checklist": [{ "field": "hcp_name", "label": "HCP Name", "complete": true, "required": true }],
  "followup_suggestions": [
    { "action": "Confirm sample receipt", "due_in_days": 3, "reason": "Compliance best practice" }
  ]
}
```

---

## Project structure

```
Langgraph_work/
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py                 # FastAPI app, CORS, DB init
│       ├── config.py               # env settings (Groq, DB)
│       ├── database.py               # SQLAlchemy engine/session
│       ├── models.py               # Interaction ORM model
│       ├── schemas.py              # Pydantic request/response models
│       ├── crud.py                 # DB CRUD
│       ├── routers/
│       │   ├── chat.py             # POST /api/chat → LangGraph
│       │   ├── compliance.py       # POST /api/compliance/score
│       │   └── interactions.py     # Interaction CRUD
│       └── agent/
│           ├── graph.py            # LangGraph StateGraph
│           ├── compliance.py       # Rule-based scoring
│           ├── llm.py              # Groq client (langchain-groq)
│           ├── prompts.py          # System prompts per node
│           └── state.py            # AgentState TypedDict
├── frontend/
│   ├── package.json
│   ├── vite.config.js              # dev proxy → 127.0.0.1:8000
│   ├── index.html                  # Google Inter font
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── api/client.js
│       ├── hooks/useSpeechRecognition.js
│       ├── store/
│       │   ├── interactionSlice.js # form, compliance, follow-ups
│       │   └── chatSlice.js        # messages, send to API
│       └── components/
│           ├── LogInteractionForm.jsx
│           ├── AIChatPanel.jsx
│           ├── ComplianceCoach.jsx
│           ├── FollowupSuggestions.jsx
│           ├── VoiceNoteButton.jsx
│           └── ListAddField.jsx
├── docker-compose.yml              # optional PostgreSQL
├── TEST_FLOW.md                    # step-by-step test checklist
└── README.md
```

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | Groq API token (required for AI features) |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Primary LLM |
| `GROQ_FALLBACK_MODEL` | `llama-3.3-70b-versatile` | Fallback LLM |
| `DATABASE_URL` | `sqlite:///./hcp_crm.db` | SQLAlchemy connection string |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allowed origin |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `API offline` / proxy errors | Start backend: `uvicorn app.main:app --reload --port 8000` |
| `ECONNREFUSED ::1:8000` | Vite proxy uses `127.0.0.1` — restart frontend after config change |
| Groq `model_decommissioned` | Use `llama-3.1-8b-instant` in `.env` (not `gemma2-9b-it`) |
| `Invalid API Key` | Set `GROQ_API_KEY` in `backend/.env` (not `.env.example`) |
| Voice not working | Use Chrome/Edge; allow microphone permission |
| Compliance score not updating after Accept | Restart backend (needs `/api/compliance/score` endpoint) |

---

## Additional docs

- **[TEST_FLOW.md](./TEST_FLOW.md)** — full QA checklist for every feature

---

## Notes

- LangGraph and Groq LLM are **mandatory** and central to every AI feature.
- Extraction is **conservative**: only stated data is filled; existing form values are
  merged, not overwritten with blanks.
- Relative dates (*"today"*, *"yesterday"*) are resolved server-side.
- SQLite is the default for frictionless evaluation; use Postgres/MySQL in production
  by changing `DATABASE_URL`.
