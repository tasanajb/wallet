import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  ignoreTLS: false,
  tls: {
    rejectUnauthorized: false
  },
  secure: process.env.MAIL_SECURE == "0" ? false : true,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});
