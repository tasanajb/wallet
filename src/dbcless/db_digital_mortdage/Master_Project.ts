import sql, { Request } from "mssql";
import { SqlBuilder } from "../db_wallet/SqlUtility";

interface IMaster_ProjectMethod {
  load(request: Request, id: number | IMaster_Project): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: IMaster_Project): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMaster_Project {
  id?: number;
  project_code?: string;
  project_name?: string;
  project_type?: string;
  project_type_name?: string;
  developer_code?: string;
  developer_name?: string;
  create_date?: Date;
  update_date?: Date;
}

export class Master_Project implements IMaster_Project, IMaster_ProjectMethod {
  id?: number;
  project_code?: string;
  project_name?: string;
  project_type?: string;
  project_type_name?: string;
  developer_code?: string;
  developer_name?: string;
  create_date?: Date;
  update_date?: Date;

  static builder: SqlBuilder = new SqlBuilder(
    "Master_Project",
    {
      id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
      project_code: { name: "ProjectCode", type: sql.NVarChar, is_identity: false, is_primary: false },
      project_name: { name: "ProjectName", type: sql.NVarChar, is_identity: false, is_primary: false },
      project_type: { name: "ProjectType", type: sql.NVarChar, is_identity: false, is_primary: false },
      project_type_name: { name: "ProjectTypeName", type: sql.NVarChar, is_identity: false, is_primary: false },
      developer_code: { name: "DeveloperCode", type: sql.NVarChar, is_identity: false, is_primary: false },
      developer_name: { name: "DeveloperName", type: sql.NVarChar, is_identity: false, is_primary: false },
      create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false },
      update_date: { name: "UpdateDate", type: sql.DateTime, is_identity: false, is_primary: false }
    },
    ["id"],
    ["id", "project_code", "project_name", "project_type", "project_type_name", "developer_code", "developer_name", "create_date", "update_date"]
  );

  constructor(request?: Request | IMaster_Project, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as IMaster_Project);
    }
  }

  async load(request: Request, id: number): Promise<void> {
    const item = await Master_Project.findOne(request, { id: id });
    this.loadByData(item);
  }

  loadByData(data: IMaster_Project): void {
    this.id = data.id;
    this.project_code = data.project_code;
    this.project_name = data.project_name;
    this.project_type = data.project_type;
    this.project_type_name = data.project_type_name;
    this.developer_code = data.developer_code;
    this.developer_name = data.developer_name;
    this.create_date = data.create_date;
    this.update_date = data.update_date;
  }

  insert(request: Request): Promise<string | number> {
    return Master_Project.insert(request, {
      id: this.id,
      project_code: this.project_code,
      project_name: this.project_name,
      project_type: this.project_type,
      project_type_name: this.project_type_name,
      developer_code: this.developer_code,
      developer_name: this.developer_name,
      create_date: this.create_date,
      update_date: this.update_date,
    });
  }

  update(request: Request): Promise<void> {
    return Master_Project.update(request, {
      id: this.id,
      project_code: this.project_code,
      project_name: this.project_name,
      project_type: this.project_type,
      project_type_name: this.project_type_name,
      developer_code: this.developer_code,
      developer_name: this.developer_name,
      create_date: this.create_date,
      update_date: this.update_date,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: number): Promise<void> {
    return Master_Project.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: IMaster_Project): Promise<Master_Project[]> {
    const recordset = await this.builder.find(request, condition);
    return recordset.map(item => new Master_Project(item));
  }

  static async findOne(request: Request, condition: IMaster_Project): Promise<Master_Project> {
    const item = await this.builder.findOne(request, condition);
    return item == null ? null as any : new Master_Project(item);
  }

  static async count(request: Request, condition: IMaster_Project): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: IMaster_Project): Promise<string | number> {
    return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMaster_Project, condition: IMaster_Project): Promise<void> {
    return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMaster_Project): Promise<void> {
    return this.builder.delete(request, condition);
  }
}