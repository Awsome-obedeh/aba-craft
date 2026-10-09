import mongoose from "mongoose";

const rfqSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  buyerName: { type: String, required: true, trim: true },
  productName: { type: String, required: true, trim: true },
  productDescription: { type: String, trim: true, maxlength: 5000 },
  productImage: { type: String, trim: true },
  colour: { type: String, trim: true },
  productType: { type: String, trim: true },
  material: { type: String, trim: true },
  dimensions: { type: String, trim: true },
  responseDeadline: { type: Date },
  buyerCompany: { type: String, trim: true },
  buyerContactRole: { type: String, trim: true },
  buyerLocation: { type: String, trim: true },
  buyerType: { type: String, trim: true },
  sampleRequired: { type: Boolean, default: false },
  sampleQuantity: { type: Number, min: 1 },
  sampleNotes: { type: String, trim: true, maxlength: 5000 },
  attachments: {
    type: [{ _id: false, name: { type: String, required: true, trim: true }, url: { type: String, required: true, trim: true } }],
    default: [],
  },
  quantity: { type: Number, required: true, min: 1 },
  targetPrice: { type: Number, min: 0 },
  deliveryDays: { type: Number, required: true, min: 1 },
  workspace: { type: String, enum: ["production", "sourcing"], default: "production" },
  status: { type: String, enum: ["new", "awaiting_response", "responded", "accepted", "rejected", "expired"], default: "new" },
  notes: { type: String, default: "", maxlength: 5000 },
  deliveryAddress: { type: String, default: "" },
}, { timestamps: true });
rfqSchema.index({ vendor: 1, createdAt: -1 });
export default mongoose.models.Rfq || mongoose.model("Rfq", rfqSchema);
