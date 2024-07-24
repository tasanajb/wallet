import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface IMaster_ModuleMethod {
  load(request: Request, id: number | IMaster_Module): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: IMaster_Module): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMaster_Module {
    id?: number;
    path?: string;
    name?: string;
    parent_id?: number;
    developer_id?: number;
    status?: string;
    create_date?: Date;
    modify_date?: Date;
    seq?: number;
}

export class Master_Module implements IMaster_Module, IMaster_ModuleMethod {
    id?: number;
    path?: string;
    name?: string;
    parent_id?: number;
    developer_id?: number;
    status?: string;
    create_date?: Date;
    modify_date?: Date;
    seq?: number;

  static builder: SqlBuilder = new SqlBuilder(
    "Master_Module",
    {
    id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
    path: { name: "Path", type: sql.NVarChar, is_identity: false, is_primary: false },
    name: { name: "Name", type: sql.NVarChar, is_identity: false, is_primary: false },
    parent_id: { name: "ParentId", type: sql.Int, is_identity: false, is_primary: false },
    developer_id: { name: "DeveloperId", type: sql.Int, is_identity: false, is_primary: false },
    status: { name: "Status", type: sql.NVarChar, is_identity: false, is_primary: false },
    create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    modify_date: { name: "ModifyDate", type: sql.DateTime, is_identity: false, is_primary: false },
    seq: { name: "Seq", type: sql.Int, is_identity: false, is_primary: false }
    },
    ["id"],
    ["id","path","name","parent_id","developer_id","status","create_date","modify_date","seq"]
  );

  constructor(request?: Request | IMaster_Module, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as IMaster_Module);
    }
  }

  async load(request: Request, id: number): Promise<void> {
      const item = await Master_Module.findOne(request, { id: id });
      this.loadByData(item);
  }

  loadByData(data: IMaster_Module): void {
    this.id = data.id;
    this.path = data.path;
    this.name = data.name;
    this.parent_id = data.parent_id;
    this.developer_id = data.developer_id;
    this.status = data.status;
    this.create_date = data.create_date;
    this.modify_date = data.modify_date;
    this.seq = data.seq;
  }

  insert(request: Request): Promise<string | number> {
    return Master_Module.insert(request, {
      id: this.id,
      path: this.path,
      name: this.name,
      parent_id: this.parent_id,
      developer_id: this.developer_id,
      status: this.status,
      create_date: this.create_date,
      modify_date: this.modify_date,
      seq: this.seq,
    });
  }

  update(request: Request): Promise<void> {
    return Master_Module.update(request, {
      id: this.id,
      path: this.path,
      name: this.name,
      parent_id: this.parent_id,
      developer_id: this.developer_id,
      status: this.status,
      create_date: this.create_date,
      modify_date: this.modify_date,
      seq: this.seq,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: number): Promise<void> {
    return Master_Module.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: IMaster_Module): Promise<Master_Module[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Master_Module(item));
  }

  static async findOne(request: Request, condition: IMaster_Module): Promise<Master_Module> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null as any: new Master_Module(item);
  }

  static async count(request: Request, condition: IMaster_Module): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: IMaster_Module): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMaster_Module, condition: IMaster_Module): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMaster_Module): Promise<void> {
      return this.builder.delete(request, condition);
  }
}