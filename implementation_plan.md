# AR Prototype — Implementation Plan

_Last updated: 2026-02-23_

---

## Current Project State

**Frontend**: Next.js 16 app in `frontend/v0/`. All pages fully wired to the real backend. Static data removed. Live polling on inbox and dashboard (10s interval).

**Backend**: FastAPI app in `backend/`. Running on `localhost:8000`. SQLite database seeded. All routes live. Gmail poller running as background thread. Full AI pipeline built.

**AI**: All three Claude calls use `claude-opus-4-6`. Rules agent (parse + schedule), intent classifier, draft reply generator.

**Email**: Bidirectional. IMAP polling receives emails every 10s. SMTP sends real replies. Same Gmail credentials for both.

**Package management**: `uv` for backend (`uv sync`, `uv run`). `pnpm` for frontend.

---

## The Two Demo Moments

### Demo Moment 1 — Rules Upload → Timelines Populate ✓ BUILT
App opens showing all customer cards, no timelines. Presenter drags any rules file onto the upload zone. Claude reads it, computes the full schedule for all invoices, timelines populate instantly colour-coded.

### Demo Moment 2 — Email Arrives → Inbox Updates + Reply Sent ✓ BUILT
Send a real email to the demo Gmail address. Within ~15 seconds: ticket appears in inbox, intent badge shows classification, timeline for that customer updates, draft reply is ready. Presenter edits if needed and hits Send — reply goes to the sender's real inbox.

---

## Phase 1 — Backend Foundation
**Status: COMPLETE ✓**

### 1.1 — FastAPI App Scaffold ✓
- [x] `backend/main.py` — FastAPI app, CORS for localhost:3000, lifespan startup
- [x] `backend/database.py` — SQLAlchemy engine, session factory, Base
- [x] `backend/models.py` — 7 ORM models: Customer, Invoice, Rule, ScheduledAction, InboxMessage, ActionLog, Setting
- [x] `backend/schemas.py` — All Pydantic request/response types
- [x] `backend/pyproject.toml` — uv-managed dependencies
- [x] `backend/requirements.txt` — kept for reference
- [x] `backend/.env.example` — ANTHROPIC_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD
- [x] `GET /health` → `{"status": "ok", "db_seeded": bool, "customer_count": int}`

**Schema (7 tables):**
```
customers(id, name, email, initials, color, created_at)
invoices(id, customer_id, invoice_number, amount, due_date, status, created_at)
rules(id, name, day_offset, audience, type, frequency, status, created_at)
scheduled_actions(id, invoice_id, rule_id, action_name, scheduled_date, audience, day_offset, status, color, ai_generated, note, created_at)
inbox(id, ticket_id, customer_id, invoice_id, from_email, subject, body, thread_key, thread_count, received_at, intent, confidence, promised_date, intent_summary, draft_reply, action_summary, status)
action_log(id, invoice_id, inbox_id, action_type, description, created_at)
settings(id, scope, customer_id, key, value, updated_at)
```

**Settings table:**
- `scope = "global"` — applies to all customers
- `scope = "customer"` — per-customer override, customer_id set
- Agent reads customer-specific first, falls back to global
- Agent can write new settings after taking actions
- Seeded with 6 global defaults + customer-specific overrides for all 9 customers

### 1.2 — Seed Dummy Data ✓
- [x] `backend/seed.py` — runs on startup if DB is empty
- [x] 9 customers (5 dummy + 4 live demo) with invoices, due dates relative to today
- [x] Global settings seeded (contact_language, escalation_threshold_days, reply_sign_off, etc.)
- [x] Per-customer settings seeded (agent_notes, dispute_route, pause_automated_contact, preferred_contact_time)

**9 customers (5 dummy + 4 live demo):**
| Name | Email | Invoice | Amount | Status |
|---|---|---|---|---|
| NovaTech Corp | billing@novatech-demo.com | IN-1023 | $34,200 | current (+7d) |
| Pinnacle Corp | finance@pinnacle-demo.com | IN-1035 | $23,400 | overdue (-12d) |
| Meridian LLC | ar@meridian-demo.com | IN-1040 | $18,900 | overdue (-16d) |
| Acme Inc | billing@acme-demo.com | IN-1045 | $12,500 | current (+14d) |
| GlobalTech Solutions | ap@globaltech-demo.com | IN-1030 | $8,750 | current (+3d) |
| Rajaraman and Daughter Finance | rr@chargebee.com | IN-1050 | $45,000 | overdue (-5d) |
| Saravana Technology Services | kps@chargebee.com | IN-1055 | $28,500 | current (+10d) |
| Ankhmorprok Antiquities | rohit.p@chargebee.com | IN-1060 | $15,750 | overdue (-20d) |
| Mahesh Pav Bhaji Company | maheshwar.v@chargebee.com | IN-1065 | $9,200 | current (+5d) |

**Verified working:**
```bash
curl localhost:8000/health          # {"status":"ok","db_seeded":true,"customer_count":9}
curl localhost:8000/customers       # 9 customers with invoices and settings
curl localhost:8000/customers/1/settings  # merged global + customer settings
```

---

## Phase 2 — Rules Agent (AI-powered)
**Status: COMPLETE ✓**

### 2.1 — Rules Agent Service ✓
- [x] `backend/services/rules_agent.py` — Claude call with `claude-opus-4-6`
- [x] Sends raw PDF bytes as a native Claude document block (base64-encoded) — no text extraction
- [x] Invoice context passed as plain text alongside the document
- [x] Claude returns `{ rules: [...], scheduled_actions: [...] }` as structured JSON
- [x] No column matching, no arithmetic — Claude reads the document natively and computes all dates
- [x] Strips markdown fences from response defensively
- [x] `max_tokens=8192` (raised from 4096 — rules docs with email templates are verbose)

### 2.2 — `POST /rules/upload` ✓
- [x] `backend/routes/rules.py` — accepts PDF files
- [x] Raw bytes passed directly to agent — no format conversion layer
- [x] Calls `rules_agent.parse_and_schedule()`
- [x] Wipes old rules + scheduled_actions before persisting new ones
- [x] Returns `{ rules_count, invoices_scheduled, message }`

### 2.3 — Schedule adjustment functions ✓
- [x] `backend/services/scheduler.py` — 4 pure adjustment functions (no schedule generation)
- [x] `apply_will_pay_later()` — pauses pending actions, creates AI follow-up node
- [x] `apply_already_paid()` — cancels all pending, marks invoice resolved
- [x] `apply_disputed()` — pauses pending, triggers immediate internal escalation, marks disputed
- [x] `apply_unclear()` — logs message, flags for human review, no schedule changes

### 2.4 — Read endpoints ✓
- [x] `GET /rules` → all loaded rules
- [x] `GET /invoices` → all invoices with status
- [x] `GET /invoices/{id}/schedule` → full scheduled actions for one invoice
- [x] `GET /invoices/{id}/timeline` → alias for `/schedule`

### 2.5 — Write endpoints ✓
- [x] `POST /rules/{id}/pause` → toggle rule between active/paused

### 2.6 — Sample rules file ✓
- [x] `ArDocument.pdf` — real Chargebee AR process document (gitignored), 14 rules (I–XIV)

---

## Phase 3 — Frontend Integration
**Status: COMPLETE ✓**

### 3.1 — API Client ✓
- [x] `frontend/v0/lib/api.ts` — typed fetch wrapper, base URL `http://localhost:8000`
- [x] All endpoints covered with TypeScript types mirroring Pydantic schemas
- [x] `get()`, `post()`, `postForm()` helpers — base URL swappable in one place

### 3.2 — Timeline / Invoices Page ✓
- [x] Fetches rules on load — shows drag-and-drop empty state if none loaded
- [x] Empty state: centred drop zone, "Claude will read it and build the schedule"
- [x] On drop: `POST /rules/upload`, refetches rules and schedule
- [x] Customer selector populated from `GET /customers`
- [x] Timeline from `GET /invoices/{id}/schedule`
- [x] Colour coding from backend `color` field → Tailwind class map
- [x] AI-modified banner shown when any action has `ai_generated=true`

### 3.3 — Inbox Page ✓
- [x] Polls `GET /inbox` every 10 seconds
- [x] Thread list with status tabs (all / open / classified / needs_review / closed)
- [x] Intent badges with colour per intent type
- [x] Thread count badge when multiple messages
- [x] Email detail view with AI actions taken panel
- [x] Editable draft reply textarea
- [x] **Send Reply** button → `POST /inbox/{ticket_id}/send-reply` → real SMTP email
- [x] Simulator panel (collapsible) at bottom of thread list — backup demo tool

### 3.4 — Dashboard Page ✓
- [x] KPIs from `GET /dashboard/summary` — 6 cards (total, current, 1-30d, 30+d, P2P, disputes)
- [x] Top customers from `GET /customers`
- [x] Recent AI Activity from `GET /dashboard/action-log`
- [x] Polls both every 10 seconds
- [x] Empty state for activity feed when no actions yet

### 3.5 — Automations Page ✓
- [x] Rules from `GET /rules`
- [x] Upload button + file input → `POST /rules/upload`
- [x] Shows "AI is reading…" during upload
- [x] Rule count, created date, customer/internal breakdown in summary bar

### 3.6 — Settings / Reset Page ✓
- [x] `frontend/v0/components/settings-page.tsx` — new file
- [x] `frontend/v0/app/settings/page.tsx` — new route
- [x] Single "Reset Demo" button with confirmation step
- [x] `POST /admin/reset` → clears all transient state, restores invoice statuses
- [x] Redirects to home after reset
- [x] Sidebar Settings link fixed from `#` to `/settings`

---

## Phase 4 — Gmail + AI Pipeline
**Status: COMPLETE ✓**

### 4.1 — Gmail IMAP Poller ✓
- [x] `backend/services/gmail_poller.py` — daemon thread started on FastAPI startup
- [x] Polls every 10 seconds, fetches UNSEEN emails
- [x] Marks emails as read after processing
- [x] Extracts from_email (regex from headers), subject, plain text body
- [x] Falls back to HTML→stripped text if no plain text part
- [x] Gracefully no-ops if GMAIL_USER/GMAIL_APP_PASSWORD not set
- [x] Auto-reconnects on IMAP connection drop

### 4.2 — Email Processing Pipeline ✓
- [x] `backend/services/pipeline.py` — single entry point for both real and simulated emails
- [x] Thread matching: normalise subject (strip Re:/Fwd:), match on `(from_email, normalised_subject)`
- [x] Appends to existing open thread or creates new ticket (TKT-NNNN)
- [x] Customer matching by `from_email` against `customers.email`
- [x] Picks most relevant invoice (overdue/paused/disputed first)
- [x] Reads merged customer+global settings before acting

### 4.3 — Intent Classification ✓
- [x] `backend/services/classifier.py` — `claude-opus-4-6`
- [x] Returns `{ intent, confidence, promised_date, summary }` as structured JSON
- [x] 4 intents: `will_pay_later`, `already_paid`, `disputed`, `unclear`
- [x] Defensive JSON parsing

### 4.4 — Draft Reply Generation ✓
- [x] `backend/services/reply_generator.py` — `claude-opus-4-6`
- [x] Reads merged settings for sign-off name and company name
- [x] Separate call from classification — independently tunable
- [x] Graceful fallback reply on API error

### 4.5 — Gmail SMTP Sender ✓
- [x] `backend/services/gmail_sender.py` — `smtp.gmail.com:587`, STARTTLS
- [x] Same credentials as IMAP poller
- [x] `POST /inbox/{ticket_id}/send-reply` — sends draft (or custom body) to original sender
- [x] Marks thread `closed`, logs `action_type=replied` to action_log

---

## Phase 5 — Live Inbox
**Status: COMPLETE ✓**

All inbox features built as part of Phase 3/4:
- [x] `GET /inbox` — reverse chronological, enriched with customer name/initials/color
- [x] `GET /inbox/{ticket_id}` — full thread
- [x] `GET /inbox/{ticket_id}/thread` — message + scheduled actions in one call (ThreadOut schema)
- [x] `POST /inbox/simulate` — presenter trigger, identical pipeline to real email
- [x] `POST /inbox/{ticket_id}/send-reply` — real SMTP reply
- [x] Frontend polls every 10s
- [x] Simulator panel in UI (collapsible, customer picker + message textarea)

---

## Phase 6 — Reset + Polish
**Status: PARTIALLY COMPLETE**

### Done ✓
- [x] `POST /admin/reset` — wipes scheduled_actions, inbox, action_log, rules; resets invoice statuses; re-seeds customer settings
- [x] Settings page with confirmation dialog and redirect
- [x] Loading spinners on timeline and upload
- [x] Empty states on all pages (inbox, dashboard activity, timeline no-schedule)
- [x] `start.sh` — one command, uses `uv sync` + `uv run` for backend, `pnpm dev` for frontend

### Still to do
- [ ] Toast notifications (rules uploaded, new message classified, reply sent)
- [ ] Smooth animation when timeline nodes populate after CSV upload
- [ ] Backend unavailable banner
- [ ] Gmail not configured indicator on the agent status banner

---

## Phase 8 — Agent Context + Fora Skills
**Status: COMPLETE ✓**

### 8.1 — Agent context fixes ✓
- [x] `gmail_poller.py` — IMAP abort errors now re-raised correctly so outer reconnect logic runs
- [x] `classifier.py` — `thread_history` + `skill_context` parameters added
- [x] `reply_generator.py` — `customer_message`, `thread_history`, `skill_context`, `skill_reply` parameters; hardcoded sign-off removed; skill sections moved to end of prompt to override earlier defaults
- [x] `pipeline.py` — builds `thread_history` before appending new message; passes actual email body to reply generator; reads + concatenates all 4 skill contexts; injects into both classifier and reply generator
- [x] `seed.py` — 3 new global settings: `company_currency`, `payment_terms_days`, `accepted_payment_methods`

### 8.2 — Fora Skills backend ✓
- [x] `backend/routes/skills.py` — `GET /skills`, `PUT /skills/{id}`, `DELETE /skills/{id}/context`
- [x] 4 skill definitions: `classification`, `promise_to_pay`, `dispute`, `reply`
- [x] Contexts stored in settings table as `skill_context_{id}`, scope=global
- [x] Registered in `main.py`

### 8.3 — Fora Skills frontend ✓
- [x] `frontend/v0/components/fora-skills-page.tsx` — 4 skill cards, inline preview, add/edit/clear dialog
- [x] `frontend/v0/app/skills/page.tsx` — route wrapper
- [x] `frontend/v0/components/icons/fora-bee-icon.tsx` — SVG bee icon
- [x] `frontend/v0/lib/api.ts` — `Skill` interface, `api.skills` namespace
- [x] Sidebar: Fora Skills link added to receivables nav

---

## Phase 9 — Billing Home + Two-Product App
**Status: COMPLETE ✓**

### 9.1 — Billing home page ✓
- [x] `frontend/v0/app/page.tsx` — Chargebee billing home (metric cards, time filters, chart placeholders)
- [x] `frontend/v0/app/dashboard/page.tsx` — receivables dashboard moved here from `/`
- [x] `frontend/v0/components/metric-card.tsx` — reusable metric card component

### 9.2 — Two-product sidebar ✓
- [x] `frontend/v0/components/app-sidebar.tsx` — full rewrite as Chargebee-style dark sidebar
- [x] Product switcher: Billing (orange `#ff6c37`) ↔ Receivables (blue `#3b82f6`)
- [x] URL-based product detection: `pathname === "/" || pathname.startsWith("/billing")` → billing
- [x] Full billing nav with collapsible groups (Invoices & Credit Notes, Collections NEW, etc.)
- [x] Full receivables nav (Home→/dashboard, Inbox, Invoices, Automations, Fora Skills, Reports, Settings)
- [x] `frontend/v0/components/app-shell.tsx` — `overflow-y-auto` on main for sub-page scrolling

### 9.3 — Collections sub-pages ✓
- [x] `frontend/v0/lib/collections-data.ts` — static snapshot data
- [x] `frontend/v0/lib/forecast-data.ts` — deterministic forecast engine (1,250 subscriptions)
- [x] `frontend/v0/components/forecast/kpi-strip.tsx`
- [x] `frontend/v0/components/forecast/forecast-chart.tsx` — stacked bar + MRR line, recharts
- [x] `frontend/v0/components/forecast/monthly-table.tsx` — clickable drilldown rows
- [x] `frontend/v0/components/forecast/month-drilldown.tsx` — side sheet, invoice + subscription tabs
- [x] `frontend/v0/components/forecast/forecast-settings.tsx` — basis toggle, billing config toggles
- [x] `frontend/v0/components/forecast/export-modal.tsx`
- [x] `frontend/v0/app/billing/collections/page.tsx` — Collections Overview
- [x] `frontend/v0/app/billing/cash-flow/page.tsx` — Collection Forecast
- [x] Sidebar Collections links updated: Overview → `/billing/collections`, Collection Forecast → `/billing/cash-flow`

---

## Phase 7 — Tests
**Status: COMPLETE ✓**

- [x] `backend/tests/conftest.py` — shared fixtures: StaticPool in-memory SQLite, `db` session, `client` TestClient with `get_db` override, 8 factory helpers
- [x] `backend/tests/test_health.py` — 2 tests
- [x] `backend/tests/test_customers.py` — 13 tests (list, get, settings merge, PATCH settings)
- [x] `backend/tests/test_dashboard.py` — 11 tests (KPI buckets, action log, recent activity)
- [x] `backend/tests/test_admin.py` — 7 tests (reset behaviour, keep customers)
- [x] `backend/tests/test_invoices.py` — 8 tests (list, schedule, timeline alias, sort)
- [x] `backend/tests/test_inbox.py` — 13 tests (list, get, simulate, send-reply, thread)
- [x] `backend/tests/test_rules.py` — 10 tests (list, upload mocked, pause toggle)
- [x] `backend/tests/test_pipeline.py` — 26 tests (customer matching, threading, all 4 intents, invoice selection, action log)
- [x] **90 tests total, all passing in 0.32s**

Dev dependencies in `pyproject.toml`:
```toml
[project.optional-dependencies]
dev = ["pytest==8.3.4", "pytest-mock==3.14.0", "httpx==0.28.1"]
```

Run with: `uv run pytest tests/ -v`

---

## All Routes

| Method | Path | Status |
|---|---|---|
| GET | `/health` | ✓ |
| GET | `/customers` | ✓ |
| GET | `/customers/{id}` | ✓ |
| GET | `/customers/{id}/settings` | ✓ |
| PATCH | `/customers/{id}/settings` | ✓ |
| GET | `/invoices` | ✓ |
| GET | `/invoices/{id}/schedule` | ✓ |
| GET | `/invoices/{id}/timeline` | ✓ (alias) |
| GET | `/rules` | ✓ |
| POST | `/rules/upload` | ✓ |
| POST | `/rules/{id}/pause` | ✓ |
| GET | `/inbox` | ✓ |
| GET | `/inbox/{ticket_id}` | ✓ |
| GET | `/inbox/{ticket_id}/thread` | ✓ |
| POST | `/inbox/simulate` | ✓ |
| POST | `/inbox/{ticket_id}/send-reply` | ✓ |
| GET | `/dashboard/summary` | ✓ |
| GET | `/dashboard/action-log` | ✓ |
| POST | `/admin/reset` | ✓ |
| GET | `/skills` | ✓ |
| PUT | `/skills/{id}` | ✓ |
| DELETE | `/skills/{id}/context` | ✓ |

---

## Running the App

```bash
# One command
./start.sh

# Or separately:
# Terminal 1 — backend
cd backend && uv run uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend/v0 && pnpm dev
```

**Required `.env` in `backend/`:**
```
ANTHROPIC_API_KEY=sk-ant-...
GMAIL_USER=your-demo-account@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

**Gmail setup:** Google Account → Security → 2-Step Verification → App Passwords → generate one.

---

## What We Are NOT Building
- Authentication or user accounts
- Multi-tenancy
- Production database
- Deployment infrastructure
- Error handling beyond the happy path
- SMS/Twilio (Gmail only)
