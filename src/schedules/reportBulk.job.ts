import chalk from "chalk";
import schedule from "node-schedule";
import { reportBulkSummaryJob } from "../controllers/internals/reports";
import { sendMailBulkSummaryJob } from "../controllers/internals/email";

let job: any = null;

export const start = () => {
  job = schedule.scheduleJob(process.env.BULK_JOB_RUN_TIME, async () => {
    try {
      await reportBulkSummaryJob();
      console.log(chalk.yellowBright.inverse("Report bulk job started, Run at 00:15 on the first day of every month"));
    } catch (e) {
      console.error(e);
    }
  });
};

export const sendMail = () => {
  job = schedule.scheduleJob(process.env.BULK_MAIL_JOB_RUN_TIME, async () => {
    try {
      await sendMailBulkSummaryJob();
      console.log(chalk.yellowBright.inverse("Send report bulk to email job started, Run at 8:00 AM on the first day of every month"));
    } catch (e) {
      console.error(e);
    }
  });
};

export const cancel = () => {
  if (job) {
    job.cancel();
  }
};
