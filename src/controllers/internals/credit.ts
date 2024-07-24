import { NextFunction, Request, Response } from "express";
import { snakeCaseKeys } from "../../utility";
import { createRequest, pool } from "../../config";
import sql from "mssql";
import _ from "lodash";
import {
  Transaction_Activity_Log,
  Transaction_In_Log,
  Master_Credit_Balance,
  Master_Credit_Free,
} from "../../dbcless/db_wallet";

let order_code: string;
let trans_id: string;

export const addCredit = async (req: Request, res: Response) => {
  try {
    const { user_id, developer_id, amount } = req.body;
    trans_id = await generateId("IN"); // gen transection id
    if (!trans_id)
      throw { status: 400, message: "Can’t generate transection id" };

    const credit_data = await Master_Credit_Balance.findOne(
      createRequest(),
      {
        developer_id: developer_id,
      }
    );
    const body_obj = {
      body: req.body,
      before: _.omit(credit_data, ["id", "developer_id"]),
    };
    await Transaction_Activity_Log.insert(createRequest(), {
      transaction_id: trans_id,
      developer_id: developer_id,
      is_credit: false,
      type: "เติมเครดิต",
      method: "post",
      origin: req.originalUrl,
      header: JSON.stringify(req.headers),
      body: JSON.stringify(body_obj),
      description_code: "pending",
      description: "รอดำเนินการ",
      create_by: user_id,
    });

    order_code = await generateId("I"); // gen order code //
    if (!order_code)
      throw { status: 400, message: "Can’t generate order code" };

    await Transaction_In_Log.insert(createRequest(), {
      order_code: order_code,
      developer_id: developer_id,
      type: "IN",
      amount: amount,
      status: "สำเร็จ",
    });

    if (!credit_data) {
      // create balance
      await Master_Credit_Balance.insert(createRequest(), {
        developer_id: developer_id,
        total_balance: amount,
        total_in: amount,
        total_out: 0,
      });
    } else {
      // update balance
      let total_balance = credit_data.total_balance + amount;
      let total_in = credit_data.total_in + amount;
      await Master_Credit_Balance.update(
        createRequest(),
        {
          developer_id: developer_id,
          total_balance: total_balance,
          total_in: total_in,
          update_date: new Date(),
        },
        {
          developer_id: developer_id,
        }
      );
    }

    await Transaction_Activity_Log.update(
      createRequest(),
      {
        referance_id: order_code,
        response: "{ status: 200, message: 'เพิ่มเครดิตสำเร็จ' }",
        description_code: "success",
        description: "สำเร็จ",
        update_by: user_id,
        update_date: new Date(),
      },
      {
        transaction_id: trans_id,
      }
    );

    res.status(200).send({ status: 200, message: "เพิ่มเครดิตสำเร็จ" });
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
      }
    );

    res
      .status(500)
      .send({ status: error.status | 500, message: error.message });
  }
};

export const cancelCredit = async (req: Request, res: Response) => {
  try {
    const { order_code, user_id } = req.body;

    const log_in_data = await Transaction_In_Log.findOne(createRequest(), {
      order_code: order_code,
    });
    const balance_data = await Master_Credit_Balance.findOne(
      createRequest(),
      {
        developer_id: log_in_data?.developer_id,
      }
    );

    if (!log_in_data || !balance_data) {
      throw {
        status: 400,
        message: "ไม่พบรายการที่ต้องการยกเลิก",
      };
    }

    trans_id = await generateId("CXL");
    if (!trans_id)
      throw { status: 400, message: "Can’t generate transection id" };

    const body_obj = {
      body: req.body,
      before: _.omit(balance_data, ["id", "developer_id"]),
    };
    await Transaction_Activity_Log.insert(createRequest(), {
      transaction_id: trans_id,
      developer_id: log_in_data.developer_id,
      is_credit: false,
      type: "ยกเลิกเครดิต",
      method: "post",
      origin: req.originalUrl,
      header: JSON.stringify(req.headers),
      body: JSON.stringify(body_obj),
      description_code: "pending",
      description: "รอดำเนินการ",
      create_by: user_id,
    });
    if (log_in_data.status === "ยกเลิก")
      throw {
        status: 400,
        message: "รายการนี้ถูกยกเลิกแล้ว",
      };

    // cal balance
    const isbalance =
      balance_data.total_balance >= 1000 &&
        balance_data.total_balance - log_in_data.amount >= 1000
        ? true
        : false;
    if (!isbalance)
      throw {
        status: 400,
        message: "ยกเลิกรายการไม่สำเร็จ เงินคงเหลือไม่เพียงพอ",
      };
    //  update trance in status
    await Transaction_In_Log.update(
      createRequest(),
      {
        status: "ยกเลิก",
      },
      {
        order_code: order_code,
      }
    );
    // remove balance
    const amount = balance_data.total_balance - log_in_data.amount;
    const final_total_in = balance_data.total_in - log_in_data.amount;
    await Master_Credit_Balance.update(
      createRequest(),
      {
        total_balance: amount,
        total_in: final_total_in,
      },
      {
        developer_id: log_in_data.developer_id,
      }
    );
    // update trans activity log success
    await Transaction_Activity_Log.update(
      createRequest(),
      {
        response: "{ status: 200, message: 'ยกเลิกการเติมเครดิต สำเร็จ' }",
        referance_id: order_code,
        update_date: new Date(),
        update_by: user_id,
        description_code: "success",
        description: "สำเร็จ",
      },
      {
        transaction_id: trans_id,
        developer_id: log_in_data.developer_id,
      }
    );

    res
      .status(200)
      .send({ status: 200, message: "ยกเลิกการเติมเครดิต สำเร็จ" });
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
      }
    );

    res
      .status(error.status | 500)
      .send({ status: error.status | 500, message: error.message });
  }
};

export const history = async (req: Request, res: Response) => {
  try {
    const { developer_id, current_page, per_page } = req.body;
    const developer_q: any = await createRequest()
      .input("id", sql.Int, developer_id)
      .input("offset", sql.Int, current_page || 1)
      .input("limit", sql.Int, per_page || 10)
      .query(
        `CREATE TABLE #templactivity (Id INT, TransactionId NVARCHAR(100),CreateDate DATETIME, Type NVARCHAR(50), Description NVARCHAR(100), Amount INT)
        INSERT INTO #templactivity (Id, TransactionId, CreateDate, Type, Description, Amount)
        SELECT ROW_NUMBER() OVER (ORDER BY Id) AS Id, TransactionId, CreateDate, Type, Description, Amount
        FROM (
            SELECT log.Id, log.TransactionId, log.CreateDate, log.Type, log.Description, inlog.Amount
            FROM Transaction_Activity_Log log
            INNER JOIN Transaction_In_Log inlog ON log.ReferanceId = inlog.OrderCode
            WHERE log.DeveloperId = @id AND log.Type IN('ยกเลิกเครดิต','เติมเครดิต')
        
            UNION ALL
        
            SELECT log.Id, log.TransactionId, log.CreateDate, log.Type, log.Description, outlog.Amount
            FROM Transaction_Activity_Log log
            INNER JOIN Transaction_Out_Log outlog ON log.ReferanceId = outlog.OrderCode
            WHERE log.DeveloperId = @id AND log.Type LIKE'หักเครดิต%' AND log.IsCredit = 1 AND log.IsCreditFree = 0     
        )T
        ORDER BY CreateDate desc
        
        SELECT Id as RowId, TransactionId, CreateDate, Type, Description, Amount
        FROM #templactivity
        ORDER BY CreateDate desc
        OFFSET (@offset-1)*@limit ROWS
        FETCH NEXT @limit ROWS ONLY
        SET @offset = @offset + 1
                          
        SELECT COUNT(0) AS Total
        FROM #templactivity
        
        DROP TABLE #templactivity
      `
      );
    
    res.status(200).send({
      total: snakeCaseKeys(developer_q.recordsets[1][0].Total),
      data: snakeCaseKeys(developer_q.recordsets[0]),
    });
  } catch (error) {
    res.status(500).send({ status: 500, message: error.message });
  }
};

export const creditHistory = async (req: Request, res: Response) => {
  try {
    const { developer_id, current_page, per_page } = req.body;
    const developer_q: any = await createRequest()
      .input("id", sql.Int, developer_id)
      .input("offset", sql.Int, current_page || 1)
      .input("limit", sql.Int, per_page || 10)
      .query(
        `
        SELECT ROW_NUMBER() OVER (ORDER BY Id) AS RowId
        , OrderCode, CreateDate, Status, Amount
        FROM Transaction_In_Log
          WHERE DeveloperId = @id AND Type = 'IN'
          ORDER BY CreateDate DESC
            OFFSET (@offset-1)*@limit ROWS
            FETCH NEXT @limit ROWS ONLY
            SET @offset = @offset + 1
        
        SELECT COUNT(0) AS Total FROM Transaction_In_Log WHERE DeveloperId = @id AND Type = 'IN'
      `
      );
    res.status(200).send({
      total: snakeCaseKeys(developer_q.recordsets[1][0].Total),
      data: snakeCaseKeys(developer_q.recordsets[0]),
    });
  } catch (error) {
    res.status(500).send({ status: 500, message: error.message });
  }
};

//credit free
export const addCreditFree = async (req: Request, res: Response) => {
  try {
    const { user_id, developer_id, amount, credit_expire } = req.body;
    trans_id = await generateId("IN"); // gen transection id
    if (!trans_id)
      throw { status: 400, message: "Can’t generate transection id" };

    const credit_data = await Master_Credit_Free.findOne(
      createRequest(),
      {
        developer_id: developer_id,
      }
    );
    const body_obj = {
      body: req.body,
      before: _.omit(credit_data, ["id", "developer_id"]),
    };
    await Transaction_Activity_Log.insert(createRequest(), {
      transaction_id: trans_id,
      developer_id: developer_id,
      is_credit: false,
      type: "เติมเครดิตฟรี",
      method: "post",
      origin: req.originalUrl,
      header: JSON.stringify(req.headers),
      body: JSON.stringify(body_obj),
      description_code: "pending",
      description: "รอดำเนินการ",
      create_by: String(user_id),
    });

    order_code = await generateId("I"); // gen order code //
    if (!order_code)
      throw { status: 400, message: "Can’t generate order code" };

    await Transaction_In_Log.insert(createRequest(), {
      order_code: order_code,
      developer_id: developer_id,
      type: "INF",
      amount: amount,
      status: "สำเร็จ",
    });

    if (!credit_data) {
      // create balance
      await Master_Credit_Free.insert(createRequest(), {
        developer_id: developer_id,
        total_balance: amount,
        total_in: amount,
        total_out: 0,
        expired_date: credit_expire
      });
    } else {
      // update balance
      let total_balance = credit_data.total_balance + amount;
      let total_in = credit_data.total_in + amount;
      await Master_Credit_Free.update(
        createRequest(),
        {
          developer_id: developer_id,
          total_balance: total_balance,
          total_in: total_in,
          expired_date: credit_expire,
          update_date: new Date(),
        },
        {
          developer_id: developer_id,
        }
      );
    }

    await Transaction_Activity_Log.update(
      createRequest(),
      {
        referance_id: order_code,
        response: "{ status: 200, message: 'เพิ่มเครดิตฟรีสำเร็จ' }",
        description_code: "success",
        description: "สำเร็จ",
        update_by: String(user_id),
        update_date: new Date(),
      },
      {
        transaction_id: trans_id,
      }
    );

    res.status(200).send({ status: 200, message: "เพิ่มเครดิตฟรีสำเร็จ" });
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
      }
    );

    res
      .status(500)
      .send({ status: error.status | 500, message: error.message });
  }
};

export const cancelCreditFree = async (req: Request, res: Response) => {
  try {
    const { order_code, user_id } = req.body;

    const log_in_data = await Transaction_In_Log.findOne(createRequest(), {
      order_code: order_code,
    });

    const balance_data = await Master_Credit_Free.findOne(
      createRequest(),
      {
        developer_id: log_in_data?.developer_id,
      }
    );

    if (!log_in_data || !balance_data) {
      throw {
        status: 400,
        message: "ไม่พบรายการที่ต้องการยกเลิก",
      };
    }

    trans_id = await generateId("CXL");
    if (!trans_id)
      throw { status: 400, message: "Can’t generate transection id" };

    const body_obj = {
      body: req.body,
      before: _.omit(balance_data, ["id", "developer_id"]),
    };
    await Transaction_Activity_Log.insert(createRequest(), {
      transaction_id: trans_id,
      developer_id: log_in_data.developer_id,
      is_credit: false,
      type: "ยกเลิกเครดิตฟรี",
      method: "post",
      origin: req.originalUrl,
      header: JSON.stringify(req.headers),
      body: JSON.stringify(body_obj),
      description_code: "pending",
      description: "รอดำเนินการ",
      create_by: String(user_id),
    });
    if (log_in_data.status === "ยกเลิก")
      throw {
        status: 400,
        message: "รายการนี้ถูกยกเลิกแล้ว",
      };

    const amount = balance_data.total_balance - log_in_data.amount;
    if (amount < 0) {
      throw {
        status: 400,
        message: "ยกเลิกรายการไม่สำเร็จ เครดิตฟรีคงเหลือไม่เพียงพอ",
      };
    }

    //  update trance in status
    await Transaction_In_Log.update(
      createRequest(),
      {
        status: "ยกเลิก",
      },
      {
        order_code: order_code,
      }
    );
    // remove balance
    const final_total_in = balance_data.total_in - log_in_data.amount;
    await Master_Credit_Free.update(
      createRequest(),
      {
        total_balance: amount,
        total_in: final_total_in,
      },
      {
        developer_id: log_in_data.developer_id,
      }
    );
    // update trans activity log success
    await Transaction_Activity_Log.update(
      createRequest(),
      {
        response: "{ status: 200, message: 'ยกเลิกการเติมเครดิต สำเร็จ' }",
        referance_id: order_code,
        update_date: new Date(),
        update_by: String(user_id),
        description_code: "success",
        description: "สำเร็จ",
      },
      {
        transaction_id: trans_id,
        developer_id: log_in_data.developer_id,
      }
    );

    res
      .status(200)
      .send({ status: 200, message: "ยกเลิกการเติมเครดิตฟรี สำเร็จ" });
  } catch (error) {
    await Transaction_Activity_Log.update(
      createRequest(),
      {
        error_message: error.message,
        description_code: "failed",
        description: "ยกเลิกการเติมเครดิตฟรี ไม่สำเร็จ",
        update_date: new Date(),
      },
      {
        transaction_id: trans_id,
      }
    );

    res
      .status(error.status | 500)
      .send({ status: error.status | 500, message: error.message });
  }
};

export const changExpiredCreditFree = async (req: Request, res: Response) => {
  try {
    const { user_id, developer_id, credit_expire } = req.body;
    trans_id = await generateId("EXP"); // gen transection id
    if (!trans_id)
      throw { status: 400, message: "Can’t generate transection id" };

    const credit_data = await Master_Credit_Free.findOne(
      createRequest(),
      {
        developer_id: developer_id,
      }
    );
    
    if (!credit_data) {
      return res
      .status(400)
      .send({ status: 400, message: "ไม่พบข้อมูลเครดิตฟรี" });
    }

    const body_obj = {
      body: req.body,
      before: _.omit(credit_data, ["id", "developer_id"]),
    };

    await Transaction_Activity_Log.insert(createRequest(), {
      transaction_id: trans_id,
      developer_id: developer_id,
      is_credit: false,
      type: "เปลี่ยนวันหมดอายุเครดิตฟรี",
      method: "post",
      origin: req.originalUrl,
      header: JSON.stringify(req.headers),
      body: JSON.stringify(body_obj),
      description_code: "pending",
      description: "รอดำเนินการ",
      create_by: String(user_id),
    });

    await Master_Credit_Free.update(
      createRequest(),
      {
        expired_date: credit_expire,
        update_date: new Date(),
      },
      {
        developer_id: developer_id,
      }
    );

    await Transaction_Activity_Log.update(
      createRequest(),
      {
        response: "{ status: 200, message: เปลี่ยนวันหมดอายุเครดิตฟรี สำเร็จ' }",
        description_code: "success",
        description: "สำเร็จ",
        update_by: String(user_id),
        update_date: new Date(),
      },
      {
        transaction_id: trans_id,
      }
    );

    res.status(200).send({ status: 200, message: "เปลี่ยนวันหมดอายุเครดิตฟรี สำเร็จ" });
  } catch (error) {
    await Transaction_Activity_Log.update(
      createRequest(),
      {
        error_message: error.message,
        description_code: "failed",
        description: "เปลี่ยนวันหมดอายุเครดิตฟรี ไม่สำเร็จ",
        update_date: new Date(),
      },
      {
        transaction_id: trans_id,
      }
    );

    res
      .status(500)
      .send({ status: error.status | 500, message: error.message });
  }
};

export const historyCreditFree = async (req: Request, res: Response) => {
  try {
    const { developer_id, current_page, per_page } = req.body;
    const developer_q: any = await createRequest()
      .input("id", sql.Int, developer_id)
      .input("offset", sql.Int, current_page || 1)
      .input("limit", sql.Int, per_page || 10)
      .query(`   
      CREATE TABLE #templactivity (Id INT, TransactionId NVARCHAR(100),CreateDate DATETIME, Type NVARCHAR(50), Description NVARCHAR(100), Amount INT)
      INSERT INTO #templactivity (Id, TransactionId, CreateDate, Type, Description, Amount)
      SELECT ROW_NUMBER() OVER (ORDER BY Id) AS Id, TransactionId, CreateDate, Type, Description, Amount
      FROM (
          SELECT log.Id, log.TransactionId, log.CreateDate, REPLACE(log.Type,'ฟรี','') as Type, log.Description, inlog.Amount
          FROM Transaction_Activity_Log log
          INNER JOIN Transaction_In_Log inlog ON log.ReferanceId = inlog.OrderCode
          WHERE log.DeveloperId = @id AND log.Type IN('ยกเลิกเครดิตฟรี','เติมเครดิตฟรี')
      
          UNION ALL
      
          SELECT log.Id, log.TransactionId, log.CreateDate, log.Type, log.Description, 1 as Amount
          FROM Transaction_Activity_Log log
          INNER JOIN Transaction_Out_Log outlog ON log.ReferanceId = outlog.OrderCode
          WHERE log.DeveloperId = @id AND log.Type LIKE'หักเครดิต%' AND log.IsCredit = 1 AND log.IsCreditFree = 1     
      )T
      ORDER BY CreateDate desc
      
      SELECT Id as RowId, TransactionId, CreateDate, Type, Description, Amount
      FROM #templactivity
      ORDER BY CreateDate desc
      OFFSET (@offset-1)*@limit ROWS
      FETCH NEXT @limit ROWS ONLY
      SET @offset = @offset + 1
                        
      SELECT COUNT(0) AS Total
      FROM #templactivity
      
      DROP TABLE #templactivity
      `
      );

    res.status(200).send({
      total: snakeCaseKeys(developer_q.recordsets[1][0].Total),
      data: snakeCaseKeys(developer_q.recordsets[0]),
    });
  } catch (error) {
    res.status(500).send({ status: 500, message: error.message });
  }
};

export const historysCreditFreeForAdmin = async (req: Request, res: Response) => {
  try {
    const { developer_id, current_page, per_page } = req.body;
    const developer_q: any = await createRequest()
      .input("id", sql.Int, developer_id)
      .input("offset", sql.Int, current_page || 1)
      .input("limit", sql.Int, per_page || 10)
      .query(
        `
        SELECT ROW_NUMBER() OVER (ORDER BY Id) AS RowId
        , OrderCode, CreateDate, Status, Amount
        FROM Transaction_In_Log
          WHERE DeveloperId = @id AND Type = 'INF'
          ORDER BY CreateDate DESC
            OFFSET (@offset-1)*@limit ROWS
            FETCH NEXT @limit ROWS ONLY
            SET @offset = @offset + 1
        
        SELECT COUNT(0) AS Total FROM Transaction_In_Log WHERE DeveloperId = @id AND Type = 'INF'
      `
      );
    res.status(200).send({
      total: snakeCaseKeys(developer_q.recordsets[1][0].Total),
      data: snakeCaseKeys(developer_q.recordsets[0]),
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
