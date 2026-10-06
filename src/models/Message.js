import mongoose from "mongoose";
import { MAX_MESSAGE_LENGTH } from "../app/lib/messaging/validation.js";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, maxlength: MAX_MESSAGE_LENGTH },
    clientId: { type: String, required: true },
    attachments: [
      new mongoose.Schema(
        {
          id: mongoose.Schema.Types.ObjectId,
          name: String,
          type: String,
          size: Number,
        },
        { _id: false },
      ),
    ],
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
messageSchema.index({ recipientId: 1, readAt: 1, conversationId: 1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

export default mongoose.models.Message ||
  mongoose.model("Message", messageSchema);
