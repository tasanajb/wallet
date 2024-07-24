import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface IMapping_Role_UserMethod {
  load(request: Request, id: number | IMapping_Role_User): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: IMapping_Role_User): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMapping_Role_User {
    role_id?: number;
    user_id?: number;
}

export class Mapping_Role_User implements IMapping_Role_User, IMapping_Role_UserMethod {
    role_id?: number;
    user_id?: number;

  static builder: SqlBuilder = new SqlBuilder(
    "Mapping_Role_User",
    {
    role_id: { name: "RoleId", type: sql.Int, is_identity: false, is_primary: true },
    user_id: { name: "UserId", type: sql.Int, is_identity: false, is_primary: true }
    },
    [],
    ["role_id","user_id"]
  );

  constructor(request?: Request | IMapping_Role_User, role_id?: number) {
    if (role_id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, role_id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("role_id is required.");
      }
      this.loadByData(request as IMapping_Role_User);
    }
  }

  async load(request: Request, role_id: number): Promise<void> {
      const item = await Mapping_Role_User.findOne(request, { role_id: role_id });
      this.loadByData(item);
  }

  loadByData(data: IMapping_Role_User): void {
    this.role_id = data.role_id;
    this.user_id = data.user_id;
  }

  insert(request: Request): Promise<string | number> {
    return Mapping_Role_User.insert(request, {
      role_id: this.role_id,
      user_id: this.user_id,
    });
  }

  update(request: Request): Promise<void> {
    return Mapping_Role_User.update(request, {
      role_id: this.role_id,
      user_id: this.user_id,
    }, {
      role_id: this.role_id
    });
  }

  delete(request: Request, role_id: number): Promise<void> {
    return Mapping_Role_User.delete(request, {
      role_id: role_id
    });
  }

  static async find(request: Request, condition: IMapping_Role_User): Promise<Mapping_Role_User[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Mapping_Role_User(item));
  }

  static async findOne(request: Request, condition: IMapping_Role_User): Promise<Mapping_Role_User> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null as any: new Mapping_Role_User(item);
  }

  static async count(request: Request, condition: IMapping_Role_User): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: IMapping_Role_User): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMapping_Role_User, condition: IMapping_Role_User): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMapping_Role_User): Promise<void> {
      return this.builder.delete(request, condition);
  }
}