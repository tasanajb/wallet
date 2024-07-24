import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface ILog_ReportMethod {
  load(request: Request, id: string | ILog_Report): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: string): Promise<void>;
  loadByData(data: ILog_Report): void;
  insert(request: Request): Promise<string | number>;
}

export interface ILog_Report {
    id?: string;
    sftp_ip?: string;
    name?: string;
    path?: string;
    data?: string;
    date?: string;
    status?: string;
    create_date?: Date;
    update_date?: Date;
    count_retry?: number;
    error_message?: string;
}

export class Log_Report implements ILog_Report, ILog_ReportMethod {
    id?: string;
    sftp_ip?: string;
    name?: string;
    path?: string;
    data?: string;
    date?: string;
    status?: string;
    create_date?: Date;
    update_date?: Date;
    count_retry?: number;
    error_message?: string;

  static builder: SqlBuilder = new SqlBuilder(
    "Log_Report",
    {
    id: { name: "Id", type: sql.NVarChar, is_identity: false, is_primary: true },
    sftp_ip: { name: "SftpIP", type: sql.NVarChar, is_identity: false, is_primary: false },
    name: { name: "Name", type: sql.NVarChar, is_identity: false, is_primary: false },
    path: { name: "Path", type: sql.NVarChar, is_identity: false, is_primary: false },
    data: { name: "Data", type: sql.NVarChar, is_identity: false, is_primary: false },
    date: { name: "Date", type: sql.NVarChar, is_identity: false, is_primary: false },
    status: { name: "Status", type: sql.NVarChar, is_identity: false, is_primary: false },
    create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    update_date: { name: "UpdateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    count_retry: { name: "CountRetry", type: sql.Int, is_identity: false, is_primary: false },
    error_message: { name: "ErrorMessage", type: sql.NVarChar, is_identity: false, is_primary: false }
    },
    [],
    ["id","sftp_ip","name","path","data","date","status","create_date","update_date","count_retry","error_message"]
  );

  constructor(request?: Request | ILog_Report, id?: string) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as ILog_Report);
    }
  }

  async load(request: Request, id: string): Promise<void> {
      const item = await Log_Report.findOne(request, { id: id });
      this.loadByData(item);
  }

  loadByData(data: ILog_Report): void {
    this.id = data.id;
    this.sftp_ip = data.sftp_ip;
    this.name = data.name;
    this.path = data.path;
    this.data = data.data;
    this.date = data.date;
    this.status = data.status;
    this.create_date = data.create_date;
    this.update_date = data.update_date;
    this.count_retry = data.count_retry;
    this.error_message = data.error_message;
  }

  insert(request: Request): Promise<string | number> {
    return Log_Report.insert(request, {
      id: this.id,
      sftp_ip: this.sftp_ip,
      name: this.name,
      path: this.path,
      data: this.data,
      date: this.date,
      status: this.status,
      create_date: this.create_date,
      update_date: this.update_date,
      count_retry: this.count_retry,
      error_message: this.error_message,
    });
  }

  update(request: Request): Promise<void> {
    return Log_Report.update(request, {
      id: this.id,
      sftp_ip: this.sftp_ip,
      name: this.name,
      path: this.path,
      data: this.data,
      date: this.date,
      status: this.status,
      create_date: this.create_date,
      update_date: this.update_date,
      count_retry: this.count_retry,
      error_message: this.error_message,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: string): Promise<void> {
    return Log_Report.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: ILog_Report): Promise<Log_Report[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Log_Report(item));
  }

  static async findOne(request: Request, condition: ILog_Report): Promise<Log_Report> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null as any : new Log_Report(item);
  }

  static async count(request: Request, condition: ILog_Report): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: ILog_Report): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: ILog_Report, condition: ILog_Report): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: ILog_Report): Promise<void> {
      return this.builder.delete(request, condition);
  }
}