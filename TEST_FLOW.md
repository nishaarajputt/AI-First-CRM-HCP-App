# HCP CRM — End-to-End Test Flow

Use this checklist to verify every feature: chat auto-fill, voice input, multi-turn refine, compliance coach, follow-up planner, and form save.

---

## Prerequisites

| Step | Action | Expected |
|------|--------|----------|
| 0.1 | Backend running: `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000` | `http://127.0.0.1:8000/api/health` returns `{"status":"ok",...}` |
| 0.2 | Frontend running: `cd frontend && npm run dev` | App opens at `http://localhost:5173` |
| 0.3 | `GROQ_API_KEY` set in `backend/.env` | Health shows `groq_configured: true` |
| 0.4 | Use **Chrome or Edge** (for voice tests) | Mic permission available |

**Quick API smoke test (optional):**

```bash
curl -s http://127.0.0.1:8000/api/health | python3 -m json.tool
```

---

## Test 1 — Chat auto-fill (LangGraph `log_interaction`)

**Goal:** Natural language in chat populates the left form.

| # | Step | Expected result |
|---|------|-----------------|
| 1.1 | Open app, confirm left = form, right = AI Assistant | Two-panel layout loads |
| 1.2 | In chat, type and click **Log**: | |
| | `Today I met with Dr. Anita Rao on a virtual call about Prodo-X efficacy and dosing. Positive sentiment. Shared the clinical brochure and left 5 sample packs.` | |
| 1.3 | Wait for AI reply (green success bubble) | Assistant responds within a few seconds |
| 1.4 | Check **left form** fields | |
| | **HCP Name** | `Dr. Anita Rao` (or similar) |
| | **Interaction Type** | `Virtual` or `Meeting` |
| | **Date** | Today's date (`YYYY-MM-DD`) |
| | **Topics Discussed** | Mentions Prodo-X |
| | **Materials Shared** | `clinical brochure` or similar |
| | **Samples Distributed** | Sample entry with quantity |
| | **Sentiment** | Positive selected |
| | **Outcomes** | Populated (not empty) |
| 1.5 | Updated fields briefly **highlight** in blue | Flash animation on changed fields |

**Pass criteria:** At least HCP name, date, topics, and sentiment are auto-filled.

---

## Test 2 — Compliance Coach (completeness scoring)

**Goal:** After logging via chat, compliance panel shows score + checklist.

| # | Step | Expected result |
|---|------|-----------------|
| 2.1 | Complete Test 1 first | Form has data |
| 2.2 | Look below form header on the **left panel** | **Compliance Coach** panel visible |
| 2.3 | Check **completeness %** | Score shown (e.g. 70–90%) with colored bar |
| 2.4 | Check **checklist** | Items like HCP Name ✓, Date ✓, Topics ✓ |
| 2.5 | Check chat bubble tags | `completeness XX%` tag under assistant message |
| 2.6 | If score &lt; 80% | Amber/red bar; optional compliance warning text |

**Pass criteria:** Compliance panel appears with score ≥ 1 and checklist items reflect form state.

---

## Test 3 — Smart Follow-up Planner

**Goal:** AI suggests follow-ups; Accept fills the form.

| # | Step | Expected result |
|---|------|-----------------|
| 3.1 | After Test 1, look at **bottom of chat panel** (above input) | **📋 Suggested Follow-ups** panel |
| 3.2 | Verify 1–3 suggestion cards | Each has action, reason, optional "Due in X days" |
| 3.3 | Click **Accept** on first suggestion | Card disappears or is dismissed |
| 3.4 | Check **Follow-up Actions** field on left form | Accepted text appended |
| 3.5 | Click **Dismiss** on another suggestion | Card removed, form unchanged |

**Pass criteria:** Follow-up suggestions appear after log; Accept updates Follow-up Actions.

---

## Test 4 — Multi-turn Refine Interaction

**Goal:** Edit already-filled form via chat without losing other fields.

| # | Step | Expected result |
|---|------|-----------------|
| 4.1 | With form filled from Test 1, send in chat: | |
| | `Change sentiment to neutral` | |
| 4.2 | Check assistant reply | **Yellow refine bubble** (not green success) |
| 4.3 | Check refine tag | Shows `updated: sentiment` |
| 4.4 | Check **Sentiment** on form | **Neutral** selected; other fields unchanged |
| 4.5 | Send: `Add Dr. Patel as attendee` | |
| 4.6 | Check **Attendees** | Includes Dr. Patel |
| 4.7 | Send: `Update follow-up to send safety data next week` | |
| 4.8 | Check **Follow-up Actions** | Updated with safety data mention |

**Pass criteria:** Each refine command updates only targeted fields; `refine_interaction` intent in chat UI.

---

## Test 5 — Voice input in chat

**Goal:** Microphone transcribes speech into chat input, then logs like typed text.

| # | Step | Expected result |
|---|------|-----------------|
| 5.1 | Click **🎙️** mic button in chat input bar | Consent prompt (first time only) |
| 5.2 | Click **Allow microphone** | Browser asks for mic permission — allow it |
| 5.3 | Speak clearly: | |
| | `"Met Dr. Smith today, discussed product X efficiency, positive sentiment, shared brochures"` | |
| 5.4 | Watch input field | Text appears as you speak |
| 5.5 | Click **🎙️** again to stop | "Listening…" indicator disappears |
| 5.6 | Click **Log** | Same auto-fill behavior as typed message |
| 5.7 | Form updates | Dr. Smith, today's date, topics, sentiment filled |

**Pass criteria:** Voice → text → chat → form fill works end-to-end.

**Skip if:** Firefox or mic unavailable — note as N/A.

---

## Test 6 — Voice note on form (Topics field)

**Goal:** Form-level voice dictation into Topics Discussed.

| # | Step | Expected result |
|---|------|-----------------|
| 6.1 | Clear form (optional) or scroll to **Topics Discussed** | |
| 6.2 | Click **🎙️ Summarize from Voice Note (Requires Consent)** | Mic starts (after consent) |
| 6.3 | Speak: `"Discussed efficacy data and patient adherence"` | |
| 6.4 | Stop voice note | |
| 6.5 | **Topics Discussed** textarea | Contains spoken text |

**Pass criteria:** Topics field populated from voice.

---

## Test 7 — Manual form edit + merge

**Goal:** Hand-edits persist; next chat message merges (doesn't wipe).

| # | Step | Expected result |
|---|------|-----------------|
| 7.1 | Manually change **HCP Name** to `Dr. Test User` on form | Field updates |
| 7.2 | In chat send: `Add outcome: HCP agreed to review materials` | |
| 7.3 | Check **HCP Name** | Still `Dr. Test User` (not overwritten) |
| 7.4 | Check **Outcomes** | Contains review materials text |

**Pass criteria:** Manual edits preserved; new chat data merges in.

---

## Test 8 — Save interaction to database

**Goal:** Persist logged interaction via API + DB.

| # | Step | Expected result |
|---|------|-----------------|
| 8.1 | Ensure **HCP Name** is filled | Log Interaction button enabled |
| 8.2 | Click **Log Interaction** (bottom of left form) | Button shows "Saving..." |
| 8.3 | Success banner | `Interaction saved successfully (ID #N)` |
| 8.4 | Verify via API: | |
| | `curl -s http://127.0.0.1:8000/api/interactions \| python3 -m json.tool` | Latest entry matches form data |

**Pass criteria:** Record saved with correct HCP name, date, sentiment, source `chat` or `form`.

---

## Test 9 — General chat (help mode)

**Goal:** Non-logging questions route to `chat` intent (no form overwrite).

| # | Step | Expected result |
|---|------|-----------------|
| 9.1 | Click **Clear** in chat (if available) or refresh page | Fresh state |
| 9.2 | Send: `What fields are required for a compliant HCP log?` | |
| 9.3 | Assistant reply | Helpful text about required fields |
| 9.4 | Form | No unexpected auto-fill / no green success bubble |
| 9.5 | Compliance panel | Hidden or score 0 (no checklist) |

**Pass criteria:** Help question answered; form not polluted.

---

## Test 10 — API / LangGraph direct test (developer)

**Goal:** Verify backend graph nodes without UI.

```bash
cd backend && source .venv/bin/activate

python3 << 'PY'
from app.agent.graph import run_agent
import json

# Log
r1 = run_agent(
    "Today I met Dr. Smith, discussed Prodo-X, positive, shared brochure",
    [], {}
)
print("=== LOG ===")
print("intent:", r1["intent"])
print("score:", r1["completeness_score"])
print("followups:", len(r1["followup_suggestions"]))
print("date:", r1["extracted"]["interaction_date"])

# Refine
r2 = run_agent("change sentiment to neutral", [], r1["extracted"])
print("\n=== REFINE ===")
print("intent:", r2["intent"])
print("updated:", r2["updated_fields"])
print("sentiment:", r2["extracted"]["sentiment"])
PY
```

**Expected output:**
- LOG: `intent: log_interaction`, score &gt; 0, followups 1–3, date = today
- REFINE: `intent: refine_interaction`, `updated: ['sentiment']`, sentiment = Neutral

---

## Regression checklist (quick 5-min smoke)

- [ ] Backend health OK
- [ ] Chat log → form fills
- [ ] Date = today when "today" is said
- [ ] Compliance score visible
- [ ] Follow-up suggestions + Accept works
- [ ] Refine: "change sentiment to neutral" works
- [ ] Voice mic fills input (Chrome/Edge)
- [ ] Log Interaction saves to DB

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `API offline` / Internal Server Error | Start backend; ensure Vite proxy uses `127.0.0.1:8000` |
| Groq model error | Check `GROQ_API_KEY` in `backend/.env` (not `.env.example`) |
| No follow-up suggestions | Ensure message includes HCP name + topics |
| Refine not working | Form must have data first; use explicit commands like "change sentiment to..." |
| Voice not working | Use Chrome/Edge; allow microphone permission |
| Outcomes empty | Mention result explicitly, or rely on auto-summary from sentiment + topics |

---

## Sample test script (copy-paste chat messages)

Run these **in order** for a full demo:

```
1. Today I met with Dr. Anita Rao on a virtual call about Prodo-X efficacy. Positive sentiment. Shared brochure and left 5 samples.

2. Change sentiment to neutral

3. Add Dr. Patel as attendee

4. Set follow-up to send safety data in 7 days

5. What should I document when distributing samples?
```

After message 1: form filled + compliance + follow-ups.  
After 2–4: refine updates only targeted fields.  
After 5: help reply, no form changes.
