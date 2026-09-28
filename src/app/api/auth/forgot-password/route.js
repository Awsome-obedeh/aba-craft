import { createHash, randomBytes } from "node:crypto";
import connectDB from "@/app/lib/connect";
import { sendPasswordResetMail } from "@/app/lib/send-mail";
import { readBody, normalizeEmail, errorResponse } from "@/app/lib/server/signup-validation";
import User from "@/models/User";

const reply = () => Response.json({ success: true, message: "If an account exists for that email, a password reset link has been sent." }, { headers: { "Cache-Control": "no-store" } });

export async function POST(request) {
  try {
    const { email: input } = await readBody(request, 4096);
    const email = normalizeEmail(input);
    await connectDB();
    const user = await User.findOne({ email }).select("+passwordResetRequestedAt");
    if (!user || (user.passwordResetRequestedAt && Date.now() - user.passwordResetRequestedAt.getTime() < 60_000)) return reply();

    const token = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const updated = await User.updateOne({ _id: user._id, $or: [{ passwordResetRequestedAt: { $lte: new Date(now.getTime() - 60_000) } }, { passwordResetRequestedAt: { $exists: false } }] }, {
      $set: { passwordResetTokenHash: hash, passwordResetExpiresAt: new Date(now.getTime() + 30 * 60_000), passwordResetRequestedAt: now },
    });
    if (!updated.modifiedCount) return reply();
    try {
      const url = new URL("/auth/reset-password", request.url);
      url.searchParams.set("token", token);
      await sendPasswordResetMail(email, url.toString());
    } catch (error) {
      await User.updateOne({ _id: user._id, passwordResetTokenHash: hash }, { $unset: { passwordResetTokenHash: "", passwordResetExpiresAt: "", passwordResetRequestedAt: "" } });
      throw error;
    }
    return reply();
  } catch (error) {
    return errorResponse(error);
  }
}
