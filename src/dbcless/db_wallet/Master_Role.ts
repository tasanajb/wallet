import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface IMaster_RoleMethod {
  load(request: Request, id: number | IMaster_Role): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: IMaster_Role): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMaster_Role {
    id?: number;
    name?: string;
    created_date?: Date;
    modified_date?: Date;
    developer_id?: number;
}

export class Master_Role implements IMaster_Role, IMaster_RoleMethod {
    id?: number;
    name?: string;
    created_date?: Date;
    modified_date?: Date;
    developer_id?: number;

  static builder: SqlBuilder = new SqlBuilder(
    "Master_Role",
    {
    id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
    name: { name: "Name", type: sql.NVarChar, is_identity: false, is_primary: false },
    created_date: { name: "CreatedDate", type: sql.DateTime, is_identity: false, is_primary: false },
    modified_date: { name: "ModifiedDate", type: sql.DateTime, is_identity: false, is_primary: false },
    developer_id: { name: "DeveloperId", type: sql.Int, is_identity: false, is_primary: false }
    },
    ["id"],
    ["id","name","created_date","modified_date","developer_id"]
  );

  constructor(request?: Request | IMaster_Role, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as IMaster_Role);
    }
  }

  async load(request: Request, id: number): Promise<void> {
      const item = await Master_Role.findOne(request, { id: id });
      this.loadByData(item);
  }

  loadByData(data: IMaster_Role): void {
    this.id = data.id;
    this.name = data.name;
    this.created_date = data.created_date;
    this.modified_date = data.modified_date;
    this.developer_id = data.developer_id;
  }

  insert(request: Request): Promise<string | number> {
    return Master_Role.insert(request, {
      id: this.id,
      name: this.name,
      created_date: this.created_date,
      modified_date: this.modified_date,
      developer_id: this.developer_id,
    });
  }

  update(request: Request): Promise<void> {
    return Master_Role.update(request, {
      id: this.id,
      name: this.name,
      created_date: this.created_date,
      modified_date: this.modified_date,
      developer_id: this.developer_id,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: number): Promise<void> {
    return Master_Role.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: IMaster_Role): Promise<Master_Role[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Master_Role(item));
  }

  static async findOne(request: Request, condition: IMaster_Role): Promise<Master_Role> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null as any : new Master_Role(item);
  }

  static async count(request: Request, condition: IMaster_Role): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: IMaster_Role): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMaster_Role, condition: IMaster_Role): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMaster_Role): Promise<void> {
      return this.builder.delete(request, condition);
  }
}