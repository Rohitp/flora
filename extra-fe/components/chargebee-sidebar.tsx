"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useRef, useMemo, useEffect } from "react"
import {
  Home,
  Users,
  RefreshCw,
  FileText,
  MessageSquareText,
  CheckCircle2,
  Package,
  Shield,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Search,
  Command,
  ExternalLink,
  HelpCircle,
  MoreHorizontal,
  Banknote,
  Zap,
  Workflow,
  Inbox,
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
  { label: "Home", href: "/", icon: <Home className="h-4 w-4" /> },
  { label: "Customers", href: "#", icon: <Users className="h-4 w-4" /> },
  { label: "Subscriptions", href: "#", icon: <RefreshCw className="h-4 w-4" /> },
  {
    label: "Invoices & Credit Notes",
    icon: <FileText className="h-4 w-4" />,
    children: [
      { label: "Invoices", href: "#" },
      { label: "Credit Notes", href: "#" },
    ],
  },
  { label: "Quotes", href: "#", icon: <MessageSquareText className="h-4 w-4" /> },
  {
    label: "Approvals",
    icon: <CheckCircle2 className="h-4 w-4" />,
    children: [],
  },
  {
    label: "Product Catalog",
    icon: <Package className="h-4 w-4" />,
    children: [],
  },
  {
    label: "Entitlements",
    icon: <Shield className="h-4 w-4" />,
    children: [],
  },
  {
    label: "Collections",
    icon: <Banknote className="h-4 w-4" />,
    isNew: true,
    children: [
      { label: "Overview", href: "/billing/collections" },
      { label: "Collection Forecast", href: "/billing/cash-flow" },
      { label: "Offline Dunning", href: "/billing/offline-dunning" },
    ],
  },
  {
    label: "RevenueStory",
    icon: <BarChart3 className="h-4 w-4" />,
    children: [],
  },
  {
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
    children: [],
  },
]

const receivablesNavItems: NavItem[] = [
  { label: "Home", href: "/receivables", icon: <Home className="h-4 w-4" /> },
  { label: "Inbox", href: "/receivables/inbox", icon: <Inbox className="h-4 w-4" /> },
  { label: "Receivables", href: "/receivables/collections", icon: <Banknote className="h-4 w-4" /> },
  {
    label: "Automations",
    icon: <Workflow className="h-4 w-4" />,
    children: [
      { label: "Invoice Reminders", href: "/receivables/automations" },
      { label: "P2P Reminders", href: "/receivables/automations/p2p" },
    ],
  },
  { label: "Fora Skills", href: "/receivables/fora-skills", icon: <ForaBeeIcon className="h-4 w-4" /> },
  { label: "Reports", href: "#", icon: <BarChart3 className="h-4 w-4" /> },
  {
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
    children: [],
  },
]

function NavItemRow({ item, defaultExpanded }: { item: NavItem; defaultExpanded?: boolean }) {
  const pathname = usePathname()
  const hasChildren = item.children && item.children.length > 0

  const isChildActive = hasChildren
    ? item.children!.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"))
    : false
  const isDirectActive = item.href ? pathname === item.href : false
  const isActive = isDirectActive || isChildActive

  const [expanded, setExpanded] = useState(isChildActive || !!defaultExpanded)

  useEffect(() => {
    if (isChildActive && !expanded) {
      setExpanded(true)
    }
  }, [isChildActive, expanded])

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors",
            "text-[#b0b7c3] hover:bg-[#2a3040] hover:text-[#e2e6ed]",
            isActive && "bg-[#2a3040] text-[#ffffff]"
          )}
        >
          <span className="shrink-0 opacity-70">{item.icon}</span>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {item.isNew && (
            <span className="rounded bg-[#ff6c37] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-white">
              NEW
            </span>
          )}
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
          )}
        </button>
        {expanded && (
          <div className="ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l border-[#3a4050] pl-3">
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "rounded-md px-3 py-[5px] text-[13px] transition-colors",
                  "text-[#8a92a1] hover:bg-[#2a3040] hover:text-[#e2e6ed]",
                  (pathname === child.href || pathname.startsWith(child.href + "/")) &&
                    "bg-[#2a3040] text-[#ffffff] font-medium"
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
        isActive && "bg-[#2a3040] text-[#ffffff]"
      )}
    >
      <span className="shrink-0 opacity-70">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  )
}

const productConfig = {
  billing: {
    label: "Billing",
    icon: <Zap className="h-3.5 w-3.5 text-white" />,
    iconBg: "bg-[#ff6c37]",
  },
  receivables: {
    label: "Receivables",
    icon: <Banknote className="h-3.5 w-3.5 text-white" />,
    iconBg: "bg-[#3b82f6]",
  },
} as const

function ProductSwitcher({
  open,
  onClose,
  onSelect,
  activeProduct,
  anchorRef,
}: {
  open: boolean
  onClose: () => void
  onSelect: (product: Product) => void
  activeProduct: Product
  anchorRef: React.RefObject<HTMLDivElement | null>
}) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, onClose, anchorRef])

  if (!open) return null

  const otherProducts = (Object.keys(productConfig) as Product[]).filter(
    (p) => p !== activeProduct
  )

  return (
    <div
      ref={popoverRef}
      className="absolute left-[228px] top-2 z-50 w-52 rounded-lg border border-[#2a3040] bg-[#1b2030] py-1.5 shadow-xl"
    >
      <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[#6b7889]">
        Products
      </p>

      {/* Active product */}
      <div className="mx-1.5 flex items-center gap-2.5 rounded-md bg-[#2a3040] px-3 py-2">
        <div className={cn("flex h-5 w-5 items-center justify-center rounded", productConfig[activeProduct].iconBg)}>
          {productConfig[activeProduct].icon}
        </div>
        <span className="text-[13px] font-medium text-white">
          {productConfig[activeProduct].label}
        </span>
        <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-[#4ade80]" />
      </div>

      {/* Divider */}
      <div className="mx-3 my-1.5 border-t border-[#2a3040]" />

      {/* Other products */}
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#6b7889]">
        Switch to
      </p>
      {otherProducts.map((product) => (
        <button
          key={product}
          onClick={() => {
            onSelect(product)
            onClose()
          }}
          className="mx-1.5 flex w-[calc(100%-12px)] items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-[#2a3040]"
        >
          <div className={cn("flex h-5 w-5 items-center justify-center rounded", productConfig[product].iconBg)}>
            {productConfig[product].icon}
          </div>
          <span className="text-[13px] font-medium text-[#b0b7c3]">
            {productConfig[product].label}
          </span>
        </button>
      ))}
    </div>
  )
}

export function ChargebeeSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [productSwitcherOpen, setProductSwitcherOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  // Derive active product purely from URL
  const activeProduct: Product = useMemo(() => {
    if (pathname.startsWith("/receivables")) return "receivables"
    return "billing"
  }, [pathname])

  const navItems = activeProduct === "receivables" ? receivablesNavItems : billingNavItems
  const config = productConfig[activeProduct]

  function handleProductSwitch(product: Product) {
    if (product === "billing") {
      router.push("/")
    } else {
      // Receivables is the standalone app running on port 3000
      window.location.href = "http://localhost:3000"
    }
  }

  return (
    <aside className="relative flex h-screen w-[220px] shrink-0 flex-col bg-[#1b2030]">
      {/* Product header */}
      <div
        ref={headerRef}
        onClick={() => setProductSwitcherOpen(!productSwitcherOpen)}
        className="flex cursor-pointer items-center gap-2 px-4 pt-4 pb-1 hover:opacity-90"
      >
        <div className={cn("flex h-6 w-6 items-center justify-center rounded", config.iconBg)}>
          {config.icon}
        </div>
        <span className="text-sm font-semibold text-white">{config.label}</span>
        <ChevronDown className={cn(
          "ml-auto h-3.5 w-3.5 text-[#6b7889] transition-transform",
          productSwitcherOpen && "rotate-180"
        )} />
      </div>

      <ProductSwitcher
        open={productSwitcherOpen}
        onClose={() => setProductSwitcherOpen(false)}
        onSelect={handleProductSwitch}
        activeProduct={activeProduct}
        anchorRef={headerRef}
      />

      {/* Org selector */}
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

      {/* Go to search */}
      <div className="px-3 pb-1">
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[13px] text-[#8a92a1] hover:bg-[#2a3040]">
          <Search className="h-4 w-4 opacity-60" />
          <span>Go to</span>
          <span className="ml-auto flex items-center gap-0.5 text-[11px] text-[#6b7889]">
            <Command className="h-3 w-3" />K
          </span>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavItemRow key={item.label} item={item} />
          ))}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col gap-0.5 border-t border-[#2a3040] px-3 py-2">
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-[13px] text-[#8a92a1] hover:bg-[#2a3040] hover:text-[#e2e6ed]">
          <ExternalLink className="h-4 w-4 opacity-60" />
          <span>{"What's new"}</span>
          <ExternalLink className="ml-auto h-3 w-3 opacity-30" />
        </button>
        <button className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[13px] text-[#8a92a1] hover:bg-[#2a3040] hover:text-[#e2e6ed]">
          <span className="flex items-center gap-3">
            <HelpCircle className="h-4 w-4 opacity-60" />
            <span>Need Help?</span>
          </span>
          <MoreHorizontal className="h-3.5 w-3.5 opacity-40" />
        </button>

        {/* User */}
        <div className="mt-1 flex items-center gap-2 rounded-md px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3b82f6] text-xs font-semibold text-white">
            AK
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-xs font-medium text-white">Arjun Kumar</p>
            <p className="truncate text-[11px] text-[#6b7889]">arjun.k@gingercorp.com</p>
          </div>
          <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-[#6b7889]" />
        </div>
      </div>
    </aside>
  )
}
