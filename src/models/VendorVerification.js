import mongoose from "mongoose";

const vendorVerificationSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    bvn: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{11}$/, "BVN must be exactly 11 digits"],
    },

    abssin: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{11}$/, "ABSSIN must be exactly 11 digits"],
    },

    businessAddress: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
    },

    cacCertificateNumber: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },

    cacDocumentUrl: {
      type: String,
      required: true,
      trim: true,
    },

    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    isConsent: {
      type: Boolean,
      required: true,
      default: true,
    },



    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },

    adminNotes: {
      type: String,
      default: "",
    },

    reviewedAt: {
      type: Date,
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const VendorVerification =
  mongoose.models.VendorVerification ||
  mongoose.model("VendorVerification", vendorVerificationSchema);

export default VendorVerification;

