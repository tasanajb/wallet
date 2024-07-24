import { NextFunction, Request, Response } from "express";
import { snakeCaseKeys } from "../../utility";
import { createRequest, pool } from "../../config";
import sql from "mssql";
import {
  Transaction_Activity_Log,
  Transaction_In_Log,
  Master_Credit_Balance,
} from "../../dbcless/db_wallet";

let order_code: string;
let trans_id: string;

export const addCredit = async (req: Request, res: Response) => {
  try {
    const { user_id, developer_id, amount } = req.body;
    // validata data ....{ }

    trans_id = await generateId("IN"); // gen transection id
    const condition = {
      developer_id: developer_id,
      create_by: user_id,
      type: "เติมเครดิต",
    };
    trans_id
      ? await createTransActivity(req.body, condition)
      : res
        .status(400)
        .send({ status: 400, message: "Can’t generate transection id" });

    order_code = await generateId("I"); // gen order code //
    let updated = order_code // create transection in log //
      ? await createTransIn(developer_id, amount, user_id)
      : res
        .status(400)
        .send({ status: 400, message: "Can’t generate order code" });

    if (updated) await addCreditBalance(developer_id, user_id, amount); // calc credit balance
    res.status(200).send({ status: 200, message: "add credit success" });
  } catch (error) {
    res.status(500).send({ status: 500, message: "error" });
  }
};

export const cancelCredit = async (req: Request, res: Response) => {
  let trans = new sql.Transaction(pool);
  try {
    await trans.begin();
    const { order_code, user_id } = req.body;
    const transection_data = await Transaction_In_Log.findOne(
      createRequest(trans),
      {
        order_code: order_code,
      }
    );
    const balance_data = await Master_Credit_Balance.findOne(
      createRequest(trans),
      {
        developer_id: transection_data.developer_id,
      }
    );
    // cal balance
    const check_balance =
      balance_data.total_balance >= 1000 &&
        balance_data.total_balance - transection_data.amount >= 1000
        ? true
        : false;
    if (check_balance) {
      // create trance activity log
      trans_id = await generateId("OUT");
      const condition = {
        developer_id: transection_data.developer_id,
        create_by: user_id,
        referance_id: order_code,
        type: "ยกเลิกเครดิต",
      };
      await createTransActivity(req.body, condition);
      //  update trance in status
      await Transaction_In_Log.update(
        createRequest(trans),
        {
          status: "ยกเลิก",
        },
        {
          order_code: order_code,
        }
      );

      // remove balance
      const amount = balance_data.total_balance - transection_data.amount;
      const final_total_in = balance_data.total_in - transection_data.amount;
      await Master_Credit_Balance.update(
        createRequest(trans),
        {
          total_balance: amount,
          total_in: final_total_in,
        },
        {
          developer_id: transection_data.developer_id,
        }
      );
      // update trans activity log success
      await Transaction_Activity_Log.update(
        createRequest(trans),
        {
          update_date: new Date(),
          update_by: user_id,
          description_code: "success",
          description: "สำเร็จ",
        },
        {
          transaction_id: trans_id,
          developer_id: transection_data.developer_id,
        }
      );
    } else {
      await trans.commit();
      res.status(400).send({
        status: 400,
        message: "ยกเลิกรายกสรไม่สำเร็จ เงินคงเหลือไม่เพียงพอ",
      });
    }

    await trans.commit();
    res
      .status(200)
      .send({ status: 200, message: "ยกเลิกการเติมเครดิต สำเร็จ" });
  } catch (error) {
    res.status(500).send({ status: 500, message: error.message });
  }
};

export const historys = async (req: Request, res: Response) => {
  try {
    const { developer_id, current_page, per_page } = req.body;
    const developer_q = await createRequest()
      .input("id", sql.Int, developer_id)
      .input("offset", sql.Int, current_page || 1)
      .input("limit", sql.Int, per_page || 10)
      .query(
        `
       SELECT ROW_NUMBER() OVER (ORDER BY log.Id) AS RowId, log.TransactionId, log.CreateDate, log.Type, log.Description, inlog.Amount
              FROM Transaction_Activity_Log log
              INNER JOIN Transaction_In_Log inlog ON log.ReferanceId = inlog.OrderCode
              WHERE log.DeveloperId = @id
              ORDER BY log.CreateDate ASC
                  OFFSET (@offset-1)*@limit ROWS
                  FETCH NEXT @limit ROWS ONLY
                  SET @offset = @offset + 1
      `
      );
    const total_developer_q = await createRequest()
      .input("id", sql.Int, developer_id)
      .query(
        `
          SELECT COUNT(0) AS Total 
          FROM Transaction_Activity_Log log
          INNER JOIN Transaction_In_Log inlog ON log.ReferanceId = inlog.OrderCode
          WHERE log.DeveloperId = @id
        `
      );
    res.status(200).send({
      total: snakeCaseKeys(total_developer_q.recordset[0].Total),
      data: snakeCaseKeys(developer_q.recordset),
    });
  } catch (error) {
    res.status(500).send({ status: 500, message: error.message });
  }
};

export const creditHistorys = async (req: Request, res: Response) => {
  try {
    const { developer_id, current_page, per_page } = req.body;
    const developer_q = await createRequest()
      .input("id", sql.Int, developer_id)
      .input("offset", sql.Int, current_page || 1)
      .input("limit", sql.Int, per_page || 10)
      .query(
        `
        SELECT ROW_NUMBER() OVER (ORDER BY Id) AS RowId
        , OrderCode, CreateDate, Status, Amount
        FROM Transaction_In_Log
          WHERE DeveloperId = @id
          ORDER BY CreateDate ASC
            OFFSET (@offset-1)*@limit ROWS
            FETCH NEXT @limit ROWS ONLY
            SET @offset = @offset + 1
        SELECT COUNT(0) AS Total FROM Transaction_In_Log
      `
      );
    const total_developer_q = await createRequest().query(
      `
        SELECT COUNT(0) AS Total FROM Transaction_In_Log
      `
    );
    res.status(200).send({
      total: snakeCaseKeys(total_developer_q.recordset[0].Total),
      data: snakeCaseKeys(developer_q.recordset),
    });
  } catch (error) {
    res.status(500).send({ status: 500, message: error.message });
  }
};

// gen id format
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

// create transection activity log
async function createTransActivity(body: any, condition: any) {
  let trans = new sql.Transaction(pool);
  await trans.begin();
  const create_activity = await Transaction_Activity_Log.insert(
    createRequest(trans),
    {
      ...condition,
      transaction_id: trans_id,
      description_code: "pending",
      description: "รอดำเนินการ",
      method: "post",
      body: JSON.stringify(body),
    }
  );
  await trans.commit();
  return create_activity;
}

// create transection in log
async function createTransIn(
  developer_id: number,
  amount: number,
  user_id: string
) {
  let trans = new sql.Transaction(pool);
  await trans.begin();
  const add_credit = await Transaction_In_Log.insert(createRequest(trans), {
    order_code: order_code,
    developer_id: developer_id,
    type: "IN",
    amount: amount,
    status: "สำเร็จ",
  });
  // update referance id
  let updated;
  if (add_credit) {
    let condition_update = {
      referance_id: order_code,
    };
    updated = await updateTransActive(developer_id, user_id, condition_update);
  }
  await trans.commit();

  return updated;
}

// update transection activity log
async function updateTransActive(
  dev_id: number,
  user_id: string,
  condition_update: any
) {
  let trans = new sql.Transaction(pool);
  await trans.begin();
  try {
    await Transaction_Activity_Log.update(
      createRequest(),
      {
        ...condition_update,
        update_date: new Date(),
        update_by: user_id,
      },
      {
        transaction_id: trans_id,
        developer_id: dev_id,
      }
    );
    await trans.commit();
    return true;
  } catch (error) {
    return false;
  }
}

// find credit balance
async function getCreditBalance(dev_id: number) {
  let trans = new sql.Transaction(pool);
  await trans.begin();
  const dev = await Master_Credit_Balance.findOne(createRequest(trans), {
    developer_id: dev_id,
  });
  await trans.commit();
  return dev;
}

// calc credit balance
async function addCreditBalance(
  dev_id: number,
  user_id: string,
  amount: number
) {
  let trans = new sql.Transaction(pool);
  await trans.begin();
  const balance = await getCreditBalance(dev_id); // check credit balance
  if (!balance) {
    // create balance
    await Master_Credit_Balance.insert(createRequest(trans), {
      developer_id: dev_id,
      total_balance: amount,
      total_in: amount,
      total_out: 0,
    });
    // update activity log staus success
    let condition_update = {
      description_code: "success",
      description: "สำเร็จ",
    };
    await updateTransActive(dev_id, user_id, condition_update);
  } else {
    // update balance
    let total_balance = balance.total_balance + amount;
    let total_in = balance.total_in + amount;
    await Master_Credit_Balance.update(
      createRequest(trans),
      {
        developer_id: dev_id,
        total_balance: total_balance,
        total_in: total_in,
        update_date: new Date(),
      },
      {
        developer_id: dev_id,
      }
    );
    // update activity log staus success
    let condition_update = {
      description_code: "success",
      description: "สำเร็จ",
    };
    await updateTransActive(dev_id, user_id, condition_update);
  }
  await trans.commit();
  return true;
}
