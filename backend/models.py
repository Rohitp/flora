from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime,
    ForeignKey, Text, Boolean
)
from sqlalchemy.orm import relationship
from database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    initials = Column(String(4), nullable=False)
    color = Column(String, nullable=False)  # Tailwind bg class e.g. "bg-blue-600"
    created_at = Column(DateTime, default=datetime.utcnow)

    invoices = relationship("Invoice", back_populates="customer")
    settings = relationship("Setting", back_populates="customer")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    invoice_number = Column(String, nullable=False, unique=True)
    amount = Column(Float, nullable=False)
    due_date = Column(Date, nullable=False)
    # current | overdue | disputed | resolved | paused
    status = Column(String, default="current")
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="invoices")
    scheduled_actions = relationship("ScheduledAction", back_populates="invoice")
    inbox_messages = relationship("InboxMessage", back_populates="invoice")
    action_logs = relationship("ActionLog", back_populates="invoice")


class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    day_offset = Column(Integer, nullable=False)  # negative = before due date
    audience = Column(String, nullable=False)      # Customer | Internal
    type = Column(String, nullable=False)          # email | escalation
    frequency = Column(String, default="Once")    # Once | Daily | Weekly | Monthly
    status = Column(String, default="active")     # active | paused
    created_at = Column(DateTime, default=datetime.utcnow)

    scheduled_actions = relationship("ScheduledAction", back_populates="rule")


class ScheduledAction(Base):
    __tablename__ = "scheduled_actions"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    rule_id = Column(Integer, ForeignKey("rules.id"), nullable=True)  # null for AI-generated
    action_name = Column(String, nullable=False)
    scheduled_date = Column(Date, nullable=False)
    audience = Column(String, nullable=False)
    day_offset = Column(Integer, nullable=False)
    # pending | sent | paused | cancelled | completed
    status = Column(String, default="pending")
    # blue | red | grey | green | orange
    color = Column(String, default="blue")
    ai_generated = Column(Boolean, default=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="scheduled_actions")
    rule = relationship("Rule", back_populates="scheduled_actions")


class InboxMessage(Base):
    __tablename__ = "inbox"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(String, nullable=False)       # TKT-0001 style
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    from_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    thread_key = Column(String, nullable=True)       # normalized subject + from_email
    thread_count = Column(Integer, default=1)        # number of messages in thread
    received_at = Column(DateTime, default=datetime.utcnow)
    # Classification output
    intent = Column(String, nullable=True)           # will_pay_later | already_paid | disputed | unclear
    confidence = Column(Float, nullable=True)
    promised_date = Column(Date, nullable=True)
    intent_summary = Column(Text, nullable=True)
    draft_reply = Column(Text, nullable=True)
    action_summary = Column(Text, nullable=True)
    # open | classified | needs_review | closed
    status = Column(String, default="open")

    customer = relationship("Customer")
    invoice = relationship("Invoice", back_populates="inbox_messages")


class ActionLog(Base):
    __tablename__ = "action_log"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    inbox_id = Column(Integer, ForeignKey("inbox.id"), nullable=True)
    action_type = Column(String, nullable=False)   # classify | pause | cancel | escalate | draft | schedule
    description = Column(Text, nullable=False)     # plain English e.g. "Paused 3 reminders for IN-1041"
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="action_logs")


class Setting(Base):
    """
    Key-value settings table.
    scope=global: applies to all customers (customer_id is null)
    scope=customer: customer-specific override (customer_id is set)
    Agent reads customer-specific first, falls back to global.
    Agent can write new settings after taking actions.
    """
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    scope = Column(String, nullable=False)         # global | customer
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    key = Column(String, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="settings")
