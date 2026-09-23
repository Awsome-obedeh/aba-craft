import mongoose from "mongoose";
import connect from "../connect.js";
import { sendMail } from "../send-mail.js";
import Challenge from "../../../models/SignupChallenge.js";
import User from "../../../models/User.js";
import Business from "../../../models/Business.js";
import { createSignupService } from "./signup-service.js";
import { uploadDocument, deleteDocument } from "./signup-documents.js";

export const signupService = createSignupService({
  connect: async () => {
    await connect();
    // Ensure collections and uniqueness indexes exist before transactional writes.
    await Promise.all([Challenge.init(), User.init(), Business.init()]);
  }, Challenge, User, Business,
 
  uploadDocument, deleteDocument, sendCodeEmail: sendMail,
});
