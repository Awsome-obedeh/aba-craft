"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, PackagePlus, Boxes, ShoppingBag, ClipboardList, UserRound, Settings, LogOut, Menu, X } from "lucide-react";
import { toast } from "react-toastify";
import { logout } from "@/app/lib/logout";

const linksByRole = {
  vendor: [
    { label: "Dashboard Overview", href: "/dashboard/vendor", icon: LayoutDashboard },
    { label: "Upload Product", href: "/dashboard/vendor/upload-product", icon: PackagePlus },
    { label: "My Inventory", href: "/dashboard/vendor/inventory", icon: Boxes },
    { label: "My Products", href: "/dashboard/vendor/products", icon: ShoppingBag },
    { label: "Orders & Sales", href: "/dashboard/vendor/orders", icon: ClipboardList },
    { label: "Profile & Verification", href: "/dashboard/vendor/profile", icon: UserRound },
  ],
  admin: [
    { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Manage Vendors", href: "/dashboard/admin/vendors", icon: UserRound },
    { label: "Approve Products", href: "/dashboard/admin/publish-products", icon: ClipboardList },
    { label: "Products", href: "/dashboard/products", icon: ShoppingBag },
  ],
  customer: [
    { label: "Browse Products", href: "/dashboard/products", icon: ShoppingBag },
    { label: "My Orders", href: "/account/orders", icon: ClipboardList },
  ],
};

export default function Sidebar({ role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const links = linksByRole[role] || [];

  async function handleLogout() {
    try {
      await logout(router);
      toast.success("Logged out");
    } catch {
      // logout handles its own redirect.
    }
  }

  return <>
    <button type="button" aria-label="Open dashboard menu" onClick={() => setOpen(true)} className="fixed left-4 top-3 z-40 rounded-xl border border-brandBorder bg-white p-2.5 text-forest shadow-sm lg:hidden"><Menu size={21} /></button>
    {open && <button type="button" aria-label="Close dashboard menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[244px] flex-col border-r border-brandBorder bg-white transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
      <div className="flex h-[76px] items-center justify-between border-b border-brandBorder px-6">
        <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-forest">Aba Crafts<span className="text-gold">.</span></Link>
        <button type="button" aria-label="Close dashboard menu" onClick={() => setOpen(false)} className="lg:hidden"><X size={20} /></button>
      </div>
      <nav aria-label="Dashboard navigation" className="flex-1 space-y-1 px-3 py-6">
        {links.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard/vendor" && pathname.startsWith(`${href}/`));
          return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${active ? "bg-[#F7F0DE] text-[#8B691E]" : "text-muted hover:bg-cream hover:text-forest"}`}>
            <Icon size={18} strokeWidth={1.8} />{label}
          </Link>;
        })}
      </nav>
      <div className="space-y-1 border-t border-brandBorder px-3 py-5">
        <Link href={role === "vendor" ? "/dashboard/vendor/profile" : role === "admin" ? "/dashboard/admin" : "/account/orders"} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted hover:bg-cream hover:text-forest"><Settings size={18} />Settings</Link>
        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-muted hover:bg-cream hover:text-forest"><LogOut size={18} />Logout</button>
      </div>
    </aside>
  </>;
}
