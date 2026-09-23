import mongoose from "mongoose";

const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },

  codeHash: String,

  codeExpiresAt: Date,

  attempts: { type: Number, default: 0 },

  nextSendAt: Date,

  windowExpiresAt: Date,


  sendCount: { type: Number, default: 0 },
  proofHash: String,

  documentScanCount: { type: Number, default: 0 },

  proofExpiresAt: Date,

  usedAt: Date,

  purgeAt: { type: Date, required: true },
  
}, { timestamps: true });
schema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.SignupChallenge || mongoose.model("SignupChallenge", schema);
