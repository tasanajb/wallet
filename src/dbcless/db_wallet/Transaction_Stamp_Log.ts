import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface ITransaction_Stamp_LogMethod {
  loadByData(data: ITransaction_Stamp_Log): void;
  insert(request: Request): Promise<string | number>;
}

export interface ITransaction_Stamp_Log {
    id?: number;
    order_code?: string;
    type?: string;
    amount?: number;
    create_date?: Date;
    status?: string;
    developer_id?: number;
}

export class Transaction_Stamp_Log implements ITransaction_Stamp_Log, ITransaction_Stamp_LogMethod {
    id?: number;
    order_code?: string;
    type?: string;
    amount?: number;
    create_date?: Date;
    status?: string;
    developer_id?: number;

  static builder: SqlBuilder = new SqlBuilder(
    "Transaction_Stamp_Log",
    {
    id: { name: "Id", type: sql.Int, is_identity: true, is_primary: false },
    order_code: { name: "OrderCode", type: sql.NVarChar, is_identity: false, is_primary: false },
    type: { name: "Type", type: sql.NVarChar, is_identity: false, is_primary: false },
    amount: { name: "Amount", type: sql.Int, is_identity: false, is_primary: false },
    create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    status: { name: "Status", type: sql.NVarChar, is_identity: false, is_primary: false },
    developer_id: { name: "DeveloperId", type: sql.Int, is_identity: false, is_primary: false }
    },
    ["id"],
    ["id","order_code","type","amount","create_date","status","developer_id"]
  );

  constructor(request?: ITransaction_Stamp_Log) {
    if (request != null) {
      this.loadByData(request as ITransaction_Stamp_Log);
    }
  }

  loadByData(data: ITransaction_Stamp_Log): void {
    this.id = data.id;
    this.order_code = data.order_code;
    this.type = data.type;
    this.amount = data.amount;
    this.create_date = data.create_date;
    this.status = data.status;
    this.developer_id = data.developer_id;
  }

  insert(request: Request): Promise<string | number> {
    return Transaction_Stamp_Log.insert(request, {
      id: this.id,
      order_code: this.order_code,
      type: this.type,
      amount: this.amount,
      create_date: this.create_date,
      status: this.status,
      developer_id: this.developer_id,
    });
  }

  static async find(request: Request, condition: ITransaction_Stamp_Log): Promise<Transaction_Stamp_Log[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Transaction_Stamp_Log(item));
  }

  static async findOne(request: Request, condition: ITransaction_Stamp_Log): Promise<Transaction_Stamp_Log> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null as any: new Transaction_Stamp_Log(item);
  }

  static async count(request: Request, condition: ITransaction_Stamp_Log): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: ITransaction_Stamp_Log): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: ITransaction_Stamp_Log, condition: ITransaction_Stamp_Log): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: ITransaction_Stamp_Log): Promise<void> {
      return this.builder.delete(request, condition);
  }
}