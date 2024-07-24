import { NextFunction, Request, Response } from "express";
import jwt from "../utility/jwt";
import { createRequest } from "../config";
import { Master_User, Transaction_Token_User } from "../dbcless/db_wallet";
import _ from "lodash";
import crypto from "crypto";

export const withAuthen = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      const token = req.headers.authorization.split(" ")[1];
      const check_token = await Transaction_Token_User.findOne(
        createRequest(),
        {
          token_id: token,
          status: "active",
        }
      );
      if (check_token) {
        const verify = jwt.verify(token, null) as Master_User;
        // const decoded = jwt.decode(token);
        if (verify && verify.id) {
          const user = (await Master_User.findOne(createRequest(), {
            id: verify.id,
            status: "active",
          })) as Master_User;
          if (user) {
            req.auth = _.omit(user, [
              "password",
              "created_date",
              "modified_date",
              "status",
            ]) as Master_User;
            next();
          } else {
            throw new Error("User Unavailable");
          }
        } else {
          throw new Error("Token Expired");
        }
      } else {
        throw new Error("Token Unavailable");
      }
    } else {
      throw new Error("No Token");
    }
  } catch (error) {
    res
      .status(401)
      .send({ status: 401, message: error.message, expired: true });
  }
};

export const withOAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      const check_token = await Transaction_Token_User.findOne(
        createRequest(),
        {
          token_id: req.headers.authorization.split(" ")[1],
        }
      );
      if (check_token) {
        const verify = jwt.verify(
          req.headers.authorization.split(" ")[1],
          null as any
        ) as any;
        if (verify && verify.result) {
          const hmac = crypto.createHmac(
            "sha256",
            process.env.TOKEN_CLIENT_ID + "+" + process.env.TOKEN_CLIENT_SECRET
          );
          let result = hmac
            .update(process.env.TOKEN_CLIENT_SIG as string)
            .digest("base64");

          if (verify.result !== result) {
            throw new Error("authorize error");
          }
        } else {
          throw new Error("authorize error");
        }
      } else {
        throw new Error("authorize error");
      }
      next();
    } else {
      throw new Error("authorize error");
    }
  } catch (error) {
    res.status(401).send({
      code: 401,
      error: "authorize error",
    });
  }
};
