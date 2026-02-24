"""
Gmail IMAP poller — runs as a background thread.
Polls every 10 seconds for new unread emails.
Passes each email through the processing pipeline.

Resilience design:
- All IMAP errors (abort, error) trigger immediate reconnect (no long sleep).
- BaseException wrapper logs and restarts the loop if something unexpected kills it.
- NOOP keepalive every 5 minutes prevents Gmail from timing out idle connections.
- Thread status is tracked in a module-level dict for health checks.
"""
import imaplib
import email
import time
import threading
import os
from email.header import decode_header
from database import SessionLocal
from services.pipeline import process_email

# --- Module-level poller state (readable by health endpoint) ---
_poller_state: dict = {
    "running": False,
    "connected": False,
    "last_poll_at": None,
    "last_error": None,
    "emails_processed": 0,
}
_poller_lock = threading.Lock()


def get_poller_status() -> dict:
    with _poller_lock:
        return dict(_poller_state)


def _set_state(**kwargs):
    with _poller_lock:
        _poller_state.update(kwargs)


def _decode_header_value(value: str | bytes | None) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        value = value.decode("utf-8", errors="replace")
    parts = decode_header(value)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            decoded.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(part)
    return "".join(decoded)


def _extract_body(msg: email.message.Message) -> str:
    """Extract plain text body, falling back to HTML stripped of tags."""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get("Content-Disposition", ""))
            if ct == "text/plain" and "attachment" not in cd:
                charset = part.get_content_charset() or "utf-8"
                return part.get_payload(decode=True).decode(charset, errors="replace")
        # Fallback to HTML
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                charset = part.get_content_charset() or "utf-8"
                html = part.get_payload(decode=True).decode(charset, errors="replace")
                import re
                return re.sub(r'<[^>]+>', ' ', html).strip()
    else:
        charset = msg.get_content_charset() or "utf-8"
        return msg.get_payload(decode=True).decode(charset, errors="replace")
    return ""


def poll_once(mail: imaplib.IMAP4_SSL) -> int:
    """Fetch and process all unread emails. Returns count processed."""
    mail.select("INBOX")
    _, msg_ids = mail.search(None, "UNSEEN")

    ids = msg_ids[0].split()
    if not ids:
        return 0

    processed = 0
    import re as _re
    for msg_id in ids:
        db = SessionLocal()
        try:
            _, msg_data = mail.fetch(msg_id, "(RFC822)")
            raw = msg_data[0][1]
            msg = email.message_from_bytes(raw)

            from_raw = _decode_header_value(msg.get("From", ""))
            match = _re.search(r'[\w.+-]+@[\w-]+\.[a-z]+', from_raw)
            from_email = match.group(0) if match else from_raw

            subject = _decode_header_value(msg.get("Subject", "(no subject)"))
            body = _extract_body(msg)

            # Persist to DB first, then mark as read to avoid silent data loss
            process_email(db=db, from_email=from_email, subject=subject, body=body)
            mail.store(msg_id, "+FLAGS", "\\Seen")
            processed += 1

        except (imaplib.IMAP4.abort, imaplib.IMAP4.error):
            raise  # let _poller_loop handle reconnect
        except Exception as e:
            print(f"[gmail_poller] Error processing email {msg_id}: {e}")
            # Still mark as read so we don't reprocess a broken message endlessly
            try:
                mail.store(msg_id, "+FLAGS", "\\Seen")
            except Exception:
                pass
        finally:
            db.close()

    return processed


def _connect(gmail_user: str, gmail_pass: str) -> imaplib.IMAP4_SSL:
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(gmail_user, gmail_pass)
    return mail


def _poller_loop():
    gmail_user = os.environ.get("GMAIL_USER", "")
    gmail_pass = os.environ.get("GMAIL_APP_PASSWORD", "")

    if not gmail_user or not gmail_pass:
        print("[gmail_poller] GMAIL_USER or GMAIL_APP_PASSWORD not set — poller disabled.")
        return

    _set_state(running=True)
    mail = None
    noop_counter = 0
    NOOP_EVERY = 30  # send NOOP every 30 × 10s = 5 minutes

    while True:
        try:
            if mail is None:
                mail = _connect(gmail_user, gmail_pass)
                _set_state(connected=True, last_error=None)
                print(f"[gmail_poller] Connected as {gmail_user}")
                noop_counter = 0

            # Periodic NOOP keepalive to prevent Gmail idle timeout (~20 min)
            noop_counter += 1
            if noop_counter >= NOOP_EVERY:
                mail.noop()
                noop_counter = 0

            count = poll_once(mail)
            _set_state(last_poll_at=time.time())
            if count:
                _set_state(emails_processed=_poller_state["emails_processed"] + count)
                print(f"[gmail_poller] Processed {count} new email(s)")

        except (imaplib.IMAP4.abort, imaplib.IMAP4.error) as e:
            # Both connection drops and protocol errors → reconnect immediately
            print(f"[gmail_poller] IMAP error ({type(e).__name__}): {e} — reconnecting...")
            _set_state(connected=False, last_error=str(e))
            try:
                mail.logout()
            except Exception:
                pass
            mail = None
            time.sleep(2)  # brief pause before reconnect
            continue

        except Exception as e:
            print(f"[gmail_poller] Unexpected error: {e} — reconnecting in 10s...")
            _set_state(connected=False, last_error=str(e))
            mail = None
            time.sleep(10)
            continue

        time.sleep(10)


def _poller_wrapper():
    """Wrapper that restarts _poller_loop if it ever dies unexpectedly."""
    _set_state(running=True)
    while True:
        try:
            _poller_loop()
            # _poller_loop only returns if credentials are missing
            break
        except BaseException as e:
            # Catch SystemExit, KeyboardInterrupt, etc. — log and restart
            import traceback as _tb
            print(f"[gmail_poller] Thread crashed ({type(e).__name__}: {e}) — restarting in 15s...")
            print(_tb.format_exc())
            _set_state(running=False, connected=False, last_error=f"CRASH: {e}")
            time.sleep(15)
            _set_state(running=True)
    _set_state(running=False, connected=False)


def start_poller():
    """Start the Gmail poller in a daemon background thread."""
    thread = threading.Thread(target=_poller_wrapper, daemon=True, name="gmail-poller")
    thread.start()
    print("[gmail_poller] Poller thread started.")
    return thread
