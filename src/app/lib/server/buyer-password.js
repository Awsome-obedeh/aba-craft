import connect from "../connect.js";
import User from "../../../models/User.js";
import Challenge from "../../../models/PasswordResetChallenge.js";
import { sendBuyerPasswordResetCode } from "../send-mail.js";
import { createBuyerPasswordService } from "./buyer-password-service.js";

export const buyerPasswordService = createBuyerPasswordService({
  connect: async () => { await connect(); await Challenge.init(); },
  User, Challenge, sendEmail: sendBuyerPasswordResetCode,
});
