# AR Prototype — Implementation Plan

_Last updated: 2026-02-21_

---

## Project State

**Frontend**: Next.js 16 app (v0-generated) lives in `frontend/v0/`. All four pages are visually complete with hardcoded static data. The UI matches the designs exactly. We are keeping Next.js (not switching to Vite — Next.js is strictly better for this use case).

**Backend**: Does not exist yet. We are building a FastAPI app from scratch in `backend/`.

**Database**: SQLite, file-based, lives inside `backend/`.

**AI**: Anthropic claude-sonnet-4-6 via API. Two separate calls — one for classification, one for draft reply generation.

**Email**: Gmail IMAP polled every 10 seconds from a background thread inside FastAPI.

---

## The Two Demo Moments That Must Be Flawless

### Demo Moment 1 — Rules Upload → Timelines Populate
Audience watches empty customer cards transform into fully scheduled timelines the instant a CSV is dropped. This sells Workflow 1.

### Demo Moment 2 — Email Arrives → Inbox Updates + Timeline Changes
Within 10 seconds of sending an email from a demo Gmail address, the inbox ticket appears, intent is classified (will pay / already paid / disputed / unclear), the timeline for that customer updates to reflect the AI's action, and a draft reply is visible. This sells Workflow 2.

---

## Phase 1 — Backend Foundation
**Status: COMPLETE** ✓
**Demo value: Backend is running, health check works, dummy data seeded**

### 1.1 — FastAPI App Scaffold
- [ ] Create `backend/` directory structure
- [ ] `main.py` — FastAPI app entry point, CORS enabled for localhost:3000
- [ ] `database.py` — SQLAlchemy engine + session factory + Base
- [ ] `models.py` — ORM models for all 5 tables (see schema below)
- [ ] `requirements.txt` — all dependencies
- [ ] `.env.example` — template with ANTHROPIC_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD
- [ ] `GET /health` → returns `{"status": "ok", "db_seeded": bool}`

**Schema:**
```
rules(id, name, day_offset, audience, type, frequency, status, created_at)
invoices(id, customer_id, invoice_number, amount, due_date, status, created_at)
customers(id, name, email, initials, color)
scheduled_actions(id, invoice_id, rule_id, scheduled_date, action_name, audience, status, day_offset)
inbox(id, ticket_id, customer_id, invoice_id, from_email, subject, body, raw_headers, thread_key, received_at, intent, confidence, draft_reply, action_summary, status)
action_log(id, invoice_id, inbox_id, action_type, description, created_at)
settings(id, scope, customer_id, key, value, updated_at)
```

**Settings table design:**
- `scope`: `"global"` or `"customer"` — agent reads customer-specific first, falls back to global
- `customer_id`: nullable, only set when scope=customer
- `key`/`value`: string key-value pairs — flexible, no schema migration needed when adding new settings
- Examples of global settings: `contact_language=English`, `escalation_threshold_days=30`, `max_reminders=5`
- Examples of customer settings: `pause_contact_until=2026-03-01`, `dispute_route=legal`, `preferred_contact_time=morning`, `agent_notes=Customer flagged as high-risk`
- The agent reads settings before making decisions and can write new ones after acting
- Seeded with sensible global defaults; a few customer-specific overrides to demonstrate the feature

### 1.2 — Seed Dummy Data
- [ ] `seed.py` — creates 5 customers with realistic data on startup if DB is empty
- [ ] Customer due dates: 2 overdue (12d ago, 37d ago), 2 due soon (4d, 7d), 1 due in 14d
- [ ] Each customer gets 1 invoice at seed time, no scheduled actions yet
- [ ] `GET /customers` → returns all customers with their invoice status

**5 Dummy Customers:**
| Name | Email | Invoice | Amount | Due Date |
|---|---|---|---|---|
| NovaTech Corp | billing@novatech-demo.com | IN-1023 | $34,200 | +7d from today |
| Pinnacle Corp | finance@pinnacle-demo.com | IN-1035 | $23,400 | -12d (overdue) |
| Meridian LLC | ar@meridian-demo.com | IN-1040 | $18,900 | -16d (overdue) |
| Acme Inc | billing@acme-demo.com | IN-1045 | $12,500 | +4d from today |
| GlobalTech Solutions | ap@globaltech-demo.com | IN-1030 | $8,750 | -37d (overdue) |

**Testable after this phase:** `curl localhost:8000/health` returns ok; `curl localhost:8000/customers` returns 5 customers.

---

## Phase 2 — Rules Agent (AI-powered, no algorithm)
**Status: NOT STARTED**
**Demo value: Drop any rules file → Claude reads it, generates full schedules for all 5 customers**

### 2.1 — Rules Agent Service
No column parsing, no rigid schema, no day_offset arithmetic in code. Claude does all of it.

**Flow:**
1. Upload any file (CSV, Excel, plain text, PDF — format doesn't matter)
2. File is converted to readable text (pandas used only for Excel→CSV text, not for logic)
3. Claude receives: raw rules text + all 5 invoices with their due dates + today's date
4. Claude returns structured JSON: parsed rules + a complete schedule for every invoice
5. We persist both and return counts

**Demo story:** "Drop your existing rules spreadsheet in any format — the AI reads it and builds the schedule."

### 2.2 — `services/rules_agent.py`
- [ ] Read file bytes → text (CSV raw, Excel via pandas conversion to text only)
- [ ] Build Claude prompt: rules content + invoice context (customer name, invoice #, due date)
- [ ] Claude returns: `{ rules: [...], scheduled_actions: [...] }`
- [ ] Rules: `{ name, day_offset, audience, type, frequency }`
- [ ] Scheduled actions: `{ invoice_number, action_name, scheduled_date, audience, day_offset, color, status }`
- [ ] Persist both to DB
- [ ] Also used by `POST /admin/reset` to re-apply rules after reset

### 2.3 — Updated `POST /rules/upload`
- [ ] Remove pandas-based column parsing
- [ ] Call `rules_agent.parse_and_schedule()` instead
- [ ] Returns `{ rules_count, invoices_scheduled, message }`

### 2.4 — Read endpoints
- [ ] `GET /rules` → all loaded rules
- [ ] `GET /invoices/{id}/schedule` → scheduled actions for one invoice

**Testable after this phase:** Upload `sample_rules.csv` → Claude parses it → `GET /invoices/1/schedule` returns dated actions for NovaTech Corp.

---

## Phase 3 — Connect Frontend to Real Backend
**Status: NOT STARTED**
**Demo value: The app shows real data — this is the first fully integrated experience**

### 3.1 — API Client Layer in Frontend
- [ ] Create `frontend/v0/lib/api.ts` — typed fetch wrapper pointing to `http://localhost:8000`
- [ ] All data calls go through this layer (easy to swap base URL for production)
- [ ] Types mirror the backend response shapes

### 3.2 — State: No Rules Loaded (Empty State)
- [ ] `GET /rules` on page load — if empty, show **empty state** on Invoices/Timeline page
- [ ] Empty state: centered drag-and-drop upload zone with copy "Drop your rules CSV to generate collection timelines"
- [ ] Empty state matches the scope doc description — this is the app's opening state in the demo

### 3.3 — Automations Page (Rules Upload)
- [ ] Replace static `automationRules` data with real `GET /rules` call
- [ ] "Replace File" button and drag-and-drop on empty state both `POST /upload-rules`
- [ ] On success: refetch rules, navigate to Invoices view
- [ ] Show rule count and upload timestamp correctly

### 3.4 — Invoices/Timeline Page
- [ ] Replace static `customers` and `timelineEvents` with real API calls
- [ ] Customer selector populates from `GET /customers`
- [ ] Timeline populates from `GET /invoices/{invoice_id}/schedule`
- [ ] Color coding from backend: pre-due-date=blue, post-due-date=red, internal=grey, completed=green, paused=orange
- [ ] If no rules loaded → show empty state with upload CTA

### 3.5 — Dashboard Page
- [ ] Replace static KPI data with real computed values from `GET /dashboard/summary`
- [ ] Top customers panel pulls from `GET /customers`
- [ ] Recent AI Activity panel pulls from `GET /action-log?limit=10`

**Testable after this phase:** Full browser demo of Workflow 1 — open app (empty state), drag CSV, timelines populate.

---

## Phase 4 — Gmail Poller + AI Classification
**Status: NOT STARTED**
**Demo value: Send an email → it appears in inbox within 10 seconds with AI intent badge**

### 4.1 — Gmail IMAP Poller
- [ ] `gmail_poller.py` — background thread using `imaplib` + `email` stdlib
- [ ] Connects on startup using GMAIL_USER + GMAIL_APP_PASSWORD from `.env`
- [ ] Polls every 10 seconds, fetches all unread emails in INBOX
- [ ] Marks each email as read after fetching
- [ ] Extracts: from_email, subject, body (text/plain preferred, strip HTML if needed)
- [ ] Stores raw email in `inbox` table with `status='unclassified'`
- [ ] Immediately passes email to classification pipeline (Step 4.2)
- [ ] Logs connection errors gracefully — app continues if Gmail is not configured

### 4.2 — Intent Classification (Claude API Call 1)
- [ ] `classifier.py` — takes raw email text + invoice context
- [ ] Single Claude call with structured JSON output spec:
  ```json
  {
    "intent": "will_pay_later | already_paid | disputed | unclear",
    "confidence": 0.0-1.0,
    "promised_date": "YYYY-MM-DD or null",
    "summary": "one sentence plain English"
  }
  ```
- [ ] Customer matching: look up `inbox.from_email` against `customers.email`
- [ ] Updates `inbox` record with classification result
- [ ] Executes schedule adjustment (Step 4.3)
- [ ] Writes each step to `action_log`

### 4.3 — Schedule Adjustment Logic
- [ ] `will_pay_later` → pause all pending scheduled_actions for invoice, create new follow-up action for (promised_date + 1 day)
- [ ] `already_paid` → cancel all pending scheduled_actions, set invoice.status = 'resolved'
- [ ] `disputed` → pause all pending scheduled_actions, set invoice.status = 'disputed', trigger internal escalation action immediately (log it)
- [ ] `unclear` → log the message, set inbox.status = 'needs_review', no automatic action on schedule

### 4.4 — Draft Reply Generation (Claude API Call 2)
- [ ] Second Claude call — separate from classification
- [ ] Input: intent, customer name, invoice details, action summary
- [ ] Returns a professional draft reply email body
- [ ] Saved to `inbox.draft_reply`
- [ ] This is what the user sees in the inbox view to approve/copy

**Testable after this phase:** Send email to demo Gmail → within 10 seconds: inbox record created, classified, timeline updated, draft visible.

---

## Phase 5 — Live Inbox View
**Status: NOT STARTED**
**Demo value: Inbox feels alive — new tickets appear automatically, threads are grouped**

### 5.1 — Inbox API Endpoints
- [ ] `GET /inbox` → returns all inbox threads in reverse chronological order, with latest action summary
- [ ] `GET /inbox/{ticket_id}` → full thread with all emails, action log, draft reply
- [ ] Response shape matches the frontend's `EmailThread` type

### 5.2 — Thread Matching
- [ ] When new email arrives: normalize subject (strip Re:, Fwd: prefixes), match on sender email
- [ ] If existing open ticket from same sender → append to thread (update thread, don't create new)
- [ ] Thread shows message count badge if >1 message

### 5.3 — Frontend Inbox Live Updates
- [ ] Replace static `threads` data with real `GET /inbox` call
- [ ] Poll `GET /inbox` every 10 seconds (simple polling, no WebSockets needed for demo)
- [ ] New ticket appears → thread list updates smoothly
- [ ] Expand ticket → shows full email body, action log, draft reply
- [ ] Draft reply is editable textarea with Copy button

### 5.4 — Intent Simulator (In-Demo Tool)
- [ ] Inbox page has a "Simulate Message" button / compose panel
- [ ] Presenter can type a fake customer message during demo
- [ ] Select which customer it's from
- [ ] POST /simulate-message → triggers full classification + schedule update pipeline
- [ ] Result appears in inbox and timeline within seconds
- [ ] This is the backup if live Gmail isn't cooperating during the presentation

**Testable after this phase:** Full Workflow 2 demo using simulator — type "I'll pay next Friday", watch intent badge appear and timeline update.

---

## Phase 6 — Reset, Polish, and Demo Hardening
**Status: NOT STARTED**
**Demo value: Bulletproof demo that can be reset and re-run cleanly**

### 6.1 — Reset Endpoint
- [ ] `POST /reset` — wipes scheduled_actions, inbox, action_log, rules
- [ ] Re-seeds the 5 dummy customers (or just resets their invoice statuses)
- [ ] Returns `{"reset": true}`
- [ ] Frontend Settings page has a single prominent "Reset Demo" button wired to this

### 6.2 — Settings / Reset Page
- [ ] Simple page: big red "Reset Demo" button, description of what it does
- [ ] Confirmation dialog before firing reset
- [ ] After reset: redirect to home, all state is cleared

### 6.3 — Loading States
- [ ] Skeleton loaders on timeline while fetching schedule
- [ ] Spinner on CSV upload button while processing
- [ ] "Processing..." state on inbox during classification (maybe a brief pulse)

### 6.4 — Transitions and Polish
- [ ] Smooth appear animation when timeline nodes populate after CSV upload
- [ ] New inbox ticket slides in from top
- [ ] AI action banner on timeline animates in when schedule is modified
- [ ] Toast notifications: "Rules uploaded — 5 timelines computed", "New message classified: Will Pay Later"

### 6.5 — Error States
- [ ] If backend is down: show a banner "Backend unavailable — check server"
- [ ] If Gmail not configured: show a badge on the AI banner "Gmail not connected" instead of crashing

### 6.6 — Startup Script
- [ ] `start.sh` — starts both backend (uvicorn) and frontend (next dev) in one command
- [ ] Prints URLs for both servers on startup

---

## Commit Sequence

Each commit is a demoable moment:

| # | Commit Message | What's visible |
|---|---|---|
| 1 | `feat: FastAPI backend scaffold with health check and CORS` | curl /health works |
| 2 | `feat: SQLite schema and 5 dummy customers seeded on startup` | curl /customers returns 5 customers |
| 3 | `feat: rules upload endpoint and schedule computation engine` | Upload CSV, get computed timelines |
| 4 | `feat: sample_rules.csv with 10 collection rules` | Usable demo CSV |
| 5 | `feat: frontend API client and empty state for no-rules condition` | Browser shows empty state |
| 6 | `feat: timeline page wired to real backend schedule data` | Real timelines after upload |
| 7 | `feat: automations page wired to real rules data with upload UI` | Drag CSV in browser |
| 8 | `feat: dashboard page wired to real backend KPI and customer data` | Real numbers everywhere |
| 9 | `feat: Gmail IMAP poller background thread` | Emails appear in DB |
| 10 | `feat: Claude intent classification with schedule adjustment` | Intent badges appear |
| 11 | `feat: Claude draft reply generation` | AI-drafted reply visible |
| 12 | `feat: inbox view wired to real backend with 10s polling` | Live inbox updates |
| 13 | `feat: thread matching for reply emails` | Replies thread correctly |
| 14 | `feat: in-demo message simulator` | Presenter can trigger flow manually |
| 15 | `feat: reset endpoint and settings page` | Demo can be rerun |
| 16 | `feat: loading states, transitions, and toast notifications` | App feels polished |
| 17 | `feat: startup script and env setup docs` | One command to run |

---

## What We Are NOT Building
- Authentication
- Actually sending emails (only receiving + classifying)
- Multi-tenancy
- Production database
- Deployment infrastructure
- Error handling beyond the happy path
- The SMS/Twilio path (Gmail only)

---

## Running the App

```bash
# Backend
cd backend && pip install -r requirements.txt
cp .env.example .env  # fill in API keys
uvicorn main:app --reload --port 8000

# Frontend
cd frontend/v0 && pnpm install
pnpm dev  # runs on localhost:3000
```
