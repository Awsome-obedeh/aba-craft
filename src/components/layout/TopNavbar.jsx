"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronDown, Search, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/app/store/cartStore";

export default function TopNavbar({ email, role }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [mounted] = useState(typeof window !== "undefined");
  const itemCount = useCartStore(state => state.items.reduce((count, item) => count + item.quantity, 0));
  const profileHref = role === "vendor" ? "/dashboard/vendor/profile" : role === "admin" ? "/dashboard/admin" : "/account/orders";
  const initial = email?.charAt(0)?.toUpperCase() || "A";

  function submitSearch(event) {
    event.preventDefault();
    const destination = role === "vendor" ? "/dashboard/vendor/products" : "/dashboard/products";
    router.push(search.trim() ? `${destination}?search=${encodeURIComponent(search.trim())}` : destination);
  }

  return <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-brandBorder bg-white px-4 pl-16 sm:px-6 sm:pl-16 lg:px-8">
    <div className="flex w-full items-center justify-between gap-5">
      <form role="search" onSubmit={submitSearch} className="hidden h-10 w-full max-w-sm items-center gap-2 rounded-full border border-brandBorder bg-[#F7F8F6] px-4 text-muted sm:flex">
        <Search size={17} aria-hidden="true" />
        <input value={search} onChange={event => setSearch(event.target.value)} aria-label="Search products" placeholder="Search products" className="w-full bg-transparent text-sm text-forest outline-none" />
      </form>
      <div className="ml-auto flex items-center gap-3 sm:gap-5">
        {role === "customer" && <Link href="/cart" aria-label={`Cart${mounted && itemCount ? `, ${itemCount} items` : ""}`} className="relative text-forest"><ShoppingCart size={19} />{mounted && itemCount > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-gold px-1.5 text-[10px] font-bold text-forest">{itemCount}</span>}</Link>}
        <span aria-label="Notifications" className="text-muted"><Bell size={19} /></span>
        <span className="hidden items-center gap-1 border-r border-brandBorder pr-5 text-xs text-muted md:flex">🇬🇧 English <ChevronDown size={13} /></span>
        <Link href={profileHref} className="flex items-center gap-2 text-forest" aria-label="Open profile">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm font-semibold text-white">{initial}</span>
          <span className="hidden min-w-0 text-left md:block"><span className="block max-w-40 truncate text-xs font-semibold">{email || "My account"}</span><span className="block text-[11px] capitalize text-muted">{role || "Account"}</span></span>
          <ChevronDown size={14} className="hidden text-muted md:block" />
        </Link>
      </div>
    </div>
  </header>;
}
