"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import AddProductModal from "./AddProductModal";
import { useRouter, useSearchParams } from "next/navigation";
import { Boxes, Package, Plus, Search, SlidersHorizontal, X, ArrowUpRight, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/app/lib/axios";
import { useAuthStore } from "@/app/store/authStore";

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const categoryName = (product) => product.category?.categoryName || "Uncategorized";
const stockCount = (product) => Math.max(0, Number(product.quantity) || 0);
const salePrice = (product) => product.discountPrice > 0 ? product.discountPrice : Number(product.price || 0) * (1 - Math.min(100, Math.max(0, Number(product.discountPercentage) || 0)) / 100);
const stockLabel = (product) => stockCount(product) === 0 ? "Out of stock" : stockCount(product) <= (Number(product.stockAlert) || 10) ? "Low stock" : "In stock";
const statusLabel = (product) => product.status === "draft" ? "Draft" : product.status === "rejected" ? "Rejected" : product.status === "approved" ? product.isPublished ? "Published" : "Unpublished" : "Under review";

function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  const src = product.productImages?.[0];
  return <div className="relative aspect-[1.65] overflow-hidden bg-[#eeeFEB]">
    {src && !failed ? <Image src={src} alt={product.productName || "Product"} fill unoptimized sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-105" onError={() => setFailed(true)} />
      : <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-400"><Package size={34} strokeWidth={1} /><span className="text-xs">No product image</span></div>}
  </div>;
}

function Catalog() {
  const { user, accessToken } = useAuthStore();
  const router = useRouter();
  const params = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useRef(null);
  const urlSearch = params.get("search") || "";

  useEffect(() => {
    if (!accessToken || !user) { router.replace("/auth/sign-in"); return; }
    if (user.role !== "vendor") { router.replace("/dashboard/products"); return; }
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/products/vendor", { signal: controller.signal });
        if (!Array.isArray(response.data.products) || response.data.success === false) throw new Error("Invalid product response");
        if (!controller.signal.aborted) setProducts(response.data.products);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.response?.data?.message || "We couldn't load your products. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [accessToken, user, router, retry]);

  const categories = [...products.reduce((map, product) => {
    const name = categoryName(product);
    map.set(name, (map.get(name) || 0) + stockCount(product));
    return map;
  }, new Map())].sort(([a], [b]) => a.localeCompare(b));
  const query = (search || urlSearch).trim().toLowerCase();
  const visible = products.filter((product) =>
    (!category || categoryName(product) === category) &&
    (!stock || stockLabel(product) === stock) &&
    (!status || statusLabel(product) === status) &&
    (!query || [product.productName, product.brand, product.description, categoryName(product)].some((value) => String(value || "").toLowerCase().includes(query)))
  ).sort((a, b) => sort === "price-low" ? salePrice(a) - salePrice(b) : sort === "price-high" ? salePrice(b) - salePrice(a) : sort === "name" ? String(a.productName).localeCompare(String(b.productName)) : new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const filtered = Boolean(category || stock || status || query);
  function clearFilters() {
    setSearch(""); setCategory(""); setStock(""); setStatus(""); setSort("newest");
    if (urlSearch) router.replace(window.location.pathname);
  }
  function openProduct(product) { setSelected(product); dialog.current.showModal(); }

  return <DashboardLayout role={user?.role} email={user?.email}>
    <div className="mx-auto max-w-[1440px] text-[#292b27]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">My Products</h1><p className="mt-1 text-sm text-stone-500">Your uploaded products, stock, and listing status in one place.</p></div>
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#b59127] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#98771d]"><Plus size={16} /> Add product</button>
      </header>

      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      <section className="rounded-xl border border-[#deded8] bg-white p-4 sm:p-5" aria-label="Product inventory">
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Categories &amp; Stock</h2><button type="button" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-controls="inventory-filters" className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition ${showFilters ? "border-[#b59127] bg-[#fbf6e7]" : "border-stone-200 hover:bg-stone-50"}`}><SlidersHorizontal size={14} /> Filters{(stock || status) && <span className="h-1.5 w-1.5 rounded-full bg-[#b59127]" />}</button></div>

        {!loading && !error && products.length > 0 && <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <button type="button" onClick={() => setCategory("")} aria-pressed={!category} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${!category ? "border-[#b59127] bg-[#fbf6e7]" : "border-stone-200 bg-[#f7f7f5] hover:border-stone-400"}`}><Boxes size={21} className="shrink-0 text-stone-500" /><span><span className="block text-xs font-medium">All products</span><span className="text-[11px] text-stone-500">{products.reduce((sum, p) => sum + stockCount(p), 0).toLocaleString()} units</span></span></button>
          {categories.map(([name, count]) => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(category === name ? "" : name)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${category === name ? "border-[#b59127] bg-[#fbf6e7]" : "border-stone-200 bg-[#f7f7f5] hover:border-stone-400"}`}><Package size={20} className="shrink-0 text-stone-500" /><span className="min-w-0"><span className="block break-words text-xs font-medium">{name}</span><span className="text-[11px] text-stone-500">{count.toLocaleString()} units</span></span></button>)}
        </div>}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex w-full items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 sm:max-w-xs"><Search size={16} className="text-stone-400" /><input aria-label="Search your products" placeholder={urlSearch ? `Search: ${urlSearch}` : "Search your products..."} value={search} onChange={(event) => { setSearch(event.target.value); if (urlSearch) router.replace(window.location.pathname); }} className="min-w-0 w-full bg-transparent text-xs outline-none" /></label>
          <p className="text-xs text-stone-500" aria-live="polite">{!loading && !error && `${visible.length} of ${products.length} products`}</p>
        </div>
        {showFilters && <div id="inventory-filters" className="mb-5 grid gap-3 rounded-lg bg-stone-50 p-3 sm:grid-cols-3">
          <label className="text-xs text-stone-600">Stock<select value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1 block w-full rounded-md border border-stone-200 bg-white p-2"><option value="">All stock levels</option>{["In stock", "Low stock", "Out of stock"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="text-xs text-stone-600">Listing status<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full rounded-md border border-stone-200 bg-white p-2"><option value="">All statuses</option>{["Published", "Unpublished", "Under review", "Rejected", "Draft"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="text-xs text-stone-600">Sort by<select value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1 block w-full rounded-md border border-stone-200 bg-white p-2"><option value="newest">Newest first</option><option value="name">Product name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
        </div>}
        {filtered && <button type="button" onClick={clearFilters} className="mb-4 flex items-center gap-1 text-xs text-[#94731b] hover:underline"><X size={13} /> Clear filters</button>}

        {loading ? <div role="status" aria-label="Loading products" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="animate-pulse overflow-hidden rounded-xl border border-stone-200"><div className="aspect-[1.65] bg-stone-100" /><div className="space-y-3 p-4"><div className="h-3 w-2/3 rounded bg-stone-100" /><div className="h-3 w-1/3 rounded bg-stone-100" /><div className="h-6 rounded bg-stone-100" /></div></div>)}</div>
          : error ? <div role="alert" className="py-16 text-center"><p className="text-sm text-red-700">{error}</p><button onClick={() => setRetry(retry + 1)} className="mx-auto mt-4 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"><RefreshCw size={15} /> Try again</button></div>
          : visible.length === 0 ? <div className="py-20 text-center"><Package size={40} strokeWidth={1} className="mx-auto mb-4 text-stone-400" /><h3 className="font-medium">{products.length ? "No matching products" : "Your product catalog starts here"}</h3><p className="mt-2 text-sm text-stone-500">{products.length ? "Try another search or clear your filters." : "Upload your first product to start building your inventory."}</p><button type="button" onClick={() => setAdding(true)} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#94731b]"><Plus size={15} /> Add product</button></div>
          : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(product => <article key={product._id} className="group overflow-hidden rounded-xl border border-[#deded8] bg-white transition-shadow hover:shadow-md">
            <button onClick={() => openProduct(product)} className="block w-full text-left" aria-label={`View ${product.productName}`}><ProductImage product={product} /></button>
            <div className="p-3.5"><div className="flex items-start justify-between gap-2"><button onClick={() => openProduct(product)} className="text-left text-sm font-medium leading-5 text-[#a48222] hover:underline">{product.productName}</button><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${stockCount(product) === 0 ? "bg-red-50 text-red-700" : stockCount(product) <= (Number(product.stockAlert) || 10) ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{stockLabel(product)}</span></div>
              <p className="mt-1 text-[10px] text-stone-400">{product.brand || categoryName(product)}</p>
              <p className="mt-3 line-clamp-2 min-h-8 text-xs leading-4 text-stone-600">{product.description || "No description added."}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-[11px]"><span className="text-stone-500">{stockCount(product).toLocaleString()} units available</span><span className="rounded bg-stone-100 px-2 py-1 text-stone-600">{statusLabel(product)}</span></div>
            </div>
            <footer className="flex items-center justify-between border-t border-stone-100 px-3.5 py-3"><div><p className="text-[10px] text-stone-400">Unit price</p><p className="text-sm font-semibold text-[#a48222]">{money.format(salePrice(product))}<span className="font-normal text-[10px]"> / unit</span>{salePrice(product) < Number(product.price) && <del className="ml-2 text-[10px] font-normal text-stone-400">{money.format(product.price)}</del>}</p></div><button type="button" onClick={() => openProduct(product)} aria-label={`View details for ${product.productName}`} className="rounded-md p-2 text-stone-500 hover:bg-stone-100"><ArrowUpRight size={17} /></button></footer>
          </article>)}</div>}
      </section>
    </div>
    {adding && <AddProductModal onClose={() => setAdding(false)} onCreated={(message) => { setAdding(false); setNotice(message); setRetry(value => value + 1); }} />}
    <dialog ref={dialog} aria-labelledby="product-detail-title" className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl p-0 shadow-xl backdrop:bg-black/40">
      {selected && <><div className="flex items-center justify-between gap-4 p-4"><h2 id="product-detail-title" className="text-lg font-semibold">{selected.productName}</h2><button autoFocus onClick={() => dialog.current.close()} aria-label="Close product details" className="rounded p-2 hover:bg-stone-100"><X size={20} /></button></div><ProductImage key={selected._id} product={selected} /><div className="space-y-4 p-5"><p className="text-xl font-semibold text-[#a48222]">{money.format(salePrice(selected))}</p><p className="whitespace-pre-wrap text-sm text-stone-600">{selected.description || "No description added."}</p><dl className="grid grid-cols-2 gap-4 text-sm">{[["Category", categoryName(selected)], ["Brand", selected.brand || "Not specified"], ["Stock", `${stockCount(selected)} units`], ["Status", statusLabel(selected)]].map(([label, value]) => <div key={label}><dt className="text-xs text-stone-400">{label}</dt><dd className="mt-1">{value}</dd></div>)}</dl>{selected.rejectionReason && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Review feedback: {selected.rejectionReason}</p>}</div></>}
    </dialog>
  </DashboardLayout>;
}

export default function VendorProducts() {
  return <Suspense fallback={<p role="status" className="p-8 text-sm text-stone-500">Loading your inventory...</p>}><Catalog /></Suspense>;
}


