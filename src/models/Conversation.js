import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    // Preserve the subject even when a listing is renamed or removed.
    product: {
      name: { type: String, required: true },
      slug: { type: String, required: true },
      image: { type: String, default: "" },
    },
    lastMessageAt: { type: Date, required: true },
  },
  { timestamps: true },
);

conversationSchema.index({ buyerId: 1, lastMessageAt: -1, _id: -1 });
conversationSchema.index({ vendorId: 1, lastMessageAt: -1, _id: -1 });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);
