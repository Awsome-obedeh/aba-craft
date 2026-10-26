import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignupError, normalizeEmail, validatePassword, hashSecret } from "./signup-validation.js";

const digest = (value) => hashSecret(`buyer-password-reset:${value}`);
const minute = 60_000;

export function createBuyerPasswordService({ connect, User, Challenge, sendEmail }) {
  async function sendCode(input) {
    const email = normalizeEmail(input);
    await connect();
    const user = await User.findOne({ email, role: "customer" });
    if (!user) throw new SignupError("We couldn't find a buyer account associated with this email.", 404);
    const now = new Date();
    try {
      await Challenge.updateOne({ email }, { $setOnInsert: { email, sendCount: 0,
        windowExpiresAt: new Date(+now + 60 * minute), purgeAt: new Date(+now + 24 * 60 * minute) } }, { upsert: true });
    } catch (error) { if (error.code !== 11000) throw error; }
    await Challenge.updateOne({ email, windowExpiresAt: { $lte: now } }, {
      $set: { sendCount: 0, windowExpiresAt: new Date(+now + 60 * minute) },
    });
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = digest(`${email}:${code}`);
    const challenge = await Challenge.findOneAndUpdate({ email, sendCount: { $lt: 5 },
      $or: [{ nextSendAt: { $lte: now } }, { nextSendAt: { $exists: false } }],
    }, { $inc: { sendCount: 1 }, $set: { userId: user._id, sessionVersion: user.sessionVersion || 0,
      codeHash, codeExpiresAt: new Date(+now + 15 * minute), attempts: 0,
      nextSendAt: new Date(+now + minute), purgeAt: new Date(+now + 24 * 60 * minute) },
      $unset: { proofHash: "", proofExpiresAt: "", usedAt: "" },
    }, { returnDocument: "after" });
    if (!challenge) throw new SignupError("Please wait before requesting another code. Up to 5 codes are allowed per hour.", 429);
    try { await sendEmail(email, code); }
    catch {
      await Challenge.updateOne({ email, codeHash }, { $unset: { codeHash: "", codeExpiresAt: "" } });
      throw new SignupError("The verification email could not be sent. Please try again in a minute.", 503);
    }
    return { success: true, expiresIn: 900, retryAfter: 60 };
  }

  async function verifyCode(input, code) {
    const email = normalizeEmail(input);
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) throw new SignupError("Enter the six-digit verification code.");
    await connect();
    const challenge = await Challenge.findOneAndUpdate({ email, codeExpiresAt: { $gt: new Date() },
      attempts: { $lt: 5 }, usedAt: { $exists: false },
    }, { $inc: { attempts: 1 } }, { returnDocument: "after" });
    if (!challenge) throw new SignupError("The code has expired or reached its attempt limit. Request a new code.");
    const expected = Buffer.from(challenge.codeHash || "", "hex");
    const actual = Buffer.from(digest(`${email}:${code}`), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new SignupError("The verification code is incorrect.");
    const token = randomBytes(32).toString("hex");
    const verified = await Challenge.findOneAndUpdate({ _id: challenge._id, codeHash: challenge.codeHash,
      codeExpiresAt: { $gt: new Date() }, usedAt: { $exists: false },
    }, { $set: { proofHash: digest(token), proofExpiresAt: new Date(Date.now() + 15 * minute) },
      $unset: { codeHash: "", codeExpiresAt: "" },
    }, { returnDocument: "after" });
    if (!verified) throw new SignupError("The code was replaced or already verified. Request a new code.");
    return { success: true, token, expiresIn: 900 };
  }

  async function resetPassword(body) {
    const email = normalizeEmail(body?.email);
    const password = validatePassword(body?.password);
    if (password !== body?.confirmPassword) throw new SignupError("Passwords do not match.");
    if (typeof body?.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) throw new SignupError("Verify your email before resetting your password.");
    await connect();
    const proofHash = digest(body.token);
    const filter = { email, proofHash, proofExpiresAt: { $gt: new Date() }, usedAt: { $exists: false } };
    const challenge = await Challenge.findOne(filter);
    if (!challenge) throw new SignupError("Your password reset verification has expired or was already used. Request a new code.");
    const user = await User.findOne({ _id: challenge.userId, email, role: "customer" });
    if (!user || (user.sessionVersion || 0) !== challenge.sessionVersion) throw new SignupError("Your account changed. Request a new reset code.");
    if (await bcrypt.compare(password, user.password)) throw new SignupError("Choose a password you have not used before.");
    const passwordHash = await bcrypt.hash(password, 12);
    const consumed = await Challenge.findOneAndUpdate(filter, { $set: { usedAt: new Date() } }, { returnDocument: "after" });
    if (!consumed) throw new SignupError("This password reset has already been used. Request a new code.");
    const result = await User.updateOne({ _id: user._id, password: user.password,
      ...(challenge.sessionVersion === 0 ? { $or: [{ sessionVersion: 0 }, { sessionVersion: { $exists: false } }] } : { sessionVersion: challenge.sessionVersion }),
    }, {
      $set: { password: passwordHash, emailVerified: true }, $inc: { sessionVersion: 1 },
      $unset: { passwordResetTokenHash: "", passwordResetExpiresAt: "", passwordResetRequestedAt: "" },
    });
    if (!result.modifiedCount) throw new SignupError("Your password could not be changed. Request a new code.");
    return { success: true, message: "password schanged succesffuly" };
  }
  return { sendCode, verifyCode, resetPassword };
}
