import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface IMaster_DescriptionMethod {
  load(request: Request, id: number | IMaster_Description): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: IMaster_Description): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMaster_Description {
    id?: number;
    description_code?: string;
    description_text?: string;
    status?: string;
}

export class Master_Description implements IMaster_Description, IMaster_DescriptionMethod {
    id?: number;
    description_code?: string;
    description_text?: string;
    status?: string;

  static builder: SqlBuilder = new SqlBuilder(
    "Master_Description",
    {
    id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
    description_code: { name: "DescriptionCode", type: sql.NVarChar, is_identity: false, is_primary: false },
    description_text: { name: "DescriptionText", type: sql.NVarChar, is_identity: false, is_primary: false },
    status: { name: "Status", type: sql.NVarChar, is_identity: false, is_primary: false }
    },
    ["id"],
    ["id","description_code","description_text","status"]
  );

  constructor(request?: Request | IMaster_Description, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as IMaster_Description);
    }
  }

  async load(request: Request, id: number): Promise<void> {
      const item = await Master_Description.findOne(request, { id: id });
      this.loadByData(item);
  }

  loadByData(data: IMaster_Description): void {
    this.id = data.id;
    this.description_code = data.description_code;
    this.description_text = data.description_text;
    this.status = data.status;
  }

  insert(request: Request): Promise<string | number> {
    return Master_Description.insert(request, {
      id: this.id,
      description_code: this.description_code,
      description_text: this.description_text,
      status: this.status,
    });
  }

  update(request: Request): Promise<void> {
    return Master_Description.update(request, {
      id: this.id,
      description_code: this.description_code,
      description_text: this.description_text,
      status: this.status,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: number): Promise<void> {
    return Master_Description.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: IMaster_Description): Promise<Master_Description[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Master_Description(item));
  }

  static async findOne(request: Request, condition: IMaster_Description): Promise<Master_Description> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null as any : new Master_Description(item);
  }

  static async count(request: Request, condition: IMaster_Description): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: IMaster_Description): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMaster_Description, condition: IMaster_Description): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMaster_Description): Promise<void> {
      return this.builder.delete(request, condition);
  }
}