const nodemailer = require("nodemailer");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://towncentralhoa.org";

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function wrapEmail(title, bodyHtml) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #2c3e50; padding: 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 1.4rem;">${title}</h2>
        <span style="font-size: 0.8rem; letter-spacing: 1px; color: #2ecc71; font-weight: bold;">TOWN CENTRAL HOA</span>
      </div>
      <div style="padding: 28px; background-color: #ffffff; color: #334155; font-size: 0.95rem; line-height: 1.6;">
        ${bodyHtml}
      </div>
      <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #f1f5f9;">
        Town Central Executive Board · Piedmont, OK
      </div>
    </div>
  `;
}

async function sendMail(options) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email skipped: EMAIL_USER / EMAIL_PASS are not set.");
    return { skipped: true };
  }
  return transporter.sendMail({
    from: `"Town Central Executive Board" <${process.env.EMAIL_USER}>`,
    ...options,
  });
}

function sendWelcomePacket({ to, firstName, attachments }) {
  const loginUrl = `${FRONTEND_URL}/login`;
  return sendMail({
    to,
    subject: `Welcome to Town Central, ${firstName}!`,
    html: wrapEmail(
      `Welcome, ${firstName}`,
      `
        <p>Your resident portal account is active. You can now sign in to view announcements, pay attention to community alerts, submit maintenance or ARC requests, and access neighborhood documents.</p>
        <p><a href="${loginUrl}" style="display: inline-block; background: #2ecc71; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 18px; border-radius: 8px;">Open Resident Login</a></p>
        ${attachments?.length ? "<p>Your welcome packet is attached.</p>" : ""}
        <p>If you did not claim this profile, please contact the board at board@towncentralhoa.org.</p>
      `,
    ),
    attachments,
  });
}

function sendClaimCodeEmail({ to, firstName, streetAddress, claimCode }) {
  const claimUrl = `${FRONTEND_URL}/claim`;
  return sendMail({
    to,
    subject: `Your Town Central claim code for ${streetAddress}`,
    html: wrapEmail(
      "Claim Your Household Profile",
      `
        <p>Hello${firstName ? ` ${firstName}` : ""},</p>
        <p>The Town Central board has added <strong>${streetAddress}</strong> to the neighborhood roster. Use this claim code on the portal to create your account:</p>
        <p style="font-size: 1.6rem; font-weight: 800; letter-spacing: 0.2em; text-align: center; background: #f8fafc; padding: 16px; border-radius: 10px; color: #0f172a;">${claimCode}</p>
        <p><a href="${claimUrl}" style="display: inline-block; background: #2ecc71; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 18px; border-radius: 8px;">Claim your profile</a></p>
      `,
    ),
  });
}

function sendHouseholdInvite({ to, address, token }) {
  const inviteUrl = `${FRONTEND_URL}/invite/${token}`;
  return sendMail({
    to,
    subject: "You've been invited to the Town Central resident portal",
    html: wrapEmail(
      "Household Invitation",
      `
        <p>You were invited to join the Town Central resident portal for <strong>${address}</strong>.</p>
        <p><a href="${inviteUrl}" style="display: inline-block; background: #2ecc71; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 18px; border-radius: 8px;">Accept invitation</a></p>
        <p>This link can only be used once. If you were not expecting this email, you can ignore it.</p>
      `,
    ),
  });
}

function sendPasswordReset({ to, firstName, token }) {
  const resetUrl = `${FRONTEND_URL}/reset/${token}`;
  return sendMail({
    to,
    subject: "Reset your Town Central password",
    html: wrapEmail(
      "Password reset",
      `
        <p>Hello${firstName ? ` ${firstName}` : ""},</p>
        <p>We received a request to reset the password for your Town Central resident portal account.</p>
        <p><a href="${resetUrl}" style="display: inline-block; background: #2ecc71; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 18px; border-radius: 8px;">Choose a new password</a></p>
        <p>This link expires in one hour. If you did not ask for a reset, you can ignore this email.</p>
      `,
    ),
  });
}

module.exports = {
  transporter,
  sendMail,
  sendWelcomePacket,
  sendClaimCodeEmail,
  sendHouseholdInvite,
  sendPasswordReset,
  FRONTEND_URL,
};
