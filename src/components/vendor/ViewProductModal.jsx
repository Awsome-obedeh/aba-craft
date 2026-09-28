"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Circle, LoaderCircle, Package, Pencil, Trash2, X } from "lucide-react";
import { api } from "@/app/lib/axios";

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
const control = "mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-[#b59127] focus:outline-none focus:ring-2 focus:ring-amber-100";
const categoryName = p => typeof p.category === "string" ? p.category : p.category?.categoryName || "Unassigned";
const listingStatus = p => p.status === "approved" ? p.isPublished ? "Published" : "Unpublished" : ({ draft: "Draft", under_review: "Under review", rejected: "Rejected" }[p.status] || "Unknown");

function ProductPhoto({ src, name, className = "" }) {
  const [failed, setFailed] = useState(false);
  return <div className={`relative flex items-center justify-center overflow-hidden rounded-lg bg-[#f3f0e9] ${className}`}>
    {src && !failed ? <Image src={src} alt={name} fill unoptimized sizes="400px" className="object-contain" onError={() => setFailed(true)} /> : <Package size={32} strokeWidth={1} className="text-stone-400" />}
  </div>;
}

export default function ViewProductModal({ slug, onClose, onUpdated, onDeleted, onEdit }) {
  const dialog = useRef(null);
  const busyRef = useRef(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [busy, setBusy] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; focused?.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        if (!slug) throw new Error("This product has no detail link. Refresh your inventory and try again.");
        const response = await api.get(`/products/${encodeURIComponent(slug)}`, { signal: controller.signal });
        if (!response.data.success || !response.data.data?._id) throw new Error(response.data.message || "Invalid product response.");
        if (!controller.signal.aborted) setProduct(response.data.data);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.response?.data?.message || err.message || "Unable to load product.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [slug, retry]);

  useEffect(() => {
    if (!editing) return;
    const controller = new AbortController();
    async function load() {
      setCategoryLoading(true); setCategoryError("");
      try {
        const response = await api.get("/category", { signal: controller.signal });
        if (!Array.isArray(response.data.categories)) throw new Error("Invalid categories");
        if (!controller.signal.aborted) setCategories(response.data.categories);
      } catch { if (!controller.signal.aborted) setCategoryError("Couldn't load categories."); }
      finally { if (!controller.signal.aborted) setCategoryLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [editing, categoryRetry]);

  function startEdit() {
    if (onEdit) { onEdit(product); return; }
    setForm({ ...product, category: product.categoryId || product.category?._id || "" });
    setEditing(true); setError(""); setNotice(""); setConfirmDelete(false);
  }
  async function save(event) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy("save"); setError("");
    try {
      const response = await api.put(`/products/${encodeURIComponent(slug)}`, form);
      if (!response.data.success || !response.data.data?._id) throw new Error(response.data.message || "Unable to update product.");
      const updated = response.data.data;
      const categoryId = updated.category?._id || updated.category || "";
      const category = categories.find(item => item._id === categoryId) || (categoryId === product.categoryId ? { _id: categoryId, categoryName: categoryName(product) } : null);
      const details = { ...product, ...updated, notes: form.notes, categoryId, category: category?.categoryName || "Unassigned" };
      setProduct(details); setEditing(false); setNotice("Product updated successfully.");
      onUpdated({ ...details, category });
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to update product."); }
    finally { busyRef.current = false; setBusy(""); }
  }
  async function remove() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy("delete"); setError("");
    try {
      const response = await api.delete(`/products/${encodeURIComponent(slug)}`);
      if (!response.data.success) throw new Error(response.data.message || "Unable to delete product.");
      onDeleted(product._id);
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to delete product."); }
    finally { busyRef.current = false; setBusy(""); }
  }
  function field(key, label, options = {}) {
    return <div key={key}><label className="block text-[11px] text-stone-500">{label}
      {editing ? <input value={form[key] ?? ""} onChange={e => setForm(previous => ({ ...previous, [key]: e.target.value }))} className={control} {...options} /> : <span className={`${control} block min-h-9 break-words`}>{product[key] === "" || product[key] == null ? "Not provided" : product[key]}</span>}
    </label></div>;
  }
  function textField(key, label, maxLength) {
    return <label className="block text-[11px] text-stone-500">{label}{editing ? <textarea rows={3} maxLength={maxLength} value={form[key] || ""} onChange={e => setForm(previous => ({ ...previous, [key]: e.target.value }))} className={control} /> : <span className={`${control} block whitespace-pre-wrap break-words leading-5`}>{product[key] || "Not provided"}</span>}</label>;
  }
  const images = product?.productImages || [];
  const informationComplete = Boolean(product?.productName && product?.description && product?.categoryId);
  const pricingComplete = Number(product?.price) > 0 && Number(product?.quantity) >= 0;
  const checklist = [["Product Information", informationComplete], ["Media Gallery", images.length > 0], ["Inventory & Pricing", pricingComplete], ["Review & Publish", product?.status === "approved" && product?.isPublished]];
  const salePrice = product?.discountPrice > 0 ? product.discountPrice : Number(product?.price || 0) * (1 - Number(product?.discountPercentage || 0) / 100);

  return <dialog ref={dialog} aria-labelledby="view-product-title" onCancel={e => { e.preventDefault(); if (!busyRef.current) onClose(); }} className="m-auto max-h-[92dvh] w-[calc(100%_-_2rem)] max-w-[940px] overflow-hidden rounded-xl bg-[#f5f5f5] p-0 text-stone-800 shadow-2xl backdrop:bg-black/50">
    <form onSubmit={save} className="flex max-h-[92dvh] flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-4">
        <div><h2 id="view-product-title" className="text-base font-semibold">{editing ? "Edit Product" : "Product Details"}</h2><p className="mt-1 text-xs text-stone-500">{product ? `View all information on ${product.productName}` : "View product information"}</p></div>
        <div className="flex items-center gap-2">{product && !loading && !editing && <><button type="button" onClick={startEdit} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded bg-[#b59127] px-3 py-2 text-xs text-white"><Pencil size={13} /> Edit Product</button><button type="button" onClick={() => { setConfirmDelete(true); setError(""); }} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded border border-red-200 px-3 py-2 text-xs text-red-600"><Trash2 size={13} /> Delete Product</button></>}<button type="button" autoFocus disabled={!!busy} onClick={onClose} aria-label="Close product details" className="rounded p-2 hover:bg-stone-100 disabled:opacity-50"><X size={18} /></button></div>
      </header>
      <div className="overflow-y-auto p-4 sm:p-5" aria-busy={loading || !!busy}>
        {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}{!product && !loading && <button type="button" onClick={() => setRetry(n => n + 1)} className="ml-3 underline">Try again</button>}</div>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
        {confirmDelete && <section role="alert" className="mb-4 rounded-lg border border-red-200 bg-white p-4"><h3 className="text-sm font-semibold">Delete {product.productName}?</h3><p className="mt-1 text-xs text-stone-500">This will remove the product from your inventory and catalog.</p><div className="mt-3 flex gap-2"><button type="button" disabled={!!busy} onClick={remove} className="rounded bg-red-600 px-3 py-2 text-xs text-white disabled:opacity-50">{busy === "delete" ? "Deleting..." : "Delete product"}</button><button type="button" disabled={!!busy} onClick={() => setConfirmDelete(false)} className="rounded border px-3 py-2 text-xs">Keep product</button></div></section>}
        {loading ? <p role="status" className="flex items-center justify-center gap-2 py-24 text-sm text-stone-500"><LoaderCircle size={20} className="animate-spin" /> Loading product details...</p> : product && <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_230px]">
          <fieldset disabled={!!busy} className="min-w-0 space-y-5 rounded-xl bg-white p-4 sm:p-5">
            <section><h3 className="mb-3 text-xs font-semibold text-[#a48222]">Product Information</h3><div className="grid gap-3 sm:grid-cols-2">
              {field("productName", "Product Name", { required: true, minLength: 3, maxLength: 200 })}
              <label className="text-[11px] text-stone-500">Category{editing ? <><select value={form.category} onChange={e => setForm(previous => ({ ...previous, category: e.target.value }))} className={control} disabled={categoryLoading} required={product.status !== "draft"}><option value="">{categoryLoading ? "Loading..." : "Select category"}</option>{categories.map(c => <option key={c._id} value={c._id}>{c.categoryName}</option>)}</select>{categoryError && <span className="text-red-600">{categoryError} <button type="button" onClick={() => setCategoryRetry(n => n + 1)} className="underline">Retry</button></span>}</> : <span className={`${control} block`}>{categoryName(product)}</span>}</label>
              {field("productType", "Product Type", { maxLength: 100 })}{field("sku", "SKU / Item Code", { maxLength: 100 })}{field("hsn", "HSN (Optional)", { maxLength: 30 })}{field("brand", "Brand", { maxLength: 200 })}
            </div><div className="mt-3">{textField("shortDescription", "Short Description", 150)}</div></section>
            <section className="space-y-4 rounded-lg bg-[#f7f7f6] p-3">{textField("description", "Detailed Description", 5000)}<div><h3 className="text-xs font-semibold">Product Status</h3><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-md border border-[#d7ba65] bg-white px-3 py-2 text-xs text-[#94731b]">{Number(product.quantity) > 0 ? "In Stock" : "Out of Stock"}</span><span className="rounded-md bg-stone-200/60 px-3 py-2 text-xs">{listingStatus(product)}</span></div>{product.rejectionReason && <p className="mt-2 text-xs text-red-700">Review feedback: {product.rejectionReason}</p>}</div>
              <div><h3 className="mb-2 text-xs font-semibold">Product Images</h3>{images.length ? <><ProductPhoto key={images[activeImage]} src={images[activeImage]} name={product.productName} className="aspect-[1.8] border border-stone-200" /><div className="mt-2 flex flex-wrap gap-2">{images.map((src, index) => <button key={`${src}-${index}`} type="button" aria-label={`View image ${index + 1}`} aria-pressed={activeImage === index} onClick={() => setActiveImage(index)} className={`rounded-lg border-2 p-1 ${activeImage === index ? "border-[#b59127]" : "border-transparent"}`}><ProductPhoto src={src} name={`${product.productName}, image ${index + 1}`} className="h-14 w-14" /></button>)}</div></> : <p className="rounded-lg border border-dashed p-6 text-center text-xs text-stone-400">No images uploaded.</p>}</div>
            </section>
            <section><h3 className="mb-3 text-xs font-semibold text-[#a48222]">Inventory &amp; Pricing</h3><div className="grid gap-3 sm:grid-cols-3">{field("quantity", "Quantity", { type: "number", min: 0, step: 1, required: true })}{field("price", "Price (NGN)", { type: "number", min: 0, step: "0.01", required: true })}{field("compareAtPrice", "Compare-at Price (NGN)", { type: "number", min: 0, step: "0.01" })}{field("weight", "Weight (kg)", { type: "number", min: 0, step: "0.001" })}{field("dimensions", "Dimensions (L × W × H)", { maxLength: 100 })}{field("stockAlert", "Stock Alert", { type: "number", min: 0, step: 1 })}{field("discountPrice", "Discount Price (NGN)", { type: "number", min: 0, step: "0.01" })}{field("discountPercentage", "Discount (%)", { type: "number", min: 0, max: 100, step: "0.01" })}</div></section>
            <section><h3 className="mb-2 text-xs font-semibold text-[#a48222]">Review / Summary</h3>{textField("notes", "Internal notes", 1000)}</section>
          </fieldset>
          <aside className="space-y-4 md:sticky md:top-0"><section className="rounded-xl bg-white p-4"><h3 className="mb-3 text-xs font-semibold text-[#a48222]">Product Preview</h3><ProductPhoto key={images[0]} src={images[0]} name={product.productName} className="aspect-square" /><dl className="mt-4 space-y-3 text-xs">{[["Product Name", product.productName], ["SKU / Item Code", product.sku || "—"], ["Category", categoryName(product)], ["Price", money.format(salePrice)], ["Stock", `${product.quantity ?? 0} units`]].map(([label, value]) => <div key={label}><dt className="text-[10px] text-stone-400">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl></section><section className="rounded-xl bg-white p-4"><h3 className="text-xs font-semibold text-[#a48222]">Completion Checklist</h3><p className="mt-1 text-[10px] text-stone-400">Your listing at a glance.</p><ul className="mt-4 space-y-4">{checklist.map(([label, complete]) => <li key={label} className="flex items-center gap-2 text-[10px]">{complete ? <CheckCircle2 size={14} className="shrink-0 text-[#b59127]" /> : <Circle size={14} className="shrink-0 text-stone-300" />}<span className="flex-1">{label}</span><span className="text-stone-400">{complete ? "Completed" : "Pending"}</span></li>)}</ul></section></aside>
        </div>}
      </div>
      {editing && <footer className="flex shrink-0 justify-end gap-2 border-t bg-white px-5 py-4"><button type="button" disabled={!!busy} onClick={() => { setEditing(false); setError(""); }} className="rounded border px-4 py-2 text-xs">Cancel</button><button type="submit" disabled={!!busy || categoryLoading || !!categoryError} className="rounded bg-[#b59127] px-4 py-2 text-xs text-white disabled:opacity-50">{busy === "save" ? "Saving..." : "Save changes"}</button></footer>}
    </form>
  </dialog>;
}
