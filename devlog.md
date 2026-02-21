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

### Decision: Three Separate Claude API Calls

Three concerns, three calls, each independently tunable:

1. **Rules agent** (`services/rules_agent.py`) — parses uploaded file + computes full schedule for all invoices. System prompt instructs strict JSON output. Returns `{ rules, scheduled_actions }`.
2. **Intent classifier** (`services/classifier.py`) — classifies a customer email into one of 4 intents. System prompt: "Return ONLY valid JSON". Returns `{ intent, confidence, promised_date, summary }`.
3. **Draft reply generator** (`services/reply_generator.py`) — writes a professional reply based on intent + actions taken. System prompt: prose, professional tone. Returns plain text.

Keeping them separate means we can tune prompts, swap models, or add retries independently.

### Decision: IMAP Polling (not Gmail API / OAuth)

IMAP with an app password is far simpler to set up for a demo. No OAuth flow, no redirect URIs, no Google Cloud Console setup. The 10-second polling interval is fine — the demo is not a latency competition.

Threading: The poller runs as a Python `threading.Thread` started on FastAPI's `startup` event. It runs a simple `while True: poll(); sleep(10)` loop. Not production-safe but exactly right for a demo.

### Decision: Gmail is Bidirectional — IMAP Receive + SMTP Send

The demo's lightbulb moment is a full email loop: presenter sends email to demo address → AI classifies it → presenter hits Send in the UI → reply lands in the sender's real inbox.

- IMAP (`imaplib`, stdlib) for receiving — polls every 10s
- SMTP (`smtplib`, stdlib) for sending — `smtp.gmail.com:587`, STARTTLS
- Same `GMAIL_USER` + `GMAIL_APP_PASSWORD` credentials for both
- No extra dependencies — both use Python stdlib

### Decision: Frontend Polls Backend Every 10 Seconds

No WebSockets. No SSE. Simple `setInterval` fetch in the Inbox and Dashboard components. Matches the 10-second IMAP poll cycle. Total end-to-end latency for demo: ~15-20 seconds from send to visible. Acceptable.

### Decision: Intent Simulator as Backend Endpoint + UI Panel

`POST /inbox/simulate` runs the exact same pipeline as a real email. Presenter picks a customer, types a message, and triggers the full classify→adjust→draft flow without needing a live email. Built as a collapsible panel at the bottom of the inbox thread list.

This is the safety net for demos — the live Gmail path is the wow moment, the simulator is the backup.

### Decision: Thread Matching Strategy

Subject normalisation: strip `Re:`, `Fwd:`, `RE:`, `FWD:` prefixes recursively. Match on `(from_email, normalised_subject)`. If a match exists and the thread is not closed, append rather than create new.

Heuristic, not perfect — but works for the demo's controlled email set.

### Decision: Color Coding Owned by Backend

The backend returns a `color` field (`blue`, `red`, `grey`, `green`, `orange`) with each scheduled action. Frontend maps these to Tailwind classes. Business logic stays in one place.

- `blue` → pre-due-date reminders (day_offset < 0)
- `red` → post-due-date overdue notices (day_offset > 0, Customer audience)
- `grey` → internal escalations
- `green` → completed / resolved
- `orange` → paused / snoozed

### Decision: Settings Table for Agent State

A `settings` table stores key-value pairs at two scopes:
- `scope=global` — applies to all customers (contact_language, escalation_threshold_days, reply_sign_off, company_name, etc.)
- `scope=customer` — per-customer overrides the agent reads before acting and can write after acting (agent_notes, dispute_route, pause_automated_contact, preferred_contact_time, etc.)

The agent reads merged settings (customer overrides global) via `GET /customers/{id}/settings`. This gives the AI context like "key account, CC account manager on escalations" or "do not send automated reminders".

Seeded with global defaults + per-customer overrides for 4 of 5 customers to demonstrate the feature in the demo.

### Decision: API Client Centralized in `lib/api.ts`

All fetch calls go through a single typed client. Base URL set to `http://localhost:8000`. Easy to swap for a deployed backend without touching any component code.

---

## 2026-02-21 — Rules upload is AI-driven, not algorithmic

Original plan used pandas to parse CSV columns and deterministic code to compute `due_date + day_offset`. Replaced entirely with a Claude agent call.

**Why:** Better demo story ("drop any file format — the AI figures it out"), more robust to messy real-world rules docs, consistent with the product's AI-first positioning.

**Implementation:** `services/rules_agent.py` sends raw file text + all invoice due dates to Claude in one call. Claude returns structured JSON with both the parsed rules table and the complete scheduled actions for every invoice. Pandas is kept only to convert Excel binary to readable text before sending — not for any logic.

**Consequence:** `POST /rules/upload` and `POST /inbox/simulate` both require `ANTHROPIC_API_KEY`. The only endpoints that work without it are `/health`, `/customers`, and `/dashboard/summary`.

---

## 2026-02-21 — Model: claude-opus-4-6 across all AI calls

All three Claude API calls use `claude-opus-4-6` — the most capable model. Demo is low volume so cost is not a factor. Better reasoning = more accurate intent classification, better-quality draft replies, more robust rules parsing from arbitrary file formats.

---

## 2026-02-21 — Package management: uv + pyproject.toml

Using `uv` for the backend. `pyproject.toml` added alongside `requirements.txt`. `start.sh` uses `uv sync` (creates venv + installs deps in one step) and `uv run uvicorn ...` (no manual venv activation needed).

---

## Stack Summary

| Layer | Tech | Version | Notes |
|---|---|---|---|
| Frontend | Next.js | 16.1.6 | v0-generated, kept as-is |
| Styling | Tailwind CSS v4 | 4.2.0 | Pre-installed with v0 |
| Components | shadcn/ui + Radix | — | Pre-installed, all primitives available |
| Backend | FastAPI + Uvicorn | 0.115.6 / 0.32.1 | |
| ORM | SQLAlchemy | 2.0.36 | |
| Database | SQLite | — | File: `backend/flora.db` |
| File handling | pandas | 2.2.3 | Excel→text only, no logic |
| AI | Anthropic SDK | 0.40.0 | claude-opus-4-6 for all calls |
| Email receive | imaplib (stdlib) | — | IMAP, polls every 10s |
| Email send | smtplib (stdlib) | — | SMTP, port 587, STARTTLS |
| Package manager (FE) | pnpm | — | pnpm-lock.yaml in repo |
| Package manager (BE) | uv | — | pyproject.toml + uv sync |

---

## File Structure (current)

```
flora/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, lifespan startup
│   ├── database.py              # SQLAlchemy engine, session, Base
│   ├── models.py                # 7 ORM models
│   ├── schemas.py               # All Pydantic response types
│   ├── seed.py                  # 5 customers + settings on first run
│   ├── pyproject.toml           # uv-managed dependencies
│   ├── requirements.txt         # kept for reference
│   ├── .env.example             # ANTHROPIC_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD
│   ├── flora.db                 # SQLite database (gitignored)
│   ├── routes/
│   │   ├── customers.py         # GET /customers, GET /customers/{id}, GET /customers/{id}/settings
│   │   ├── invoices.py          # GET /invoices, GET /invoices/{id}/schedule
│   │   ├── rules.py             # GET /rules, POST /rules/upload
│   │   ├── inbox.py             # GET /inbox, GET /inbox/{id}, POST /inbox/simulate, POST /inbox/{id}/send-reply
│   │   ├── dashboard.py         # GET /dashboard/summary, GET /dashboard/action-log
│   │   └── admin.py             # POST /admin/reset
│   └── services/
│       ├── rules_agent.py       # Claude: parse rules file + compute full schedule
│       ├── classifier.py        # Claude: classify email intent → structured JSON
│       ├── reply_generator.py   # Claude: generate draft reply
│       ├── pipeline.py          # Full email processing pipeline (thread match → classify → adjust → draft)
│       ├── scheduler.py         # 4 schedule adjustment functions (no generation)
│       ├── gmail_poller.py      # IMAP background thread, polls every 10s
│       └── gmail_sender.py      # SMTP send, same credentials as poller
├── frontend/
│   └── v0/
│       ├── app/
│       │   ├── page.tsx                  # → DashboardPage
│       │   ├── inbox/page.tsx            # → InboxPage
│       │   ├── timeline/page.tsx         # → TimelinePage
│       │   ├── automations/page.tsx      # → AutomationsPage
│       │   └── settings/page.tsx         # → SettingsPage (new)
│       ├── components/
│       │   ├── app-shell.tsx             # unchanged
│       │   ├── app-sidebar.tsx           # Settings link fixed to /settings
│       │   ├── dashboard-page.tsx        # wired to API, 10s polling
│       │   ├── timeline-page.tsx         # wired to API, empty state, drag-drop upload
│       │   ├── inbox-page.tsx            # wired to API, 10s polling, send reply, simulator
│       │   ├── automations-page.tsx      # wired to API, upload UI
│       │   └── settings-page.tsx         # new — reset button with confirmation
│       └── lib/
│           ├── api.ts                    # new — typed fetch client
│           └── data.ts                   # kept — reference types only
├── designs/                     # Reference screenshots (untouched)
├── sample_rules.csv             # 12 rules for demo upload
├── implementation_plan.md
├── devlog.md
├── scope.md
└── start.sh                     # uv sync + uv run + pnpm dev

```

---

## Known Risks

1. **Claude API latency on rules upload**: Opus processing a rules file + computing 60 scheduled actions (5 customers × 12 rules) could take 5-15 seconds. The upload spinner covers this. May want to show a more detailed "AI is computing…" state.
2. **Claude API latency on email classification**: Two consecutive Opus calls (classify + draft) = 5-15 seconds. The inbox polls every 10s so the result appears on the next tick after classification completes.
3. **Gmail IMAP disconnects**: Poller auto-reconnects on `IMAP4.abort`. Errors logged, app continues.
4. **CORS**: Configured for `localhost:3000` only. For any other frontend port, update `main.py`.
5. **SQLite concurrent writes**: Not an issue for demo — single user, low volume. Would need Postgres for production.
6. **Next.js workspace root warning**: Build warns about multiple lockfiles. Cosmetic only — build succeeds cleanly.
