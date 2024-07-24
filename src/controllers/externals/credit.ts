import { Request, Response } from "express";
import { createRequest, pool } from "../../config";
import sql from "mssql";
import _ from "lodash";
import {
  Transaction_Activity_Log,
  Master_Credit_Balance,
  Transaction_Out_Log,
  Master_Developer,
  Transaction_Stamp_Log,
  Master_Credit_Free
} from "../../dbcless/db_wallet";
import { snakeCaseKeys } from "../../utility";

let order_code: string;
let dev_id: number;
let trans_id: string;

export const creditNCB = async (req: Request, res: Response) => {
  try {
    const { developer_code, is_credit, ncb_id } = req.body;
    trans_id = ncb_id;
    let amount = process.env.WALLET_NCB;
    const dev_data = await Master_Developer.findOne(createRequest(), {
      developer_code: developer_code,
    });
    if (!dev_data)
      throw {
        status: 400,
        message: "หักเครดิตไม่สำเร็จ ไม่พบ developer กรุณาติดต่อผู้ให้บริการ",
      };
    dev_id = dev_data.id;

    await Transaction_Activity_Log.insert(createRequest(), {
      transaction_id: trans_id,
      developer_id: dev_id,
      is_credit: is_credit,
      type: "หักเครดิต(ncb)",
      method: "post",
      origin: req.originalUrl,
      header: JSON.stringify(req.headers),
      body: JSON.stringify(req.body),
      description_code: "pending",
      description: "รอดำเนินการ",
      create_by: "0",
    });

    // case ncb credit out
    if (is_credit) {
      const credit_out = await creditOut(req.body, dev_id, parseInt(amount), trans_id);
      if (credit_out.status != 200) {
        throw credit_out;
      }
    } else {
      await Transaction_Activity_Log.update(
        createRequest(),
        {
          response: "{ status: 200, message: 'หักเครดิตสำเร็จ' }",
          update_date: new Date(),
          update_by: "0",
          description_code: "success",
          description: "สำเร็จ",
        },
        {
          transaction_id: trans_id,
          description_code: "pending",
        }
      );
    }

    res.status(200).send({
      status: 200,
      message: "หักเครดิตสำเร็จ",
    });
  } catch (error) {
    await Transaction_Activity_Log.update(
      createRequest(),
      {
        error_message: error.message,
        description_code: "failed",
        description: "ไม่สำเร็จ",
        update_date: new Date(),
      },
      {
        transaction_id: trans_id,
        description_code: "pending",
      }
    );

    res
      .status(error.status | 500)
      .send({ status: error.status | 500, message: error.message });
  }
};

export const creditLoan = async (req: Request, res: Response) => {
  try {
    const { developer_code, is_credit, loan_id } = req.body;
    trans_id = loan_id;
    let amount = process.env.WALLET_LOAN;
    const dev_data = await Master_Developer.findOne(createRequest(), {
      developer_code: developer_code,
    });
    if (!dev_data)
      throw {
        status: 400,
        message: "หักเครดิตไม่สำเร็จ ไม่พบ developer กรุณาติดต่อผู้ให้บริการ",
      };
    dev_id = dev_data.id;

    const credit_data = await Master_Credit_Balance.findOne(
      createRequest(),
      {
        developer_id: dev_id,
      }
    );
    const body_obj = {
      body: req.body,
      before: _.omit(credit_data, ["id", "developer_id"]),
    };
    await Transaction_Activity_Log.insert(createRequest(), {
      transaction_id: trans_id,
      developer_id: dev_id,
      is_credit: is_credit,
      type: "หักเครดิต(loan)",
      method: "post",
      origin: req.originalUrl,
      header: JSON.stringify(req.headers),
      body: JSON.stringify(body_obj),
      description_code: "pending",
      description: "รอดำเนินการ",
      create_by: "0",
    });

    // case ncb credit out
    if (is_credit) {
      const credit_out = await creditOut(req.body, dev_id, parseInt(amount), trans_id);
      if (credit_out.status != 200) {
        throw credit_out;
      }
    } else {
      await Transaction_Activity_Log.update(
        createRequest(),
        {
          response: "{ status: 200, message: 'หักเครดิตสำเร็จ' }",
          update_date: new Date(),
          update_by: "0",
          description_code: "success",
          description: "สำเร็จ",
        },
        {
          transaction_id: trans_id,
          description_code: "pending",
        }
      );
    }

    res.status(200).send({
      status: 200,
      message: "หักเครดิตสำเร็จ",
    });
  } catch (error) {
    await Transaction_Activity_Log.update(
      createRequest(),
      {
        error_message: error.message,
        description_code: "failed",
        description: "ไม่สำเร็จ",
        update_date: new Date(),
      },
      {
        transaction_id: trans_id,
        description_code: "pending",
      }
    );

    res
      .status(error.status | 500)
      .send({ status: error.status | 500, message: error.message });
  }
};

export const stampLog = async (req: Request, res: Response) => {
  try {
    const dev_data = await Master_Developer.findOne(createRequest(), {
      developer_code: req.body[0].developer_code,
    });

    for (let i in req.body) {
      await Transaction_Stamp_Log.insert(createRequest(), {
        order_code: req.body[i].order_code,
        type: req.body[i].type,
        amount: req.body[i].amount,
        status: "success",
        developer_id: dev_data.id,
      });
    }

    res.status(200).send({ status: 200, message: "บันทึกสำเร็จ" });
  } catch (error) {
    res.status(500).send({ status: 500, message: error.message });
  }
};

export const checkCredit = async (req: Request, res: Response) => {
  try {
    const { developer_code, amount } = req.body;
    const dev_data = await Master_Developer.findOne(createRequest(), {
      developer_code: developer_code
    })

    if (!dev_data)
      throw {
        status: 400,
        message: "หักเครดิตไม่สำเร็จ ไม่พบ developer กรุณาติดต่อผู้ให้บริการ",
      };
    let developer_id = dev_data.id;
    const credit_free_q = await createRequest()
      .input("developer_id", sql.Int, developer_id)
      .query(`
        SELECT DeveloperId, TotalBalance, TotalIn, TotalOut, ExpiredDate 
        FROM Master_Credit_Free 
        WHERE TotalBalance > 0 AND DeveloperId = @developer_id AND ExpiredDate >= getDate()  
      `)
    let credit_free = snakeCaseKeys(credit_free_q.recordset[0]);

    const balance_data = await Master_Credit_Balance.findOne(
      createRequest(),
      {
        developer_id: developer_id,
      }
    );
    if (!balance_data)
      return res.status(400).send({
        status: 400,
        message:
          "หักเครดิตไม่สำเร็จ ไม่พบบัญชี Wallet กรุณาติดต่อผู้ให้บริการ",
      });
    const isbalance =
      balance_data.total_balance >= 1500 &&
        balance_data.total_balance - parseInt(amount) >= 1000
        ? true
        : false;
    if (!isbalance)
      return res.status(400).send({
        status: 400,
        message:
          "เครดิตไม่เพียงพอ กรุณาติดต่อผู้ให้บริการ",
        data: {
          credit_balance: balance_data?.total_balance || 0,
          credit_free_balance: credit_free?.total_balance || 0,
          credit_free_expire_date: credit_free?.expired_date || ""
        }
      });

    res.status(200).send({
      status: 200,
      message:
        "เครดิตเพียงพอ สารถทำรายการต่อได้",
      data: {
        credit_balance: balance_data?.total_balance || 0,
        credit_free_balance: credit_free?.total_balance || 0,
        credit_free_expire_date: credit_free?.expired_date || ""
      }
    });
  } catch (error) {
    res
      .status(error.status | 500)
      .send({ status: error.status | 500, message: error.message });
  }
}

async function generateId(key: string) {
  const trans_runnumber = await createRequest()
    .input("RunKey", sql.NVarChar, key)
    .input("KeyCode", sql.NVarChar, key)
    .input("CreateDate", sql.Date, new Date())
    .execute("sp_CreateRunning");
  let trans_id = trans_runnumber
    ? String(trans_runnumber.recordset[0]["RunKey"])
    : null;
  return trans_id;
}

async function creditOut(data_body: any, developer_id: number, amount: number, transaction_id: string) {
  const credit_free_q = await createRequest()
    .input("developer_id", sql.Int, developer_id)
    .query(`
        SELECT DeveloperId, TotalBalance, TotalIn, TotalOut, ExpiredDate 
        FROM Master_Credit_Free 
        WHERE TotalBalance > 0 AND DeveloperId = @developer_id AND ExpiredDate >= getDate() 
    `)
  let credit_free = snakeCaseKeys(credit_free_q.recordset[0]);
  let credit_balance: number;
  let out: number;
  let is_credit_free: boolean;
  let body_obj: any = {};

  if (credit_free) {
    // credit out
    credit_balance = credit_free.total_balance - 1;
    out = credit_free.total_out + 1;
    is_credit_free = true;
    await Master_Credit_Free.update(
      createRequest(),
      {
        total_balance: credit_balance,
        total_out: out,
        update_date: new Date(),
      },
      {
        developer_id: developer_id,
      }
    );

    body_obj = {
      body: data_body,
      before: _.omit(credit_free, ["id", "developer_id"]),
    };
  } else {
    const balance_data = await Master_Credit_Balance.findOne(
      createRequest(),
      {
        developer_id: developer_id,
      }
    );
    if (!balance_data)
      return {
        status: 400,
        message:
          "หักเครดิตไม่สำเร็จ ไม่พบบัญชี Wallet กรุณาติดต่อผู้ให้บริการ",
      };
    const isbalance =
      balance_data.total_balance >= 1500 &&
        balance_data.total_balance - amount >= 1000
        ? true
        : false;
    if (!isbalance)
      return {
        status: 400,
        message:
          "หักเครดิตไม่สำเร็จ เครดิตไม่เพียงพอ กรุณาติดต่อผู้ให้บริการ",
      };

    // credit out
    credit_balance = balance_data.total_balance - amount;
    out = balance_data.total_out + amount;
    is_credit_free = false;
    await Master_Credit_Balance.update(
      createRequest(),
      {
        total_balance: credit_balance,
        total_out: out,
        update_date: new Date(),
      },
      {
        developer_id: developer_id,
      }
    );
    body_obj = {
      body: data_body,
      before: _.omit(balance_data, ["id", "developer_id"]),
    };
  }

  // keep activity to Transaction_Out_Log
  order_code = await generateId("O"); // gen order code
  await Transaction_Out_Log.insert(createRequest(), {
    order_code: order_code,
    type: "out",
    amount: amount,
    status: "สำเร็จ",
    developer_id: developer_id,
  });
  await Transaction_Activity_Log.update(
    createRequest(),
    {
      referance_id: order_code,
      body: JSON.stringify(body_obj),
      is_credit_free: is_credit_free,
      update_date: new Date(),
      description_code: "success",
      description: "สำเร็จ",
      response: "{ status: 200,  message: 'หักเครดิตสำเร็จ'}",
      update_by: "0",
    },
    {
      transaction_id: transaction_id,
      description_code: "pending",
    }
  );

  return {
    status: 200,
    message:
      "หักเครดิตสำเร็จ",
  };
}
