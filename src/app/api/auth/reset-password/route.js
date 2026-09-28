import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import connectDB from "@/app/lib/connect";
import { readBody, validatePassword, SignupError, errorResponse } from "@/app/lib/server/signup-validation";
import User from "@/models/User";

export async function POST(request) {
  try {
    const body = await readBody(request, 4096);
    if (typeof body?.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) throw new SignupError("This reset link is invalid or has expired.");
    const password = validatePassword(body.password);
    const hash = createHash("sha256").update(body.token).digest("hex");
    await connectDB();
    const user = await User.findOne({ passwordResetTokenHash: hash, passwordResetExpiresAt: { $gt: new Date() } }).select("+password");
    if (!user) throw new SignupError("This reset link is invalid or has expired.");
    if (await bcrypt.compare(password, user.password)) throw new SignupError("Choose a password you have not used before.");
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await User.updateOne({ _id: user._id, passwordResetTokenHash: hash, passwordResetExpiresAt: { $gt: new Date() } }, {
      $set: { password: passwordHash },
      $unset: { passwordResetTokenHash: "", passwordResetExpiresAt: "", passwordResetRequestedAt: "" },
      $inc: { sessionVersion: 1 },
    });
    if (!result.modifiedCount) throw new SignupError("This reset link is invalid or has expired.");
    return Response.json({ success: true, message: "Password updated. You can now sign in." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
