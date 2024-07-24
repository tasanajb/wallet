import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface ITransaction_Activity_LogMethod {
  load(request: Request, id: number | ITransaction_Activity_Log): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: ITransaction_Activity_Log): void;
  insert(request: Request): Promise<string | number>;
}

export interface ITransaction_Activity_Log {
    id?: number;
    transaction_id?: string;
    developer_id?: number;
    referance_id?: string;
    is_credit?: boolean;
    is_credit_free?: boolean;
    type?: string;
    method?: string;
    origin?: string;
    header?: string;
    body?: string;
    response?: string;
    description_code?: string;
    description?: string;
    error_message?: string;
    create_date?: Date;
    update_date?: Date;
    create_by?: string;
    update_by?: string;
}

export class Transaction_Activity_Log implements ITransaction_Activity_Log, ITransaction_Activity_LogMethod {
    id?: number;
    transaction_id?: string;
    developer_id?: number;
    referance_id?: string;
    is_credit?: boolean;
    is_credit_free?: boolean;
    type?: string;
    method?: string;
    origin?: string;
    header?: string;
    body?: string;
    response?: string;
    description_code?: string;
    description?: string;
    error_message?: string;
    create_date?: Date;
    update_date?: Date;
    create_by?: string;
    update_by?: string;

  static builder: SqlBuilder = new SqlBuilder(
    "Transaction_Activity_Log",
    {
    id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
    transaction_id: { name: "TransactionId", type: sql.NVarChar, is_identity: false, is_primary: false },
    developer_id: { name: "DeveloperId", type: sql.Int, is_identity: false, is_primary: false },
    referance_id: { name: "ReferanceId", type: sql.NVarChar, is_identity: false, is_primary: false },
    is_credit: { name: "IsCredit", type: sql.Bit, is_identity: false, is_primary: false },
    is_credit_free: { name: "IsCreditFree", type: sql.Bit, is_identity: false, is_primary: false },
    type: { name: "Type", type: sql.NVarChar, is_identity: false, is_primary: false },
    method: { name: "Method", type: sql.NVarChar, is_identity: false, is_primary: false },
    origin: { name: "Origin", type: sql.NVarChar, is_identity: false, is_primary: false },
    header: { name: "Header", type: sql.NVarChar, is_identity: false, is_primary: false },
    body: { name: "Body", type: sql.NVarChar, is_identity: false, is_primary: false },
    response: { name: "Response", type: sql.NVarChar, is_identity: false, is_primary: false },
    description_code: { name: "DescriptionCode", type: sql.NVarChar, is_identity: false, is_primary: false },
    description: { name: "Description", type: sql.NVarChar, is_identity: false, is_primary: false },
    error_message: { name: "ErrorMessage", type: sql.NVarChar, is_identity: false, is_primary: false },
    create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    update_date: { name: "UpdateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    create_by: { name: "CreateBy", type: sql.NVarChar, is_identity: false, is_primary: false },
    update_by: { name: "UpdateBy", type: sql.NVarChar, is_identity: false, is_primary: false }
    },
    ["id"],
    ["id","transaction_id","developer_id","referance_id","is_credit","is_credit_free","type","method","origin","header","body","response","description_code","description","error_message","create_date","update_date","create_by","update_by"]
  );

  constructor(request?: Request | ITransaction_Activity_Log, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as ITransaction_Activity_Log);
    }
  }

  async load(request: Request, id: number): Promise<void> {
      const item = await Transaction_Activity_Log.findOne(request, { id: id });
      this.loadByData(item);
  }

  loadByData(data: ITransaction_Activity_Log): void {
    this.id = data.id;
    this.transaction_id = data.transaction_id;
    this.developer_id = data.developer_id;
    this.referance_id = data.referance_id;
    this.is_credit = data.is_credit;
    this.is_credit_free = data.is_credit_free;
    this.type = data.type;
    this.method = data.method;
    this.origin = data.origin;
    this.header = data.header;
    this.body = data.body;
    this.response = data.response;
    this.description_code = data.description_code;
    this.description = data.description;
    this.error_message = data.error_message;
    this.create_date = data.create_date;
    this.update_date = data.update_date;
    this.create_by = data.create_by;
    this.update_by = data.update_by;
  }

  insert(request: Request): Promise<string | number> {
    return Transaction_Activity_Log.insert(request, {
      id: this.id,
      transaction_id: this.transaction_id,
      developer_id: this.developer_id,
      referance_id: this.referance_id,
      is_credit: this.is_credit,
      is_credit_free: this.is_credit_free,
      type: this.type,
      method: this.method,
      origin: this.origin,
      header: this.header,
      body: this.body,
      response: this.response,
      description_code: this.description_code,
      description: this.description,
      error_message: this.error_message,
      create_date: this.create_date,
      update_date: this.update_date,
      create_by: this.create_by,
      update_by: this.update_by,
    });
  }

  update(request: Request): Promise<void> {
    return Transaction_Activity_Log.update(request, {
      id: this.id,
      transaction_id: this.transaction_id,
      developer_id: this.developer_id,
      referance_id: this.referance_id,
      is_credit: this.is_credit,
      is_credit_free: this.is_credit_free,
      type: this.type,
      method: this.method,
      origin: this.origin,
      header: this.header,
      body: this.body,
      response: this.response,
      description_code: this.description_code,
      description: this.description,
      error_message: this.error_message,
      create_date: this.create_date,
      update_date: this.update_date,
      create_by: this.create_by,
      update_by: this.update_by,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: number): Promise<void> {
    return Transaction_Activity_Log.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: ITransaction_Activity_Log): Promise<Transaction_Activity_Log[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Transaction_Activity_Log(item));
  }

  static async findOne(request: Request, condition: ITransaction_Activity_Log): Promise<Transaction_Activity_Log> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null : new Transaction_Activity_Log(item);
  }

  static insert(request: Request, params: ITransaction_Activity_Log): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: ITransaction_Activity_Log, condition: ITransaction_Activity_Log): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: ITransaction_Activity_Log): Promise<void> {
      return this.builder.delete(request, condition);
  }
}