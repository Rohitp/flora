"""
Gmail IMAP poller — runs as a background thread.
Polls every 10 seconds for new unread emails.
Passes each email through the processing pipeline.
"""
import imaplib
import email
import time
import threading
import os
from email.header import decode_header
from database import SessionLocal
from services.pipeline import process_email


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

            # Mark as read
            mail.store(msg_id, "+FLAGS", "\\Seen")

            process_email(db=db, from_email=from_email, subject=subject, body=body)
            processed += 1

        except Exception as e:
            print(f"[gmail_poller] Error processing email {msg_id}: {e}")
        finally:
            db.close()

    return processed


def _poller_loop():
    gmail_user = os.environ.get("GMAIL_USER", "")
    gmail_pass = os.environ.get("GMAIL_APP_PASSWORD", "")

    if not gmail_user or not gmail_pass:
        print("[gmail_poller] GMAIL_USER or GMAIL_APP_PASSWORD not set — poller disabled.")
        return

    mail = None
    while True:
        try:
            if mail is None:
                mail = imaplib.IMAP4_SSL("imap.gmail.com")
                mail.login(gmail_user, gmail_pass)
                print(f"[gmail_poller] Connected as {gmail_user}")

            count = poll_once(mail)
            if count:
                print(f"[gmail_poller] Processed {count} new email(s)")

        except imaplib.IMAP4.abort:
            print("[gmail_poller] Connection dropped — reconnecting...")
            mail = None
        except Exception as e:
            print(f"[gmail_poller] Error: {e} — reconnecting in 30s...")
            mail = None
            time.sleep(30)
            continue

        time.sleep(10)


def start_poller():
    """Start the Gmail poller in a daemon background thread."""
    thread = threading.Thread(target=_poller_loop, daemon=True, name="gmail-poller")
    thread.start()
    print("[gmail_poller] Poller thread started.")
    return thread
