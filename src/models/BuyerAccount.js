import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    followed: [{ type: mongoose.Schema.Types.ObjectId, ref: "Business" }],
    recentlyViewed: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    newsletter: { type: Boolean, default: false },
    newsletterConsentAt: { type: Date, default: null },
    cookies: {
      advertising: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      personalization: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export default mongoose.models.BuyerAccount ||
  mongoose.model("BuyerAccount", schema);
