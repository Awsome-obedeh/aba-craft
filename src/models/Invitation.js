import { Schema, model, models } from "mongoose";


const invitationOTPSchema = new Schema(
  {
    
     email: {
      type: String,
      required: [true, "email is required"],
      lowercase: true,
      trim: true,
      index: true, // Indexed for high-speed lookups during verification
    },

 
    invitationCode: {
      type: String,
      required: [true, "code is required"],
      unique: true,
    },

    
    purpose: {
      type: String,
      enum: ["email_verification", "password_reset"],
      required: [true, "Token purpose is required"],
    },

  
    isUsed: {
      type: Boolean,
      default: false,
    },

 
    // 5. Audit fields for tracking fraud or security exploits
    metadata: {
      ipAddress: { type: String },
      userAgent: { type: String },
      attemptsCount: { 
        type: Number, 
        default: 0,
        max: [5, "Maximum validation attempts exceeded"]// rate limit
      },
    },

   usedAt:{
        type:Date,
       

    },

    expiresAt: {
      type: Date,
      required: [true, "Expiration timestamp is required"],
    },
  },
  { 
    timestamps: true // Automatically generates createdAt and updatedAt
  }
);

// CRITICAL INDEX: TTL (Time-To-Live) 
// This tells MongoDB to automatically delete this document when expiresAt is reached.

invitationOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


 const Invitation = models.Invitation || 
model("Invitation", invitationOTPSchema);

export default Invitation;