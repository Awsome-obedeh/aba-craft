import { ArrowUpRight } from "lucide-react";

export function DashboardPanel({ title, subtitle, action, children, className = "" }) {
  return <section className={`rounded-2xl border border-brandBorder bg-white p-5 shadow-[0_5px_22px_rgba(30,51,41,0.04)] ${className}`}>
    <div className="mb-5 flex items-start justify-between gap-3">
      <div><h2 className="text-base font-semibold text-forest">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}</div>
      {action}
    </div>
    {children}
  </section>;
}

export function MetricTile({ icon: Icon, label, value, detail, tone = "gold", featured = false }) {
  const toneClass = { gold: "bg-[#F8EBCB] text-[#9D751D]", violet: "bg-violet-100 text-violet-600", green: "bg-emerald-100 text-emerald-600", red: "bg-rose-100 text-rose-600" }[tone];
  return <div className={`min-w-0 rounded-xl border p-4 ${featured ? "border-[#B79842] bg-[#B79842] text-white" : "border-brandBorder bg-white text-forest"}`}>
    <span className={`mb-4 flex h-9 w-9 items-center justify-center rounded-full ${featured ? "bg-white/20 text-white" : toneClass}`}><Icon size={17} /></span>
    <p className={`text-xs ${featured ? "text-white/80" : "text-muted"}`}>{label}</p>
    <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
    <p className={`mt-1 text-xs ${featured ? "text-white/80" : "text-muted"}`}>{detail}</p>
  </div>;
}

export function StatusBadge({ status }) {
  const styles = {
    delivered: "bg-emerald-50 text-emerald-700", paid: "bg-emerald-50 text-emerald-700",
    processing: "bg-sky-50 text-sky-700", shipped: "bg-indigo-50 text-indigo-700",
    pending_payment: "bg-amber-50 text-amber-700", pending: "bg-amber-50 text-amber-700",
    cancelled: "bg-slate-100 text-slate-600", failed: "bg-rose-50 text-rose-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${styles[status] || "bg-slate-100 text-slate-600"}`}>{status?.replaceAll("_", " ") || "Unknown"}</span>;
}

export function TextLink({ href, children }) {
  return <a href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#937022] hover:underline">{children}<ArrowUpRight size={13} /></a>;
}

export function SalesAreaChart({ data }) {
  const max = Math.max(1, ...data.map(point => point.revenue));
  const points = data.map((point, index) => `${34 + index * 60},${176 - (point.revenue / max) * 130}`).join(" ");
  const area = `34,176 ${points} 334,176`;
  return <div>
    <svg viewBox="0 0 368 198" role="img" aria-label="Revenue for the last six months" className="h-52 w-full overflow-visible">
      <defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C9A84C" stopOpacity=".34" /><stop offset="100%" stopColor="#C9A84C" stopOpacity=".02" /></linearGradient></defs>
      {[46, 89, 132, 176].map(y => <line key={y} x1="34" x2="334" y1={y} y2={y} stroke="#E6EAE7" strokeDasharray="3 4" />)}
      <polygon points={area} fill="url(#revenue-fill)" />
      <polyline points={points} fill="none" stroke="#B79842" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((point, index) => <circle key={index} cx={34 + index * 60} cy={176 - (point.revenue / max) * 130} r="3.5" fill="#B79842" stroke="white" strokeWidth="2" />)}
      {data.map((point, index) => <text key={point.label + index} x={34 + index * 60} y="195" fill="#66706B" fontSize="10" textAnchor="middle">{point.label}</text>)}
    </svg>
    {data.every(point => point.revenue === 0) && <p className="text-center text-xs text-muted">Sales will appear here after your first paid order.</p>}
  </div>;
}

export function SalesBars({ data, formatMoney }) {
  const max = Math.max(1, ...data.map(point => point.revenue));
  const total = data.reduce((sum, point) => sum + point.revenue, 0);
  return <div>
    <div className="flex h-45 items-end justify-between gap-3 border-b border-brandBorder px-2">
      {data.map((point, index) => <div key={point.label + index} className="flex h-full flex-1 flex-col justify-end gap-2 text-center">
        <div className="mx-auto w-full max-w-10 rounded-t-md bg-[#D5BE79]" style={{ height: `${Math.max(point.revenue ? 8 : 2, (point.revenue / max) * 82)}%` }} title={`${point.label}: ${formatMoney(point.revenue)}`} />
        <span className="text-[10px] text-muted">{point.label}</span>
      </div>)}
    </div>
    <div className="mt-4 rounded-xl bg-cream px-4 py-3 text-center"><p className="text-xs text-muted">Six-month sales</p><p className="text-lg font-semibold text-forest">{formatMoney(total)}</p></div>
  </div>;
}
