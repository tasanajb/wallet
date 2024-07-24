import { transport } from "../config/email.config";
import { createRequest } from "../config";
import { Transaction_Email } from "../dbcless/db_wallet";
import dotenv from "dotenv";
dotenv.config();

export const sendMail = async (data: any) => {
  try {
    let text: string = "";
    let html: string = "";
    let attachments: any = [];
    text = data?.text;
    html = data?.html;
    attachments = data?.attachments;

      await transport.sendMail({
        to: (data.send_to as string).split(","),
        cc: (data.send_cc as string).split(","),
        from: process.env.EMAIL_USERNAME,
        subject: data.subject,
        text: text,
        html: html,
        attachments: attachments,
        //   attachments: [
        //     {
        //         filename: 'how_to_add_summernote_editor_in_laravel.png',
        //         path: './uploads/how_to_add_summernote_editor_in_laravel.png'
        //     }
        // ]
      });

    return {status: true, message: "success"};
  } catch (error) {
    return {status: false, message: "fail", error: error};
  }
};
