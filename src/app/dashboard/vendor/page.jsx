"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, BadgeCheck, Boxes, CircleCheck, Clock3, Package, Plus, ShoppingBag, TrendingUp, Truck } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { DashboardPanel, MetricTile, SalesAreaChart, SalesBars, StatusBadge, TextLink } from "@/components/dashboard/OverviewUI";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";

const money = value => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value || 0);
const shortDate = value => new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const stages = ["paid", "processing", "shipped", "delivered"];

export default function VendorDashboardPage() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { router.replace("/auth/sign-in"); return; }
    if (user.role !== "vendor") { router.replace(user.role === "admin" ? "/dashboard/admin" : "/dashboard/products"); return; }
    let active = true;
    api.get("/auth/vendor/dashboard", { baseURL: "/api" })
      .then(response => { if (active) setOverview(response.data.data); })
      .catch(() => { if (active) setError("We could not load your dashboard right now. Please refresh the page."); });
    return () => { active = false; };
  }, [user, router]);

  if (!user || user.role !== "vendor") return null;

  const vendor = overview?.vendor;
  const metrics = overview?.metrics;
  const recentOrders = overview?.recentOrders || [];
  const latestOrder = recentOrders.find(order => order.status !== "cancelled" && order.status !== "pending_payment");
  const currentStage = latestOrder ? stages.indexOf(latestOrder.status) : -1;
  const actions = overview ? [
    vendor.verificationStatus !== "verified" && { title: "Complete your profile verification", detail: "Finish the required details to build buyer trust.", href: "/dashboard/vendor/profile", tone: "amber" },
    metrics.lowStockCount > 0 && { title: `Restock ${metrics.lowStockCount} low-stock ${metrics.lowStockCount === 1 ? "product" : "products"}`, detail: "Keep your catalogue ready for buyers.", href: "/dashboard/vendor/inventory", tone: "rose" },
    metrics.pendingOrders > 0 && { title: `Prepare ${metrics.pendingOrders} active ${metrics.pendingOrders === 1 ? "order" : "orders"}`, detail: "Review paid and processing orders.", href: "/dashboard/vendor/orders", tone: "blue" },
  ].filter(Boolean) : [];

  return <DashboardLayout role="vendor" email={user.email}>
    <div className="mx-auto max-w-[1480px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="font-serif text-2xl font-semibold text-forest sm:text-3xl">Welcome back, {vendor?.name || user.email?.split("@")[0] || "Vendor"}</h1><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Seller</span></div>
          <p className="mt-1 text-sm text-muted">{vendor?.businessName || "Your vendor dashboard"} · Here is your store at a glance.</p>
        </div>
        <div className="flex gap-2"><Link href="/dashboard/vendor/products" className="rounded-lg border border-brandBorder bg-white px-4 py-2.5 text-xs font-semibold text-forest hover:bg-cream">View store</Link><Link href="/dashboard/vendor/upload-product" className="button-bg inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold text-dark hover:opacity-90"><Plus size={15} /> Add product</Link></div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      {!overview && !error && <div role="status" className="rounded-2xl border border-brandBorder bg-white p-8 text-sm text-muted">Loading your dashboard...</div>}

      {overview && <>
        <section className="rounded-2xl border border-brandBorder bg-white p-5 shadow-[0_5px_22px_rgba(30,51,41,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><BadgeCheck size={21} /></span><div><h2 className="text-base font-semibold text-forest">Your seller journey</h2><p className="text-xs text-muted">Build a trusted store and keep your business moving.</p></div></div><Link href="/dashboard/vendor/profile" className="text-xs font-semibold text-[#937022] hover:underline">View verification status →</Link></div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-brandBorder pt-5 sm:grid-cols-4">
            {[{ label: "Account", done: true }, { label: "Email", done: true }, { label: "Business", done: !!vendor.businessName }, { label: "Verification", done: vendor.verificationStatus === "verified" }].map(step => <div key={step.label} className="flex items-center gap-2 text-xs"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{step.done ? <CircleCheck size={15} /> : <Clock3 size={15} />}</span><span className={step.done ? "text-forest" : "text-muted"}>{step.label}</span></div>)}
          </div>
        </section>

        <section aria-label="Store metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricTile icon={Package} label="Active products" value={metrics.productCount} detail="Products in your catalogue" tone="gold" featured />
          <MetricTile icon={ShoppingBag} label="Total orders" value={metrics.orderCount} detail="Orders containing your products" tone="violet" />
          <MetricTile icon={TrendingUp} label="Sales revenue" value={money(metrics.revenue)} detail={`${metrics.unitsSold} units sold`} tone="green" />
          <MetricTile icon={AlertCircle} label="Action needed" value={actions.length} detail={actions.length ? "Items to review" : "All caught up"} tone="red" />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <DashboardPanel title="Sales performance" subtitle="Revenue from paid orders over the last six months" action={<span className="rounded-lg border border-brandBorder px-2.5 py-1.5 text-[11px] text-muted">Last 6 months</span>}><SalesAreaChart data={overview.monthlySales} /></DashboardPanel>
          <DashboardPanel title="Top sales" subtitle="Your sales trend, month by month" action={<TrendingUp size={17} className="text-[#B79842]" />}><SalesBars data={overview.monthlySales} formatMoney={money} /></DashboardPanel>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <DashboardPanel title="Action required" subtitle="Keep your store in good shape" action={<TextLink href="/dashboard/vendor/profile">View profile</TextLink>}>
            {actions.length ? <div className="divide-y divide-brandBorder">{actions.map(action => <Link key={action.title} href={action.href} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-[#937022]"><span className="flex min-w-0 items-center gap-3"><span className={`h-2 w-2 shrink-0 rounded-full ${action.tone === "rose" ? "bg-rose-500" : action.tone === "blue" ? "bg-sky-500" : "bg-amber-500"}`} /><span><span className="block text-sm font-medium text-forest">{action.title}</span><span className="block text-xs text-muted">{action.detail}</span></span></span><ArrowRight size={15} className="shrink-0 text-muted" /></Link>)}</div> : <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CircleCheck size={20} />You are all caught up.</div>}
          </DashboardPanel>
          <DashboardPanel title="Top-selling products" subtitle="Products buyers have purchased most" action={<TextLink href="/dashboard/vendor/products">View products</TextLink>}>
            {overview.topProducts.length ? <div className="space-y-4">{overview.topProducts.map((product, index) => <div key={product.id} className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream text-xs font-semibold text-[#937022]">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 truncate text-sm text-forest">{product.name}</span><span className="text-xs font-semibold text-muted">{product.units} sold</span></div>)}</div> : <p className="rounded-xl bg-cream p-5 text-sm text-muted">Your best sellers will appear after your first paid order.</p>}
          </DashboardPanel>
          <DashboardPanel title="Recent buyer messages" subtitle="Conversations with your customers">
            <p className="rounded-xl bg-cream p-5 text-sm text-muted">Buyer messaging is not available yet. Customer order updates are available under Orders &amp; Sales.</p>
            <TextLink href="/dashboard/vendor/orders">View orders</TextLink>
          </DashboardPanel>
        </div>

        <DashboardPanel title="Order tracking" subtitle="Progress of your latest active order" action={<TextLink href="/dashboard/vendor/orders">View orders</TextLink>}>
          {latestOrder ? <><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><div><span className="font-semibold text-forest">Order #{latestOrder.id.slice(-7).toUpperCase()}</span><span className="ml-2 text-muted">· {latestOrder.items[0]?.name || "Order"}</span></div><StatusBadge status={latestOrder.status} /></div><div className="mt-5 grid grid-cols-4 gap-2">{stages.map((stage, index) => <div key={stage}><div className={`h-1.5 rounded-full ${index <= currentStage ? "bg-[#B79842]" : "bg-brandBorder"}`} /><p className={`mt-2 text-[11px] capitalize ${index <= currentStage ? "font-semibold text-forest" : "text-muted"}`}>{stage}</p></div>)}</div></> : <div className="flex items-center gap-3 rounded-xl bg-cream p-5 text-sm text-muted"><Truck size={20} />Active order progress will appear here.</div>}
        </DashboardPanel>

        <DashboardPanel title="Recent orders" subtitle="Your latest customer purchases" action={<TextLink href="/dashboard/vendor/orders">View all orders</TextLink>}>
          {recentOrders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left text-xs"><thead className="border-b border-brandBorder text-muted"><tr><th className="pb-3 font-medium">Order ID</th><th className="pb-3 font-medium">Buyer</th><th className="pb-3 font-medium">Product</th><th className="pb-3 font-medium">Amount</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Date</th></tr></thead><tbody>{recentOrders.map(order => <tr key={order.id} className="border-b border-brandBorder/70 last:border-0"><td className="py-3 font-semibold text-forest">#{order.id.slice(-7).toUpperCase()}</td><td className="py-3 text-muted">{order.customer}</td><td className="max-w-48 truncate py-3 text-forest">{order.items.map(item => item.name).join(", ")}</td><td className="py-3 font-medium text-forest">{money(order.items.reduce((sum, item) => sum + item.total, 0))}</td><td className="py-3"><StatusBadge status={order.status} /></td><td className="py-3 text-muted">{shortDate(order.createdAt)}</td></tr>)}</tbody></table></div> : <div className="flex items-center gap-3 rounded-xl bg-cream p-5 text-sm text-muted"><Boxes size={20} />No orders yet. Your recent orders will show here.</div>}
        </DashboardPanel>
      </>}
    </div>
  </DashboardLayout>;
}
