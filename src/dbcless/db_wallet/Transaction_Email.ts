import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface ITransaction_EmailMethod {
  load(request: Request, id: number | ITransaction_Email): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: ITransaction_Email): void;
  insert(request: Request): Promise<string | number>;
}

export interface ITransaction_Email {
    id?: number;
    send_to?: string;
    send_cc?: string;
    subject?: string;
    body?: string;
    developer_code?: string;
    create_date?: Date;
    update_date?: Date;
    effective_date?: Date;
    sent_date?: Date;
    error_date?: Date;
    error_message?: string;
    error_count?: number;
    status?: string;
    job_id?: string;
}

export class Transaction_Email implements ITransaction_Email, ITransaction_EmailMethod {
    id?: number;
    send_to?: string;
    send_cc?: string;
    subject?: string;
    body?: string;
    developer_code?: string;
    create_date?: Date;
    update_date?: Date;
    effective_date?: Date;
    sent_date?: Date;
    error_date?: Date;
    error_message?: string;
    error_count?: number;
    status?: string;
    job_id?: string;

  static builder: SqlBuilder = new SqlBuilder(
    "Transaction_Email",
    {
    id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
    send_to: { name: "SendTo", type: sql.NVarChar, is_identity: false, is_primary: false },
    send_cc: { name: "SendCC", type: sql.NVarChar, is_identity: false, is_primary: false },
    subject: { name: "Subject", type: sql.NVarChar, is_identity: false, is_primary: false },
    body: { name: "Body", type: sql.NText, is_identity: false, is_primary: false },
    developer_code: { name: "DeveloperCode", type: sql.NVarChar, is_identity: false, is_primary: false },
    create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    update_date: { name: "UpdateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    effective_date: { name: "EffectiveDate", type: sql.DateTime, is_identity: false, is_primary: false },
    sent_date: { name: "SentDate", type: sql.DateTime, is_identity: false, is_primary: false },
    error_date: { name: "ErrorDate", type: sql.DateTime, is_identity: false, is_primary: false },
    error_message: { name: "ErrorMessage", type: sql.NVarChar, is_identity: false, is_primary: false },
    error_count: { name: "ErrorCount", type: sql.Int, is_identity: false, is_primary: false },
    status: { name: "Status", type: sql.NVarChar, is_identity: false, is_primary: false },
    job_id: { name: "JobId", type: sql.NVarChar, is_identity: false, is_primary: false }
    },
    ["id"],
    ["id","send_to","send_cc","subject","body","developer_code","create_date","update_date","effective_date","sent_date","error_date","error_message","error_count","status","job_id"]
  );

  constructor(request?: Request | ITransaction_Email, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as ITransaction_Email);
    }
  }

  async load(request: Request, id: number): Promise<void> {
      const item = await Transaction_Email.findOne(request, { id: id });
      this.loadByData(item);
  }

  loadByData(data: ITransaction_Email): void {
    this.id = data.id;
    this.send_to = data.send_to;
    this.send_cc = data.send_cc;
    this.subject = data.subject;
    this.body = data.body;
    this.developer_code = data.developer_code;
    this.create_date = data.create_date;
    this.update_date = data.update_date;
    this.effective_date = data.effective_date;
    this.sent_date = data.sent_date;
    this.error_date = data.error_date;
    this.error_message = data.error_message;
    this.error_count = data.error_count;
    this.status = data.status;
    this.job_id = data.job_id;
  }

  insert(request: Request): Promise<string | number> {
    return Transaction_Email.insert(request, {
      id: this.id,
      send_to: this.send_to,
      send_cc: this.send_cc,
      subject: this.subject,
      body: this.body,
      developer_code: this.developer_code,
      create_date: this.create_date,
      update_date: this.update_date,
      effective_date: this.effective_date,
      sent_date: this.sent_date,
      error_date: this.error_date,
      error_message: this.error_message,
      error_count: this.error_count,
      status: this.status,
      job_id: this.job_id,
    });
  }

  update(request: Request): Promise<void> {
    return Transaction_Email.update(request, {
      id: this.id,
      send_to: this.send_to,
      send_cc: this.send_cc,
      subject: this.subject,
      body: this.body,
      developer_code: this.developer_code,
      create_date: this.create_date,
      update_date: this.update_date,
      effective_date: this.effective_date,
      sent_date: this.sent_date,
      error_date: this.error_date,
      error_message: this.error_message,
      error_count: this.error_count,
      status: this.status,
      job_id: this.job_id,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: number): Promise<void> {
    return Transaction_Email.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: ITransaction_Email): Promise<Transaction_Email[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Transaction_Email(item));
  }

  static async findOne(request: Request, condition: ITransaction_Email): Promise<Transaction_Email> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null as any : new Transaction_Email(item);
  }

  static async count(request: Request, condition: ITransaction_Email): Promise<number> {
    return await this.builder.count(request, condition);
  }


  static insert(request: Request, params: ITransaction_Email): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: ITransaction_Email, condition: ITransaction_Email): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: ITransaction_Email): Promise<void> {
      return this.builder.delete(request, condition);
  }
}