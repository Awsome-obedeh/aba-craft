import { mockProducts } from "../../lib/mock-products.js";

export async function GET() {
  // Replace this data source with a database query while keeping the API shape.
  return Response.json(
    { success: true, data: mockProducts, totalItems: mockProducts.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
