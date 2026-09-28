"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { Camera, Check, Circle, LoaderCircle, Package, UploadCloud, X } from "lucide-react";
import { api } from "@/app/lib/axios";
import { productFormErrors } from "@/app/lib/product-form-validation";
import { validateProductInput } from "@/app/lib/product-input";

const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
const keys = ["productName", "productType", "sku", "hsn", "shortDescription", "description", "brand", "quantity", "price", "compareAtPrice", "weight", "dimensions", "stockAlert", "discountPrice", "discountPercentage", "notes"];

export default function EditProductModal({ product, onClose, onSaved }) {
  const dialog = useRef(null);
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const previews = useRef(new Set());
  const uploads = useRef(new Map());
  const submitting = useRef(false);
  const [form, setForm] = useState(() => ({ ...Object.fromEntries(keys.map(key => [key, product[key] ?? ""])), category: product.categoryId || product.category?._id || "" }));
  const [availability, setAvailability] = useState(product.status === "draft" ? "draft" : Number(product.quantity) > 0 ? "in_stock" : "out_of_stock");
  const [images, setImages] = useState(() => (product.productImages || []).map(url => ({ preview: url, url })));
  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [retry, setRetry] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [imageError, setImageError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [dragging, setDragging] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [dirty, setDirty] = useState(false);
  const errors = productFormErrors(form, { draft: availability === "draft", availability, imageCount: images.length });
  const visibleErrors = submitted ? { ...errors } : {};
  if (imageError) visibleErrors.productImages = imageError;
  const update = (key, value) => { setDirty(true); setForm(previous => ({ ...previous, [key]: value })); };

  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    const urls = previews.current;
    element.showModal(); document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; urls.forEach(url => URL.revokeObjectURL(url)); focused?.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setCategoryLoading(true); setCategoryError("");
      try {
        const response = await api.get("/category", { signal: controller.signal });
        if (!Array.isArray(response.data.categories)) throw new Error("Invalid categories");
        if (!controller.signal.aborted) setCategories(response.data.categories);
      } catch { if (!controller.signal.aborted) setCategoryError("Categories could not be loaded."); }
      finally { if (!controller.signal.aborted) setCategoryLoading(false); }
    }
    load(); return () => controller.abort();
  }, [retry]);

  function close() { if (!submitting.current) { if (dirty) setDiscarding(true); else onClose(); } }
  function addImages(files) {
    if (submitting.current) return;
    const incoming = Array.from(files);
    if (images.length + incoming.length > 7) { setImageError("You can add up to 7 images."); return; }
    if (incoming.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) { setImageError("Choose JPG, PNG or WEBP images up to 5 MB each."); return; }
    setImageError(""); setDirty(true);
    setImages(previous => [...previous, ...incoming.map(file => { const preview = URL.createObjectURL(file); previews.current.add(preview); return { file, preview }; })]);
  }
  function removeImage(item) {
    if (submitting.current) return;
    if (item.file) { URL.revokeObjectURL(item.preview); previews.current.delete(item.preview); }
    setImages(previous => previous.filter(image => image !== item)); setDirty(true); setImageError("");
  }
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    setSubmitted(true); setError(""); setImageError("");
    if (Object.keys(errors).length) { event.currentTarget.querySelector(`[data-field="${Object.keys(errors)[0]}"]`)?.focus(); return; }
    const payload = { ...form, quantity: availability === "out_of_stock" ? 0 : form.quantity, availability, saveAsDraft: availability === "draft" };
    try {
      validateProductInput({ ...payload, productImages: images.map(image => image.url || "https://placeholder.invalid/image") });
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_NAME;
      if (images.some(image => image.file) && (!cloud || !preset)) throw new Error("Image uploads are not configured. Please contact support.");
      submitting.current = true; setBusy("Saving changes...");
      const productImages = [];
      for (const item of images) {
        if (item.url) { productImages.push(item.url); continue; }
        if (!uploads.current.has(item.file)) {
          setBusy("Uploading images...");
          const body = new FormData(); body.append("file", item.file); body.append("upload_preset", preset);
          const response = await axios.post(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, body);
          if (!response.data.secure_url) throw new Error("Image upload failed. Please try again.");
          uploads.current.set(item.file, response.data.secure_url);
        }
        productImages.push(uploads.current.get(item.file));
      }
      setBusy("Updating product...");
      const response = await api.put(`/products/${encodeURIComponent(product.slug)}`, { ...payload, productImages });
      if (!response.data.success || !response.data.data?._id) throw new Error(response.data.message || "Unable to update product.");
      const saved = response.data.data;
      const category = categories.find(item => item._id === form.category) || (form.category ? { _id: form.category, categoryName: typeof product.category === "string" ? product.category : product.category?.categoryName } : null);
      onSaved({ ...saved, category, categoryId: form.category, notes: form.notes }, response.data.message);
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to update product."); }
    finally { submitting.current = false; setBusy(""); }
  }
  const props = key => ({ "data-field": key, "aria-invalid": !!visibleErrors[key], "aria-describedby": visibleErrors[key] ? `edit-${key}-error` : undefined });
  const inputClass = key => `mt-1 block w-full rounded-md border bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:ring-2 focus:ring-[#b59127]/20 disabled:bg-stone-50 ${visibleErrors[key] ? "border-red-500" : "border-stone-200 focus:border-[#b59127]"}`;
  const fieldError = key => visibleErrors[key] ? <span id={`edit-${key}-error`} role="alert" className="mt-1 block text-xs text-red-600">{visibleErrors[key]}</span> : null;
  function field(key, label, options = {}) {
    return <label className="block text-[11px] text-stone-600">{label}{options.required && <span className="ml-1 text-red-500">*</span>}<input {...options} {...props(key)} value={key === "quantity" && availability === "out_of_stock" ? 0 : form[key]} onChange={e => update(key, e.target.value)} className={inputClass(key)} />{fieldError(key)}</label>;
  }
  const price = Number(form.discountPrice) > 0 ? Number(form.discountPrice) : Number(form.price || 0) * (1 - Number(form.discountPercentage || 0) / 100);
  const statusHint = availability === "draft" ? "Saved privately. This product will be removed from the storefront." : product.status === "draft" ? "This product will be submitted for admin approval." : product.status === "approved" && product.isPublished ? "Changes to this listing will go live after you update." : "Changes will be saved. Storefront visibility still requires admin approval and publishing.";

  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); close(); }} aria-labelledby="edit-product-title" className="m-auto max-h-[94dvh] w-[calc(100%_-_2rem)] max-w-[1060px] overflow-hidden rounded-xl bg-[#f6f7f9] p-0 text-stone-800 shadow-2xl backdrop:bg-black/50">
    <form noValidate onSubmit={submit} className="flex max-h-[94dvh] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 px-5 py-4 sm:px-7"><div><h2 id="edit-product-title" className="text-lg font-semibold">Edit Product</h2><p className="mt-1 text-xs text-stone-500">Modify details, pricing, and stock of your store listing.</p></div><button type="button" onClick={close} disabled={!!busy} aria-label="Close edit product" className="rounded-md p-2 hover:bg-stone-200 disabled:opacity-50"><X size={19} /></button></header>
      <div className="min-h-0 overflow-y-auto px-5 pb-5 sm:px-7 sm:pb-7">
        {discarding && <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">Discard your unsaved changes?<div className="mt-3 flex gap-3"><button type="button" onClick={onClose} className="rounded border border-amber-300 px-3 py-2 text-xs">Discard changes</button><button type="button" onClick={() => setDiscarding(false)} className="rounded bg-[#b59127] px-3 py-2 text-xs text-white">Keep editing</button></div></div>}
        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_210px]">
          <div className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
            <fieldset disabled={!!busy} className="min-w-0 space-y-5">
              <section><h3 className="mb-3 text-xs font-semibold">Product Information</h3><div className="grid gap-3 sm:grid-cols-2">
                {field("productName", "Product Name", { required: true, maxLength: 200, autoFocus: true })}
                <label className="text-[11px] text-stone-600">Category <span className="text-red-500">*</span><select {...props("category")} className={inputClass("category")} value={form.category} onChange={e => update("category", e.target.value)} disabled={categoryLoading}><option value="">{categoryLoading ? "Loading categories..." : "Select category"}</option>{form.category && !categories.some(c => c._id === form.category) && <option value={form.category}>{typeof product.category === "string" ? product.category : product.category?.categoryName || "Current category"}</option>}{categories.map(c => <option key={c._id} value={c._id}>{c.categoryName}</option>)}</select>{fieldError("category")}{categoryError && <span role="alert" className="mt-1 block text-red-600">{categoryError} <button type="button" onClick={() => setRetry(n => n + 1)} className="underline">Retry</button></span>}</label>
                {field("productType", "Product Type", { maxLength: 100 })}{field("sku", "SKU / Item Code", { maxLength: 100 })}{field("hsn", "HSN (Optional)", { maxLength: 30 })}{field("shortDescription", "Short Description", { maxLength: 150 })}
              </div></section>
              <label className="block text-[11px] text-stone-600">Detailed Description <span className="text-red-500">*</span><textarea {...props("description")} rows={4} maxLength={5000} value={form.description} onChange={e => update("description", e.target.value)} className={`${inputClass("description")} !bg-[#f7f7f8]`} />{fieldError("description")}</label>
              <fieldset><legend className="mb-2 text-xs font-semibold">Product Status</legend><div className="grid gap-2 sm:grid-cols-3">{[["in_stock", "Active", "In stock · publishing subject to approval"], ["out_of_stock", "Out of Stock", "Temporarily unavailable"], ["draft", "Draft", "Saved for private preview"]].map(([value, title, hint]) => <label key={value} className={`cursor-pointer rounded-lg border p-3 ${availability === value ? "border-[#c5a04a] bg-[#fffdf7]" : "border-stone-100 bg-stone-50"}`}><span className="flex items-center gap-2 text-xs"><input type="radio" name="product-availability" checked={availability === value} onChange={() => { setAvailability(value); setDirty(true); }} className="accent-[#b59127]" />{title}</span><span className="mt-1 block text-[10px] text-stone-500">{hint}</span></label>)}</div></fieldset>
              <section><h3 className="mb-2 text-xs font-semibold">Media / Gallery</h3><div tabIndex={-1} {...props("productImages")} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); addImages(e.dataTransfer.files); }} className={`rounded-lg border border-dashed p-4 text-center ${visibleErrors.productImages ? "border-red-500" : dragging ? "border-[#b59127] bg-amber-50" : "border-stone-300 bg-[#f3f3f7]"}`}>
                {images.length > 0 && <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">{images.map((item, index) => <div key={item.preview} className="relative"><div className="relative aspect-square overflow-hidden rounded-md bg-white"><Image src={item.preview} alt={`Product image ${index + 1}`} fill unoptimized sizes="160px" className="object-contain" /><button type="button" onClick={() => removeImage(item)} aria-label={`Remove image ${index + 1}`} className="absolute right-1 top-1 rounded-full bg-white p-1 shadow"><X size={13} /></button></div><button type="button" disabled={index === 0} onClick={() => { setImages(previous => [item, ...previous.filter(image => image !== item)]); setDirty(true); }} className="mt-1 text-[10px] text-[#94731b] disabled:text-stone-400">{index === 0 ? "Cover image" : "Make cover"}</button></div>)}</div>}
                <p className="flex items-center justify-center gap-2 text-xs text-stone-400"><UploadCloud size={16} /> Drag &amp; drop product photos here</p><div className="mt-3 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => fileInput.current.click()} className="inline-flex items-center gap-1 rounded bg-white px-3 py-2 text-xs text-stone-500"><UploadCloud size={13} /> Upload from device</button><button type="button" onClick={() => cameraInput.current.click()} className="inline-flex items-center gap-1 rounded bg-white px-3 py-2 text-xs text-stone-500"><Camera size={13} /> Use Camera</button></div><input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} /><input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} />
              </div>{fieldError("productImages")}<p className="mt-2 text-[10px] text-stone-400">Up to 7 images · JPG, PNG or WEBP · 5 MB each.</p></section>
              <section><h3 className="mb-3 text-xs font-semibold">Inventory &amp; Pricing</h3><div className="grid gap-3 sm:grid-cols-3">{field("quantity", "Quantity", { type: "number", min: 0, step: 1, disabled: availability === "out_of_stock" })}{field("price", "Price (NGN)", { type: "number", min: 0, step: "0.01" })}{field("compareAtPrice", "Compare-at Price (NGN)", { type: "number", min: 0, step: "0.01" })}{field("weight", "Weight (kg)", { type: "number", min: 0, step: "0.001" })}{field("dimensions", "Dimensions", { maxLength: 100 })}{field("stockAlert", "Stock Alert", { type: "number", min: 0, step: 1 })}</div></section>
              <details className="text-xs text-stone-500"><summary className="cursor-pointer">Additional details &amp; discounts</summary><div className="mt-3 grid gap-3 sm:grid-cols-3">{field("brand", "Brand", { maxLength: 200 })}{field("discountPrice", "Discount Price (NGN)", { type: "number", min: 0, step: "0.01" })}{field("discountPercentage", "Discount (%)", { type: "number", min: 0, max: 100, step: "0.01" })}</div><label className="mt-3 block text-[11px]">Internal notes<textarea value={form.notes} onChange={e => update("notes", e.target.value)} maxLength={1000} rows={2} className={inputClass("notes")} {...props("notes")} />{fieldError("notes")}</label></details>
            </fieldset>
            <footer className="mt-5 border-t border-stone-200 pt-4"><p className="text-[10px] leading-4 text-stone-500">{statusHint}</p>{error && <p role="alert" className="mt-3 rounded bg-red-50 p-3 text-xs text-red-700">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" disabled={!!busy} onClick={close} className="rounded-md border px-4 py-2 text-xs">Cancel</button><button type="submit" disabled={!!busy || categoryLoading || !!categoryError} className="inline-flex min-w-24 items-center justify-center gap-2 rounded-md bg-[#b59127] px-5 py-2 text-xs text-white hover:bg-[#98771d] disabled:opacity-50">{busy && <LoaderCircle size={14} className="animate-spin" />}{busy || "Update"}</button></div></footer>
          </div>
          <aside className="border-stone-200 bg-white p-4 md:sticky md:top-0 md:border-l"><h3 className="mb-3 text-xs font-semibold">Product Preview</h3><div className="overflow-hidden rounded-lg border border-stone-200"><div className="relative flex aspect-square items-center justify-center bg-[#eeefec]">{images[0] ? <Image src={images[0].preview} alt={form.productName || "Product preview"} fill unoptimized sizes="210px" className="object-contain" /> : <Package className="text-stone-400" size={32} />}</div><div className="p-3"><p className="break-words text-xs font-medium">{form.productName || "Product name"}</p><p className="mt-1 text-[11px] text-stone-500">{currency.format(Number.isFinite(price) ? price : 0)} / unit</p><p className="mt-1 text-[10px] text-stone-400">{availability === "out_of_stock" ? 0 : Number(form.quantity) || 0} units</p></div></div><h3 className="mb-1 mt-5 text-xs font-semibold">Edit Status</h3><p className="text-[10px] text-stone-400">Live validation of your changes</p><ul className="mt-3 space-y-3">{[["Required details filled", !errors.productName && !errors.category && !errors.description], ["Pricing and stock valid", !errors.price && !errors.quantity && !errors.compareAtPrice && !errors.stockAlert], ["Product images added", images.length > 0 && !imageError]].map(([label, complete]) => <li key={label} className={`flex items-center gap-2 text-[10px] ${complete ? "text-emerald-600" : "text-stone-400"}`}>{complete ? <Check size={13} /> : <Circle size={12} />}{label}</li>)}</ul></aside>
        </div>
      </div>
    </form>
  </dialog>;
}
