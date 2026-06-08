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

    description: {
        type: String,
        default: "",
    },

    logo: {
        type: String,
        default: "",
    },
    address: {
        type: String,
        default: "",
    },
    typeOfBusiness: {
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
    }
}, { timestamps: true }
);

const Business =mongoose.models.Business
|| mongoose.model("Business", businessSchma);
export default Business;