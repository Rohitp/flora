// Mock data for the AR management application

export type ThreadStatus = "open" | "p2p" | "dispute" | "bounced" | "closed"

export interface EmailThread {
  id: string
  company: string
  initials: string
  color: string
  subject: string
  preview: string
  invoiceIds: string[]
  status: ThreadStatus
  timeAgo: string
  unread: boolean
  emails: Email[]
  totalAmount: number
}

export interface Email {
  id: string
  from: string
  to: string
  date: string
  body: string
}

export interface Customer {
  name: string
  initials: string
  color: string
  openInvoices: number
  totalOutstanding: number
  invoices: Invoice[]
  invoiceHistory: { amount: number; status: "paid" | "overdue" }[]
}

export interface Invoice {
  id: string
  amount: number
  dueDate: string
  status: "current" | "overdue" | "paid" | "disputed"
  daysOverdue?: number
  daysUntilDue?: number
}

export interface TimelineEvent {
  id: string
  date: string
  action: string
  audience: "Customer" | "Internal"
  status: "completed" | "sent" | "pending" | "paused" | "cancelled"
  type: "email" | "escalation" | "call" | "ai-action"
  note?: string
  aiGenerated?: boolean
  dayOffset: number
}

export interface AutomationRule {
  id: string
  name: string
  dayOffset: number
  audience: "Customer" | "Internal"
  frequency: "Daily" | "Weekly" | "Once"
  status: "active" | "paused"
  lastUpdated: string
  type: "email" | "escalation"
}

export const threads: EmailThread[] = [
  {
    id: "t1",
    company: "Acme Inc",
    initials: "AI",
    color: "bg-blue-600",
    subject: "Re: Payment extension request for...",
    preview: "We'd like to request a 15-day extension on the payment...",
    invoiceIds: ["IN-1045", "IN-1046"],
    status: "open",
    timeAgo: "2 hours ago",
    unread: true,
    totalAmount: 12500,
    emails: [
      {
        id: "e1",
        from: "billing@acme.com",
        to: "collections@company.com",
        date: "2026-02-18",
        body: "Hi,\n\nWe'd like to request a 15-day extension on the payment for invoices IN-1045 and IN-1046. Our finance department is processing the payment but we need additional time due to internal approval cycles.\n\nPlease let us know if this is acceptable.\n\nBest regards,\nAcme Billing",
      },
    ],
  },
  {
    id: "t2",
    company: "GlobalTech Solutions",
    initials: "GS",
    color: "bg-emerald-600",
    subject: "Dispute: Incorrect charges on invo...",
    preview: "We are disputing the charges on invoice IN-1030...",
    invoiceIds: ["IN-1030"],
    status: "dispute",
    timeAgo: "5 hours ago",
    unread: true,
    totalAmount: 8750,
    emails: [
      {
        id: "e2",
        from: "ap@globaltech.com",
        to: "collections@company.com",
        date: "2026-02-18",
        body: "Hi,\n\nWe are disputing the charges on invoice IN-1030. The line items for consulting services do not match our agreed contract terms. Please review and send a corrected invoice.\n\nRegards,\nGlobalTech AP Department",
      },
    ],
  },
  {
    id: "t3",
    company: "Pinnacle Corp",
    initials: "PC",
    color: "bg-slate-600",
    subject: "Re: Payment confirmation for IN-1...",
    preview: "Payment has been processed and should arrive within...",
    invoiceIds: ["IN-1035", "IN-1036"],
    status: "p2p",
    timeAgo: "1 day ago",
    unread: false,
    totalAmount: 23400,
    emails: [
      {
        id: "e3",
        from: "finance@pinnacle.com",
        to: "collections@company.com",
        date: "2026-02-17",
        body: "Hi,\n\nPayment has been processed and should arrive within 3-5 business days. Our reference number is PAY-2026-0218. Please confirm receipt.\n\nThanks,\nPinnacle Finance",
      },
    ],
  },
  {
    id: "t4",
    company: "Unknown Sender",
    initials: "US",
    color: "bg-gray-500",
    subject: "Bank details clarification",
    preview: "We need updated bank details for wire transfer...",
    invoiceIds: [],
    status: "open",
    timeAgo: "3 days ago",
    unread: false,
    totalAmount: 0,
    emails: [
      {
        id: "e4",
        from: "unknown@external.com",
        to: "collections@company.com",
        date: "2026-02-15",
        body: "Hi,\n\nWe need updated bank details for wire transfer. The account information we have on file seems outdated. Could you please provide current banking details?\n\nThank you",
      },
    ],
  },
  {
    id: "t5",
    company: "GlobalTech Solutions",
    initials: "GS",
    color: "bg-emerald-600",
    subject: "Service quality concern on IN-1051",
    preview: "We have concerns about the service quality...",
    invoiceIds: ["IN-1051"],
    status: "dispute",
    timeAgo: "6 hours ago",
    unread: true,
    totalAmount: 4200,
    emails: [
      {
        id: "e5",
        from: "ap@globaltech.com",
        to: "collections@company.com",
        date: "2026-02-18",
        body: "Hi,\n\nWe have concerns about the service quality delivered against invoice IN-1051. The deliverables did not meet the specifications outlined in our SOW. We'd like to discuss a credit adjustment.\n\nRegards,\nGlobalTech AP",
      },
    ],
  },
  {
    id: "t6",
    company: "Meridian LLC",
    initials: "ML",
    color: "bg-indigo-600",
    subject: "Re: Overdue notice for IN-1040",
    preview: "We acknowledge the overdue status and are arranging...",
    invoiceIds: ["IN-1040"],
    status: "open",
    timeAgo: "1 day ago",
    unread: false,
    totalAmount: 18900,
    emails: [
      {
        id: "e6",
        from: "finance@meridian.com",
        to: "collections@company.com",
        date: "2026-02-17",
        body: "Hi,\n\nWe acknowledge the overdue status of invoice IN-1040 and are arranging payment. Our CFO will approve the transfer by end of this week.\n\nApologies for the delay.\n\nMeridian Finance",
      },
    ],
  },
  {
    id: "t7",
    company: "Acme Inc",
    initials: "AI",
    color: "bg-blue-600",
    subject: "Re: Invoice IN-1050 payment confi...",
    preview: "Payment for IN-1050 has been scheduled for...",
    invoiceIds: ["IN-1050"],
    status: "p2p",
    timeAgo: "4 hours ago",
    unread: false,
    totalAmount: 5600,
    emails: [
      {
        id: "e7",
        from: "billing@acme.com",
        to: "collections@company.com",
        date: "2026-02-18",
        body: "Hi,\n\nPayment for IN-1050 has been scheduled for March 1st. You should see it reflected in your account within 2 business days after that.\n\nBest,\nAcme Billing",
      },
    ],
  },
  {
    id: "t8",
    company: "Vertex Systems",
    initials: "VS",
    color: "bg-rose-600",
    subject: "Re: Outstanding payment for IN-1...",
    preview: "We acknowledge the overdue invoice IN-1041...",
    invoiceIds: ["IN-1041"],
    status: "open",
    timeAgo: "2 days ago",
    unread: false,
    totalAmount: 65,
    emails: [
      {
        id: "e8",
        from: "finance@vertexsys.com",
        to: "collections@company.com",
        date: "2026-02-18",
        body: "Hi,\n\nWe acknowledge the overdue invoice IN-1041 ($65). Our CFO has approved the payment and we are arranging it this month. Apologies for the delay.\n\nVertex Systems Finance",
      },
    ],
  },
  {
    id: "t9",
    company: "NovaTech Corp",
    initials: "NC",
    color: "bg-teal-600",
    subject: "Question about invoice IN-1023 lin...",
    preview: "Could you clarify the line items on IN-1023...",
    invoiceIds: ["IN-1023"],
    status: "open",
    timeAgo: "3 hours ago",
    unread: true,
    totalAmount: 34200,
    emails: [
      {
        id: "e9",
        from: "ap@novatech.com",
        to: "collections@company.com",
        date: "2026-02-18",
        body: "Hi,\n\nCould you clarify the line items on IN-1023? We see a charge for 'Platform License - Enterprise' but our contract specifies 'Platform License - Professional'. Please advise.\n\nNovaTech AP",
      },
    ],
  },
  {
    id: "t10",
    company: "Summit Partners",
    initials: "SP",
    color: "bg-amber-600",
    subject: "Payment processed for IN-1028",
    preview: "This is to confirm that payment for IN-1028...",
    invoiceIds: ["IN-1028"],
    status: "closed",
    timeAgo: "5 hours ago",
    unread: false,
    totalAmount: 0,
    emails: [
      {
        id: "e10",
        from: "finance@summit.com",
        to: "collections@company.com",
        date: "2026-02-18",
        body: "Hi,\n\nThis is to confirm that payment for IN-1028 has been processed via wire transfer. Reference: WTR-2026-0218-SP. Please confirm receipt.\n\nSummit Partners Finance",
      },
    ],
  },
]

export const customers: Record<string, Customer> = {
  "Vertex Systems": {
    name: "Vertex Systems",
    initials: "VS",
    color: "bg-rose-600",
    openInvoices: 1,
    totalOutstanding: 65,
    invoices: [
      { id: "IN-1041", amount: 65, dueDate: "2025-11-22", status: "overdue", daysOverdue: 91 },
    ],
    invoiceHistory: [
      { amount: 65, status: "overdue" },
      { amount: 4400, status: "paid" },
    ],
  },
  "Acme Inc": {
    name: "Acme Inc",
    initials: "AI",
    color: "bg-blue-600",
    openInvoices: 3,
    totalOutstanding: 18100,
    invoices: [
      { id: "IN-1045", amount: 7500, dueDate: "2026-02-25", status: "current", daysUntilDue: 4 },
      { id: "IN-1046", amount: 5000, dueDate: "2026-03-01", status: "current", daysUntilDue: 8 },
      { id: "IN-1050", amount: 5600, dueDate: "2026-02-15", status: "overdue", daysOverdue: 6 },
    ],
    invoiceHistory: [
      { amount: 7500, status: "overdue" },
      { amount: 5000, status: "overdue" },
      { amount: 5600, status: "paid" },
      { amount: 12000, status: "paid" },
      { amount: 8900, status: "paid" },
    ],
  },
  "GlobalTech Solutions": {
    name: "GlobalTech Solutions",
    initials: "GS",
    color: "bg-emerald-600",
    openInvoices: 2,
    totalOutstanding: 12950,
    invoices: [
      { id: "IN-1030", amount: 8750, dueDate: "2026-01-15", status: "disputed", daysOverdue: 37 },
      { id: "IN-1051", amount: 4200, dueDate: "2026-02-10", status: "disputed", daysOverdue: 11 },
    ],
    invoiceHistory: [
      { amount: 8750, status: "overdue" },
      { amount: 4200, status: "overdue" },
      { amount: 15000, status: "paid" },
      { amount: 9800, status: "paid" },
    ],
  },
}

export const timelineEvents: TimelineEvent[] = [
  {
    id: "tl1",
    date: "2025-11-15",
    action: "Invoice IN-1041 issued",
    audience: "Customer",
    status: "completed",
    type: "email",
    dayOffset: -7,
  },
  {
    id: "tl2",
    date: "2025-11-18",
    action: "Soft reminder - 4 days before due",
    audience: "Customer",
    status: "sent",
    type: "email",
    dayOffset: -4,
  },
  {
    id: "tl3",
    date: "2025-11-22",
    action: "Invoice due date",
    audience: "Customer",
    status: "completed",
    type: "email",
    dayOffset: 0,
  },
  {
    id: "tl4",
    date: "2025-11-23",
    action: "Payment reminder - 1 day overdue",
    audience: "Customer",
    status: "sent",
    type: "email",
    dayOffset: 1,
  },
  {
    id: "tl5",
    date: "2025-11-27",
    action: "Payment reminder - 5 days overdue",
    audience: "Customer",
    status: "sent",
    type: "email",
    dayOffset: 5,
  },
  {
    id: "tl6",
    date: "2025-12-02",
    action: "Escalation reminder - 10 days overdue",
    audience: "Customer",
    status: "sent",
    type: "email",
    dayOffset: 10,
  },
  {
    id: "tl7",
    date: "2025-12-07",
    action: "Internal escalation - Account flagged",
    audience: "Internal",
    status: "completed",
    type: "escalation",
    dayOffset: 15,
  },
  {
    id: "tl8",
    date: "2025-12-12",
    action: "Urgent reminder - 20 days overdue",
    audience: "Customer",
    status: "sent",
    type: "email",
    dayOffset: 20,
  },
  {
    id: "tl9",
    date: "2025-12-17",
    action: "Escalation - 25 days overdue",
    audience: "Customer",
    status: "sent",
    type: "email",
    dayOffset: 25,
  },
  {
    id: "tl10",
    date: "2026-01-06",
    action: "Final notice - 45 days overdue",
    audience: "Customer",
    status: "sent",
    type: "email",
    dayOffset: 45,
  },
  {
    id: "tl11",
    date: "2026-02-18",
    action: "Customer replied - promised payment",
    audience: "Customer",
    status: "completed",
    type: "ai-action",
    note: "Paused -- customer promised payment this month",
    aiGenerated: true,
    dayOffset: 88,
  },
  {
    id: "tl12",
    date: "2026-03-05",
    action: "Follow-up if payment not received",
    audience: "Customer",
    status: "pending",
    type: "email",
    note: "AI-scheduled follow-up based on customer promise",
    aiGenerated: true,
    dayOffset: 103,
  },
]

export const automationRules: AutomationRule[] = [
  {
    id: "r1",
    name: "Soft Reminder - Before Due Date",
    dayOffset: -7,
    audience: "Customer",
    frequency: "Once",
    status: "active",
    lastUpdated: "20-Feb-2026",
    type: "email",
  },
  {
    id: "r2",
    name: "Due Date Reminder",
    dayOffset: 0,
    audience: "Customer",
    frequency: "Once",
    status: "active",
    lastUpdated: "20-Feb-2026",
    type: "email",
  },
  {
    id: "r3",
    name: "Invoice Due by 1 day",
    dayOffset: 1,
    audience: "Customer",
    frequency: "Daily",
    status: "active",
    lastUpdated: "20-Feb-2026",
    type: "email",
  },
  {
    id: "r4",
    name: "Invoice Due by 5 days",
    dayOffset: 5,
    audience: "Customer",
    frequency: "Daily",
    status: "active",
    lastUpdated: "20-Feb-2026",
    type: "email",
  },
  {
    id: "r5",
    name: "Invoice Due by 10 days",
    dayOffset: 10,
    audience: "Customer",
    frequency: "Daily",
    status: "active",
    lastUpdated: "20-Feb-2026",
    type: "email",
  },
  {
    id: "r6",
    name: "Invoice Due by 15 days",
    dayOffset: 15,
    audience: "Customer",
    frequency: "Daily",
    status: "active",
    lastUpdated: "20-Feb-2026",
    type: "email",
  },
  {
    id: "r7",
    name: "Internal Escalation - 15 days",
    dayOffset: 15,
    audience: "Internal",
    frequency: "Once",
    status: "active",
    lastUpdated: "20-Feb-2026",
    type: "escalation",
  },
  {
    id: "r8",
    name: "Invoice Due by 20 days",
    dayOffset: 20,
    audience: "Customer",
    frequency: "Daily",
    status: "active",
    lastUpdated: "20-Feb-2026",
    type: "email",
  },
  {
    id: "r9",
    name: "Invoice Due by 25 days",
    dayOffset: 25,
    audience: "Customer",
    frequency: "Daily",
    status: "active",
    lastUpdated: "20-Feb-2026",
    type: "email",
  },
  {
    id: "r10",
    name: "Final Notice - 45 days",
    dayOffset: 45,
    audience: "Customer",
    frequency: "Daily",
    status: "active",
    lastUpdated: "20-Feb-2026",
    type: "email",
  },
  {
    id: "r11",
    name: "Manager Escalation - 30 days",
    dayOffset: 30,
    audience: "Internal",
    frequency: "Weekly",
    status: "paused",
    lastUpdated: "19-Feb-2026",
    type: "escalation",
  },
  {
    id: "r12",
    name: "Legal Notice Prep - 60 days",
    dayOffset: 60,
    audience: "Internal",
    frequency: "Once",
    status: "paused",
    lastUpdated: "18-Feb-2026",
    type: "escalation",
  },
]

export const dashboardKPIs = {
  totalOutstanding: 342650,
  current: 187400,
  overdue1to30: 89250,
  overdue30plus: 66000,
  promiseToPay: 47600,
  disputes: 12950,
}

export const topCustomers = [
  { name: "NovaTech Corp", initials: "NC", color: "bg-teal-600", amount: 34200, invoiceId: "IN-1023", dueDate: "2026-02-28", daysUntilDue: 7, status: "current" as const },
  { name: "Pinnacle Corp", initials: "PC", color: "bg-slate-600", amount: 23400, invoiceId: "IN-1035", dueDate: "2026-02-10", daysOverdue: 11, status: "p2p" as const },
  { name: "Meridian LLC", initials: "ML", color: "bg-indigo-600", amount: 18900, invoiceId: "IN-1040", dueDate: "2026-02-05", daysOverdue: 16, status: "overdue" as const },
  { name: "Acme Inc", initials: "AI", color: "bg-blue-600", amount: 12500, invoiceId: "IN-1045", dueDate: "2026-02-25", daysUntilDue: 4, status: "current" as const },
  { name: "GlobalTech Solutions", initials: "GS", color: "bg-emerald-600", amount: 8750, invoiceId: "IN-1030", dueDate: "2026-01-15", daysOverdue: 37, status: "dispute" as const },
]

export const recentActivity = [
  { id: "a1", action: "Paused reminders for Vertex Systems", detail: "Customer promised payment by end of month", time: "2 hours ago", type: "ai" as const },
  { id: "a2", action: "Sent reminder to Meridian LLC", detail: "Overdue notice for IN-1040 (+16 days)", time: "3 hours ago", type: "email" as const },
  { id: "a3", action: "Escalation created for GlobalTech", detail: "Dispute on IN-1030 flagged to manager", time: "5 hours ago", type: "escalation" as const },
  { id: "a4", action: "Sent reminder to NovaTech Corp", detail: "Upcoming due date reminder for IN-1023", time: "6 hours ago", type: "email" as const },
  { id: "a5", action: "Auto-classified thread from Acme Inc", detail: "Marked as payment extension request", time: "8 hours ago", type: "ai" as const },
  { id: "a6", action: "Sent follow-up to Pinnacle Corp", detail: "Payment confirmation request for IN-1035", time: "1 day ago", type: "email" as const },
]
