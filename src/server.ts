import express from "express";
import apiRoutes from "./controllers";
import http from "http";
import dotenv from "dotenv";
import chalk from "chalk";
import helmet from "helmet";
import nocache from "nocache";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { HttpException } from "./models/HttpException";
import { logger } from "./utility";
import { createPoolFirst, createPoolSecond } from "./config";
import sql from "mssql";
import jwt from "./utility/jwt";
import { Master_User } from "./dbcless/db_wallet";
import path from "path";
import schedules from "./schedules";

let started_time: Date;
// ENV
const env_result = dotenv.config();
if (env_result.error) {
  throw env_result.error;
}
const env = env_result.parsed;

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH", "HEAD"],
};

const app = express();
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(nocache());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(apiRoutes);

app.use(function (
  err: HttpException,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.status && err.status < 500) {
    logger.info(err.message);
  } else {
    if (err.stack) {
      logger.error(err.stack);
    } else {
      logger.info(err.message);
    }
  }

  res.status(err.status || 500).send({
    error_code: err.status || 500,
    error_message: err.message || "System error, Something went wrong",
  });
});

const configSql: sql.config = {
  server: process.env.DB_HOST as string,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME as string,
  requestTimeout: 50000,
  connectionTimeout: 50000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false,
    rowCollectionOnDone: true,
    useUTC: false,
    enableArithAbort: true,
  },
};

const configSqlSecond: sql.config = {
  server: process.env.DB_HOST as string,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME_SECOND as string,
  requestTimeout: 50000,
  connectionTimeout: 50000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false,
    rowCollectionOnDone: true,
    useUTC: false,
    enableArithAbort: true,
  },
};


// JWT
jwt.setKeyFromPath((__dirname == "/" ? "" : __dirname) + "/keys");

declare global {
  namespace Express {
    interface Request {
      auth: Master_User;
    }
  }
}

// STATIC
app.use("/api/statics", express.static(path.join(__dirname, "../public")));
app.use("/images", express.static("./images/"));

// Start App
Promise.all([createPoolFirst(configSql), createPoolSecond(configSqlSecond)])
  .then(() => {
    console.log(chalk.green.inverse(`Pool connected`));
    started_time = new Date();

    if (process.env.REPORT_NCB_JOB === "true") {
      schedules.reportNcbJob.start();
    }
    if (process.env.RETRY_REPORT_NCB_JOB === "true") {
      schedules.reportNcbJob.retry();
    }
    if (process.env.REPORT_BULK_JOB === "true") {
      schedules.reportBulkJob.start();
    }

    if (process.env.REPORT_BULK_MAIL_JOB === "true") {
      schedules.reportBulkJob.sendMail();
    }
    
    http.createServer(app).listen(process.env.PORT, () => {
      console.log(chalk.green.inverse(`Listening on port ${process.env.PORT}`));
    });
  })
  .catch((err) => {
    console.log(chalk.red.inverse(`Pool connect error`), err);
  });