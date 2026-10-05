import nodemailer from "nodemailer";

// Inline styles and presentation tables keep the layout compatible with email clients.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderAccountEmail(title, preview, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#FAF7F2;color:#2A2F2D;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF7F2">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
        <tr><td bgcolor="#1E3329" style="padding:28px 24px;border-radius:12px 12px 0 0;border-bottom:4px solid #E5A93C border-radius:10px;">
          <p style="margin:0;color:#FAF7F2;font-family:Georgia,serif;font-size:28px;font-weight:bold;">Aba Crafts</p>
        </td></tr>
        <tr><td bgcolor="#FFFFFF" style="padding:32px 24px;border:1px solid #E6EAE7;border-top:0;border-radius:0 0 12px 12px;">
          <h1 style="margin:0 0 16px;color:#1E3329;font-family:Georgia,serif;font-size:28px;line-height:1.3;">${escapeHtml(title)}</h1>
          ${content}
          <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #E6EAE7;color:#66706B;font-size:13px;line-height:1.6;">If you did not request this, you can safely ignore this email.</p>
        </td></tr>
        <tr><td align="center" style="padding:20px 12px;color:#66706B;font-size:12px;line-height:1.6;">Aba Crafts<br>This is an automated email. Please do not reply.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}


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
    html: renderAccountEmail("Reset your password", "Your Aba Crafts password reset link expires in 30 minutes.", `
      <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">We received a request to reset your Aba Crafts password. Use the button below to choose a new password.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#C4572A" style="border-radius:8px;text-align:center;">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:15px 24px;border:1px solid #C4572A;border-radius:8px;color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;">Reset password</a>
      </td></tr></table>
      <p style="margin:24px 0 16px;color:#66706B;font-size:14px;line-height:1.6;">This link expires in <strong style="color:#1E3329;">30 minutes</strong>. Do not share it with anyone.</p>
      <p style="margin:0;color:#66706B;font-size:13px;line-height:1.6;">If the button does not work, copy and paste this link into your browser:</p>
      <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;"><a href="${escapeHtml(url)}" style="color:#A3431D;text-decoration:underline;">${escapeHtml(url)}</a></p>
    `),
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
    html: renderAccountEmail("Verify your email", "Your Aba Crafts verification code expires in 15 minutes.", `
      <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">Welcome to Aba Crafts. Enter the verification code below to verify your email address.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#FDF1EC" style="padding:24px 12px;border:1px solid #E6EAE7;border-radius:8px;">
        <p style="margin:0 0 10px;color:#66706B;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Your verification code</p>
        <p style="margin:0;color:#A3431D;font-family:'Courier New',monospace;font-size:32px;font-weight:bold;letter-spacing:6px;line-height:1.4;">${escapeHtml(otp)}</p>
      </td></tr></table>
      <p style="margin:24px 0 0;color:#66706B;font-size:14px;line-height:1.6;">This code expires in <strong style="color:#1E3329;">15 minutes</strong>. Keep it private and do not share it with anyone.</p>
    `),
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
