import { Request, Response } from "express";
import { createRequest, pool } from "../../config";
import sql from "mssql";
import {
  Transaction_Activity_Log,
  Master_Credit_Balance,
  Transaction_Out_Log,
  Master_Developer,
  Transaction_Stamp_Log,
} from "../../dbcless/db_wallet";

let order_code: string;
let dev_id: number;

export const creditNCB = async (req: Request, res: Response) => {
  let trans = new sql.Transaction(pool);
  let trans_id: string;

  try {
    const { developer_code, amount, is_credit, ncb_id } = req.body;
    trans_id = ncb_id;
    await trans.begin();

    // find developer id by developer code
    const dev_data = await Master_Developer.findOne(createRequest(), {
      developer_code: developer_code,
    });
    if (dev_data) {
      dev_id = dev_data.id;
      // case ncb credit out
      if (is_credit) {
        // check balance account of developer before cal credit
        const balance_data = await Master_Credit_Balance.findOne(
          createRequest(),
          {
            developer_id: dev_id,
          }
        );
        // credit
        if (balance_data) {
          const check_balance =
            balance_data.total_balance >= 1000 &&
              balance_data.total_balance - parseInt(amount) >= 1000
              ? true
              : false;
          if (check_balance) {
            let trans = new sql.Transaction(pool);
            await trans.begin();
            // activity log
            const condition = {
              transaction_id: ncb_id,
              developer_id: dev_id,
              is_credit: is_credit,
              type: "หักเครดิต",
              create_by: "0",
              origin: "/externals/credit/ncb/out",
              description_code: "pending",
              description: "รอดำเนินการ",
            };
            await createTransActivity(req.body, condition);
            // credit out
            const credit_balance =
              balance_data.total_balance - parseInt(amount);
            const out = balance_data.total_out + parseInt(amount);
            await Master_Credit_Balance.update(
              createRequest(),
              {
                total_balance: credit_balance,
                total_out: out,
                update_date: new Date(),
              },
              {
                developer_id: dev_id,
              }
            );
            // keep activity to Transaction_Out_Log
            order_code = await generateId("O"); // gen order code
            const credited = await Transaction_Out_Log.insert(
              createRequest(trans),
              {
                order_code: order_code,
                type: "out",
                amount: amount,
                status: "สำเร็จ",
                developer_id: dev_id,
              }
            );
            //case credit success -- update Transaction_Activity_Log ref order code Transaction_Out_Log
            if (credited) {
              await Transaction_Activity_Log.update(
                createRequest(),
                {
                  referance_id: order_code,
                  update_date: new Date(),
                  description_code: "success",
                  description: "สำเร็จ",
                  response: "{ status: 200,  message: 'หักเครดิตสำเร็จ'}",
                  update_by: "0",
                },
                {
                  developer_id: dev_id,
                  transaction_id: ncb_id,
                }
              );
            }
            await trans.commit();
            res.status(200).send({ status: 200, message: "หักเครดิตสำเร็จ" });
          } else {
            // case balance falid :: balance def, lower 1000
            const condition = {
              transaction_id: ncb_id,
              developer_id: dev_id,
              error_message: "credit lower 1000",
              response:
                "{ status: 400,  message: 'เครดิตไม่เพียงพอ กรุณาติดต่อผู้ให้บริการ'}",
              is_credit: is_credit,
              type: "หักเครดิต",
              create_by: "0",
              origin: "/externals/credit/ncb/out",
              description_code: "failed",
              description: "ไม่สำเร็จ",
            };
            await createTransActivity(req.body, condition);
            res.status(400).send({
              status: 400,
              message:
                "หักเครดิตไม่สำเร็จ เครดิตไม่เพียงพอ กรุณาติดต่อผู้ให้บริการ",
            });
          }
        } else {
          // case credit falid not found credit list
          const condition = {
            transaction_id: ncb_id,
            developer_id: dev_id,
            is_credit: is_credit,
            error_message: "wallet account not found",
            response:
              "{status: 400,  message: 'ไม่พบบัญชี Wallet กรุณาติดต่อผู้ให้บริการ'}",
            type: "หักเครดิต",
            create_by: "0",
            description_code: "failed",
            description: "ไม่สำเร็จ",
            origin: "/externals/credit/ncb/out",
          };
          await createTransActivity(req.body, condition);
          res.status(400).send({
            status: 400,
            message:
              "หักเครดิตไม่สำเร็จ ไม่พบบัญชี Wallet กรุณาติดต่อผู้ให้บริการ",
          });
        }
      } else {
        // case ncb not credit
        const condition = {
          transaction_id: ncb_id,
          developer_id: dev_id,
          is_credit: is_credit,
          type: "หักเครดิต",
          create_by: "0",
          response: "{status: 200,  message: 'หักเครดิตสำเร็จ'}",
          description_code: "success",
          description: "สำเร็จ",
          origin: "/externals/credit/ncb/out",
        };
        await createTransActivity(req.body, condition);
        res.status(200).send({
          status: 200,
          message: "หักเครดิตสำเร็จ",
        });
      }
    } else {
      // // create activity log case not found developer
      // const condition = {
      //   transaction_id: ncb_id,
      //   error_message: "developer not found",
      //   is_credit: is_credit,
      //   type: "หักเครดิต",
      //   create_by: "0",
      //   description_code: "failed",
      //   description: "ไม่สำเร็จ",
      //   origin: "/externals/credit/ncb/out",
      // };
      // await createTransActivity(req.body, condition);
      res.status(400).send({
        status: 400,
        message: "หักเครดิตไม่สำเร็จ กรุณาติดต่อผู้ให้บริการ",
      });
    }
  } catch (error) {
    await Transaction_Activity_Log.update(
      createRequest(trans),
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
    await trans.commit();

    res
      .status(error.status | 500)
      .send({ status: error.status | 500, message: error.message });
  }
};

export const creditLoan = async (req: Request, res: Response) => {
  try {
    const { developer_code, amount, is_credit, loan_id } = req.body;
    // find developer id by developer code
    const dev_data = await Master_Developer.findOne(createRequest(), {
      developer_code: developer_code,
    });
    if (dev_data) {
      dev_id = dev_data.id;
      // case ncb credit out
      if (is_credit) {
        // check balance account of developer before cal credit
        const balance_data = await Master_Credit_Balance.findOne(
          createRequest(),
          {
            developer_id: dev_id,
          }
        );
        // credit
        if (balance_data) {
          const check_balance =
            balance_data.total_balance >= 1000 &&
              balance_data.total_balance - parseInt(amount) >= 1000
              ? true
              : false;
          if (check_balance) {
            let trans = new sql.Transaction(pool);
            await trans.begin();
            // activity log
            const condition = {
              transaction_id: loan_id,
              developer_id: dev_id,
              is_credit: is_credit,
              type: "หักเครดิต",
              create_by: "0",
              origin: "/externals/credit/loan/out",
              description_code: "pending",
              description: "รอดำเนินการ",
            };
            await createTransActivity(req.body, condition);
            // credit out
            const credit_balance =
              balance_data.total_balance - parseInt(amount);
            const out = balance_data.total_out + parseInt(amount);

            await Master_Credit_Balance.update(
              createRequest(),
              {
                total_balance: credit_balance,
                total_out: out,
                update_date: new Date(),
              },
              {
                developer_id: dev_id,
              }
            );
            // keep activity to Transaction_Out_Log
            order_code = await generateId("O"); // gen order code
            const credited = await Transaction_Out_Log.insert(
              createRequest(trans),
              {
                order_code: order_code,
                type: "out",
                amount: amount,
                status: "สำเร็จ",
                developer_id: dev_id,
              }
            );
            //case credit success -- update Transaction_Activity_Log ref order code Transaction_Out_Log
            if (credited) {
              await Transaction_Activity_Log.update(
                createRequest(),
                {
                  referance_id: order_code,
                  update_date: new Date(),
                  description_code: "success",
                  description: "สำเร็จ",
                  response: "{ status: 200,  message: 'หักเครดิตสำเร็จ'}",
                  update_by: "0",
                },
                {
                  developer_id: dev_id,
                  transaction_id: loan_id,
                }
              );
            }
            await trans.commit();
            res.status(200).send({ status: 200, message: "หักเครดิตสำเร็จ" });
          } else {
            // case balance falid :: balance def, lower 1000
            const condition = {
              transaction_id: loan_id,
              developer_id: dev_id,
              error_message: "credit lower 1000",
              response:
                "{ status: 400,  message: 'เครดิตไม่เพียงพอ กรุณาติดต่อผู้ให้บริการ'}",
              is_credit: is_credit,
              type: "หักเครดิต",
              create_by: "0",
              origin: "/externals/credit/loan/out",
              description_code: "failed",
              description: "ไม่สำเร็จ",
            };
            await createTransActivity(req.body, condition);
            res.status(400).send({
              status: 400,
              message: "เครดิตไม่เพียงพอ กรุณาติดต่อผู้ให้บริการ",
            });
          }
        } else {
          // case credit falid not found credit list
          const condition = {
            transaction_id: loan_id,
            developer_id: dev_id,
            is_credit: is_credit,
            error_message: "wallet account not found",
            response:
              "{status: 400,  message: 'ไม่พบบัญชี Wallet กรุณาติดต่อผู้ให้บริการ'}",
            type: "หักเครดิต",
            create_by: "0",
            description_code: "failed",
            description: "ไม่สำเร็จ",
            origin: "/externals/credit/loan/out",
          };
          await createTransActivity(req.body, condition);
          res.status(400).send({
            status: 400,
            message: "ไม่พบบัญชี Wallet กรุณาติดต่อผู้ให้บริการ",
          });
        }
      } else {
        // case loan not credit
        const condition = {
          transaction_id: loan_id,
          developer_id: dev_id,
          is_credit: is_credit,
          type: "หักเครดิต",
          create_by: "0",
          response: "{status: 200,  message: 'หักเครดิตสำเร็จ'}",
          description_code: "success",
          description: "สำเร็จ",
          origin: "/externals/credit/loan/out",
        };
        await createTransActivity(req.body, condition);
        res.status(200).send({
          status: 200,
          message: "หักเครดิตสำเร็จ",
        });
      }
    } else {
      // create activity log case not found developer
      const condition = {
        transaction_id: loan_id,
        error_message: "developer account not found",
        is_credit: is_credit,
        type: "หักเครดิต",
        create_by: "0",
        description_code: "failed",
        description: "ไม่สำเร็จ",
        origin: "/externals/credit/loan/out",
      };
      await createTransActivity(req.body, condition);
      res.status(400).send({
        status: 400,
        message: "หักเครดิตไม่สำเร็จ กรุณาติดต่อผู้ให้บริการ",
      });
    }
  } catch (error) {
    res.status(500).send({ status: 500, message: error.message });
  }
};

export const stampLog = async (req: Request, res: Response) => {
  let trans = new sql.Transaction(pool);
  try {
    await trans.begin();
    const dev_data = await Master_Developer.findOne(createRequest(), {
      developer_code: req.body[0].developer_code,
    });

    for (let i in req.body) {
      await Transaction_Stamp_Log.insert(createRequest(trans), {
        order_code: req.body[i].order_code,
        type: req.body[i].type,
        amount: req.body[i].amount,
        status: "success",
        developer_id: dev_data.id,
      });
    }

    await trans.commit();
    res.status(200).send({ status: 200, message: "บันทึกสำเร็จ" });
  } catch (error) {
    if (trans) {
      await trans.rollback();
    }
    res.status(500).send({ status: 500, message: error.message });
  }
};
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
async function createTransActivity(body: any, condition: any) {
  let trans = new sql.Transaction(pool);
  await trans.begin();
  const create_activity = await Transaction_Activity_Log.insert(
    createRequest(trans),
    {
      ...condition,
      method: "post",
      body: JSON.stringify(body),
    }
  );
  await trans.commit();
  return create_activity;
}
