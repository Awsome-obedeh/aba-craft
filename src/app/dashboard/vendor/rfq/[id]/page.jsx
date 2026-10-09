"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Building2, UserRound, MapPin, UsersRound, Package, Paperclip, ArrowUpRight, CircleCheck, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";

const statuses = { new: "New", awaiting_response: "Awaiting response", responded: "Responded", accepted: "Accepted", rejected: "Rejected", expired: "Expired" };
const tones = { new: "bg-violet-50 text-violet-700", awaiting_response: "bg-amber-50 text-amber-700", responded: "bg-emerald-50 text-emerald-700", accepted: "bg-green-50 text-green-700", rejected: "bg-rose-50 text-rose-700", expired: "bg-stone-100 text-stone-500" };
const money = value => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "Not provided";
const text = value => value || "Not provided";
function safeUrl(value) {
  if (typeof value !== "string") return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}

export default function RfqDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState("");
  const successDialog = useRef(null);
  const canDecline = rfq && ["new", "awaiting_response", "responded"].includes(rfq.status);

  async function declineRfq() {
    if (declining || !canDecline) return;
    setDeclining(true);
    setDeclineError("");
    try {
      const response = await api.patch(`/rfqs/vendor/${encodeURIComponent(id)}`, { action: "decline" }, { baseURL: "/api" });
      setRfq(response.data.request);
      successDialog.current?.showModal();
    } catch (error) {
      setDeclineError(error.response?.data?.message || "Unable to decline this RFQ. Please try again.");
    } finally { setDeclining(false); }
  }

  useEffect(() => {
    if (!user) { router.replace("/auth/sign-in"); return; }
    if (user.role !== "vendor") { router.replace(user.role === "admin" ? "/dashboard/admin" : "/dashboard/products"); return; }
    let active = true;
    api.get(`/rfqs/vendor/${encodeURIComponent(id)}`, { baseURL: "/api" })
      .then(response => { if (active) { setRfq(response.data.request); setError(""); } })
      .catch(error => { if (active) setError(error.response?.status === 404 ? "This RFQ could not be found." : "We could not load this RFQ. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, user, router, reload]);

  if (!user || user.role !== "vendor") return null;
  const image = safeUrl(rfq?.productImage);
  return <DashboardLayout role="vendor" email={user.email}>
    <div className="mx-auto max-w-[1480px]">
      <Link href="/dashboard/vendor/rfq" className="inline-flex items-center gap-2 text-xs text-muted transition hover:text-forest"><ArrowLeft size={14} />Back to RFQ Inbox</Link>
      {loading ? <div role="status" className="mt-6 rounded-xl border border-brandBorder bg-white p-16 text-center text-sm text-muted">Loading RFQ details...</div> : error ? <div role="alert" className="mt-6 rounded-xl border border-brandBorder bg-white p-12 text-center"><h1 className="text-lg font-semibold text-forest">RFQ details unavailable</h1><p className="mt-2 text-sm text-muted">{error}</p><button onClick={() => { setLoading(true); setError(""); setReload(value => value + 1); }} className="mt-5 rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-white">Try again</button></div> : rfq && <>
        <header className="mb-6 mt-4">
          <div className="flex flex-wrap items-center gap-3"><h1 className="font-serif text-3xl font-semibold text-forest">RFQ Details</h1><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tones[rfq.status] || tones.new}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{statuses[rfq.status] || rfq.status}</span></div>
          <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted"><span className="font-medium">RFQ-{rfq._id.slice(-6).toUpperCase()}</span><span aria-hidden="true">·</span><span>Received {date(rfq.createdAt)}</span>{rfq.responseDeadline && <><span aria-hidden="true">·</span><span>Respond by {date(rfq.responseDeadline)}</span></>}</p>
        </header>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            <Card title="Product specification" subtitle="Everything the buyer requires for this run.">
              <div className="flex flex-col gap-6 p-5 sm:flex-row sm:p-6">
                <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-[#eeefeb] sm:w-48">
                  {image ? <Image src={image} alt={rfq.productName} fill unoptimized sizes="(max-width: 640px) 100vw, 192px" className="object-contain" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-400"><Package size={38} strokeWidth={1.2} /><span className="text-xs">No product image</span></div>}
                </div>
                <div className="min-w-0 flex-1"><h2 className="text-base font-semibold text-forest">{rfq.productName}</h2><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted">{text(rfq.productDescription)}</p>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-3">
                    <Field label="Colour" value={text(rfq.colour)} accent />
                    <Field label="Product type" value={text(rfq.productType)} accent />
                    <Field label="Material" value={text(rfq.material)} accent />
                    <Field label="Target price" value={rfq.targetPrice == null ? "Negotiable" : `${money(rfq.targetPrice)} / unit`} accent />
                    <Field label="Size / dimensions" value={text(rfq.dimensions)} accent />
                    <Field label="Required quantity" value={`${rfq.quantity.toLocaleString()} units`} accent />
                  </dl>
                </div>
              </div>
              <dl className="grid gap-5 border-t border-brandBorder bg-[#f8f9fa] px-5 py-4 sm:grid-cols-3 sm:px-6"><Field label="Delivery window" value={`${rfq.deliveryDays} days`} /><Field label="Estimated order value" value={rfq.targetPrice == null ? "Negotiable" : money(rfq.targetPrice * rfq.quantity)} /><Field label="Response deadline" value={date(rfq.responseDeadline)} /></dl>
            </Card>
            <Card title="Requirements & notes" subtitle="Additional conditions submitted with the request."><div className="p-5 sm:p-6"><p className="whitespace-pre-wrap break-words text-sm leading-6 text-forest">{rfq.notes || "No additional requirements provided."}</p>{rfq.deliveryAddress && <div className="mt-5 border-t border-brandBorder pt-4"><p className="text-xs text-muted">Delivery address</p><p className="mt-1 whitespace-pre-wrap text-sm text-forest">{rfq.deliveryAddress}</p></div>}</div></Card>
            <Card title="Attachments" subtitle="Supporting files provided by the buyer."><div className="p-5 sm:p-6">{rfq.attachments?.length ? <ul className="space-y-3">{rfq.attachments.map((attachment, index) => { const url = safeUrl(attachment.url); return <li key={`${attachment.name}-${index}`} className="flex items-center gap-3 rounded-lg border border-brandBorder p-3 text-sm"><Paperclip size={16} className="shrink-0 text-[#b18b2a]" />{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center justify-between gap-2 text-forest hover:underline"><span className="break-words">{attachment.name}</span><ArrowUpRight size={15} className="shrink-0" /></a> : <span>{attachment.name} (unavailable)</span>}</li>; })}</ul> : <p className="text-xs text-muted">No attachments provided.</p>}</div></Card>
          </div>
          <aside className="space-y-5">
            <Card title="Buyer information" gold><dl className="space-y-5 p-5"><BuyerField icon={Building2} label="Company" value={text(rfq.buyerCompany)} /><BuyerField icon={UserRound} label="Contact person" value={text(rfq.buyerName)} detail={rfq.buyerContactRole} /><BuyerField icon={MapPin} label="Location" value={text(rfq.buyerLocation)} /><BuyerField icon={UsersRound} label="Buyer type" value={text(rfq.buyerType)} /></dl></Card>
            <Card title="Sample requirement" gold><div className="p-5"><div className="flex gap-3"><Package size={19} className="shrink-0 text-[#b18b2a]" /><div><p className="text-sm font-medium text-[#937022]">{rfq.sampleRequired ? "Sample required" : "No sample requested"}</p>{rfq.sampleRequired && <p className="mt-1 text-xs text-muted">{rfq.sampleQuantity ? `${rfq.sampleQuantity} ${rfq.sampleQuantity === 1 ? "unit" : "units"} before production` : "Quantity not specified"}</p>}</div></div>{rfq.sampleNotes && <p className="mt-4 whitespace-pre-wrap text-xs leading-5 text-forest">{rfq.sampleNotes}</p>}</div></Card>
            <Card title="Request overview" gold><dl className="space-y-4 p-5"><Field label="Workspace" value={rfq.workspace === "sourcing" ? "Sourcing" : "Production"} /><Field label="Status" value={statuses[rfq.status] || rfq.status} /><Field label="Last updated" value={date(rfq.updatedAt)} /></dl></Card>
            <Card title="Respond to this request" gold>
              <div className="p-5">
                <p className="mb-4 text-xs leading-5 text-muted">{rfq.status === "rejected" ? "You have declined this RFQ." : canDecline ? "Decline this request if you cannot fulfil the buyer's requirements." : "This request is no longer open for a decline."}</p>
                {declineError && <p role="alert" className="mb-3 text-xs leading-5 text-rose-700">{declineError}</p>}
                {canDecline && <button type="button" onClick={declineRfq} disabled={declining} className="w-full rounded-lg bg-[#b18b2a] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#967522] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b18b2a] disabled:cursor-wait disabled:opacity-60">{declining ? "Declining..." : "Decline RFQ"}</button>}
              </div>
            </Card>
          </aside>
        </div>
      </>}
    </div>
    <dialog ref={successDialog} aria-labelledby="rfq-declined-title" className="fixed inset-0 m-auto w-[calc(100%_-_32px)] max-w-[480px] rounded-xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/35">
      <div className="relative flex flex-col items-center px-6 py-10 text-center sm:px-12">
        <button type="button" aria-label="Close decline message" onClick={() => successDialog.current.close()} className="absolute right-3 top-3 rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-forest"><X size={17} /></button>
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-green-50"><CircleCheck size={26} className="text-green-500" /></span>
        <h2 id="rfq-declined-title" className="text-lg font-semibold text-[#a17b1f]">RFQ successfully declined</h2>
        <form method="dialog" className="mt-5"><button autoFocus className="min-w-28 rounded-md bg-[#b18b2a] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#967522] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b18b2a]">Done</button></form>
      </div>
    </dialog>
  </DashboardLayout>;
}

function Card({ title, subtitle, gold, children }) {
  return <section className="overflow-hidden rounded-xl border border-brandBorder bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"><header className="border-b border-brandBorder px-5 py-4"><h2 className={`text-sm font-semibold ${gold ? "text-[#937022]" : "text-forest"}`}>{title}</h2>{subtitle && <p className="mt-1 text-[11px] text-muted">{subtitle}</p>}</header>{children}</section>;
}
function Field({ label, value, accent }) {
  return <div className="min-w-0"><dt className="text-[11px] text-muted">{label}</dt><dd className={`mt-1 break-words text-xs font-medium ${accent ? "text-[#a17b1f]" : "text-forest"}`}>{value}</dd></div>;
}
function BuyerField({ icon: Icon, label, value, detail }) {
  return <div className="flex gap-3"><Icon size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#b18b2a]" /><div className="min-w-0"><dt className="text-[11px] text-[#937022]">{label}</dt><dd className="mt-1 break-words text-xs text-forest">{value}{detail && <span className="mt-1 block text-muted">{detail}</span>}</dd></div></div>;
}
