import mongoose from "mongoose";

const schema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  authorName: { type: String, required: true, maxlength: 120 },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  clientId: { type: String, required: true, maxlength: 80 },
  verifiedPurchase: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ authorId: 1, clientId: 1 }, { unique: true });
schema.index({ productId: 1, createdAt: -1, _id: -1 });
export default mongoose.models.ProductComment || mongoose.model("ProductComment", schema);
