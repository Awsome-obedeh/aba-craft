export function matchesMarketplace(product, { search = "", category = "", mode = "all" } = {}) {
  if (mode === "wholesale" && !product.wholesale) return false;
  if (mode === "retail" && product.wholesale) return false;
  if (category && product.category !== category) return false;
  const text = `${product.productName} ${product.description || ""} ${product.category || ""} ${product.brand || ""}`.toLowerCase();
  return search.trim().toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word));
}

export function recentSearches(previous, term) {
  const value = term.trim().replace(/\s+/g, " ").slice(0, 120);
  const safe = Array.isArray(previous) ? previous.filter((item) => typeof item === "string" && item.trim()).map((item) => item.slice(0, 120)) : [];
  return (value ? [value, ...safe.filter((item) => item.toLowerCase() !== value.toLowerCase())] : safe).slice(0, 20);
}

export function trendingSearches(products, mode = "all") {
  const terms = new Map();
  products.filter((product) => matchesMarketplace(product, { mode })).forEach((product) => {
    const label = product.category && product.category !== "Other" ? product.category : product.productName;
    if (!label) return;
    const key = label.toLowerCase();
    const previous = terms.get(key);
    terms.set(key, { label: previous?.label || label, score: (previous?.score || 0) + 1 + (product.sold || 0) });
  });
  return [...terms.values()].sort((a, b) => b.score - a.score).slice(0, 12).map((term) => term.label);
}
