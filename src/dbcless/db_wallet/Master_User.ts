import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface IMaster_UserMethod {
  load(request: Request, id: number | IMaster_User): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: IMaster_User): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMaster_User {
    id?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    password?: string;
    developer_id?: number;
    created_date?: Date;
    modified_date?: Date;
    status?: string;
}

export class Master_User implements IMaster_User, IMaster_UserMethod {
    id?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    password?: string;
    developer_id?: number;
    created_date?: Date;
    modified_date?: Date;
    status?: string;

  static builder: SqlBuilder = new SqlBuilder(
    "Master_User",
    {
    id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
    first_name: { name: "FirstName", type: sql.NVarChar, is_identity: false, is_primary: false },
    last_name: { name: "LastName", type: sql.NVarChar, is_identity: false, is_primary: false },
    email: { name: "Email", type: sql.NVarChar, is_identity: false, is_primary: false },
    password: { name: "Password", type: sql.NVarChar, is_identity: false, is_primary: false },
    developer_id: { name: "DeveloperId", type: sql.Int, is_identity: false, is_primary: false },
    created_date: { name: "CreatedDate", type: sql.DateTime, is_identity: false, is_primary: false },
    modified_date: { name: "ModifiedDate", type: sql.DateTime, is_identity: false, is_primary: false },
    status: { name: "Status", type: sql.NVarChar, is_identity: false, is_primary: false }
    },
    ["id"],
    ["id","first_name","last_name","email","password","developer_id","created_date","modified_date","status"]
  );

  constructor(request?: Request | IMaster_User, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as IMaster_User);
    }
  }

  async load(request: Request, id: number): Promise<void> {
      const item = await Master_User.findOne(request, { id: id });
      this.loadByData(item);
  }

  loadByData(data: IMaster_User): void {
    this.id = data.id;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.email = data.email;
    this.password = data.password;
    this.developer_id = data.developer_id;
    this.created_date = data.created_date;
    this.modified_date = data.modified_date;
    this.status = data.status;
  }

  insert(request: Request): Promise<string | number> {
    return Master_User.insert(request, {
      id: this.id,
      first_name: this.first_name,
      last_name: this.last_name,
      email: this.email,
      password: this.password,
      developer_id: this.developer_id,
      created_date: this.created_date,
      modified_date: this.modified_date,
      status: this.status,
    });
  }

  update(request: Request): Promise<void> {
    return Master_User.update(request, {
      id: this.id,
      first_name: this.first_name,
      last_name: this.last_name,
      email: this.email,
      password: this.password,
      developer_id: this.developer_id,
      created_date: this.created_date,
      modified_date: this.modified_date,
      status: this.status,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: number): Promise<void> {
    return Master_User.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: IMaster_User): Promise<Master_User[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Master_User(item));
  }

  static async findOne(request: Request, condition: IMaster_User): Promise<Master_User> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null as any : new Master_User(item);
  }

  static async count(request: Request, condition: IMaster_User): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: IMaster_User): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMaster_User, condition: IMaster_User): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMaster_User): Promise<void> {
      return this.builder.delete(request, condition);
  }
}