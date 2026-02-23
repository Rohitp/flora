"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useRef, useMemo, useEffect } from "react"
import {
  Home, Inbox, FileText, Settings, Zap,
  BarChart3, ChevronDown, ChevronRight,
  Search, Command, ExternalLink, HelpCircle,
  Banknote, CheckCircle2, Users, RefreshCw,
  MessageSquareText, Package, Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ForaBeeIcon } from "@/components/icons/fora-bee-icon"

type Product = "billing" | "receivables"

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: { label: string; href: string }[]
  isNew?: boolean
}

const billingNavItems: NavItem[] = [
  { label: "Home",         href: "/",   icon: <Home className="h-4 w-4" /> },
  { label: "Customers",    href: "#",   icon: <Users className="h-4 w-4" /> },
  { label: "Subscriptions",href: "#",   icon: <RefreshCw className="h-4 w-4" /> },
  {
    label: "Invoices & Credit Notes",
    icon: <FileText className="h-4 w-4" />,
    children: [
      { label: "Invoices",      href: "#" },
      { label: "Credit Notes",  href: "#" },
    ],
  },
  { label: "Quotes", href: "#", icon: <MessageSquareText className="h-4 w-4" /> },
  { label: "Approvals",       href: "#", icon: <CheckCircle2 className="h-4 w-4" /> },
  { label: "Product Catalog", href: "#", icon: <Package className="h-4 w-4" /> },
  { label: "Entitlements",    href: "#", icon: <Shield className="h-4 w-4" /> },
  {
    label: "Collections",
    icon: <Banknote className="h-4 w-4" />,
    isNew: true,
    children: [
      { label: "Overview",            href: "#" },
      { label: "Collection Forecast", href: "#" },
      { label: "Offline Dunning",     href: "#" },
    ],
  },
  { label: "RevenueStory", href: "#", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Settings",     href: "#", icon: <Settings className="h-4 w-4" /> },
]

const receivablesNavItems: NavItem[] = [
  { label: "Home",        href: "/dashboard",  icon: <Home className="h-4 w-4" /> },
  { label: "Inbox",       href: "/inbox",       icon: <Inbox className="h-4 w-4" /> },
  { label: "Invoices",    href: "/timeline",    icon: <FileText className="h-4 w-4" /> },
  { label: "Automations", href: "/automations", icon: <Zap className="h-4 w-4" /> },
  { label: "Fora Skills", href: "/skills",      icon: <ForaBeeIcon className="h-4 w-4" /> },
  { label: "Reports",     href: "#",            icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Settings",    href: "/settings",    icon: <Settings className="h-4 w-4" /> },
]

const productConfig = {
  billing: {
    label: "Billing",
    iconBg: "bg-[#ff6c37]",
    icon: <Zap className="h-3.5 w-3.5 text-white" />,
  },
  receivables: {
    label: "Receivables",
    iconBg: "bg-[#3b82f6]",
    icon: <Banknote className="h-3.5 w-3.5 text-white" />,
  },
} as const

function NavItemRow({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const hasChildren = !!item.children?.length
  const isChildActive = hasChildren
    ? item.children!.some(c => c.href !== "#" && (pathname === c.href || pathname.startsWith(c.href + "/")))
    : false
  const isDirectActive = item.href && item.href !== "#"
    ? (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
    : false
  const isActive = isDirectActive || isChildActive
  const [expanded, setExpanded] = useState(isChildActive)

  useEffect(() => {
    if (isChildActive) setExpanded(true)
  }, [isChildActive])

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded(e => !e)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors",
            "text-[#b0b7c3] hover:bg-[#2a3040] hover:text-[#e2e6ed]",
            isActive && "bg-[#2a3040] text-white",
          )}
        >
          <span className="shrink-0 opacity-70">{item.icon}</span>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {item.isNew && (
            <span className="rounded bg-[#ff6c37] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-white">
              NEW
            </span>
          )}
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
          }
        </button>
        {expanded && (
          <div className="ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l border-[#3a4050] pl-3">
            {item.children!.map(child => (
              <Link
                key={child.label}
                href={child.href}
                className={cn(
                  "rounded-md px-3 py-[5px] text-[13px] transition-colors",
                  "text-[#8a92a1] hover:bg-[#2a3040] hover:text-[#e2e6ed]",
                  child.href !== "#" && (pathname === child.href || pathname.startsWith(child.href + "/")) &&
                    "bg-[#2a3040] font-medium text-white",
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href || "#"}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors",
        "text-[#b0b7c3] hover:bg-[#2a3040] hover:text-[#e2e6ed]",
        isActive && "bg-[#2a3040] text-white",
      )}
    >
      <span className="shrink-0 opacity-70">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  )
}

function ProductSwitcher({
  open, onClose, onSelect, activeProduct, anchorRef,
}: {
  open: boolean
  onClose: () => void
  onSelect: (p: Product) => void
  activeProduct: Product
  anchorRef: React.RefObject<HTMLDivElement | null>
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return
      if (anchorRef.current?.contains(e.target as Node)) return
      onClose()
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose, anchorRef])

  if (!open) return null

  const others = (Object.keys(productConfig) as Product[]).filter(p => p !== activeProduct)

  return (
    <div
      ref={ref}
      className="absolute left-[228px] top-2 z-50 w-52 rounded-lg border border-[#2a3040] bg-[#1b2030] py-1.5 shadow-xl"
    >
      <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[#6b7889]">
        Products
      </p>
      <div className="mx-1.5 flex items-center gap-2.5 rounded-md bg-[#2a3040] px-3 py-2">
        <div className={cn("flex h-5 w-5 items-center justify-center rounded", productConfig[activeProduct].iconBg)}>
          {productConfig[activeProduct].icon}
        </div>
        <span className="text-[13px] font-medium text-white">{productConfig[activeProduct].label}</span>
        <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-[#4ade80]" />
      </div>

      <div className="mx-3 my-1.5 border-t border-[#2a3040]" />
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#6b7889]">
        Switch to
      </p>
      {others.map(p => (
        <button
          key={p}
          onClick={() => { onSelect(p); onClose() }}
          className="mx-1.5 flex w-[calc(100%-12px)] items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-[#2a3040]"
        >
          <div className={cn("flex h-5 w-5 items-center justify-center rounded", productConfig[p].iconBg)}>
            {productConfig[p].icon}
          </div>
          <span className="text-[13px] font-medium text-[#b0b7c3]">{productConfig[p].label}</span>
        </button>
      ))}
    </div>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  const activeProduct: Product = useMemo(
    () => (pathname === "/" ? "billing" : "receivables"),
    [pathname],
  )

  const config = productConfig[activeProduct]
  const navItems = activeProduct === "receivables" ? receivablesNavItems : billingNavItems

  function handleSwitch(p: Product) {
    router.push(p === "billing" ? "/" : "/dashboard")
  }

  return (
    <aside className="relative flex h-screen w-[220px] shrink-0 flex-col bg-[#1b2030]">
      {/* Product header */}
      <div
        ref={headerRef}
        onClick={() => setSwitcherOpen(o => !o)}
        className="flex cursor-pointer items-center gap-2 px-4 pb-1 pt-4 hover:opacity-90"
      >
        <div className={cn("flex h-6 w-6 items-center justify-center rounded", config.iconBg)}>
          {config.icon}
        </div>
        <span className="text-sm font-semibold text-white">{config.label}</span>
        <ChevronDown className={cn(
          "ml-auto h-3.5 w-3.5 text-[#6b7889] transition-transform",
          switcherOpen && "rotate-180",
        )} />
      </div>

      <ProductSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        onSelect={handleSwitch}
        activeProduct={activeProduct}
        anchorRef={headerRef}
      />

      {/* Org */}
      <div className="px-3 py-2">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#2a3040]">
          <div className="flex-1 truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">Gingercorp</span>
              <span className="rounded bg-[#22c55e]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#4ade80]">
                Live
              </span>
            </div>
            <p className="truncate text-[11px] text-[#6b7889]">gingercorp.chargebee.com</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6b7889]" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-1">
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[13px] text-[#8a92a1] hover:bg-[#2a3040]">
          <Search className="h-4 w-4 opacity-60" />
          <span>Go to</span>
          <span className="ml-auto flex items-center gap-0.5 text-[11px] text-[#6b7889]">
            <Command className="h-3 w-3" />K
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        <div className="flex flex-col gap-0.5">
          {navItems.map(item => <NavItemRow key={item.label} item={item} />)}
        </div>
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-0.5 border-t border-[#2a3040] px-3 py-2">
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-[13px] text-[#8a92a1] hover:bg-[#2a3040] hover:text-[#e2e6ed]">
          <ExternalLink className="h-4 w-4 opacity-60" />
          <span>{"What's new"}</span>
        </button>
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-[13px] text-[#8a92a1] hover:bg-[#2a3040] hover:text-[#e2e6ed]">
          <HelpCircle className="h-4 w-4 opacity-60" />
          <span>Need Help?</span>
        </button>
      </div>
    </aside>
  )
}
