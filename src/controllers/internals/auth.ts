import { NextFunction, Request, Response } from "express";
import {
  Mapping_Role_User,
  Master_User,
  Transaction_Token_User,
} from "../../dbcless/db_wallet";
import { createRequest, pool } from "../../config";
import bcrypt from "bcrypt";
import sql, { NVarChar } from "mssql";
import _ from "lodash";
import jwt from "../../utility/jwt";
import { snakeCaseKeys } from "../../utility";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let trans = new sql.Transaction(pool);
  try {
    await trans.begin();
    const { first_name, last_name, email, password, role_id } = req.body;
    // let gen_pass : string = randomstring.generate({
    //   length: 6,
    //   charset: "numeric",
    // });

    // validate account
    const account = await Master_User.findOne(createRequest(), {
      email: email,
    });
    if (account) {
      res
        .status(400)
        .send({ status: 400, message: "This user account already exists." });
    } else {
      const user_password = bcrypt.hashSync(password, 10);
      const user_id: any = await Master_User.insert(createRequest(trans), {
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: user_password,
        status: "active",
      });
      await Mapping_Role_User.insert(createRequest(trans), {
        user_id: parseInt(user_id),
        role_id: parseInt(role_id),
      });

      await trans.commit();
      res.status(200).send({ status: 200, message: "success" });
    }
  } catch (error) {
    if (trans) {
      await trans.rollback();
    }
    res.status(500).send({ status: 500, message: "error" });
  }
};
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let trans = new sql.Transaction(pool);
  try {
    await trans.begin();
    const { user_name, password } = req.body;
    const user_q = await createRequest(trans)
      .input("user", NVarChar, user_name)
      .input("status", NVarChar, "active")
      .query(
        `
        SELECT *
          FROM  Master_User as u
          LEFT JOIN  Mapping_Role_User as map on u.Id = map.UserId
          WHERE email = @user AND Status = @status
        `
      );
    const check_user: any = snakeCaseKeys(user_q.recordset[0]);
    if (!check_user) {
      await trans.commit();
      res.status(400).send({ status: 400, message: "ไม่พบผู้ใช้" });
    }
    let data,
      token,
      modules = [];
    if (check_user && bcrypt.compareSync(password, check_user.password)) {
      data = _.omit(check_user, [
        "password",
        "status",
        "user_id",
        "created_date",
        "modified_date",
      ]) as Master_User;

      token = jwt.sign(data, { expiresIn: "12h", algorithm: "RS256" });
      await Transaction_Token_User.insert(createRequest(trans), {
        user_id: data.id?.toString(),
        token_id: token,
        status: "active",
      });

      let module_data = await getModuleList(check_user.id);

      await trans.commit();
      res.status(200).send({
        status: 200,
        message: "success",
        data: {
          data,
          module_data,
        },
        token,
      });
    } else {
      await trans.commit();
      res
        .status(400)
        .send({ status: 400, message: "ชื่อผู้ใช้ หรือ รหัสผ่าน ไม่ถูกต้อง" });
    }
  } catch (error) {
    if (trans) {
      await trans.rollback();
    }
    res.status(500).send({ status: 500, message: "error" });
  }
};
export const getModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const module_data = await getModuleList(req.auth.id);
    res.status(200).send({
      status: 200,
      message: "success",
      data: {
        ...req.auth,
        module_data,
      },
    });
  } catch (error) {
    res.status(500).send({ status: 500, message: "error" });
  }
};

async function getModuleList(user_id: number) {
  const module_q = await createRequest()
    .input("id", sql.Int, user_id)
    .query(
      `SELECT DISTINCT t3.Id, t3.Path, t3.Name, t3.ParentId, t3.Seq
       FROM Mapping_Role_User t1
       INNER JOIN Mapping_Role_Module t2 ON t1.RoleId = t2.RoleId
       INNER JOIN Master_Module t3 ON t2.ModuleId = t3.Id AND t3.Status = 'active'
       WHERE t1.UserId = @id
        ORDER BY t3.Seq `
    );
  return await snakeCaseKeys(module_q.recordset);
}
