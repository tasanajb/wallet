import fs from "fs";
import jwt from "jsonwebtoken";

// use 'utf8' to get string instead of byte array (512 bit key)
var privateKEY: string = "";
var publicKEY: string = "";

export default {
  setKey: (priKey: string, pubKey: string) => {
    privateKEY = priKey;
    publicKEY = pubKey;
  },
  setKeyFromPath: (path: string) => {
    privateKEY = fs.readFileSync(`${path}/private_key.pem`, "utf8")?.toString();
    publicKEY = fs.readFileSync(`${path}/public_key.pem`, "utf8")?.toString();
  },
  sign: (payload: any, $Option: jwt.SignOptions) => {
    /*
         sOptions = {
          issuer: "Authorizaxtion/Resource/This server",
          subject: "iam@user.me", 
          audience: "Client_Identity" // this should be provided by client
         }
        */
    // Token signing options
    // var signOptions = {
    //     issuer: $Options.issuer,
    //     subject: $Options.subject,
    //     audience: $Options.audience,
    //     expiresIn: "30d",    // 30 days validity
    //     algorithm: "RS256"
    // };
    return jwt.sign(payload, privateKEY, $Option);
  },
  verify: (token: string, $Option: jwt.VerifyOptions) => {
    /*
         vOption = {
          issuer: "Authorization/Resource/This server",
          subject: "iam@user.me",
          audience: "Client_Identity" // this should be provided by client
         }
        */
    // var verifyOptions = {
    //     issuer: $Option.issuer,
    //     subject: $Option.subject,
    //     audience: $Option.audience,
    //     expiresIn: "30d",
    //     algorithm: ["RS256"]
    // };
    try {
      return jwt.verify(token, publicKEY, $Option);
    } catch (err) {
      return false;
    }
  },
  decode: (token: string) => {
    return jwt.decode(token, { complete: true });
    //returns null if token is invalid
  },
};
