import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface IMaster_DeveloperMethod {
  load(request: Request, id: number | IMaster_Developer): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: IMaster_Developer): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMaster_Developer {
    id?: number;
    developer_code?: string;
    developer_name?: string;
    developer_image_url?: string;
    url_api?: string;
    header_api?: string;
    is_active?: number;
    create_date?: Date;
    update_date?: Date;
}

export class Master_Developer implements IMaster_Developer, IMaster_DeveloperMethod {
    id?: number;
    developer_code?: string;
    developer_name?: string;
    developer_image_url?: string;
    url_api?: string;
    header_api?: string;
    is_active?: number;
    create_date?: Date;
    update_date?: Date;

  static builder: SqlBuilder = new SqlBuilder(
    "Master_Developer",
    {
    id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
    developer_code: { name: "DeveloperCode", type: sql.NVarChar, is_identity: false, is_primary: false },
    developer_name: { name: "DeveloperName", type: sql.NVarChar, is_identity: false, is_primary: false },
    developer_image_url: { name: "DeveloperImageUrl", type: sql.NVarChar, is_identity: false, is_primary: false },
    url_api: { name: "UrlApi", type: sql.NVarChar, is_identity: false, is_primary: false },
    header_api: { name: "HeaderApi", type: sql.NVarChar, is_identity: false, is_primary: false },
    is_active: { name: "IsActive", type: sql.Int, is_identity: false, is_primary: false },
    create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false },
    update_date: { name: "UpdateDate", type: sql.DateTime, is_identity: false, is_primary: false }
    },
    ["id"],
    ["id","developer_code","developer_name","developer_image_url","url_api","header_api","is_active","create_date","update_date"]
  );

  constructor(request?: Request | IMaster_Developer, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as IMaster_Developer);
    }
  }

  async load(request: Request, id: number): Promise<void> {
      const item = await Master_Developer.findOne(request, { id: id });
      this.loadByData(item);
  }

  loadByData(data: IMaster_Developer): void {
    this.id = data.id;
    this.developer_code = data.developer_code;
    this.developer_name = data.developer_name;
    this.developer_image_url = data.developer_image_url;
    this.url_api = data.url_api;
    this.header_api = data.header_api;
    this.is_active = data.is_active;
    this.create_date = data.create_date;
    this.update_date = data.update_date;
  }

  insert(request: Request): Promise<string | number> {
    return Master_Developer.insert(request, {
      id: this.id,
      developer_code: this.developer_code,
      developer_name: this.developer_name,
      developer_image_url: this.developer_image_url,
      url_api: this.url_api,
      header_api: this.header_api,
      is_active: this.is_active,
      create_date: this.create_date,
      update_date: this.update_date,
    });
  }

  update(request: Request): Promise<void> {
    return Master_Developer.update(request, {
      id: this.id,
      developer_code: this.developer_code,
      developer_name: this.developer_name,
      developer_image_url: this.developer_image_url,
      url_api: this.url_api,
      header_api: this.header_api,
      is_active: this.is_active,
      create_date: this.create_date,
      update_date: this.update_date,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: number): Promise<void> {
    return Master_Developer.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: IMaster_Developer): Promise<Master_Developer[]> {
      const recordset = await this.builder.find(request, condition);
      return recordset.map(item => new Master_Developer(item));
  }

  static async findOne(request: Request, condition: IMaster_Developer): Promise<Master_Developer> {
      const item = await this.builder.findOne(request, condition);
      return item == null ? null as any : new Master_Developer(item);
  }

  static async count(request: Request, condition: IMaster_Developer): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: IMaster_Developer): Promise<string | number> {
      return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMaster_Developer, condition: IMaster_Developer): Promise<void> {
      return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMaster_Developer): Promise<void> {
      return this.builder.delete(request, condition);
  }
}