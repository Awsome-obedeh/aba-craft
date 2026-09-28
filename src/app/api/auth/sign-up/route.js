import { signupService } from "@/app/lib/server/signup";
import { parseSellerSignup, readBody, errorResponse, MAX_DOCUMENT_SIZE } from "@/app/lib/server/signup-validation";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await readBody(request, 4096);
      return Response.json(await signupService.registerCustomer(body), { status: 201 });
    }
    const form = await readBody(request, 2 * MAX_DOCUMENT_SIZE + 64 * 1024, "form");
    const data = await parseSellerSignup(form);
    return Response.json(await signupService.registerSeller(data), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
