import MarketplaceProductDetail from "@/components/marketplace/MarketplaceProductDetail";

export default async function SingleMarketPlaceProductPage({ params }) {
  const { slug } = await params;
  return <MarketplaceProductDetail key={slug} slug={slug} />;
}