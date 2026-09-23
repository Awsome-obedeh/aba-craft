import nodemailer from "nodemailer";

export async function sendPasswordResetMail(email, url) {
  if (!process.env.EMAIL_ADDRESS || !process.env.EMAIL_APP_PASSWORD) throw new Error("Email delivery is not configured.");
  const transport = nodemailer.createTransport({
    ...(process.env.SMTP_HOST
      ? { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: process.env.SMTP_PORT !== "587" }
      : { service: process.env.EMAIL_HOST }),
    auth: { user: process.env.EMAIL_ADDRESS, pass: process.env.EMAIL_APP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  await transport.sendMail({
    from: process.env.EMAIL_ADDRESS, to: email, subject: "Reset your Aba Crafts password",
    text: `Use this link to reset your password: ${url}\n\nIt expires in 30 minutes. If you did not request this, ignore this email.`,
  });
}

// Propagate delivery errors so the caller cannot report that an unsent OTP was sent.
export async function sendMail(email, otp) {
  if (!process.env.EMAIL_ADDRESS || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error("Email delivery is not configured.");
  }
  const transport = nodemailer.createTransport({
    ...(process.env.SMTP_HOST
      ? { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: process.env.SMTP_PORT !== "587" }
      : { service: process.env.EMAIL_HOST }),
    auth: { user: process.env.EMAIL_ADDRESS, pass: process.env.EMAIL_APP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  await transport.sendMail({
    from: process.env.EMAIL_ADDRESS,
    to: email,
    subject: process.env.VERIFICATION_EMAIL_SUBJECT || "Verify your Abacrafts email",
    text: "Your Abacrafts verification code is " + otp + ". It expires in 15 minutes. If you did not request this, ignore this email.",
  });
}

export const sendProductApprovalMail = async (email, productSlug, productImage, subject, frontEndUrl) => {
  try {
    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_HOST,
      port: 465,
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Beautiful HTML template
  const htmlTemplate = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.5; color: #333333;">
      <h2 style="color: #111111; margin-bottom: 20px;">Product Approved</h2>
      <p>Your product has been approved and is now live on Aba Crafts.</p>
   
      <p style="font-weight: bold; margin-top: 20px; margin-bottom: 5px;">Product Name:</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; text-align: center; font-size: 16px; font-weight: bold; border-radius: 8px; color: #0f172a;">
        ${productSlug}
      </div>

      <p style="font-weight: bold; margin-top: 20px; margin-bottom: 5px;">Product Image:</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; text-align: center; border-radius: 8px;">
        <img 
          src="${productImage}" 
          alt="${productSlug}" 
          width="350"
          style="display: block; max-width: 100%; height: auto; border: 0; margin: 0 auto; border-radius: 6px;" 
        />
      </div>
      
      <p style="margin-top: 25px; text-align: center; font-size: 14px; color: #475569;">
        Your product is now visible to buyers on the marketplace.
      </p>
      
      <table border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto; width: 200px; text-align: center;">
        <tr>
          <td bgcolor="#000000" style="border-radius: 8px;">
            <a 
              href="${process.env.FRONT_END_URL}/market-place/\${productSlug}" 
              target="_blank" 
              style="display: block; padding: 14px 20px; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 8px;"
            >
              View Product
            </a>
          </td>
        </tr>
      </table>
      
      <p style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 13px; color: #64748b;">
        Thank you for being a part of Aba Crafts!
      </p>
  </div>

  <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 24px; font-family: Arial, sans-serif;">
    This is an automated email, no need to reply.
  </p>
`;


    // Mail options
    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: email,
      subject: subject,
      html: htmlTemplate,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(" Email sent:", info.response);

  } catch (error) {
    console.error(" Error sending email:", error);
  }

};
