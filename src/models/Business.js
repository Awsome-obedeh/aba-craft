import mongoose from "mongoose";

const businessSchma = new mongoose.Schema({
    businessName: {
        type: String,
        required: true,
        trim: true,
    },

    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    businessDescription: {
        type: String,
        default: null,
    },

    logo: {
        type: String,
        default: null,
    },
    address: {
        type: String,
        default: null,
    },
    businessType: {
        type: String,
        default: "",
    },

    verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    bannedStatus: {
        type: String,
        enum: ["none", "banned"],
        default: "none",
    },
    businessDescription: String,

    country: String,
    state: String,
    lga: String,
    address: String,
    postalCode: String,
    landmark: String,

   

    

    bankDetails: {
        bankName: String,
        accountNumber: String,
        accountName: String,
        bvn: String,
        accountType: String,
    },

    supportingDocuments: [String],

}, { timestamps: true }
);

const Business = mongoose.models.Business
    || mongoose.model("Business", businessSchma);
export default Business;