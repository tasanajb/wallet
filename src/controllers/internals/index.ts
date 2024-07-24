import express from "express";
import * as auth from "./auth";
import * as dev from "./developer";
import * as credit from "./credit";
import * as report from "./reports"
import * as email from "./email"
import { withAuthen } from "../../middlewares/with-authen";
import { retryReportNcb, getfile, getReportNcb, getfileDecrypt, reportNcb } from "../internals/sftp";
import multer from "multer";

export const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const app = express.Router();
app.post("/auth/login", auth.login);
app.get("/auth/module", withAuthen, auth.getModule);
app.post("/auth/create-user", auth.createUser);
app.get("/developer/lists", withAuthen, dev.getDevelopers);
app.post("/developer/detail", withAuthen, dev.getDeveloperDetail);
app.post("/credit/in", withAuthen, credit.addCredit);
app.post("/credit/out", withAuthen, credit.cancelCredit);
app.post("/credit/history", withAuthen, credit.history);
app.post("/credit/add/history", withAuthen, credit.creditHistory);
app.post("/credit-free/in", withAuthen, credit.addCreditFree);
app.post("/credit-free/out", withAuthen, credit.cancelCreditFree);
app.post("/credit-free/expired", withAuthen, credit.changExpiredCreditFree);
app.post("/credit-free/history", withAuthen, credit.historyCreditFree);
app.post("/credit-free/add/history", withAuthen, credit.historysCreditFreeForAdmin);

app.post("/report/ncb", withAuthen, report.reportNcb);
app.post("/report/loan/1", withAuthen, report.reportLoan);
app.post("/report/loan/2", withAuthen, report.reportLoan);
app.post("/report/loan/ncb", withAuthen, report.reportLoanSelf);
app.post("/report/stamp/ndid", withAuthen, report.reportNdid);
app.post("/report/stamp/set", withAuthen, report.reportSet);
app.get("/report/developers", withAuthen, report.developerList);
app.get("/report/projects", withAuthen, report.projectList);
app.post("/report/ncb/txt", withAuthen, report.reportNcbText);
app.post("/report/in/summary/user", withAuthen, report.reportInSummary);
app.post("/report/in/summary/monitering", withAuthen, report.reportInSumMonitering);
app.post("/report/in/summary/developer", withAuthen, report.reportInSumByDev);
app.post("/report/bulk/summary", withAuthen, report.reportBulkSummary);
app.post("/report/bulk/detail", withAuthen, report.reportBulkDetail);
app.post("/compare/set/detail");
app.post("/compare/ndid/detail");
app.post("/compare/set/upload");
app.post("/compare/ndid/upload");

app.post("/report/bulk/conflict/download", withAuthen, email.conflictReportBulk);
app.post("/report/bulk/download");
app.post("/email", withAuthen, email.getEmail);
app.post("/email/save", withAuthen, email.updateEmail);
app.post("/email/list", withAuthen, email.transactionEmail);
app.post("/email/resend", withAuthen, email.resendEmail);

app.get("/sftp/file", upload.any(), getfileDecrypt);
app.get("/sftp/list", getReportNcb);
app.post("/sftp/retry", retryReportNcb)
app.post("/sftp/report", reportNcb)

export default app;