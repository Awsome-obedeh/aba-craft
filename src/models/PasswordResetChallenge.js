import mongoose from "mongoose";

const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sessionVersion: Number,
  codeHash: String,
  codeExpiresAt: Date,
  attempts: { type: Number, default: 0 },
  sendCount: { type: Number, default: 0 },
  windowExpiresAt: Date,
  nextSendAt: Date,
  proofHash: String,
  proofExpiresAt: Date,
  usedAt: Date,
  purgeAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.models.PasswordResetChallenge || mongoose.model("PasswordResetChallenge", schema);
