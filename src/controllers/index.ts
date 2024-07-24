import express from "express";
import externals from "./externals";
import internals from "./internals";

const app = express.Router();
// api
app.use("/externals", externals);
app.use("/internals", internals);

export default app;