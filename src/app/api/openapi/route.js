import openapi from "@/app/lib/openapi";

export async function GET() {
  return Response.json(openapi, { headers: { "Cache-Control": "no-cache" } });
}
