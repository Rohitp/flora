"""
Seed the database with 9 customers (5 dummy + 4 live demo) + invoices + global/customer settings.
Called on startup if the customers table is empty.
"""
from datetime import date, timedelta
from models import Customer, Invoice, Setting


def get_due_date(offset_days: int) -> date:
    return date.today() + timedelta(days=offset_days)


CUSTOMERS = [
    {
        "name": "NovaTech Corp",
        "email": "billing@novatech-demo.com",
        "initials": "NC",
        "color": "bg-teal-600",
        "invoice_number": "IN-1023",
        "amount": 34200.00,
        "due_offset": +7,  # due in 7 days — current
    },
    {
        "name": "Pinnacle Corp",
        "email": "finance@pinnacle-demo.com",
        "initials": "PC",
        "color": "bg-slate-600",
        "invoice_number": "IN-1035",
        "amount": 23400.00,
        "due_offset": -12,  # 12 days overdue
    },
    {
        "name": "Meridian LLC",
        "email": "ar@meridian-demo.com",
        "initials": "ML",
        "color": "bg-violet-600",
        "invoice_number": "IN-1040",
        "amount": 18900.00,
        "due_offset": -16,  # 16 days overdue
    },
    {
        "name": "Acme Inc",
        "email": "billing@acme-demo.com",
        "initials": "AI",
        "color": "bg-blue-600",
        "invoice_number": "IN-1045",
        "amount": 12500.00,
        "due_offset": +14,  # due in 14 days — current
    },
    {
        "name": "GlobalTech Solutions",
        "email": "ap@globaltech-demo.com",
        "initials": "GS",
        "color": "bg-emerald-600",
        "invoice_number": "IN-1030",
        "amount": 8750.00,
        "due_offset": +3,  # due in 3 days — current
    },
    # Live demo accounts — real email senders matched to these customers
    {
        "name": "Rajaraman and Daughter Finance",
        "email": "rr@chargebee.com",
        "initials": "RD",
        "color": "bg-orange-600",
        "invoice_number": "IN-1050",
        "amount": 45000.00,
        "due_offset": -5,  # 5 days overdue
    },
    {
        "name": "Saravana Technology Services",
        "email": "kps@chargebee.com",
        "initials": "ST",
        "color": "bg-indigo-600",
        "invoice_number": "IN-1055",
        "amount": 28500.00,
        "due_offset": +10,  # due in 10 days — current
    },
    {
        "name": "Ankhmorprok Antiquities",
        "email": "rohit.p@chargebee.com",
        "initials": "AA",
        "color": "bg-pink-600",
        "invoice_number": "IN-1060",
        "amount": 15750.00,
        "due_offset": -20,  # 20 days overdue
    },
    {
        "name": "Mahesh Pav Bhaji Company",
        "email": "maheshwar.v@chargebee.com",
        "initials": "MP",
        "color": "bg-amber-600",
        "invoice_number": "IN-1065",
        "amount": 9200.00,
        "due_offset": +5,  # due in 5 days — current
    },
]

GLOBAL_SETTINGS = [
    ("contact_language", "English"),
    ("escalation_threshold_days", "30"),
    ("max_reminders_before_escalation", "5"),
    ("business_hours_only", "true"),
    ("reply_sign_off", "Collections Team"),
    ("company_name", "Receivables Co"),
]

# Per-customer settings — demonstrate variety for the agent to work with
CUSTOMER_SETTINGS = {
    "Pinnacle Corp": [
        ("dispute_route", "legal"),
        ("agent_notes", "Finance contact is Sarah Chen. Prefers email over phone. Has history of late payment but always pays."),
    ],
    "Meridian LLC": [
        ("agent_notes", "Escalated to account manager on Feb 10. Do not send automated reminders — coordinate with sales."),
        ("pause_automated_contact", "true"),
    ],
    "GlobalTech Solutions": [
        ("agent_notes", "Invoice disputed — customer claims they never received goods. Awaiting internal review."),
        ("dispute_route", "finance_review"),
    ],
    "NovaTech Corp": [
        ("preferred_contact_time", "morning"),
        ("agent_notes", "Key account. Handle with care. CC account manager on all escalations."),
    ],
    "Rajaraman and Daughter Finance": [
        ("agent_notes", "Owner Rajaraman handles payments personally. Family business — be respectful and formal in tone."),
        ("preferred_contact_time", "morning"),
    ],
    "Saravana Technology Services": [
        ("agent_notes", "Finance contact is KPS. Fast payer historically — likely an oversight if overdue. Friendly tone appropriate."),
    ],
    "Ankhmorprok Antiquities": [
        ("agent_notes", "Rohit handles AR directly. Unusual business name — do not abbreviate. Payment often delayed but always clears."),
        ("dispute_route", "finance_review"),
    ],
    "Mahesh Pav Bhaji Company": [
        ("agent_notes", "Maheshwar is the owner and finance contact. Small business — be empathetic. Prefers short, direct emails."),
        ("preferred_contact_time", "afternoon"),
    ],
}


def seed(db) -> None:
    from models import Customer as CustomerModel

    existing = db.query(CustomerModel).first()
    if existing:
        return  # already seeded

    customer_map = {}

    for c in CUSTOMERS:
        due_date = get_due_date(c["due_offset"])
        status = "current" if c["due_offset"] >= 0 else "overdue"

        customer = Customer(
            name=c["name"],
            email=c["email"],
            initials=c["initials"],
            color=c["color"],
        )
        db.add(customer)
        db.flush()  # get customer.id

        invoice = Invoice(
            customer_id=customer.id,
            invoice_number=c["invoice_number"],
            amount=c["amount"],
            due_date=due_date,
            status=status,
        )
        db.add(invoice)
        customer_map[c["name"]] = customer

    # Global settings
    for key, value in GLOBAL_SETTINGS:
        db.add(Setting(scope="global", customer_id=None, key=key, value=value))

    # Customer-specific settings
    db.flush()
    for customer_name, settings in CUSTOMER_SETTINGS.items():
        customer = customer_map.get(customer_name)
        if customer:
            for key, value in settings:
                db.add(Setting(scope="customer", customer_id=customer.id, key=key, value=value))

    db.commit()
    print(f"[seed] Seeded {len(CUSTOMERS)} customers with invoices and settings.")
