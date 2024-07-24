import express from "express";
import { token, checkToken } from "./auth";
import * as credit from "./credit";
import { withOAuth } from "../../middlewares/with-authen";

const app = express.Router();
app.post("/credit/ncb/out", withOAuth, credit.creditNCB);
app.post("/credit/loan/out", withOAuth, credit.creditLoan);
app.post("/credit/ncb/stamp", withOAuth, credit.stampLog);
app.post("/credit/check", withOAuth, credit.checkCredit);

//auth
app.post("/oauth/token", token);
app.post("/oauth/me", withOAuth, checkToken);
export default app;
