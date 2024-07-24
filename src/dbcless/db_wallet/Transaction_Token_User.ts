import sql, { Request } from "mssql";
import { SqlBuilder } from "./SqlUtility";

interface ITransaction_Token_UserMethod {
  load(request: Request, id: number | ITransaction_Token_User): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: ITransaction_Token_User): void;
  insert(request: Request): Promise<string | number>;
}

export interface ITransaction_Token_User {
  id?: number;
  user_id?: string;
  token_id?: string;
  status?: string;
  create_date?: Date;
}

export class Transaction_Token_User
  implements ITransaction_Token_User, ITransaction_Token_UserMethod
{
  id?: number;
  user_id?: string;
  token_id?: string;
  status?: string;
  create_date?: Date;

  static builder: SqlBuilder = new SqlBuilder(
    "Transaction_Token_User",
    {
      id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
      user_id: {
        name: "UserId",
        type: sql.NVarChar,
        is_identity: false,
        is_primary: false,
      },
      token_id: {
        name: "TokenId",
        type: sql.NVarChar,
        is_identity: false,
        is_primary: false,
      },
      status: {
        name: "Status",
        type: sql.NVarChar,
        is_identity: false,
        is_primary: false,
      },
      create_date: {
        name: "CreateDate",
        type: sql.DateTime,
        is_identity: false,
        is_primary: false,
      },
    },
    ["id"],
    ["id", "user_id", "token_id", "status", "create_date"]
  );

  constructor(request?: Request | ITransaction_Token_User, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    } else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as ITransaction_Token_User);
    }
  }

  async load(request: Request, id: number): Promise<void> {
    const item = await Transaction_Token_User.findOne(request, { id: id });
    this.loadByData(item);
  }

  loadByData(data: ITransaction_Token_User): void {
    this.id = data.id;
    this.user_id = data.user_id;
    this.token_id = data.token_id;
    this.status = data.status;
    this.create_date = data.create_date;
  }

  insert(request: Request): Promise<string | number> {
    return Transaction_Token_User.insert(request, {
      id: this.id,
      user_id: this.user_id,
      token_id: this.token_id,
      status: this.status,
      create_date: this.create_date,
    });
  }

  update(request: Request): Promise<void> {
    return Transaction_Token_User.update(
      request,
      {
        id: this.id,
        user_id: this.user_id,
        token_id: this.token_id,
        status: this.status,
        create_date: this.create_date,
      },
      {
        id: this.id,
      }
    );
  }

  delete(request: Request, id: number): Promise<void> {
    return Transaction_Token_User.delete(request, {
      id: id,
    });
  }

  static async find(
    request: Request,
    condition: ITransaction_Token_User
  ): Promise<Transaction_Token_User[]> {
    const recordset = await this.builder.find(request, condition);
    return recordset.map((item) => new Transaction_Token_User(item));
  }

  static async findOne(
    request: Request,
    condition: ITransaction_Token_User
  ): Promise<Transaction_Token_User> {
    const item = await this.builder.findOne(request, condition);
    return item == null ? (null as any) : new Transaction_Token_User(item);
  }

  static async count(
    request: Request,
    condition: ITransaction_Token_User
  ): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(
    request: Request,
    params: ITransaction_Token_User
  ): Promise<string | number> {
    return this.builder.insert(request, params);
  }

  static update(
    request: Request,
    params: ITransaction_Token_User,
    condition: ITransaction_Token_User
  ): Promise<void> {
    return this.builder.update(request, params, condition);
  }

  static delete(
    request: Request,
    condition: ITransaction_Token_User
  ): Promise<void> {
    return this.builder.delete(request, condition);
  }
}
