import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface IMaster_Credit_BalanceMethod {
  load(request: Request, id: number | IMaster_Credit_Balance): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: IMaster_Credit_Balance): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMaster_Credit_Balance {
    id?: number;
    developer_id?: number;
    total_balance?: number;
    total_in?: number;
    total_out?: number;
    update_date?: Date;
    create_date?: Date;
}

export class Master_Credit_Balance implements IMaster_Credit_Balance, IMaster_Credit_BalanceMethod {
    id?: number;
    developer_id?: number;
    total_balance?: number;
    total_in?: number;
    total_out?: number;
    update_date?: Date;
    create_date?: Date;

  static builder: SqlBuilder = new SqlBuilder(
    "Master_Credit_Balance",
    {
    id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
    developer_id: { name: "DeveloperId", type: sql.Int, is_identity: false, is_primary: false },
    total_balance: { name: "TotalBalance", type: sql.Int, is_identity: false, is_primary: false },
    total_in: { name: "TotalIn", type: sql.Int, is_identity: false, is_primary: false },
    total_out: { name: "TotalOut", type: sql.Int, is_identity: false, is_primary: false },
    update_date: { name: "UpdateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false }
    },
    ["id"],
    ["id","developer_id","total_balance","total_in","total_out","update_date","create_date"]
  );

  constructor(request?: Request | IMaster_Credit_Balance, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as IMaster_Credit_Balance);
    }
  }

  async load(request: Request, id: number): Promise<void> {
      const item = await Master_Credit_Balance.findOne(request, { id: id });
      this.loadByData(item);
  }

  loadByData(data: IMaster_Credit_Balance): void {
    this.id = data.id;
    this.developer_id = data.developer_id;
    this.total_balance = data.total_balance;
    this.total_in = data.total_in;
    this.total_out = data.total_out;
    this.update_date = data.update_date;
    this.create_date = data.create_date;
  }

  insert(request: Request): Promise<string | number> {
    return Master_Credit_Balance.insert(request, {
      id: this.id,
      developer_id: this.developer_id,
      total_balance: this.total_balance,
      total_in: this.total_in,
      total_out: this.total_out,
      update_date: this.update_date,
      create_date: this.create_date,
    });
  }

  update(request: Request): Promise<void> {
    return Master_Credit_Balance.update(request, {
      id: this.id,
      developer_id: this.developer_id,
      total_balance: this.total_balance,
      total_in: this.total_in,
      total_out: this.total_out,
      update_date: this.update_date,
      create_date: this.create_date,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: number): Promise<void> {
    return Master_Credit_Balance.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: IMaster_Credit_Balance): Promise<Master_Credit_Balance[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Master_Credit_Balance(item));
  }

  static async findOne(request: Request, condition: IMaster_Credit_Balance): Promise<Master_Credit_Balance> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null : new Master_Credit_Balance(item);
  }

  static insert(request: Request, params: IMaster_Credit_Balance): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMaster_Credit_Balance, condition: IMaster_Credit_Balance): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMaster_Credit_Balance): Promise<void> {
      return this.builder.delete(request, condition);
  }
}