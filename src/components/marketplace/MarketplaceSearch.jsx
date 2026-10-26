"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Search, Star, X } from "lucide-react";
import { marketplacePrice } from "@/app/lib/marketplace";
import { matchesMarketplace, recentSearches, trendingSearches } from "@/app/lib/marketplace-search";
import styles from "./search.module.css";

const money = (value) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

export default function MarketplaceSearch({ products, query, onQuery, mode, onSearch, onClose, onVisit, userId, loading, error }) {
  const [selectedMode, setSelectedMode] = useState(mode);
  const storageKey = `marketplace-searches:${userId || "guest"}`;
  const [recent, setRecent] = useState(() => {
    try { return recentSearches(JSON.parse(localStorage.getItem(storageKey) || "[]"), ""); } catch { return []; }
  });
  const [showAll, setShowAll] = useState(false);
  const dialog = useRef(null);
  const input = useRef(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  function search(term) {
    const next = recentSearches(recent, term);
    setRecent(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
    onSearch(term.trim(), selectedMode);
  }
  function clear() {
    setRecent([]); setShowAll(false);
    try { localStorage.removeItem(storageKey); } catch {}
  }
  function keydown(event) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
    if (event.key !== "Tab") return;
    const focusable = [...dialog.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')];
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  const matches = products.filter((product) => matchesMarketplace(product, { search: query, mode: selectedMode })).slice(0, 3);
  const trending = trendingSearches(products, selectedMode);
  const chips = showAll ? recent : recent.slice(0, 15);
  return createPortal(<div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section id="market-search-popup" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="market-search-title" className={styles.popup} onKeyDown={keydown}>
      <h2 id="market-search-title" className="sr-only">Search the marketplace</h2>
      <div className={styles.top}>
        <form role="search" className={styles.search} onSubmit={(event) => { event.preventDefault(); search(query); }}>
          <Search size={18} aria-hidden="true" /><input ref={input} aria-label="Search products, brands and categories" type="search" autoComplete="off" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search products, brands and categories" /><button type="submit">Search</button>
        </form>
        <button type="button" aria-label="Close search" className={styles.close} onClick={onClose}><X size={20} /></button>
      </div>
      <div className={styles.mode} role="group" aria-label="Seller type"><button type="button" aria-pressed={selectedMode === "wholesale"} onClick={() => setSelectedMode(selectedMode === "wholesale" ? "all" : "wholesale")}>WHOLESALE</button><button type="button" aria-pressed={selectedMode === "retail"} onClick={() => setSelectedMode(selectedMode === "retail" ? "all" : "retail")}>RETAIL</button></div>
      <div className={styles.suggestions} aria-label="Suggested products" aria-live="polite">
        {error ? <p className={styles.empty}>{error}</p> : loading ? <p className={styles.empty}>Loading products...</p> : matches.length ? matches.map((product) => <Link key={product._id} href={`/market-place/${encodeURIComponent(product.slug)}`} className={styles.product} onClick={() => { onVisit(product); onClose(); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src={product.productImages[0] || "/images/buyer/imgFiRsBox.svg"} alt={product.productName} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/buyer/imgFiRsBox.svg"; }} />
          <span className={styles.productText}><span>{product.productName}</span><strong>{money(marketplacePrice(product).current)}</strong><span className={styles.stars}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={12} fill={index < Math.round(product.rating) ? "currentColor" : "none"} aria-hidden="true" />)}<span>{product.reviewCount ? `(${product.reviewCount})` : "No reviews yet"}</span></span></span>
        </Link>) : <p className={styles.empty}>No matching products. Try another search or seller type.</p>}
      </div>
      <div className={styles.history}>
        <section aria-labelledby="recent-search-title"><div className={styles.heading}><h3 id="recent-search-title">RECENT SEARCHES</h3><button type="button" disabled={!recent.length} onClick={clear}>Clear All</button></div>
          <div className={styles.chips}>{chips.map((term, index) => <button type="button" key={`${term}-${index}`} onClick={() => search(term)}>{term}</button>)}{!showAll && recent.length > 15 && <button type="button" aria-label={`Show ${recent.length - 15} more recent searches`} onClick={() => setShowAll(true)}>+{recent.length - 15}</button>}{!recent.length && <p className={styles.hint}>Your recent searches will appear here.</p>}</div>
        </section>
        <section aria-labelledby="trending-search-title"><div className={styles.heading}><h3 id="trending-search-title">TRENDING SEARCHES</h3></div><div className={styles.chips}>{trending.map((term) => <button type="button" key={term} onClick={() => search(term)}>{term}</button>)}{!trending.length && <p className={styles.hint}>Suggestions will appear as approved products become available.</p>}</div></section>
      </div>
    </section>
  </div>, document.body);
}
