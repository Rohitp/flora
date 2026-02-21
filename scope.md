---

## Implementation Steps

Build in this order. Each step produces something visible and demoable before moving to the next.

### Step 1 — Project Scaffolding
Set up the monorepo structure with a backend/ folder and a frontend/ folder. Initialise the FastAPI app with a health check endpoint. Initialise the React + Vite app with Tailwind CSS. Confirm both run locally and the frontend can call the backend health check. Set up the .env file with placeholder keys for the Anthropic API key and Gmail app password.

### Step 2 — Database and Dummy Data
Create the SQLite database with all tables: rules, invoices, scheduled_actions, inbox, action_log. On backend startup, check if the database is empty and if so seed it with five dummy customers. Each dummy customer has a realistic name, a controlled email address, an invoice number, an invoice amount, and a due date. Two customers are already overdue, two are due within 7 days, one is due in 14 days. Expose a GET /customers endpoint that returns all five. Confirm dummy data loads correctly.

### Step 3 — Rules Upload and Schedule Computation
Build the POST /upload-rules endpoint that accepts a CSV or Excel file, parses it with pandas, saves the rules to the database, and triggers schedule computation for all five existing invoices immediately. Schedule computation applies each rule's day offset to each invoice's due date to produce a dated scheduled action. Expose GET /invoices/:id/schedule to return the computed schedule for one invoice. Test with the sample CSV.

### Step 4 — Frontend Shell and Navigation
Build the React app shell with a sidebar navigation linking to three views: Invoices, Inbox, and a Settings/Reset page. No real content yet — just the layout, sidebar, and placeholder panels. This is where the designs/ folder reference images should be used to set the visual tone for the whole app. Get the layout looking sharp before filling in content.

### Step 5 — Invoice and Timeline View
Build the Invoices view. Show all five customers as cards. Each card shows customer name, invoice number, amount, due date, and current status. Clicking a card expands or navigates to the full timeline for that invoice. The timeline is a vertical component showing each scheduled action as a node with its date, action name, audience, and status. Colour code as defined in the colour coding section. If no rules have been uploaded yet, show an empty state with a drag and drop upload area prominently in the centre of the screen. When rules are uploaded the timelines populate immediately across all five invoices.

### Step 6 — Drag and Drop Rules Upload
Add the drag and drop file upload component to the empty state of the Invoices view. On drop, POST the file to /upload-rules. On success, reload all invoice timelines. The transition from empty state to populated timelines should feel fast and satisfying — this is the key demo moment for Workflow 1.

### Step 7 — Gmail Polling
Build the Gmail IMAP poller as a background thread inside FastAPI that starts on server startup. It connects using the credentials in .env, polls every 10 seconds, fetches unread emails, marks them as read, and passes each one through the processing pipeline. For now just log the raw email to the inbox table without classification. Confirm emails sent to the demo Gmail address appear in the database within 10 seconds.

### Step 8 — Intent Classification and Automated Actions
Build the classifier using the Anthropic Claude API. Pass the email body and ask Claude to return a structured JSON response with the intent, confidence, and any extracted details such as a promised payment date. Based on the returned intent execute all automated actions against the database as defined in the Intent Classification and Automated Actions section. Write every action taken to the action_log table with a plain English description.

### Step 9 — Draft Reply Generation
After actions are executed, make a second Claude API call to draft the customer reply. Pass Claude the intent, the customer name, the invoice details, and a summary of what actions were taken. Claude returns a draft email body. Save the draft to the inbox record. This is a separate call from classification so each concern is clean and independently tunable.

### Step 10 — Inbox View
Build the Inbox view as a shared team inbox. Show all tickets in reverse chronological order. Each ticket card shows: ticket ID, customer name, timestamp, email subject, classified intent as a badge, and a one-line summary of the action taken. Clicking a ticket expands the full detail: original email body, full thread if multiple messages, the action log for that ticket, and the draft reply in an editable text area with a Copy button. New tickets should appear without a full page reload — the frontend polls GET /inbox every 10 seconds.

### Step 11 — Ticket Threading
Implement threading logic. When a new email arrives from a sender who already has an open ticket, match it to the existing ticket by normalising the subject line (strip Re:, Fwd: prefixes) and matching on sender email. Append the new message to the existing thread rather than creating a new ticket. The inbox card should show a thread count badge if there are multiple messages.

### Step 12 — Reset and Polish
Build the Settings/Reset page with a single prominent reset button. On click, call POST /reset which wipes all scheduled actions, inbox messages, action logs, and rules, then re-seeds the five dummy customers. Rules are cleared so the app returns to the empty state ready for the next demo run. Spend remaining time on visual polish — transitions, loading states, empty states, and making the timeline and inbox feel alive and responsive.

---

## Definition of Done for the Demo

- App opens showing five customers with no timeline (rules not yet uploaded)
- Drag and drop the CSV — all five timelines populate instantly
- Send an email to the demo Gmail address from one of the controlled customer addresses
- Within 10 seconds the email appears in the inbox with a ticket ID
- The intent badge shows the classification
- The timeline for that customer updates to reflect the automated action taken
- The draft reply is visible in the ticket for review
- Hit reset and the demo can run again cleanly
# AR Prototype — Build Instructions

## Purpose
This is a demo-quality prototype to show the viability of an automated accounts receivable workflow. It is not production code. Prioritise speed and visual clarity over robustness.

---

## Problem Space

Businesses send payment reminders to customers on a schedule relative to an invoice due date. The schedule is defined by a set of rules: each rule specifies how many days before or after the due date an action should trigger, who the audience is (customer or internal team), and what communication template to use.

The second layer of complexity is that customers reply — they promise to pay later, they dispute the invoice, or they say they already paid. When this happens the reminder schedule needs to adjust automatically. The inbox should feel like a shared team inbox where incoming customer messages are read, classified by AI, and reflected back into the schedule without manual intervention.

---

## Workflows

### Workflow 1 — Rules Upload and Schedule Timeline
The user uploads a file containing the action rules table. They then create an invoice by entering a customer name and a due date. The system computes the exact calendar date for every action in the rules table by applying each day offset to the due date. The result is displayed as a visual vertical timeline showing all actions in chronological order, colour coded by whether they are pre-due-date reminders, post-due-date overdue notices, or internal escalations.

### Workflow 2 — Simulated Customer Inbox and Schedule Adjustment
A simulated inbox receives messages from customers, either via Twilio SMS webhook or Gmail. Each message is passed to the Claude API which classifies the intent into one of four categories: will pay later (extract the promised date if mentioned), already paid, disputed, or unclear. Based on the classification the system automatically adjusts the scheduled actions for that invoice — pausing future reminders if the customer promises a date, flagging the invoice as disputed, or marking it resolved. The inbox page shows all incoming messages, their classified intent, and what schedule change was made.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| UI | React + Vite | Fast dev server, component-based, works well with v0-generated components |
| Styling | Tailwind CSS | Required for v0 components, utility-first, fast to customise |
| Backend API | FastAPI + Uvicorn | Lightweight REST API, handles file upload and webhooks |
| Database | SQLite | Zero config, file-based, sufficient for demo |
| File parsing | pandas | Handles both CSV and Excel upload |
| AI classification | Anthropic Claude API (claude-sonnet-4-6) | Reads customer message and returns structured intent |
| Email channel | Gmail via IMAP | Backend polls a dedicated demo Gmail account every 10 seconds using IMAP and an app password. No OAuth or webhooks required. |

---

## Application Structure

The frontend is a React + Vite single-page application with three views navigated via a sidebar. The backend is a FastAPI server exposing a REST API and webhook endpoints. Both are separate processes sharing the same SQLite database file.

### Frontend (React + Vite)

All UI components are built by Claude Code using Tailwind CSS. Reference images in the designs/ folder should be used as visual guidance for layout, colour scheme, and component style. The frontend communicates with the FastAPI backend exclusively via fetch calls to the REST API.

**View 1 — Upload Rules:** File upload component for the action rules CSV or Excel file. On upload the file is posted to the backend, parsed, and the resulting rules are displayed in a confirmation table.

**View 2 — Schedule:** Form to create an invoice with customer name, contact details, and due date. On submission the backend returns a computed list of scheduled actions which are rendered as a vertical timeline component. All existing invoices are listed with their current status and a link to their individual timeline.

**View 3 — Inbox:** Shared inbox view showing all incoming customer messages in reverse chronological order. Each message card shows the customer name, raw message text, AI-classified intent, and what schedule adjustment was made. At the top of the page is a message simulator — a form where the presenter can type a fake customer reply during the demo, select which invoice it belongs to, and trigger the full classification and adjustment flow in real time without needing a live Twilio number.

### Backend (FastAPI)

A single FastAPI process exposing REST endpoints for the frontend and webhook endpoints for Twilio and Gmail. Handles all business logic — file parsing, schedule computation, Claude API calls, and database writes. Enables CORS so the React dev server can call it freely during development.

### UI Reference Designs

A designs/ folder in the project root contains reference images for the UI. Claude Code should use these as visual reference when building all components. Match layout, colour scheme, and component style as closely as possible.

---

## Data Model

Five entities: rules, invoices, scheduled actions, inbox messages, and intent classifications. Rules are loaded from the uploaded file. Invoices are pre-loaded as dummy data on first run. Scheduled actions are computed from rules and invoices after the rules file is uploaded. Inbox messages arrive via Gmail polling. Each inbox message links to an invoice and triggers a schedule adjustment.

## Database Setup and Dummy Data

On first run the backend creates the SQLite database and seeds it with five dummy customers. These customers exist in the app before any rules are uploaded — their invoices show as unconfigured with no scheduled actions yet. Once the rules file is uploaded, the backend computes and populates the schedule for all five invoices automatically.

The five dummy customers should have realistic names, email addresses (all pointing to real inboxes you control for the demo), and due dates spread across the past and near future so the timeline shows a mix of upcoming reminders, overdue notices, and already-triggered actions. Two customers should have due dates in the past (already overdue), two in the next 7 days, and one due in 14 days.

A reset endpoint on the backend wipes all scheduled actions and inbox messages and re-seeds the five dummy customers, so the demo can be rerun cleanly without restarting the server.

## Demo Narrative and App States

The app has two clear states that the audience experiences sequentially:

**State 1 — No rules loaded.** The app opens showing five customer invoices with names, emails, and due dates. The timeline area for each invoice shows an empty state with a prompt to upload the rules file. The inbox is empty. Gmail is connected but idle.

**State 2 — Rules loaded.** The presenter drags and drops the CSV file onto the upload area. The backend parses the rules, computes the full schedule for all five invoices, and the timelines populate instantly. Scheduled actions appear colour coded across all five customers. From this point Gmail polling is active and incoming emails trigger live updates to the inbox and timelines.

---

## Schedule Adjustment Logic

When an intent is classified the following adjustments apply:

- **Will pay later** — pause all pending scheduled actions and create a single new follow-up action for one day after the promised date
- **Already paid** — cancel all pending scheduled actions and mark the invoice as resolved
- **Disputed** — pause all pending scheduled actions, mark the invoice as disputed, and trigger the internal escalation action immediately
- **Unclear** — log the message, take no automatic action, flag for human review

---

## Colour Coding for Timeline

- Blue — actions scheduled before the due date (reminders)
- Red — actions scheduled after the due date (overdue notices)
- Grey — internal escalations (audience is not the customer)
- Green — completed or resolved actions
- Orange — paused or snoozed actions

---

## Project Structure

```
ar-prototype/
├── frontend/        # React + Vite app
├── backend/         # FastAPI app
├── designs/         # UI reference images for v0 and Claude Code
├── sample_rules.csv
└── README.md
```

## Running the App

Two processes run concurrently: the React dev server (Vite) and the FastAPI backend. The Gmail poller runs as a background thread inside FastAPI — it is not a separate process. All data is stored in a single SQLite file in the backend directory. Use a shell script or Honcho to start both processes together. Ensure the Gmail app password is stored in a .env file and never hardcoded.

---

## Demo Flow (for presenting)

1. Upload the sample rules CSV
2. Create an invoice with a due date a few days from today so some actions appear in the past and some in the future
3. Show the timeline
4. Go to the inbox, type a simulated customer message like "I'll pay next Friday, cash is tight this month"
5. Show the AI classification result and the updated timeline with reminders paused and a new follow-up added
6. Repeat with "I already paid this last week" to show instant resolution

---

## What Is Out of Scope for This Prototype

- Authentication or user accounts
- Actually sending emails or SMS (only receiving and classifying)
- Multi-tenancy
- Error handling beyond the happy path
- Production database
- Any deployment infrastructure