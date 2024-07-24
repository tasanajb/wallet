import { NextFunction, Request, Response } from "express";
import { snakeCaseKeys } from "../../utility";
import { createRequest } from "../../config";
import sql from "mssql";

export const getDevelopers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const developer_data = await getDeveloperList();
    res.status(200).send({
      status: 200,
      message: "success",
      data: {
        ...req.auth,
        developer_data,
      },
    });
  } catch (error) {
    res.status(500).send({ status: 500, message: "error" });
  }
};
export const getDeveloperDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { developer_id } = req.body;
    const developer_detail = await getDeveloper(developer_id);
    res.status(200).send({
      status: 200,
      message: "success",
      data: developer_detail,
    });
  } catch (error) {
    res.status(500).send({ status: 500, message: "error" });
  }
};
async function getDeveloperList() {
  const developer_list_q = await createRequest().query(
    ` SELECT dev.Id, dev.DeveloperCode, dev.DeveloperName, dev.DeveloperImageUrl 
            FROM  Master_Developer dev 
            WHERE IsActive = 1
        `
  );
  return await snakeCaseKeys(developer_list_q.recordset);
}
async function getDeveloper(dev_id: number) {
  const developer_q = await createRequest()
    .input("id", sql.Int, dev_id)
    .query(
      `
        SELECT dev.DeveloperCode, dev.DeveloperName, dev.DeveloperImageUrl,
        balance.TotalBalance, balance.UpdateDate,
        free.TotalBalance as TotalBalanceFree, free.UpdateDate as UpdateDateFree, 
        free.ExpiredDate as CreditExpire
        FROM  Master_Developer dev
        LEFT JOIN Master_Credit_Balance balance ON dev.Id = balance.DeveloperId
        LEFT JOIN Master_Credit_Free free ON free.DeveloperId = dev.Id
        WHERE dev.Id = @id AND IsActive = 1
    `
    );

  const countState_q = await createRequest()
    .input("id", sql.Int, dev_id)
    .query(
      `  
        SELECT  COUNT(CASE WHEN a.DescriptionCode = 'success' THEN 1 END) AS 'success',
                COUNT(CASE WHEN a.DescriptionCode = 'pending' THEN 1 END) AS 'pending',
                COUNT(CASE WHEN a.DescriptionCode = 'cancel' THEN 1 END) AS 'cancel'
        FROM Transaction_Activity_Log  a
          WHERE a.DeveloperId = @id
    `
    );

  const current_year: string = String(new Date().getFullYear());
  const activity_dashboard: any = await createRequest()
    .input("developer_id", sql.Int, dev_id)
    .input("year", sql.NVarChar, current_year)
    .query(`
        CREATE TABLE #tempdate (Month NVarChar(50), CreditTotal INT, Type NVARCHAR(50), MonthNumber INT);
        INSERT INTO #tempdate (Month, CreditTotal, Type, MonthNumber)
        VALUES    ('มกราคม',0,'',1),
                  ('กุมภาพันธ์',0,'',2),
                  ('มีนาคม',0,'',3),
                  ('เมษายน',0,'',4),
                  ('พฤษภาคม',0,'',5),
                  ('มิถุนายน',0,'',6),
                  ('กรกฎาคม',0,'',7),
                  ('สิงหาคม',0,'',8),
                  ('กันยายน',0,'',9),
                  ('ตุลาคม',0,'',10),
                  ('พฤษจิกายน',0,'',11),
                  ('ธันวาคม',0,'',12)
   
        --credit in year
        CREATE TABLE #tempcredit (Month NVarChar(50), Value INT, Type NVARCHAR(50), MonthNumber INT);
        INSERT INTO #tempcredit (Month, Value, Type, MonthNumber)
        SELECT Month, Value, Type , MonthNumber
        FROM(   
            SELECT Month, SUM(CreditTotal) as Value, Type, MonthNumber 
            FROM (
              SELECT FORMAT(CreateDate, 'MMMM', 'th-TH') as Month, SUM(Amount) as CreditTotal, '1' as Type, MONTH(CreateDate) as MonthNumber
              FROM Transaction_In_Log
              WHERE Status <> 'ยกเลิก' AND Type = 'IN' AND YEAR(CreateDate) =  @year AND DeveloperId = @developer_id
              GROUP BY MONTH(CreateDate), FORMAT(CreateDate, 'MMMM', 'th-TH')
   
              UNION ALL
   
              SELECT Month, CreditTotal,CASE WHEN ISNULL(Type, '') != '' THEN Type ELSE '1' END, MonthNumber 
              FROM #tempdate
            )I
            GROUP BY I.MonthNumber, I.Month, I.Type
   
            UNION
   
            SELECT Month, SUM(o.CreditTotal) as Value, Type, MonthNumber 
            FROM (
              SELECT FORMAT(o.CreateDate, 'MMMM', 'th-TH') as Month, SUM(o.Amount) as CreditTotal, '2' as Type, MONTH(o.CreateDate) as MonthNumber
              FROM Transaction_Out_Log o 
              INNER JOIN Transaction_Activity_Log a ON a.ReferanceId = o.OrderCode AND a.IsCredit = 1 AND ISNULL(a.IsCreditFree, 0) = 0
              WHERE o.Status = 'สำเร็จ'  AND YEAR(o.CreateDate) = @year AND o.DeveloperId = @developer_id AND a.DescriptionCode ='success'
              GROUP BY MONTH(o.CreateDate), FORMAT(o.CreateDate, 'MMMM', 'th-TH')
   
              UNION ALL
   
              SELECT Month, CreditTotal, CASE WHEN ISNULL(Type, '') != '' THEN Type ELSE '2' END, MonthNumber 
              FROM #tempdate
            )O
            GROUP BY O.MonthNumber, O.Month, O.Type
        )T
   
        --credit free in year
        CREATE TABLE #tempcreditfree (Month NVarChar(50), Value INT, Type NVARCHAR(50), MonthNumber INT);
        INSERT INTO #tempcreditfree (Month, Value, Type, MonthNumber)
        SELECT Month, Value, Type , MonthNumber
        FROM(   
            SELECT Month, SUM(CreditTotal) as Value, Type, MonthNumber 
            FROM (
              SELECT FORMAT(CreateDate, 'MMMM', 'th-TH') as Month, SUM(Amount) as CreditTotal, '1' as Type, MONTH(CreateDate) as MonthNumber
              FROM Transaction_In_Log
              WHERE Status <> 'ยกเลิก' AND Type = 'INF' AND YEAR(CreateDate) =  @year AND DeveloperId = @developer_id
              GROUP BY MONTH(CreateDate), FORMAT(CreateDate, 'MMMM', 'th-TH')
   
              UNION ALL
   
              SELECT Month, CreditTotal,CASE WHEN ISNULL(Type, '') != '' THEN Type ELSE '1' END, MonthNumber 
              FROM #tempdate
            )I
            GROUP BY I.MonthNumber, I.Month, I.Type
   
            UNION
   
            SELECT Month, SUM(o.CreditTotal) as Value, Type, MonthNumber 
            FROM (
              SELECT FORMAT(o.CreateDate, 'MMMM', 'th-TH') as Month,  count(o.Id) as CreditTotal, '2' as Type, MONTH(o.CreateDate) as MonthNumber
              FROM Transaction_Out_Log o 
              INNER JOIN Transaction_Activity_Log a ON a.ReferanceId = o.OrderCode AND a.IsCredit = 1 AND ISNULL(a.IsCreditFree, 0) = 1
              WHERE o.Status = 'สำเร็จ'  AND YEAR(o.CreateDate) = @year AND o.DeveloperId = @developer_id AND a.DescriptionCode ='success'
              GROUP BY MONTH(o.CreateDate), FORMAT(o.CreateDate, 'MMMM', 'th-TH')
   
              UNION ALL
   
              SELECT Month, CreditTotal, CASE WHEN ISNULL(Type, '') != '' THEN Type ELSE '2' END, MonthNumber 
              FROM #tempdate
            )O
            GROUP BY O.MonthNumber, O.Month, O.Type
        )T
  
        -- credit 
        SELECT Month, Value, CASE WHEN Type = '1' THEN 'เครดิตที่เติม' WHEN Type = '2' THEN 'เครดิตที่ใช้' ELSE '' END as Type FROM #tempcredit 
        ORDER BY MonthNumber, Type asc
  
        SELECT SUM(CreditTotalIn) AS CreditTotalIn, SUM(CreditTotalOut) as CreditTotalOut FROM(
        SELECT CASE WHEN Type = '1' THEN SUM(Value) ELSE 0 END as CreditTotalIn , CASE WHEN Type = '2' THEN SUM(Value) ELSE 0 END as CreditTotalOut FROM #tempcredit
        GROUP BY Type
      )T
  
        -- credit free
        SELECT Month, Value, CASE WHEN Type = '1' THEN 'เครดิตฟรีที่เติม' WHEN Type = '2' THEN 'เครดิตฟรีที่ใช้' ELSE '' END as Type FROM #tempcreditfree
        ORDER BY MonthNumber, Type asc
  
        SELECT SUM(CreditTotalIn) AS CreditTotalIn, SUM(CreditTotalOut) as CreditTotalOut 
        FROM(
        SELECT CASE WHEN Type = '1' THEN SUM(Value) ELSE 0 END as CreditTotalIn , CASE WHEN Type = '2' THEN SUM(Value) ELSE 0 END as CreditTotalOut FROM #tempcreditfree
        GROUP BY Type
        )T
  
        --total credit all year
        SELECT TotalIn as CreditTotalIn, TotalOut as CreditTotalOut, TotalBalance as CreditTotalBalance
        FROM Master_Credit_Balance 
        WHERE DeveloperId = @developer_id
  
        --total credit free all year
        SELECT TotalIn as CreditFreeTotalIn, TotalOut as CreditFreeTotalOut, TotalBalance as CreditFreeTotalBalance 
        FROM Master_Credit_Free 
        WHERE DeveloperId = @developer_id
  
        DROP TABLE #tempdate, #tempcredit, #tempcreditfree
  
    `);

  const email_q = await createRequest()
    .input("developer_id", sql.Int, dev_id)
    .query(`
    SELECT e.EmailTo, e.EmailCc, e.SendDate
    FROM Master_Email e
    INNER JOIN Master_Developer d ON e.DeveloperCode = d.DeveloperCode 
    WHERE d.Id = @developer_id      
`)

  let email = snakeCaseKeys(email_q.recordset[0]);
  let credit = snakeCaseKeys(activity_dashboard?.recordsets[4][0]);
  let credit_free = snakeCaseKeys(activity_dashboard?.recordsets[5][0]);
  let data = {
    dev: snakeCaseKeys(developer_q.recordset[0]),
    dashboard: {
      success: countState_q?.recordset[0]?.success || 0,
      cancel: countState_q?.recordset[0]?.cancel || 0,
      pending: countState_q?.recordset[0]?.pending || 0,
      credit_total_in: credit?.credit_total_in || 0,
      credit_total_out: credit?.credit_total_out || 0,
      credit_total_balance: credit?.credit_total_balance || 0,
      credit_free_total_in: credit_free?.credit_free_total_in || 0,
      credit_free_total_out: credit_free?.credit_free_total_out || 0,
      credit_free_total_balance: credit_free?.credit_free_total_balance || 0,
      credit: {
        credit: {
          year: current_year,
          credit_total_in: snakeCaseKeys(activity_dashboard?.recordsets[1][0])?.credit_total_in || 0,
          credit_total_out: snakeCaseKeys(activity_dashboard?.recordsets[1][0])?.credit_total_out || 0,
          data: snakeCaseKeys(activity_dashboard?.recordsets[0]) || []
        },
        credit_free: {
          year: current_year,
          credit_total_in: snakeCaseKeys(activity_dashboard?.recordsets[3][0])?.credit_total_in || 0,
          credit_total_out: snakeCaseKeys(activity_dashboard?.recordsets[3][0])?.credit_total_out || 0,
          data: snakeCaseKeys(activity_dashboard?.recordsets[2]) || []
        },
      }
    },
    email: {
      email_to: email?.email_to || "",
      email_cc: email?.email_cc || "",
      send_date: email?.send_date || ""
    }
  };

  return data;
}
