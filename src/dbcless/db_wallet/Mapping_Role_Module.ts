import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface IMapping_Role_ModuleMethod {
  load(request: Request, id: number | IMapping_Role_Module): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: IMapping_Role_Module): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMapping_Role_Module {
  role_id?: number;
  module_id?: number;
}

export class Mapping_Role_Module implements IMapping_Role_Module, IMapping_Role_ModuleMethod {
  role_id?: number;
  module_id?: number;

  static builder: SqlBuilder = new SqlBuilder(
    "Mapping_Role_Module",
    {
      role_id: { name: "RoleId", type: sql.Int, is_identity: false, is_primary: true },
      module_id: { name: "ModuleId", type: sql.Int, is_identity: false, is_primary: true }
    },
    [],
    ["role_id", "module_id"]
  );

  constructor(request?: Request | IMapping_Role_Module, role_id?: number) {
    if (role_id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, role_id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("role_id is required.");
      }
      this.loadByData(request as IMapping_Role_Module);
    }
  }

  async load(request: Request, role_id: number): Promise<void> {
    const item = await Mapping_Role_Module.findOne(request, { role_id: role_id });
    this.loadByData(item);
  }

  loadByData(data: IMapping_Role_Module): void {
    this.role_id = data.role_id;
    this.module_id = data.module_id;
  }

  insert(request: Request): Promise<string | number> {
    return Mapping_Role_Module.insert(request, {
      role_id: this.role_id,
      module_id: this.module_id,
    });
  }

  update(request: Request): Promise<void> {
    return Mapping_Role_Module.update(request, {
      role_id: this.role_id,
      module_id: this.module_id,
    }, {
      role_id: this.role_id
    });
  }

  delete(request: Request, role_id: number): Promise<void> {
    return Mapping_Role_Module.delete(request, {
      role_id: role_id
    });
  }

  static async find(request: Request, condition: IMapping_Role_Module): Promise<Mapping_Role_Module[]> {
    const recordset = await this.builder.find(request, condition);
    return recordset.map(item => new Mapping_Role_Module(item));
  }

  static async findOne(request: Request, condition: IMapping_Role_Module): Promise<Mapping_Role_Module> {
    const item = await this.builder.findOne(request, condition);
    return item == null ? null as any : new Mapping_Role_Module(item);
  }

  static async count(request: Request, condition: IMapping_Role_Module): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: IMapping_Role_Module): Promise<string | number> {
    return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMapping_Role_Module, condition: IMapping_Role_Module): Promise<void> {
    return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMapping_Role_Module): Promise<void> {
    return this.builder.delete(request, condition);
  }
}