"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { filterCatalog } from "@/app/lib/catalog-filters";
import styles from "@/app/market-place/marketplace.module.css";

const defaults = { min: "", max: "", brands: [], rating: "", discount: "", inStock: false, sort: "popular" };
const pageSize = 12;

export default function MarketplaceCatalog({ products, allProducts, search, category, mode, onSearch, onCategory, onMode, renderProduct }) {
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  function update(key, value) { setFilters((previous) => ({ ...previous, [key]: value })); setPage(1); }
  const brands = [...new Set(allProducts.map((product) => product.brand).filter(Boolean))].sort();
  const categories = [...new Set(allProducts.map((product) => product.category).filter(Boolean))].sort();
  const invalidRange = filters.min !== "" && filters.max !== "" && Number(filters.min) > Number(filters.max);
  const results = filterCatalog(products, filters);
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const chips = [
    ...(search ? [{ label: `Search: ${search}`, clear: () => { onSearch(""); } }] : []),
    ...(category ? [{ label: category, clear: () => onCategory("") }] : []),
    ...(mode !== "all" ? [{ label: mode, clear: () => onMode("all") }] : []),
    ...filters.brands.map((brand) => ({ label: brand, clear: () => update("brands", filters.brands.filter((value) => value !== brand)) })),
    ...[ ["min", "Min price"], ["max", "Max price"], ["rating", "Minimum stars"], ["discount", "Minimum discount %"] ].filter(([key]) => filters[key] !== "").map(([key, label]) => ({ label: `${label}: ${filters[key]}`, clear: () => update(key, "") })),
    ...(filters.inStock ? [{ label: "In stock", clear: () => update("inStock", false) }] : []),
  ];
  function clear() { setFilters(defaults); setPage(1); onSearch(""); onCategory(""); onMode("all"); }
  return <section id="storefront" className={styles.catalog} aria-label="Browse products">
    <div className={styles.catalogHeading}><div><p className={styles.eyebrow}>FIND YOUR NEXT FAVOURITE</p><h2>Shop the marketplace</h2></div><button type="button" className={styles.filterToggle} aria-expanded={open} aria-controls="catalog-filters" onClick={() => setOpen(!open)}><SlidersHorizontal size={16} /> Filters {chips.length > 0 && `(${chips.length})`}</button></div>
    <div className={styles.catalogLayout}>
      <aside id="catalog-filters" className={`${styles.filters} ${open ? styles.filtersOpen : ""}`} aria-label="Product filters">
        <div className={styles.filterTitle}><strong>Filters</strong><button type="button" onClick={clear}>Reset all</button></div>
        <label className={styles.filterGroup}>Category<select value={category} onChange={(event) => { onCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className={styles.filterGroup}>Seller type<select value={mode} onChange={(event) => { onMode(event.target.value); setPage(1); }}><option value="all">All sellers</option><option value="retail">Retail</option><option value="wholesale">Wholesale</option></select></label>
        <fieldset className={styles.filterGroup}><legend>Price (NGN)</legend><div className={styles.priceInputs}><label>Min<input type="number" min="0" placeholder="0" value={filters.min} onChange={(event) => update("min", event.target.value)} /></label><span>–</span><label>Max<input type="number" min="0" placeholder="Any" value={filters.max} onChange={(event) => update("max", event.target.value)} /></label></div>{invalidRange && <p role="status" className={styles.rangeError}>Minimum price must not exceed maximum.</p>}</fieldset>
        <label className={styles.filterGroup}>Discount<select value={filters.discount} onChange={(event) => update("discount", event.target.value)}><option value="">Any discount</option>{[10, 20, 30, 40, 50].map((value) => <option key={value} value={value}>{value}% or more</option>)}</select></label>
        <label className={styles.filterGroup}>Customer rating<select value={filters.rating} onChange={(event) => update("rating", event.target.value)}><option value="">All ratings</option>{[4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars & above</option>)}</select></label>
        {brands.length > 0 && <fieldset className={styles.filterGroup}><legend>Brand</legend><div className={styles.brandOptions}>{brands.map((brand) => <label key={brand} className={styles.check}><input type="checkbox" checked={filters.brands.includes(brand)} onChange={(event) => update("brands", event.target.checked ? [...filters.brands, brand] : filters.brands.filter((value) => value !== brand))} />{brand}</label>)}</div></fieldset>}
        <label className={styles.check}><input type="checkbox" checked={filters.inStock} onChange={(event) => update("inStock", event.target.checked)} /> In stock only</label>
      </aside>
      <div className={styles.catalogResults}>
        <form className={styles.catalogSearch} role="search" onSubmit={(event) => { event.preventDefault(); onSearch(String(new FormData(event.currentTarget).get("search") || "").trim()); setPage(1); }}><input type="search" aria-label="Search this catalog" placeholder="Search products, brands, categories…" key={search} name="search" defaultValue={search} /><button type="submit">Search</button></form>
        <div className={styles.resultsToolbar}><p role="status" aria-live="polite"><strong>{results.length.toLocaleString()}</strong> products found</p><label>Sort by<select value={filters.sort} onChange={(event) => update("sort", event.target.value)}><option value="popular">Popularity</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="rating">Customer rating</option><option value="discount">Biggest discount</option><option value="name">Name: A–Z</option></select></label></div>
        {chips.length > 0 && <div className={styles.filterChips}>{chips.map((chip) => <button key={chip.label} type="button" onClick={chip.clear} aria-label={`Remove ${chip.label} filter`}>{chip.label}<X size={12} /></button>)}<button type="button" onClick={clear}>Clear all</button></div>}
        {results.length ? <div className={styles.catalogGrid}>{results.slice(start, start + pageSize).map(renderProduct)}</div> : <div className={styles.empty}><h3>No products match your filters</h3><p>Try a different search or widen your price range.</p><button type="button" className={styles.resetResults} onClick={clear}>Clear all filters</button></div>}
        {results.length > 0 && <nav className={styles.pagination} aria-label="Product pages"><p>Showing {start + 1}–{Math.min(start + pageSize, results.length)} of {results.length} products</p><div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {totalPages}</span><button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button></div></nav>}
      </div>
    </div>
  </section>;
}

