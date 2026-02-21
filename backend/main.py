import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import engine, SessionLocal, Base
import models  # ensure all models are registered before create_all
from seed import seed
from routes import customers, invoices, rules, inbox, dashboard, admin
from services.gmail_poller import start_poller


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Seed dummy data if DB is empty
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()

    # Start Gmail poller (no-ops gracefully if creds not set)
    start_poller()

    yield
    # Shutdown: daemon thread will die with the process


app = FastAPI(
    title="Flora AR API",
    description="Accounts Receivable automation backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(customers.router)
app.include_router(invoices.router)
app.include_router(rules.router)
app.include_router(inbox.router)
app.include_router(dashboard.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    db = SessionLocal()
    try:
        from models import Customer
        count = db.query(Customer).count()
        return {"status": "ok", "db_seeded": count > 0, "customer_count": count}
    finally:
        db.close()
