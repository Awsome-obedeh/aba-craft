"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { Camera, CheckCircle2, Circle, LoaderCircle, Package, UploadCloud, X } from "lucide-react";
import { api } from "@/app/lib/axios";
import { validateProductInput } from "@/app/lib/product-input";
import { productFormErrors } from "@/app/lib/product-form-validation";

const initial = { productName: "", category: "", productType: "", sku: "", hsn: "", brand: "", shortDescription: "", description: "", quantity: "", price: "", compareAtPrice: "", weight: "", dimensions: "", stockAlert: "", notes: "" };
const control = "mt-1 w-full rounded-md border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#b59127] focus:ring-2 focus:ring-[#b59127]/10 disabled:bg-stone-100";
const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

export default function AddProductModal({ onClose, onCreated }) {
  const dialog = useRef(null);
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const previews = useRef(new Set());
  const uploaded = useRef(new Map());
  const submitting = useRef(false);
  const [form, setForm] = useState(initial);
  const [availability, setAvailability] = useState("in_stock");
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [error, setError] = useState("");
  const [submittedMode, setSubmittedMode] = useState(null);
  const [imageError, setImageError] = useState("");
  const [busy, setBusy] = useState("");
  const [dragging, setDragging] = useState(false);
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const fieldErrors = submittedMode === null ? {} : productFormErrors(form, {
    draft: submittedMode === "draft" || availability === "draft", availability, imageCount: files.length,
  });
  if (imageError) fieldErrors.productImages = imageError;
  const errorId = key => `add-product-${key}-error`;
  const validationProps = key => ({
    "data-field": key,
    "aria-invalid": Boolean(fieldErrors[key]),
    "aria-describedby": fieldErrors[key] ? errorId(key) : undefined,
  });
  const inputClass = key => `${control} ${fieldErrors[key] ? "!border-red-500 focus:!border-red-500 focus:!ring-red-100" : ""}`;
  function fieldError(key) {
    return fieldErrors[key] ? <span id={errorId(key)} role="alert" className="mt-1 block text-xs font-normal text-red-600">{fieldErrors[key]}</span> : null;
  }

  useEffect(() => {
    const element = dialog.current;
    const urls = previews.current;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previousOverflow; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setCategoryLoading(true); setCategoryError("");
      try {
        const response = await api.get("/category", { signal: controller.signal });
        if (!Array.isArray(response.data.categories)) throw new Error("Invalid categories");
        if (!controller.signal.aborted) setCategories(response.data.categories);
      } catch {
        if (!controller.signal.aborted) setCategoryError("Categories could not be loaded.");
      } finally { if (!controller.signal.aborted) setCategoryLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [categoryRetry]);

  function addFiles(incoming) {
    if (submitting.current) return;
    const images = Array.from(incoming);
    if (images.length + files.length > 7) { setImageError("You can add up to 7 images."); return; }
    if (images.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size)) {
      setImageError("Choose JPG, PNG or WEBP images up to 5 MB each."); return;
    }
    setError("");
    setImageError("");
    setFiles(previous => [...previous, ...images.map(file => {
      const preview = URL.createObjectURL(file); previews.current.add(preview);
      return { file, preview };
    })]);
  }
  function removeFile(item) {
    setImageError("");
    URL.revokeObjectURL(item.preview); previews.current.delete(item.preview);
    setFiles(previous => previous.filter(entry => entry !== item));
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const saveAsDraft = event.nativeEvent.submitter?.value === "draft" || availability === "draft";
    const payload = { ...form, quantity: availability === "out_of_stock" ? 0 : form.quantity, saveAsDraft };
    setError("");
    setSubmittedMode(saveAsDraft ? "draft" : "publish");
    setImageError("");
    const errors = productFormErrors(form, { draft: saveAsDraft, availability, imageCount: files.length });
    if (Object.keys(errors).length) {
      const invalidField = event.currentTarget.querySelector(`[data-field="${Object.keys(errors)[0]}"]`);
      invalidField?.focus();
      invalidField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    try {
      validateProductInput({ ...payload, productImages: files.map(() => "https://placeholder.invalid/image") });
      if (!saveAsDraft && availability === "in_stock" && Number(form.quantity) < 1) throw new Error("Enter at least 1 unit for an in-stock product.");
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_NAME;
      if (files.length && (!cloud || !preset)) throw new Error("Image uploads are not configured. Please contact support.");
      submitting.current = true;
      setBusy("Uploading images...");
      const productImages = [];
      for (const { file } of files) {
        if (!uploaded.current.has(file)) {
          const body = new FormData(); body.append("file", file); body.append("upload_preset", preset);
          const response = await axios.post(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, body);
          if (!response.data.secure_url) throw new Error("Image upload failed. Please try again.");
          uploaded.current.set(file, response.data.secure_url);
        }
        productImages.push(uploaded.current.get(file));
      }
      setBusy(saveAsDraft ? "Saving draft..." : "Submitting product...");
      const response = await api.post("/products", { ...payload, productImages });
      if (!response.data.success) throw new Error(response.data.message || "Unable to save product.");
      onCreated(response.data.message || "Product saved.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save product. Please try again.");
    } finally { submitting.current = false; setBusy(""); }
  }

  const category = categories.find(item => item._id === form.category)?.categoryName;
  const informationComplete = form.productName.trim().length >= 3 && form.category && form.description.trim();
  const pricingComplete = Number(form.price) > 0 && (availability === "out_of_stock" || Number(form.quantity) > 0);
  const sections = [["Product Information", informationComplete], ["Media Gallery", files.length > 0], ["Inventory & Pricing", pricingComplete], ["Review & Publish", informationComplete && files.length > 0 && pricingComplete]];
  function field(key, label, options = {}) {
    return <label className="block text-[11px] font-medium text-stone-700">{label}{options.required && <span className="ml-1 text-red-500">*</span>}<input className={inputClass(key)} name={key} value={form[key]} onChange={event => update(key, event.target.value)} {...options} {...validationProps(key)} />{fieldError(key)}</label>;
  }

  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} aria-labelledby="add-product-title" className="m-auto max-h-[92dvh] w-[calc(100%_-_2rem)] max-w-[940px] overflow-hidden rounded-xl bg-white p-0 text-stone-800 shadow-2xl backdrop:bg-black/45">
    <form noValidate onSubmit={submit} className="flex max-h-[92dvh] flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className="rounded-lg bg-[#fff4d1] p-2.5 text-[#b59127]"><Package size={20} /></span><div><h2 id="add-product-title" className="text-base font-semibold">Add New Product</h2><p className="mt-0.5 text-xs text-stone-500">Add a new product to your inventory. Fill in the details below to get started.</p></div></div><button type="button" disabled={Boolean(busy)} onClick={onClose} aria-label="Close add product" className="rounded p-2 text-stone-400 hover:bg-stone-100 disabled:opacity-40"><X size={18} /></button></header>

      <div className="min-h-0 overflow-y-auto"><div className="grid md:grid-cols-[minmax(0,1fr)_210px]">
        <fieldset disabled={Boolean(busy)} className="min-w-0 space-y-5 p-5 sm:p-6">
          <section><h3 className="mb-3 text-xs font-semibold">Product Information</h3><div className="grid gap-3 sm:grid-cols-2">
            {field("productName", "Product Name", { required: true, minLength: 3, maxLength: 200, placeholder: "e.g. Leather Crossbody Bag", autoFocus: true })}
            <label className="text-[11px] font-medium text-stone-700">Category <span className="text-red-500">*</span><select required {...validationProps("category")} value={form.category} onChange={event => update("category", event.target.value)} className={inputClass("category")} disabled={categoryLoading}><option value="">{categoryLoading ? "Loading categories..." : "Select category"}</option>{categories.map(item => <option key={item._id} value={item._id}>{item.categoryName}</option>)}</select>{fieldError("category")}{categoryError && <span className="mt-1 block text-red-600">{categoryError} <button type="button" onClick={() => setCategoryRetry(value => value + 1)} className="underline">Retry</button></span>}</label>
            <label className="text-[11px] font-medium text-stone-700">Product Type<select {...validationProps("productType")} value={form.productType} onChange={event => update("productType", event.target.value)} className={inputClass("productType")}><option value="">Select product type</option>{["Ready-made", "Made to order", "Raw material", "Other"].map(type => <option key={type}>{type}</option>)}</select>{fieldError("productType")}</label>
            {field("sku", "SKU / Item Code", { maxLength: 100, placeholder: "e.g. AC-LCB-001" })}
            {field("hsn", "HSN (Optional)", { maxLength: 30, placeholder: "e.g. 4202.21" })}
            {field("brand", "Brand (Optional)", { maxLength: 200, placeholder: "Your brand name" })}
          </div><label className="mt-3 block text-[11px] font-medium">Short Description<textarea {...validationProps("shortDescription")} value={form.shortDescription} onChange={event => update("shortDescription", event.target.value)} maxLength={150} rows={2} className={`${inputClass("shortDescription")} resize-y`} placeholder="A short summary about this product..." />{fieldError("shortDescription")}<span className="block text-right text-[10px] font-normal text-stone-400">{form.shortDescription.length}/150</span></label></section>

          <section className="rounded-lg bg-[#f7f7f6] p-3"><label className="text-[11px] font-medium">Detailed Description <span className="text-red-500">*</span><textarea required {...validationProps("description")} value={form.description} onChange={event => update("description", event.target.value)} maxLength={5000} rows={3} className={`${inputClass("description")} resize-y`} placeholder="Describe your product in detail. Include features, materials, style, and what makes it unique." />{fieldError("description")}<span className="block text-right text-[10px] font-normal text-stone-400">{form.description.length}/5000</span></label>
            <fieldset className="mt-4"><legend className="text-xs font-semibold">Product Status</legend><p className="mt-1 text-[11px] text-stone-500">Set the initial availability status for this product.</p><div className="mt-2 grid grid-cols-3 gap-2">{[["in_stock", "In Stock", "Available for sale"], ["out_of_stock", "Out of Stock", "Not available"], ["draft", "Draft", "Save as draft"]].map(([value, title, hint]) => <label key={value} className={`cursor-pointer rounded-lg border bg-white p-2 ${availability === value ? "border-[#b59127]" : "border-stone-200"}`}><span className="flex items-center gap-1.5 text-[11px] font-medium"><input type="radio" name="availability" value={value} checked={availability === value} onChange={() => setAvailability(value)} className="accent-[#b59127]" />{title}</span><span className="mt-1 block text-[10px] text-stone-400">{hint}</span></label>)}</div></fieldset>
            <h3 className="mb-2 mt-4 text-xs font-semibold">Media / Gallery</h3>
            <div {...validationProps("productImages")} tabIndex={-1} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} className={`rounded-lg border border-dashed p-5 text-center ${fieldErrors.productImages ? "border-red-500 bg-red-50" : dragging ? "border-[#b59127] bg-amber-50" : "border-stone-300 bg-[#f3f3f5]"}`}>
              {files.length > 0 && <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">{files.map(item => <div key={item.preview} className="relative aspect-square overflow-hidden rounded-md border border-stone-200"><Image src={item.preview} alt={item.file.name} fill unoptimized className="object-cover" /><button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => removeFile(item)} className="absolute right-1 top-1 rounded-full bg-white p-1 shadow"><X size={12} /></button></div>)}</div>}
              <UploadCloud size={20} className="mx-auto mb-2 text-stone-400" /><p className="text-xs text-stone-500">Drag &amp; drop images here</p><div className="mt-3 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => fileInput.current.click()} className="inline-flex items-center gap-2 rounded border border-stone-200 bg-white px-3 py-2 text-[11px]"><UploadCloud size={13} /> Upload from device</button><button type="button" onClick={() => cameraInput.current.click()} className="inline-flex items-center gap-2 rounded border border-stone-200 bg-white px-3 py-2 text-[11px]"><Camera size={13} /> Use Camera</button></div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={event => { addFiles(event.target.files); event.target.value = ""; }} /><input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={event => { addFiles(event.target.files); event.target.value = ""; }} />
            </div>{fieldError("productImages")}<p className="mt-2 text-[10px] text-stone-400">Up to 7 images · JPG, PNG, WEBP · 5 MB each. First image is the cover.</p>
          </section>

          <section><h3 className="mb-3 text-xs font-semibold">Inventory &amp; Pricing</h3><div className="grid gap-3 sm:grid-cols-3">
            {field("quantity", "Quantity", { type: "number", min: 0, step: 1, placeholder: availability === "out_of_stock" ? "0 — out of stock" : "0", disabled: availability === "out_of_stock" })}
            {field("price", "Price (NGN)", { type: "number", min: 0.01, step: "0.01", placeholder: "0.00", required: true })}
            {field("compareAtPrice", "Compare-at Price (NGN)", { type: "number", min: 0, step: "0.01", placeholder: "0.00" })}
            {field("weight", "Weight (kg)", { type: "number", min: 0, step: "0.001", placeholder: "0.00 kg" })}
            {field("dimensions", "Dimensions (L × W × H)", { maxLength: 100, placeholder: "0 × 0 × 0 cm" })}
            {field("stockAlert", "Stock Alert", { type: "number", min: 0, step: 1, placeholder: "0" })}
          </div></section>
          <section><label className="text-xs font-semibold">Review / Summary<textarea {...validationProps("notes")} value={form.notes} onChange={event => update("notes", event.target.value)} maxLength={1000} rows={2} className={`${inputClass("notes")} resize-y font-normal`} placeholder="Add any internal notes, special handling, or publishing instructions..." />{fieldError("notes")}</label></section>
        </fieldset>

        <aside className="border-t border-stone-200 p-5 md:border-l md:border-t-0"><div className="md:sticky md:top-5"><h3 className="mb-3 text-xs font-semibold">Product Preview</h3><div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#d7ba65] bg-[#fffdf6]">{files[0] ? <Image src={files[0].preview} alt="Product cover preview" fill unoptimized className="object-cover" /> : <div className="p-4 text-center"><Package size={24} className="mx-auto mb-2 text-[#b59127]" /><p className="text-[11px] text-stone-500">No image yet</p><p className="mt-1 text-[10px] text-stone-400">Upload images in the media section</p></div>}</div>
          <dl className="mt-4 space-y-3 text-[11px]">{[["Product Name", form.productName || "—"], ["SKU / Item Code", form.sku || "—"], ["Category", category || "—"], ["Price", currency.format(Number(form.price) || 0)], ["Stock", availability === "out_of_stock" ? "0 units" : `${Number(form.quantity) || 0} units`], ["Status", availability === "draft" ? "Draft" : "Pending review"]].map(([label, value]) => <div key={label}><dt className="text-stone-400">{label}</dt><dd className="mt-0.5 break-words font-medium">{value}</dd></div>)}</dl>
          <h3 className="mb-1 mt-6 text-xs font-semibold">Completion Checklist</h3><p className="mb-3 text-[10px] text-stone-400">Complete all steps to submit your product.</p><ul className="space-y-3">{sections.map(([label, complete]) => <li key={label} className="flex items-center gap-2 text-[10px]">{complete ? <CheckCircle2 size={13} className="shrink-0 text-[#b59127]" /> : <Circle size={13} className="shrink-0 text-stone-300" />}<span>{label}</span></li>)}</ul>
        </div></aside>
      </div></div>
      <footer className="shrink-0 border-t border-stone-200 bg-white px-5 py-4 sm:px-6">
        {error && <p role="alert" className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xs text-[10px] leading-4 text-stone-500">Products require admin approval before appearing in the catalog. A product name is enough to save a draft.</p><div className="flex items-center gap-2"><button type="button" disabled={Boolean(busy)} onClick={onClose} className="rounded-md border border-stone-300 px-4 py-2 text-xs disabled:opacity-50">Cancel</button><button type="submit" name="action" value="draft" formNoValidate disabled={Boolean(busy)} className="rounded-md border border-[#b59127] px-3 py-2 text-xs text-[#a48222] disabled:opacity-50">Save as Draft</button><button type="submit" name="action" value="publish" formNoValidate={availability === "draft"} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-md bg-[#b59127] px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{busy && <LoaderCircle size={13} className="animate-spin" />}{busy || (availability === "draft" ? "Save Draft" : "Publish Product")}</button></div></div>
      </footer>
    </form>
  </dialog>;
}

