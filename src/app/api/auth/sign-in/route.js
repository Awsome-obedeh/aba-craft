import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import connectDB from "@/app/lib/connect";
import User from "@/models/User";
import { generateAccessToken, generateRefreshToken } from "@/app/lib/jwt";
import { readBody, normalizeEmail, errorResponse, SignupError } from "@/app/lib/server/signup-validation";

export async function POST(request) {
  try {
    const body = await readBody(request, 4096);
    const email = normalizeEmail(body?.email);
    if (typeof body?.password !== "string" || Buffer.byteLength(body.password) > 72) throw new SignupError("Invalid email or password.", 401);
    await connectDB();

    const user = await User.findOne({ email });

    if (!user || !await bcrypt.compare(body.password, user.password)) throw new SignupError("Invalid email or password.", 401);
    
    if (!user.emailVerified) return Response.json({ success: false, code: "EMAIL_NOT_VERIFIED", message: "Please verify your email before signing in." }, { status: 403 });
    const payload = {
      id: user._id.toString(), email: user.email, role: user.role,
      onBoardingStatus: user.onBoardingStatus, verificationStatus: user.verificationStatus,
      sessionVersion: user.sessionVersion || 0,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    (await cookies()).set("refreshToken", refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 7 * 24 * 60 * 60,
    });

    return Response.json({ success: true, accessToken, user: payload }, { headers: { "Cache-Control": "no-store" } });

  } catch (error) {
    return errorResponse(error);
  }
}
