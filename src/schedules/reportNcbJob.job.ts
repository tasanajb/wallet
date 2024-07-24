import chalk from "chalk";
import schedule from "node-schedule";
import { reportNcbJob, retryReportNcbJob } from "../controllers/internals/sftp";

let job: any = null;

export const start = () => {
  job = schedule.scheduleJob(process.env.SFTP_JOB_RUN_TIME, async () => {
    try {
      console.log(new Date());
      await reportNcbJob();
      console.log(chalk.yellowBright.inverse("Report NCB job started, This job runs at 00:10 every day"));
    } catch (e) {
      console.error(e);
    }
  });
};

export const retry = () => {
  job = schedule.scheduleJob(process.env.SFTP_RETRY_JOB_RUN_TIME, async () => {
    try {
      console.log(new Date());
      await retryReportNcbJob();
      console.log(chalk.yellowBright.inverse("Retry report NCB job started, This job is run every day from 00:11 to 00:20"));
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
