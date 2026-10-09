import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ["quote", "issue"], required: true },
    clientId: { type: String, required: true },
    details: { type: Object, required: true },
  },
  { timestamps: true },
);
schema.index({ buyerId: 1, createdAt: -1 });
export default mongoose.models.BuyerRequest ||
  mongoose.model("BuyerRequest", schema);
