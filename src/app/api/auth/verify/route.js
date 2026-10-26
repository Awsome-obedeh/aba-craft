import { signupService } from "@/app/lib/server/signup";
import { readBody, errorResponse } from "@/app/lib/server/signup-validation";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await readBody(request, 4096);
    const result = await signupService.verifyCode(body?.email, body?.otp);
    
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
