import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface ITransaction_ReportMethod {
  load(request: Request, report_id: string | ITransaction_Report): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, report_id: string): Promise<void>;
  loadByData(data: ITransaction_Report): void;
  insert(request: Request): Promise<string | number>;
}

export interface ITransaction_Report {
    report_id?: string;
    type?: string;
    data?: string;
    data_conflict?: string;
    is_conflict?: boolean;
    developer_code?: string;
    status?: string;
    month_number?: string;
    month?: string;
    year?: string;
    create_date?: Date;
    update_date?: Date;
}

export class Transaction_Report implements ITransaction_Report, ITransaction_ReportMethod {
    report_id?: string;
    type?: string;
    data?: string;
    data_conflict?: string;
    is_conflict?: boolean;
    developer_code?: string;
    status?: string;
    month_number?: string;
    month?: string;
    year?: string;
    create_date?: Date;
    update_date?: Date;

  static builder: SqlBuilder = new SqlBuilder(
    "Transaction_Report",
    {
    report_id: { name: "ReportId", type: sql.NVarChar, is_identity: false, is_primary: true },
    type: { name: "Type", type: sql.NVarChar, is_identity: false, is_primary: false },
    data: { name: "Data", type: sql.NVarChar, is_identity: false, is_primary: false },
    data_conflict: { name: "DataConflict", type: sql.NVarChar, is_identity: false, is_primary: false },
    is_conflict: { name: "IsConflict", type: sql.Bit, is_identity: false, is_primary: false },
    developer_code: { name: "DeveloperCode", type: sql.NVarChar, is_identity: false, is_primary: false },
    status: { name: "Status", type: sql.NVarChar, is_identity: false, is_primary: false },
    month_number: { name: "MonthNumber", type: sql.NVarChar, is_identity: false, is_primary: false },
    month: { name: "Month", type: sql.NVarChar, is_identity: false, is_primary: false },
    year: { name: "Year", type: sql.NVarChar, is_identity: false, is_primary: false },
    create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    update_date: { name: "UpdateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    },
    [],
    ["report_id","type","data","data_conflict","is_conflict","developer_code","status","month_number","month","year","create_date","update_date"]
  );

  constructor(request?: Request | ITransaction_Report, report_id?: string) {
    if (report_id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, report_id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as ITransaction_Report);
    }
  }

  async load(request: Request, report_id: string): Promise<void> {
      const item = await Transaction_Report.findOne(request, { report_id: report_id });
      this.loadByData(item);
  }

  loadByData(data: ITransaction_Report): void {
    this.report_id = data.report_id;
    this.type = data.type;
    this.data = data.data;
    this.data_conflict = data.data_conflict;
    this.is_conflict = data.is_conflict;
    this.developer_code = data.developer_code;
    this.status = data.status;
    this.month_number = data.month_number;
    this.month = data.month;
    this.year = data.year;
    this.create_date = data.create_date;
    this.update_date = data.update_date;
  }

  insert(request: Request): Promise<string | number> {
    return Transaction_Report.insert(request, {
      report_id: this.report_id,
      type: this.type,
      data: this.data,
      data_conflict: this.data_conflict,
      is_conflict: this.is_conflict,
      developer_code: this.developer_code,
      status: this.status,
      month: this.month,
      year: this.year,
      create_date: this.create_date,
      update_date: this.update_date,
    });
  }

  update(request: Request): Promise<void> {
    return Transaction_Report.update(request, {
      report_id: this.report_id,
      type: this.type,
      data: this.data,
      data_conflict: this.data_conflict,
      is_conflict: this.is_conflict,
      developer_code: this.developer_code,
      status: this.status,
      month_number: this.month_number,
      month: this.month,
      year: this.year,
      create_date: this.create_date,
      update_date: this.update_date,
    }, {
      report_id: this.report_id
    });
  }

  delete(request: Request, report_id: string): Promise<void> {
    return Transaction_Report.delete(request, {
      report_id: report_id
    });
  }

  static async find(request: Request, condition: ITransaction_Report): Promise<Transaction_Report[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Transaction_Report(item));
  }

  static async findOne(request: Request, condition: ITransaction_Report): Promise<Transaction_Report> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null as any : new Transaction_Report(item);
  }

  static async count(request: Request, condition: ITransaction_Report): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: ITransaction_Report): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: ITransaction_Report, condition: ITransaction_Report): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: ITransaction_Report): Promise<void> {
      return this.builder.delete(request, condition);
  }
}