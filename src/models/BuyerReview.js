import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, maxlength: 2000, required: true },
  },
  { timestamps: true },
);
schema.index({ buyerId: 1, orderId: 1, productId: 1 }, { unique: true });
export default mongoose.models.BuyerReview ||
  mongoose.model("BuyerReview", schema);
