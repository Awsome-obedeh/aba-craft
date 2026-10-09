"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Search, Clock3, Send, FileText, ArrowUpRight, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";

const statuses = { new: "New", awaiting_response: "Awaiting Response", responded: "Responded", accepted: "Accepted", rejected: "Rejected", expired: "Expired" };
const tones = { new: "border-violet-200 bg-violet-50 text-violet-700", awaiting_response: "border-amber-200 bg-amber-50 text-amber-700", responded: "border-emerald-200 bg-emerald-50 text-emerald-700", accepted: "border-green-200 bg-green-50 text-green-700", rejected: "border-rose-200 bg-rose-50 text-rose-700", expired: "border-gray-200 bg-gray-50 text-gray-500" };
const money = value => value == null ? "Negotiable" : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
const date = value => new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
const requestId = row => "RFQ-" + row._id.slice(-6).toUpperCase();
const PAGE_SIZE = 6;

export default function RfqInboxPage() {
  const user = useAuthStore(state => state.user);
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [filterDate] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [window, setWindow] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [page, setPage] = useState(1);



  useEffect(() => {
    if (!user) { router.replace("/auth/sign-in"); return; }
    if (user.role !== "vendor") { router.replace(user.role === "admin" ? "/dashboard/admin" : "/dashboard/products"); return; }
    let active = true;
    api.get("/rfqs/vendor", { baseURL: "/api" })
      .then(response => { if (active) { setRequests(response.data.requests); setError(""); } })
      .catch(() => { if (active) setError("We could not load your RFQs. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, router, reload]);

  function change(setter, value) { setter(value); setPage(1); }
  function retry() { setLoading(true); setError(""); setReload(value => value + 1); }
  function view(row) { router.push(`/dashboard/vendor/rfq/${row._id}`); }
  const filtered = requests.filter(row => {
    const matchesSearch = [requestId(row), row.productName, row.buyerName].some(value => value.toLowerCase().includes(search.toLowerCase().trim()));
    const days = row.deliveryDays;
    const matchesWindow = !window || (window === "15" ? days <= 15 : window === "30" ? days > 15 && days <= 30 : window === "60" ? days > 30 && days <= 60 : days > 60);
    const matchesTime = !timeframe || new Date(row.createdAt).getTime() >= filterDate - Number(timeframe) * 86400000;
    return matchesSearch && (!status || row.status === status) && matchesWindow && matchesTime && (!workspace || row.workspace === workspace);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const metrics = [
    { label: "Total RFQs", value: requests.length, detail: "Across all buyer requests", icon: Inbox, style: "border-[#B18B2A] bg-[#B18B2A] text-white" },
    { label: "New", value: requests.filter(row => row.status === "new").length, detail: "Ready for your review", icon: FileText, style: "border-violet-200 bg-white text-violet-600" },
    { label: "Awaiting Response", value: requests.filter(row => row.status === "awaiting_response").length, detail: "Buyers waiting for your quote", icon: Clock3, style: "border-orange-200 bg-white text-orange-600" },
    { label: "Responded", value: requests.filter(row => ["responded", "accepted"].includes(row.status)).length, detail: "Quotes submitted", icon: Send, style: "border-emerald-200 bg-white text-emerald-600" },
  ];
  const hasFilters = search || status || window || timeframe || workspace;
  function clearFilters() { setSearch(""); setStatus(""); setWindow(""); setTimeframe(""); setWorkspace(""); setPage(1); }
  if (!user || user.role !== "vendor") return null;

  return <DashboardLayout role="vendor" email={user.email}>
    <div className="mx-auto max-w-[1480px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#937022]">Wholesale workspace</p><h1 className="font-serif text-3xl font-semibold text-forest">RFQ Inbox</h1><p className="mt-2 text-sm text-muted">Review buyer requests and discover your next wholesale opportunity.</p></div>
        <button onClick={retry} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-brandBorder bg-white px-4 py-2.5 text-xs font-semibold text-forest disabled:opacity-50"><RefreshCw size={15} />Refresh</button>
      </header>
      <section aria-label="RFQ summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, detail, icon: Icon, style }) => <div key={label} className={"rounded-xl border p-5 " + style}><div className="flex items-center justify-between text-xs font-medium"><span>{label}</span><Icon size={17} strokeWidth={1.6} /></div><p className="mt-4 text-3xl font-semibold">{loading || error ? "—" : value}</p><p className="mt-2 text-[11px] opacity-80">{detail}</p></div>)}</section>
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-brandBorder bg-white p-4"><span className="text-xs font-semibold text-forest">Filter workspace</span><span className="flex-1 rounded-lg border border-[#C9A84C] bg-[#FFFCF4] px-4 py-3 text-sm text-[#937022]">RFQ Inbox</span><Select label="Business workspace" value={workspace} onChange={value => change(setWorkspace, value)} options={[["", "All workspaces"], ["production", "Production"], ["sourcing", "Sourcing"]]} /></section>
      <section className="overflow-hidden rounded-2xl border border-brandBorder bg-white">
        <div className="grid gap-3 border-b border-brandBorder p-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative"><span className="sr-only">Search RFQs</span><Search size={16} className="absolute left-3 top-3.5 text-muted" /><input value={search} onChange={event => change(setSearch, event.target.value)} placeholder="Search RFQ, product, buyer" className="w-full rounded-lg border border-brandBorder py-3 pl-9 pr-3 text-xs outline-none focus:border-gold" /></label>
          <Select label="Status" value={status} onChange={value => change(setStatus, value)} options={[["", "All status"], ...Object.entries(statuses)]} />
          <Select label="Delivery window" value={window} onChange={value => change(setWindow, value)} options={[["", "All delivery windows"], ["15", "0–15 days"], ["30", "16–30 days"], ["60", "31–60 days"], ["more", "60+ days"]]} />
          <Select label="Timeframe" value={timeframe} onChange={value => change(setTimeframe, value)} options={[["", "All time"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["365", "Last 365 days"]]} />
        </div>
        {hasFilters && <div className="flex items-center justify-between bg-cream px-4 py-2 text-xs text-muted"><span>{filtered.length} matching requests</span><button onClick={clearFilters} className="font-semibold text-[#937022] hover:underline">Clear filters</button></div>}
        {loading ? <div role="status" className="p-16 text-center text-sm text-muted">Loading your wholesale requests...</div> : error ? <div role="alert" className="p-12 text-center"><p className="text-sm text-rose-700">{error}</p><button onClick={retry} className="mt-3 text-sm font-semibold text-[#937022] underline">Try again</button></div> : <>
          <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left"><thead className="bg-[#F5F5F8] text-muted"><tr>{["RFQ ID", "Product", "Buyer", "Quantity", "Target price", "Delivery", "Received", "Status", ""].map((heading, index) => <th key={index} scope="col" className="px-4 py-4 text-[10px] font-medium uppercase tracking-wide">{heading || <span className="sr-only">Actions</span>}</th>)}</tr></thead><tbody className="divide-y divide-brandBorder">{visible.map(row => <tr key={row._id} className="transition-colors hover:bg-cream/60"><td className="px-4 py-5 text-xs font-semibold text-forest">{requestId(row)}</td><td className="max-w-[170px] px-4 py-5 text-xs font-medium text-forest">{row.productName}</td><td className="max-w-[150px] px-4 py-5 text-xs text-muted">{row.buyerName}</td><td className="px-4 py-5 text-xs text-muted">{row.quantity.toLocaleString()} units</td><td className="px-4 py-5 text-xs text-muted">{money(row.targetPrice)}{row.targetPrice != null && <span className="block text-[10px]">per unit</span>}</td><td className="px-4 py-5 text-xs text-muted">{row.deliveryDays} days</td><td className="whitespace-nowrap px-4 py-5 text-xs text-muted">{date(row.createdAt)}</td><td className="px-4 py-5"><span className={"inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium " + tones[row.status]}><span className="h-1.5 w-1.5 rounded-full bg-current" />{statuses[row.status]}</span></td><td className="px-4 py-5"><button onClick={() => view(row)} aria-label={"View " + requestId(row)} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-emerald-700 hover:underline">View RFQ<ArrowUpRight size={13} /></button></td></tr>)}</tbody></table></div>
          {!visible.length && <div className="px-6 py-16 text-center"><Inbox size={36} strokeWidth={1.3} className="mx-auto text-[#B79842]" /><h2 className="mt-4 font-serif text-xl text-forest">{hasFilters ? "No matching requests" : "Your next opportunity starts here"}</h2><p className="mx-auto mt-2 max-w-sm text-sm text-muted">{hasFilters ? "Try another search or clear the filters to see all requests." : "Wholesale requests from buyers will appear here when they are sent to your business."}</p>{hasFilters && <button onClick={clearFilters} className="mt-4 text-sm font-semibold text-[#937022] underline">Clear filters</button>}</div>}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-brandBorder px-4 py-4 text-xs text-muted"><span>Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} RFQs</span><div className="flex items-center gap-3"><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-brandBorder p-2 disabled:opacity-30"><ChevronLeft size={14} /></button><span>Page {currentPage} of {pages}</span><button aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-brandBorder p-2 disabled:opacity-30"><ChevronRight size={14} /></button></div></footer>
        </>}
      </section>
    </div>
  </DashboardLayout>;
}

function Select({ label, value, onChange, options }) {
  return <label className="min-w-[160px] flex-1"><span className="sr-only">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-brandBorder bg-white px-3 py-3 text-xs text-muted outline-none focus:border-gold">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}
