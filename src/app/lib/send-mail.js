
import nodemailer from "nodemailer";

// Function to send OTP via email using Nodemailer
export const sendMail = async (email, otp) => {
  try {
    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service:process.env.EMAIL_HOST,
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
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height:1.2">
                <h2>Welcome to Aba Craft</h2>
                <p>You're a step closer to creating your shop and start selling.</p>
             
                <p>Your Registration Code:</p>
                <h3 style="background-color: #f0f0f0; padding: 15px; text-align: center;">
                ${otp}
                </h3>

                <p>This code will expire in 15 minutes</p>
                <span>You'd need to request a new one after expiration.</span>
               
            </div>

            <p style="text-align:center; color:gray; font-size:10px; padding:10px 0">This is an automated email, no need to reply.</p>
              `;

    // Mail options
    const mailOptions = {
      from:  process.env.EMAIL_ADDRESS,
      to: email,
      subject: process.env.VERIFICATION_EMAIL_SUBJECT,
      html: htmlTemplate,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(" Email sent:", info.response);

  } catch (error) {
    console.error(" Error sending email:", error);
  }

};
