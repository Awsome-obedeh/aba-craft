"use client";

import Image from "next/image";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BriefcaseBusiness, ChevronDown, CircleHelp, Footprints, Grid2X2, Heart, Search, ShieldCheck, ShoppingBag, ShoppingCart, Star, Tag, UserRound, Wallet, Zap } from "lucide-react";
import { api } from "@/app/lib/axios";
import { useAuthStore } from "@/app/store/authStore";
import { useCartStore } from "@/app/store/cartStore";
import { marketplacePrice } from "@/app/lib/marketplace";
import styles from "@/app/market-place/marketplace.module.css";
import MarketplaceSearch from "./MarketplaceSearch";
import MarketplaceCatalog from "./MarketplaceCatalog";
import { matchesMarketplace } from "@/app/lib/marketplace-search";

const money = (amount) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
const tiles = [
  ["Hand bags", "bag", "/images/home/bag.webp"], ["Made to last", "", "/images/home/artisan.webp"],
  ["Wallets", "wallet", "/images/home/wallet.webp"], ["Shoes & more", "shoe", "/images/home/shoes.webp"],
  ["Everyday leather", "belt", "/images/home/belt.webp"], ["Aba craftsmanship", "", "/images/home/hero.webp"],
];
const heroes = [
  ["Premium", "leather", "Timeless Style", "/images/home/hero.webp"],
  ["Crafted for", "every day", "Made in Aba. Made for you.", "/images/home/bag.webp"],
  ["Step into", "quality", "Discover our leather collection", "/images/home/shoes.webp"],
  ["Small details.", "Big style.", "Find your everyday essentials", "/images/home/wallet.webp"],
];

function ProductImage({ product, className, onVisit, children }) {
  return <Link href={`/market-place/${encodeURIComponent(product.slug)}`} onClick={() => onVisit(product)} className={className}>
    {/* Vendor images have dynamic hosts; native images support the catalog without a host allowlist. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={product.productImages[0] || "/images/buyer/imgFiRsBox.svg"} alt={product.productName} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/buyer/imgFiRsBox.svg"; }} />
    {children}
  </Link>;
}

function ProductCard({ product, mode, visit, saved, onSave, quote, pending }) {
  const price = marketplacePrice(product);
  const soldPercent = product.sold + product.quantity > 0 ? product.sold / (product.sold + product.quantity) * 100 : 0;
  return <article className={styles.card}>
    <ProductImage product={product} className={styles.imageLink} onVisit={visit}>
      {mode === "wholesale" ? <span className={`${styles.badge} ${styles.wholesale}`}>wholesale</span> : price.discount > 0 && <span className={styles.badge}>-{price.discount}%</span>}
    </ProductImage>
    {mode === "flash" && <p className={styles.stock}>{product.quantity > 0 ? `${product.quantity} items in stock` : "Out of stock"}</p>}
    <div className={styles.body}>
      <Link href={`/market-place/${encodeURIComponent(product.slug)}`} onClick={() => visit(product)}><h3>{product.productName}</h3></Link>
      {mode === "wholesale" ? <p className={styles.manufacturer}>Manufacturer: {product.manufacturer}</p> : <p className={styles.description}>{product.description}</p>}
      {product.reviewCount > 0 && mode !== "wholesale" && <p className={styles.rating}><Star size={12} aria-hidden="true" /> {product.rating.toFixed(1)} ({product.reviewCount})</p>}
      {mode === "wholesale" && <span className={styles.detail}>Price per unit</span>}
      <p className={styles.price}>{money(price.current)}</p>
      {price.discount > 0 && <p className={styles.oldPrice}><s>{money(price.original)}</s>{mode !== "flash" && <span>-{price.discount}%</span>}</p>}
      {mode === "wholesale" ? <><p className={styles.detail}>Available stock<strong>{product.quantity} units</strong></p><p className={styles.detail}>Production time & capacity<strong>Confirm with the manufacturer</strong></p><button type="button" disabled={pending} onClick={() => quote(product)} className={styles.quote}>{pending ? "Opening..." : "Request Quote"}</button></> : <>
        {mode === "top" && <><div className={styles.cardActions}><p className={styles.sold}>{product.sold} sold</p><button type="button" disabled={pending} onClick={() => onSave(product)} aria-label={`${saved ? "Remove" : "Save"} ${product.productName} ${saved ? "from" : "to"} wishlist`} aria-pressed={saved} className={styles.save}><Heart size={14} fill={saved ? "currentColor" : "none"} /></button></div><div role="meter" aria-label="Sold share of available inventory" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(soldPercent)} className={styles.progress}><span style={{ width: `${soldPercent}%` }} /></div></>}
        {product.quantity === 0 && mode !== "flash" && <p className={styles.sold}>Out of stock</p>}
      </>}
    </div>
  </article>;
}

export default function Marketplace() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState("all");
  const searchButton = useRef(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [expanded, setExpanded] = useState({});
  const [hero, setHero] = useState(0);
  const [help, setHelp] = useState(false);
  const [recentIds, setRecentIds] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [pendingId, setPendingId] = useState("");
  const [popularOffset, setPopularOffset] = useState(0);

  const load = useCallback(async (signal) => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/marketplace", { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load products.");
      setProducts(result.data);
    } catch (error) { if (!signal?.aborted) setError(error.message || "Unable to load products."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search") || "";
    const initialMode = params.get("type");
    setQuery(initialSearch); setSearch(initialSearch);
    setSearchMode(["wholesale", "retail"].includes(initialMode) ? initialMode : "all");
    load(controller.signal);
    try { const ids = JSON.parse(localStorage.getItem("marketplace-recent") || "[]"); if (Array.isArray(ids)) setRecentIds(ids.filter((id) => typeof id === "string")); } catch {}
    if (!useAuthStore.getState().accessToken) {
      api.post("/auth/refresh", {}, { baseURL: "/api", skipAuthRefresh: true, signal: controller.signal })
        .then(({ data }) => useAuthStore.getState().setAuthData(data.accessToken, data.user)).catch(() => {});
    }
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (user?.role !== "customer") { setSavedIds([]); return; }
    const controller = new AbortController();
    const config = { baseURL: "/api", signal: controller.signal };
    api.get("/buyer/wishlist", config).then(({ data }) => setSavedIds((data.products || []).map((product) => product._id))).catch(() => {});
    api.get("/buyer/recently-viewed", config).then(({ data }) => {
      if (data.products?.length) setRecentIds(data.products.map((product) => product._id));
    }).catch(() => {});
    return () => controller.abort();
  }, [user?.role, user?.id]);

  function visit(product) {
    const next = [product._id, ...recentIds.filter((id) => id !== product._id)].slice(0, 40);
    setRecentIds(next);
    try { localStorage.setItem("marketplace-recent", JSON.stringify(next)); } catch {}
    if (user?.role === "customer") api.patch("/buyer/recently-viewed", { id: product._id }, { baseURL: "/api" }).catch(() => {});
  }
  async function save(product) {
    if (!user) { router.push("/auth/sign-in?redirect=/market-place"); return; }
    if (user.role !== "customer") { setNotice("Sign in with a buyer account to save products."); return; }
    setPendingId(product._id); setNotice("");
    const saved = savedIds.includes(product._id);
    try {
      await api.patch("/buyer/wishlist", { id: product._id, remove: saved }, { baseURL: "/api" });
      setSavedIds((previous) => saved ? previous.filter((id) => id !== product._id) : [...previous, product._id]);
    } catch (error) { setNotice(error.response?.data?.message || "Unable to update your wishlist."); }
    finally { setPendingId(""); }
  }
  async function quote(product) {
    if (!user) { router.push("/auth/sign-in?redirect=/market-place"); return; }
    if (user.role !== "customer") { setNotice("Sign in with a buyer account to request a quote."); return; }
    setPendingId(product._id); setNotice("");
    try {
      const { data } = await api.post("/conversations", { productId: product._id }, { baseURL: "/api" });
      router.push(`/dashboard/messages?conversation=${data.conversation.id}`);
    } catch (error) { setNotice(error.response?.data?.message || "Unable to contact the manufacturer."); setPendingId(""); }
  }
  function closeSearch() {
    setSearchOpen(false);
    requestAnimationFrame(() => searchButton.current?.focus({ preventScroll: true }));
  }
  function applySearch(value, mode) {
    setSearch(value); setQuery(value); setSearchMode(mode); setCategory("");
    closeSearch();
    requestAnimationFrame(() => document.getElementById("storefront")?.scrollIntoView({ behavior: "smooth" }));
  }
  function filter(value) { setSearch(value); setQuery(value); setCategory(""); setSearchMode("all"); }
  const visible = products.filter((product) => matchesMarketplace(product, { search, category, mode: searchMode }));
  const discounted = visible.filter((product) => marketplacePrice(product).discount > 0);
  const popular = visible.filter((product) => product.reviewCount > 0 || product.featured).sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  const rotatedPopular = [...popular.slice(popularOffset % Math.max(popular.length, 1)), ...popular.slice(0, popularOffset % Math.max(popular.length, 1))];
  const wholesale = visible.filter((product) => product.wholesale).sort((a, b) => Number(b.featured) - Number(a.featured));
  const sellers = visible.filter((product) => product.sold > 0).sort((a, b) => b.sold - a.sold);
  const recent = recentIds.map((id) => products.find((product) => product._id === id)).filter(Boolean);
  const categories = [...new Set(products.map((product) => product.category))];
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  function section(id, title, data, mode, limit, subtitle) {
    return <section id={id} className={`${styles.section} ${mode === "store" ? styles.store : ""}`} aria-labelledby={`${id}-title`}>
      <div className={`${styles.bar} ${mode === "flash" ? styles.flash : ""}`}>
        <div className={mode === "flash" ? styles.flashTitle : ""}>{mode === "flash" && <Zap size={40} fill="currentColor" aria-hidden="true" />}<div><h2 id={`${id}-title`}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>
        {id === "popular" && <button type="button" className={styles.refresh} onClick={() => setPopularOffset((previous) => previous + 3)}>Refresh</button>}
        <button type="button" aria-expanded={!!expanded[id]} onClick={() => setExpanded((previous) => ({ ...previous, [id]: !previous[id] }))}>{expanded[id] ? "Show Less" : "See All"}{mode === "store" && <ArrowRight size={16} />}</button>
      </div>
      {data.length ? <div className={styles.grid}>{(expanded[id] ? data : data.slice(0, limit)).map((product) => <ProductCard key={product._id} product={product} mode={mode} visit={visit} saved={savedIds.includes(product._id)} onSave={save} quote={quote} pending={pendingId === product._id} />)}</div> : <p className={styles.empty}>{search || category ? "No products in this section match your search." : mode === "flash" ? "New offers will appear here when vendors add discounts." : mode === "wholesale" ? "Wholesale listings will appear here as manufacturers publish their products." : mode === "top" ? "Best sellers will appear here as orders are completed." : id === "popular" ? "Featured and customer-rated products will appear here." : "Approved products will appear here soon."}</p>}
    </section>;
  }
  return <div className={styles.market} inert={searchOpen}>
    {searchOpen && <MarketplaceSearch key={user?.id || "guest"} products={products} query={query} onQuery={setQuery} mode={searchMode} onSearch={applySearch} onClose={closeSearch} onVisit={visit} userId={user?.id} loading={loading} error={error} />}
    <a href="#storefront" className="sr-only focus:not-sr-only">Skip to products</a>
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.top}>
          <Link href="/market-place" className={styles.logo} aria-label="AbaCraft marketplace"><BrandLogo /></Link>
          <form role="search" className={styles.search} onSubmit={(event) => { event.preventDefault(); setSearchOpen(true); }}><Search size={16} aria-hidden="true" /><input aria-label="Search products, brands and categories" aria-haspopup="dialog" aria-controls={searchOpen ? "market-search-popup" : undefined} value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, brands and categories" /><button ref={searchButton} type="submit" aria-haspopup="dialog" aria-expanded={searchOpen}>Search</button></form>
          <nav aria-label="Account" className={styles.actions}><Link href={user ? "/dashboard/profile" : "/auth/sign-in"}><UserRound size={16} />{user ? `Hi, ${user.fullName?.split(" ")[0] || user.email?.split("@")[0] || "Buyer"}` : "Sign in"}<ChevronDown size={12} /></Link><button type="button" aria-expanded={help} aria-controls="market-help" onClick={() => setHelp(!help)}><CircleHelp size={16} /><span className={styles.helpLabel}>Help</span><ChevronDown size={12} /></button><Link href="/cart"><ShoppingCart size={19} /> Cart{cartCount > 0 && ` (${cartCount})`}</Link></nav>
        </div>
        <nav aria-label="Product categories" className={styles.categories}><button type="button" aria-pressed={!category} onClick={() => setCategory("")}><Grid2X2 size={15} /> Categories</button>{categories.map((name, index) => { const Icon = [ShoppingBag, Footprints, Wallet, Tag, BriefcaseBusiness][index % 5]; return <button type="button" key={name} aria-pressed={category === name} onClick={() => setCategory(name)}><Icon size={15} /> {name}</button>; })}</nav>
        {help && <div id="market-help" className={styles.help}><strong>Shopping on AbaCraft</strong><p>Browse approved products, open a product to see its details and add it to your cart. Use Request Quote to discuss a wholesale order with the manufacturer.</p><Link href="/dashboard/messages" className="underline">Open your messages</Link></div>}
      </header>
      <main>
        <section className={styles.hero} aria-label="Discover Aba craftsmanship">
          <Image fill sizes="(max-width: 1440px) 100vw, 1440px" className={styles.heroImage} src={heroes[hero][3]} alt="Handcrafted leather goods in an Aba artisan workshop" />
          <div className={styles.heroCopy}><h1>{heroes[hero][0]}<span>{heroes[hero][1]}</span></h1><p>{heroes[hero][2]}</p><a href="#flash-sales"><Zap size={17} fill="currentColor" /> SHOP LEATHER DEALS <ArrowRight size={15} /></a></div><div className={styles.heroDots}>{heroes.map((slide, index) => <button key={slide[1]} type="button" aria-label={`Show promotion ${index + 1}`} aria-pressed={hero === index} onClick={() => setHero(index)} />)}</div>
        </section>
        <nav aria-label="Featured collections" className={styles.tiles}>{tiles.map(([label, term, image]) => <button type="button" key={label} className={styles.tile} onClick={() => { filter(term); document.getElementById("storefront")?.scrollIntoView({ behavior: "smooth" }); }}><Image fill sizes="(max-width: 600px) 33vw, 17vw" src={image} alt="" loading="lazy" /><span>{label}</span></button>)}</nav>
        {(search || category || searchMode !== "all") && <div className={styles.filterSummary}><p>{visible.length} {searchMode !== "all" ? searchMode : ""} products {search && `matching “${search}”`} {category && `in ${category}`}</p><button onClick={() => { filter(""); setCategory(""); }}>Clear filters</button></div>}
        {notice && <p role="status" className={styles.notice}>{notice}</p>}
        {error ? <div role="alert" className={styles.notice}><h2>We couldn&apos;t load the marketplace</h2><p>{error}</p><button type="button" onClick={() => load()}>Try again</button></div> : loading ? <div aria-label="Loading products" aria-busy="true" className={styles.loading}>{Array.from({ length: 6 }, (_, index) => <div key={index} />)}</div> : <>
          {section("flash-sales", "Flash Sales", discounted, "flash", 3, "Discover current vendor offers")}
          <MarketplaceCatalog products={visible} allProducts={products} search={search} category={category} mode={searchMode} onSearch={(value) => { setSearch(value); setQuery(value); }} onCategory={setCategory} onMode={setSearchMode} renderProduct={(product) => <ProductCard key={product._id} product={product} mode="top" visit={visit} saved={savedIds.includes(product._id)} onSave={save} quote={quote} pending={pendingId === product._id} />} />
          {section("popular", "Popular", rotatedPopular, "popular", 3, "Customer favourites & featured finds")}
          {section("wholesale", "Featured Wholesale Deals", wholesale, "wholesale", 6)}
          {section("top-sellers", "Top Seller Deals", sellers, "top", 9, "Best-selling finds from Aba artisans")}
          <section className={styles.section} aria-labelledby="last-viewed-title"><div className={styles.viewedBar}><h2 id="last-viewed-title">Last Viewed</h2><button onClick={() => setExpanded((previous) => ({ ...previous, recent: !previous.recent }))}>{expanded.recent ? "Show Less" : "See All"}</button></div>{recent.length ? <div className={styles.viewed}>{(expanded.recent ? recent : recent.slice(0, 3)).map((product) => <div key={product._id}><ProductImage product={product} onVisit={visit} /><p className="mt-2 text-center text-xs">{product.productName}</p></div>)}</div> : <p className={styles.empty}>Products you view will appear here.</p>}</section>
        </>}
      </main>
    </div>
    <footer className={styles.footer}><div className={styles.footerTop}><div><Link href="/" aria-label="Aba Crafts home"><BrandLogo light /></Link><p>The premium e-commerce gateway connecting skilled Aba leather creators with quality-conscious consumers nationwide and globally.</p></div><div><h3>Support</h3><button onClick={() => { setHelp(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Help Center</button><Link href="/dashboard/messages">Contact sellers</Link><Link href="/account/orders">Your orders</Link></div><div><h3>Shop with confidence</h3><p className="flex items-center gap-2"><ShieldCheck size={17} /> Admin-approved listings</p><Link href="/cart">Your shopping cart</Link><Link href="/auth/sign-up">Become a vendor</Link></div></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} AbaCraft. All rights reserved. Sourced ethically from Africa&apos;s International Market, Aba.</span><span>Nigeria&apos;s Global Artisanal Hub</span></div></footer>
  </div>;
}


