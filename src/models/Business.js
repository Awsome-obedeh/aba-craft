import mongoose from "mongoose";

const businessSchma = new mongoose.Schema({
    sellerRole: { type: String, enum: ["wholesaler_producer", "retailer"] },
    phoneNumber: String,
    countryCode: String,
    email: String,
    bvnEncrypted: { type: String, select: false },
    bvnLastFour: { type: String, select: false },
    cacNumber: { type: String, trim: true },
    documentDetails: {
        type: new mongoose.Schema({
            registeredName: { type: String, maxlength: 255 },
            registrationDate: { type: String, maxlength: 255 },
            registeredBusinessType: { type: String, maxlength: 255 },
            individualName: { type: String, maxlength: 255 },
        }, { _id: false }),
        select: false,
    },
    ninEncrypted: { type: String, select: false },
    abssinEncrypted: { type: String, select: false },
    identityConsentAt: { type: Date, select: false },
    identityChecks: {
        cac: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
        abssin: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
        nin: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    },
    ninDocument: {
        type: new mongoose.Schema({
            publicId: { type: String, required: true },
            mimeType: String,
            size: Number,
            uploadedAt: Date,
        }, { _id: false }),
        select: false,
    },
    cacDocument: {
        type: new mongoose.Schema({
            publicId: { type: String, required: true },
            mimeType: String,
            size: Number,
            uploadedAt: Date,
        }, { _id: false }),
        select: false,
    },
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
        type: [String],
        default: [],
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
    city: { type: String, trim: true, maxlength: 100 },
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
