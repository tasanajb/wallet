import winston, { format } from "winston";

// log
export const logger = winston.createLogger({
  format: format.combine(format.timestamp(), format.splat(), format.simple()),
  transports:
    process.env.NODE_ENV !== "production"
      ? [new winston.transports.Console({ format: winston.format.simple() })]
      : [
          //
          // - Write all logs with level `error` and below to `error.log`
          // - Write all logs with level `info` and below to `combined.log`
          //
          new winston.transports.File({
            filename: "error.log",
            level: "error",
          }),
          new winston.transports.File({
            filename: "combined.log",
            level: "info",
          }),
        ],
  exceptionHandlers: [
    new winston.transports.File({ filename: "exceptions.log" }),
  ],
});

// //
// // If we're not in production then log to the `console` with the format:
// // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// //
// if (process.env.NODE_ENV !== "production") {
//   logger.add(new winston.transports.Console({format: winston.format.simple()}));
// } else {
//   logger.add(new winston.transports.File({ filename: "error.log", level: "error" }));
//   logger.add(new winston.transports.File({ filename: "combined.log" }));
// }
