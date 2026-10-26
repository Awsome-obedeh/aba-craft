import { marketplacePrice } from "./marketplace.js";

export function filterCatalog(products, filters) {
  const result = products.filter((product) => {
    const price = marketplacePrice(product);
    return (filters.min === "" || price.current >= Number(filters.min)) &&
      (filters.max === "" || price.current <= Number(filters.max)) &&
      (!filters.brands.length || filters.brands.includes(product.brand)) &&
      (!filters.rating || product.rating >= Number(filters.rating)) &&
      (!filters.discount || price.discount >= Number(filters.discount)) &&
      (!filters.inStock || product.quantity > 0);
  });
  return result.sort((a, b) => {
    switch (filters.sort) {
      case "price-asc": return marketplacePrice(a).current - marketplacePrice(b).current;
      case "price-desc": return marketplacePrice(b).current - marketplacePrice(a).current;
      case "rating": return b.rating - a.rating || b.reviewCount - a.reviewCount;
      case "discount": return marketplacePrice(b).discount - marketplacePrice(a).discount;
      case "name": return a.productName.localeCompare(b.productName);
      default: return b.sold - a.sold || Number(b.featured) - Number(a.featured) || b.reviewCount - a.reviewCount;
    }
  });
}
