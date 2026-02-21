# AR Prototype — Dev Log

_Technical choices and architecture decisions_

---

## 2026-02-21 — Initial Architecture

### Decision: Keep Next.js (don't switch to Vite)

The scope.md specifies React + Vite, but the v0-generated frontend is a fully built Next.js 16 app. Switching to Vite would mean rebuilding all four pages from scratch and losing the already-polished UI. The cost of that switch (2-4 hours minimum) is not justified.

Next.js gives us routing for free (app router, /inbox, /timeline, /automations), server components where we want them, and all the Radix/shadcn components are already installed. We are keeping it.

The backend is still FastAPI — the frontend calls it via REST. Next.js is just the UI layer.

### Decision: SQLAlchemy + SQLite (not raw sqlite3)

SQLAlchemy gives us clean model definitions, easy migrations if needed, and the ORM makes the relationship between tables explicit. SQLite is zero-config and the demo never has concurrent write pressure.

We do NOT use Alembic for migrations. This is a demo. On startup, `Base.metadata.create_all()` creates all tables if they don't exist. Reset wipes and re-seeds.

### Decision: Two Separate Claude API Calls (Classification + Draft Reply)

The scope doc specifies this and it's the right call. Mixing classification and reply generation into one prompt would make each individually worse and harder to tune. Classification needs a tight JSON output spec. Reply generation needs creative prose. Separate calls, separate prompts.

Prompt strategy for classification:
- System: "You are an accounts receivable classification agent. Return ONLY valid JSON."
- User: email body + customer name + invoice details
- Expected output: `{ intent, confidence, promised_date, summary }`
- Model: claude-sonnet-4-6 (as specified in scope)

Prompt strategy for draft reply:
- System: "You are a professional AR collections agent writing on behalf of the company."
- User: intent classification result + customer context + action taken
- Expected output: plain text email body

### Decision: IMAP Polling (not Gmail API / OAuth)

IMAP with an app password is far simpler to set up for a demo. No OAuth flow, no redirect URIs, no Google Cloud Console setup. The 10-second polling interval is fine — the demo is not a latency competition.

Threading: The poller runs as a Python `threading.Thread` started on FastAPI's `startup` event. It runs a simple `while True: poll(); sleep(10)` loop. This is not production-safe (no graceful shutdown, no error recovery beyond logging) but it's exactly right for a demo.

### Decision: Frontend Polls Backend Every 10 Seconds

No WebSockets. No SSE. Simple `setInterval` fetch in the Inbox and Timeline components. This matches the 10-second IMAP poll cycle — by the time Gmail delivers the email, the poller picks it up, classifies it, and the frontend's next poll will catch it. Total latency: 10-20 seconds. Acceptable for demo.

### Decision: Intent Simulator as a Backend Endpoint

`POST /simulate-message` takes `{ customer_id, body }` and runs the exact same pipeline as a real incoming email. This is critical for the demo — the presenter cannot rely on live Gmail working under pressure. The simulator gives full control over timing and message content.

The simulator endpoint is NOT behind any auth. This is a demo.

### Decision: Thread Matching Strategy

Subject normalization: strip `Re: `, `Fwd: `, `RE: `, `FWD: ` prefixes recursively. Then match on `(from_email, normalized_subject)`. If a match exists and the thread is not closed, append to existing thread.

This is a heuristic, not a perfect threading algorithm. It will work for the demo's controlled email set.

### Decision: Color Coding Lives in the Backend Response

The backend returns a `color_class` field with each scheduled action (`blue`, `red`, `grey`, `green`, `orange`). The frontend maps these to Tailwind classes. This keeps the business logic (what counts as overdue vs. reminder) in one place.

Mapping:
- `blue` → `bg-chart-1/10 text-chart-1` — pre-due-date reminders (day_offset < 0)
- `red` → `bg-destructive/10 text-destructive` — post-due-date overdue notices (day_offset > 0)
- `grey` → `bg-chart-5/10 text-chart-5` — internal escalations
- `green` → `bg-success/10 text-success` — completed / resolved
- `orange` → `bg-amber-500/10 text-amber-600` — paused / snoozed

### Decision: API Client Centralized in `lib/api.ts`

All fetch calls go through a single API client with the base URL set to `http://localhost:8000`. This makes it trivial to swap the base URL for a deployed backend without touching any component code.

The client will be typed — each endpoint has a corresponding TypeScript type that mirrors the Pydantic response model from the backend.

---

## 2026-02-21 — Model: claude-opus-4-6 across all AI calls

All three Claude API calls (rules agent, intent classifier, draft reply generator) use `claude-opus-4-6` — the most capable model. Demo is low volume so cost is not a factor. Better reasoning = more accurate intent classification, better-quality draft replies, and more robust rules parsing from arbitrary file formats.

---

## 2026-02-21 — Gmail is bidirectional: IMAP receive + SMTP send

The demo loop is: send real email → appears classified in app → hit Send → reply lands in sender's real inbox. This is the lightbulb moment for the audience.

- IMAP poller (`services/gmail_poller.py`): already built — polls every 10s
- SMTP sender (`services/gmail_sender.py`): same credentials, `smtp.gmail.com:587`, TLS
- `POST /inbox/{ticket_id}/send-reply`: sends draft reply (or custom body) to original sender, marks thread closed, logs action
- Both use `GMAIL_USER` + `GMAIL_APP_PASSWORD` from `.env`
- `/inbox/simulate` remains as backup — identical pipeline output, no real email needed

---

## 2026-02-21 — Rules upload is AI-driven, not algorithmic

Original plan used pandas to parse columns and deterministic code to compute `due_date + day_offset`. Replaced entirely with a Claude agent call.

**Why:** Better demo story ("drop any file format"), more robust to messy real-world rules docs, and consistent with the product's AI-first positioning. The schedule is generated by Claude understanding the rules in context — not by column mapping code.

**Implementation:** `services/rules_agent.py` sends the raw file text + all invoice due dates to Claude in one call. Claude returns structured JSON with both the parsed rules table and the complete scheduled actions for every invoice. Pandas is kept only to convert Excel binary to readable text before sending to Claude — not for any logic.

**Consequence:** `POST /rules/upload` and `POST /inbox/simulate` both require `ANTHROPIC_API_KEY`. Nothing in the app works without it except `/health` and `/customers`.

---

## 2026-02-21 — Package management: uv

Using `uv` instead of pip/venv for the backend. `uv venv` + `uv pip install` — same requirements.txt format, significantly faster installs, no other changes needed. start.sh updated accordingly.

---

## Stack Summary

| Layer | Tech | Version | Why |
|---|---|---|---|
| Frontend | Next.js | 16.1.6 | Pre-built v0 UI, routing included |
| Styling | Tailwind CSS v4 | 4.2.0 | Pre-installed with v0, all components use it |
| Component library | shadcn/ui + Radix | — | Pre-installed, all primitives available |
| Backend | FastAPI + Uvicorn | latest | Lightweight, async, file upload built-in |
| ORM | SQLAlchemy | latest | Clean models, easy querying |
| Database | SQLite | — | Zero config, file-based |
| File parsing | pandas | latest | Handles CSV + Excel in 3 lines |
| AI | Anthropic SDK | latest | claude-sonnet-4-6 as specified |
| Email | imaplib (stdlib) | — | No extra dependency, IMAP sufficient |
| Package manager (FE) | pnpm | — | Already in use (pnpm-lock.yaml exists) |
| Package manager (BE) | pip + requirements.txt | — | Simple, no poetry complexity needed |

---

## File Structure

```
flora/
├── backend/
│   ├── main.py              # FastAPI app, startup events, CORS
│   ├── database.py          # SQLAlchemy engine, session, Base
│   ├── models.py            # ORM models (Customer, Invoice, Rule, etc.)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── routes/
│   │   ├── customers.py     # GET /customers
│   │   ├── invoices.py      # GET /invoices, GET /invoices/{id}/schedule
│   │   ├── rules.py         # GET /rules, POST /upload-rules
│   │   ├── inbox.py         # GET /inbox, GET /inbox/{id}, POST /simulate-message
│   │   ├── dashboard.py     # GET /dashboard/summary, GET /action-log
│   │   └── admin.py         # POST /reset
│   ├── services/
│   │   ├── scheduler.py     # compute_schedule(), apply_schedule_adjustment()
│   │   ├── classifier.py    # Claude classification call
│   │   ├── reply_generator.py # Claude draft reply call
│   │   └── gmail_poller.py  # IMAP background thread
│   ├── seed.py              # Dummy data creation
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── v0/                  # Existing Next.js app (mostly untouched structure)
│       ├── lib/
│       │   ├── api.ts       # NEW: typed API client
│       │   └── data.ts      # KEEP: used as fallback / reference
│       └── components/
│           ├── dashboard-page.tsx    # MODIFY: wire to API
│           ├── timeline-page.tsx     # MODIFY: wire to API + empty state
│           ├── inbox-page.tsx        # MODIFY: wire to API + polling
│           ├── automations-page.tsx  # MODIFY: wire to API + upload
│           └── settings-page.tsx     # NEW: reset button
├── designs/                 # Reference screenshots (do not modify)
├── sample_rules.csv         # NEW: demo CSV for upload
├── implementation_plan.md
├── devlog.md
├── scope.md
└── start.sh                 # NEW: starts both processes
```

---

## Known Risks

1. **Gmail IMAP rate limits**: Should be fine for demo, but we add error logging so failures are visible.
2. **Claude API latency**: Classification + reply generation = 2 API calls. Could be 3-8 seconds. The inbox polls every 10 seconds so the demo flow still looks instant (email arrives → next poll tick shows classified result).
3. **CORS**: FastAPI configured with `allow_origins=["http://localhost:3000"]`. Next.js dev server is on 3000.
4. **Next.js 16 + React 19**: Cutting edge. Should work fine since the v0 app already runs on it.
5. **pnpm-lock.yaml exists**: Must use pnpm, not npm or yarn, for the frontend.
