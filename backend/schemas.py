"""
Pydantic schemas for API request/response shapes.
These are the contracts between backend and frontend.
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


# --- Settings ---

class SettingOut(BaseModel):
    id: int
    scope: str
    customer_id: Optional[int]
    key: str
    value: str
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Customers ---

class InvoiceSummary(BaseModel):
    id: int
    invoice_number: str
    amount: float
    due_date: date
    status: str
    days_overdue: Optional[int] = None
    days_until_due: Optional[int] = None

    model_config = {"from_attributes": True}


class CustomerOut(BaseModel):
    id: int
    name: str
    email: str
    initials: str
    color: str
    invoices: list[InvoiceSummary] = []
    settings: list[SettingOut] = []
    total_outstanding: float = 0.0

    model_config = {"from_attributes": True}


# --- Rules ---

class RuleOut(BaseModel):
    id: int
    name: str
    day_offset: int
    audience: str
    type: str
    frequency: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Scheduled Actions / Timeline ---

class ScheduledActionOut(BaseModel):
    id: int
    invoice_id: int
    rule_id: Optional[int]
    action_name: str
    scheduled_date: date
    audience: str
    day_offset: int
    status: str
    color: str
    ai_generated: bool
    note: Optional[str]

    model_config = {"from_attributes": True}


class InvoiceScheduleOut(BaseModel):
    invoice: InvoiceSummary
    customer: CustomerOut
    scheduled_actions: list[ScheduledActionOut]


# --- Inbox ---

class InboxMessageOut(BaseModel):
    id: int
    ticket_id: str
    customer_id: Optional[int]
    invoice_id: Optional[int]
    from_email: str
    subject: str
    body: str
    thread_key: Optional[str]
    thread_count: int
    received_at: datetime
    intent: Optional[str]
    confidence: Optional[float]
    promised_date: Optional[date]
    intent_summary: Optional[str]
    draft_reply: Optional[str]
    action_summary: Optional[str]
    status: str
    # Resolved relations for UI
    customer_name: Optional[str] = None
    customer_initials: Optional[str] = None
    customer_color: Optional[str] = None
    invoice_number: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Action Log ---

class ActionLogOut(BaseModel):
    id: int
    invoice_id: Optional[int]
    inbox_id: Optional[int]
    action_type: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Dashboard ---

class DashboardKPIs(BaseModel):
    total_outstanding: float
    current: float
    overdue_1_to_30: float
    overdue_30_plus: float
    promise_to_pay: float
    disputes: float


class DashboardOut(BaseModel):
    kpis: DashboardKPIs
    recent_activity: list[ActionLogOut]


# --- Thread ---

class ThreadOut(BaseModel):
    message: InboxMessageOut
    scheduled_actions: list[ScheduledActionOut]


# --- Simulate Message ---

class SimulateMessageIn(BaseModel):
    customer_id: int
    body: str
    subject: Optional[str] = "Customer reply"


# --- Upload Rules Response ---

class UploadRulesOut(BaseModel):
    rules_count: int
    invoices_scheduled: int
    message: str


# --- Reset ---

class ResetOut(BaseModel):
    reset: bool
    message: str
