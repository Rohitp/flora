"""
Standalone Gmail poller — runs independently of the web server.

Usage (in a separate terminal):
    cd backend
    uv run python run_poller.py

This way file changes to the web server code don't kill the poller.
"""
from dotenv import load_dotenv
load_dotenv()

# Ensure DB tables exist (the web server normally does this, but we may
# start the poller before the server in some setups)
from database import engine, Base
Base.metadata.create_all(bind=engine)

from services.gmail_poller import _poller_wrapper

if __name__ == "__main__":
    print("[run_poller] Starting standalone Gmail poller...")
    _poller_wrapper()
