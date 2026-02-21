"""
Gmail SMTP sender.
Uses the same credentials as the IMAP poller.
Sends actual emails — this is the demo's lightbulb moment.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_reply(
    to_email: str,
    subject: str,
    body: str,
    in_reply_to_subject: str | None = None,
) -> bool:
    """
    Send an email reply via Gmail SMTP.
    Returns True on success, False on failure.
    """
    gmail_user = os.environ.get("GMAIL_USER", "")
    gmail_pass = os.environ.get("GMAIL_APP_PASSWORD", "")

    if not gmail_user or not gmail_pass:
        print("[gmail_sender] GMAIL_USER or GMAIL_APP_PASSWORD not set — cannot send.")
        return False

    reply_subject = subject if subject.lower().startswith("re:") else f"Re: {subject}"

    msg = MIMEMultipart("alternative")
    msg["From"] = gmail_user
    msg["To"] = to_email
    msg["Subject"] = reply_subject

    # Plain text part
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(gmail_user, gmail_pass)
            server.sendmail(gmail_user, to_email, msg.as_string())
        print(f"[gmail_sender] Sent reply to {to_email} — subject: {reply_subject}")
        return True
    except Exception as e:
        print(f"[gmail_sender] Failed to send to {to_email}: {e}")
        return False
