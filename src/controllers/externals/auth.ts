import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import jwt from "../../utility/jwt";
import { Transaction_Token_User } from "../../dbcless/db_wallet";
import { createRequest } from "../../config";

export const token = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { client_id, client_secret, grant_type, scope } = req.body;
    let access_token,
      token_type = "Bearer",
      expires_in = 60 * 60 * 2,
      message = "success";

    if (grant_type === "client_credentials") {
      if (
        client_id === (process.env.TOKEN_CLIENT_ID as string) &&
        client_secret === (process.env.TOKEN_CLIENT_SECRET as string)
      ) {
        const hmac = crypto.createHmac(
          "sha256",
          client_id + "+" + client_secret
        );
        let result = hmac
          .update(process.env.TOKEN_CLIENT_SIG as string)
          .digest("base64");
        access_token = jwt.sign(
          { message, result },
          {
            expiresIn: "2h",
            algorithm: "RS256",
          }
        );

        await Transaction_Token_User.delete(createRequest(), {
          user_id: "0",
        });

        await Transaction_Token_User.insert(createRequest(), {
          user_id: "0",
          token_id: access_token,
          status: "active",
        });
      } else {
        message = "The client_id or client_secret was not correct";
      }
    } else {
      message =
        "The Client Credentials grant type is used by clients to obtain an access token outside of the context of a user.";
    }
    res.send({ message, access_token, token_type, expires_in, scope });
  } catch (error) {
    next(error);
  }
};

export const checkToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.send({
      status: 200,
      message: "OK",
    });
  } catch (error) {
    next(error);
  }
};
