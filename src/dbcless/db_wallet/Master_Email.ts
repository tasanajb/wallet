import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface IMaster_EmailMethod {
  load(request: Request, developer_code: string | IMaster_Email): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, developer_code: string): Promise<void>;
  loadByData(data: IMaster_Email): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMaster_Email {
    developer_code?: string;
    email_to?: string;
    email_cc?: string;
    email_support?: string;
    send_date?: string;
    update_date?: Date;
    create_date?: Date;
}

export class Master_Email implements IMaster_Email, IMaster_EmailMethod {
    developer_code?: string;
    email_to?: string;
    email_cc?: string;
    email_support?: string;
    send_date?: string;
    update_date?: Date;
    create_date?: Date;

  static builder: SqlBuilder = new SqlBuilder(
    "Master_Email",
    {
      developer_code: { name: "DeveloperCode", type: sql.NVarChar, is_identity: false, is_primary: false },
      email_to: { name: "EmailTo", type: sql.NVarChar, is_identity: false, is_primary: false },
      email_cc: { name: "EmailCc", type: sql.NVarChar, is_identity: false, is_primary: false },
      email_support: { name: "EmailSupport", type: sql.NVarChar, is_identity: false, is_primary: false },
      send_date: { name: "SendDate", type: sql.NVarChar, is_identity: false, is_primary: false },
      update_date: { name: "UpdateDate", type: sql.DateTime, is_identity: false, is_primary: false },
      create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false }
    },
    [""],
    ["developer_code","email_to","email_cc","email_support","send_date","update_date","create_date"]
  );

  constructor(request?: Request | IMaster_Email, developer_code?: string) {
    if (developer_code) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, developer_code);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as IMaster_Email);
    }
  }

  async load(request: Request, developer_code: string): Promise<void> {
      const item = await Master_Email.findOne(request, { developer_code: developer_code });
      this.loadByData(item);
  }

  loadByData(data: IMaster_Email): void {
    this.developer_code = data.developer_code;
    this.email_to = data.email_to;
    this.email_cc = data.email_cc;
    this.email_support = data.email_support;
    this.send_date = data.send_date;
    this.update_date = data.update_date;
    this.create_date = data.create_date;
  }

  insert(request: Request): Promise<string | number> {
    return Master_Email.insert(request, {
      developer_code: this.developer_code,
      email_to: this.email_to,
      email_cc: this.email_cc,
      email_support: this.email_support,
      send_date: this.send_date,
      update_date: this.update_date,
      create_date: this.create_date,
    });
  }

  update(request: Request): Promise<void> {
    return Master_Email.update(request, {
      developer_code: this.developer_code,
      email_to: this.email_to,
      email_cc: this.email_cc,
      email_support: this.email_support,
      send_date: this.send_date,
      update_date: this.update_date,
      create_date: this.create_date,
    }, {
      developer_code: this.developer_code
    });
  }

  delete(request: Request, developer_code: string): Promise<void> {
    return Master_Email.delete(request, {
      developer_code: developer_code
    });
  }

  static async find(request: Request, condition: IMaster_Email): Promise<Master_Email[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Master_Email(item));
  }

  static async findOne(request: Request, condition: IMaster_Email): Promise<Master_Email> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null : new Master_Email(item);
  }

  static insert(request: Request, params: IMaster_Email): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMaster_Email, condition: IMaster_Email): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMaster_Email): Promise<void> {
      return this.builder.delete(request, condition);
  }
}