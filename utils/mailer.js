const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Temple App - Email Verification OTP",
    html: `<h3>Your OTP is: ${otp}</h3><p>Valid for 10 minutes.</p>`,
  });
};

exports.sendPasswordResetOTP = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Temple App - Password Reset OTP",
    html: `
      <h3>Password Reset Request</h3>
      <p>Your OTP for password reset is: <strong>${otp}</strong></p>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
    `,
  });
};
