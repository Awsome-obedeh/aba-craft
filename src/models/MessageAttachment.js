import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
    // Unsent uploads expire automatically. Sending removes this field.
    expiresAt: { type: Date, default: () => new Date(Date.now() + 86400000) },
  },
  { timestamps: true },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ ownerId: 1, createdAt: -1 });
export default mongoose.models.MessageAttachment ||
  mongoose.model("MessageAttachment", schema);
