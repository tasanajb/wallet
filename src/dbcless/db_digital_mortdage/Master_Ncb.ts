import sql, { Request } from "mssql";
import { SqlBuilder } from "../db_wallet/SqlUtility";

interface IMaster_NcbMethod {
  load(request: Request, id: number | IMaster_Ncb): Promise<void>;
  update(request: Request): Promise<void>;
  delete(request: Request, id: number): Promise<void>;
  loadByData(data: IMaster_Ncb): void;
  insert(request: Request): Promise<string | number>;
}

export interface IMaster_Ncb {
  id?: number;
  ncb_id?: string;
  is_ncb?: boolean;
  is_ncb_terms?: boolean;
  ncb_status_code?: string;
  ncb_type?: string;
  ncb_count?: number;
  bank_code?: string;
  bank_mode?: number;
  reference_id?: string;
  ndid_request_id?: string;
  ndid_response?: string;
  customer_id?: string;
  booking_no?: string;
  contract_id?: string;
  contract_no?: string;
  project_code?: string;
  project_name?: string;
  create_date?: Date;
  update_date?: Date;
  ncb_date_of_expiry?: Date;
  ndid_reference?: number;
  request_params?: string;
}

export class Master_Ncb implements IMaster_Ncb, IMaster_NcbMethod {
  id?: number;
  ncb_id?: string;
  is_ncb?: boolean;
  is_ncb_terms?: boolean;
  ncb_status_code?: string;
  ncb_type?: string;
  ncb_count?: number;
  bank_code?: string;
  bank_mode?: number;
  reference_id?: string;
  ndid_request_id?: string;
  ndid_response?: string;
  customer_id?: string;
  booking_no?: string;
  contract_id?: string;
  contract_no?: string;
  project_code?: string;
  project_name?: string;
  create_date?: Date;
  update_date?: Date;
  ncb_date_of_expiry?: Date;
  ndid_reference?: number;
  request_params?: string;

  static builder: SqlBuilder = new SqlBuilder(
    "Master_Ncb",
    {
      id: { name: "Id", type: sql.Int, is_identity: true, is_primary: true },
      ncb_id: { name: "NcbId", type: sql.NVarChar, is_identity: false, is_primary: true },
      is_ncb: { name: "IsNcb", type: sql.Bit, is_identity: false, is_primary: false },
      is_ncb_terms: { name: "IsNcbTerms", type: sql.Bit, is_identity: false, is_primary: false },
      ncb_status_code: { name: "NcbStatusCode", type: sql.NVarChar, is_identity: false, is_primary: false },
      ncb_type: { name: "NcbType", type: sql.NVarChar, is_identity: false, is_primary: false },
      ncb_count: { name: "NcbCount", type: sql.Int, is_identity: false, is_primary: false },
      bank_code: { name: "BankCode", type: sql.NVarChar, is_identity: false, is_primary: false },
      bank_mode: { name: "BankMode", type: sql.Int, is_identity: false, is_primary: false },
      reference_id: { name: "ReferenceId", type: sql.NVarChar, is_identity: false, is_primary: false },
      ndid_request_id: { name: "NdidRequestId", type: sql.NVarChar, is_identity: false, is_primary: false },
      ndid_response: { name: "NdidResponse", type: sql.NVarChar, is_identity: false, is_primary: false },
      customer_id: { name: "CustomerId", type: sql.NVarChar, is_identity: false, is_primary: false },
      booking_no: { name: "BookingNo", type: sql.NVarChar, is_identity: false, is_primary: false },
      contract_id: { name: "ContractId", type: sql.NVarChar, is_identity: false, is_primary: false },
      contract_no: { name: "ContractNo", type: sql.NVarChar, is_identity: false, is_primary: false },
      project_code: { name: "ProjectCode", type: sql.NVarChar, is_identity: false, is_primary: false },
      project_name: { name: "ProjectName", type: sql.NVarChar, is_identity: false, is_primary: false },
      create_date: { name: "CreateDate", type: sql.DateTime, is_identity: false, is_primary: false },
      update_date: { name: "UpdateDate", type: sql.DateTime, is_identity: false, is_primary: false },
      ncb_date_of_expiry: { name: "NcbDateOfExpiry", type: sql.DateTime, is_identity: false, is_primary: false },
      ndid_reference: { name: "NdidReference", type: sql.Int, is_identity: false, is_primary: false },
      request_params: { name: "RequestParams", type: sql.NVarChar, is_identity: false, is_primary: false },
    },
    ["id"],
    ["id", "ncb_id", "is_ncb", "is_ncb_terms", "ncb_status_code", "ncb_type", "ncb_count", "bank_code", "bank_mode", "reference_id", "ndid_request_id", "ndid_response", "customer_id", "booking_no", "contract_id", "contract_no", "project_code", "project_name", "create_date", "update_date", "ncb_date_of_expiry", "ndid_reference", "request_params"]
  );

  constructor(request?: Request | IMaster_Ncb, id?: number) {
    if (id) {
      if (request == null) throw new Error("Pool request is required.");
      this.load(request as Request, id);
    }
    else {
      if (request instanceof Request) {
        throw new Error("id is required.");
      }
      this.loadByData(request as IMaster_Ncb);
    }
  }

  async load(request: Request, id: number): Promise<void> {
    const item = await Master_Ncb.findOne(request, { id: id });
    this.loadByData(item);
  }

  loadByData(data: IMaster_Ncb): void {
    this.id = data.id;
    this.ncb_id = data.ncb_id;
    this.is_ncb = data.is_ncb;
    this.is_ncb_terms = data.is_ncb_terms;
    this.ncb_status_code = data.ncb_status_code;
    this.ncb_type = data.ncb_type;
    this.ncb_count = data.ncb_count;
    this.bank_code = data.bank_code;
    this.bank_mode = data.bank_mode;
    this.reference_id = data.reference_id;
    this.ndid_request_id = data.ndid_request_id;
    this.ndid_response = data.ndid_response;
    this.customer_id = data.customer_id;
    this.booking_no = data.booking_no;
    this.contract_id = data.contract_id;
    this.contract_no = data.contract_no;
    this.project_code = data.project_code;
    this.project_name = data.project_name;
    this.create_date = data.create_date;
    this.update_date = data.update_date;
    this.ncb_date_of_expiry = data.ncb_date_of_expiry;
    this.ndid_reference = data.ndid_reference;
    this.request_params = data.request_params;
  }

  insert(request: Request): Promise<string | number> {
    return Master_Ncb.insert(request, {
      id: this.id,
      ncb_id: this.ncb_id,
      is_ncb: this.is_ncb,
      is_ncb_terms: this.is_ncb_terms,
      ncb_status_code: this.ncb_status_code,
      ncb_type: this.ncb_type,
      ncb_count: this.ncb_count,
      bank_code: this.bank_code,
      bank_mode: this.bank_mode,
      reference_id: this.reference_id,
      ndid_request_id: this.ndid_request_id,
      ndid_response: this.ndid_response,
      customer_id: this.customer_id,
      booking_no: this.booking_no,
      contract_id: this.contract_id,
      contract_no: this.contract_no,
      project_code: this.project_code,
      project_name: this.project_name,
      create_date: this.create_date,
      update_date: this.update_date,
      ncb_date_of_expiry: this.ncb_date_of_expiry,
      ndid_reference: this.ndid_reference,
      request_params: this.request_params,
    });
  }

  update(request: Request): Promise<void> {
    return Master_Ncb.update(request, {
      id: this.id,
      ncb_id: this.ncb_id,
      is_ncb: this.is_ncb,
      is_ncb_terms: this.is_ncb_terms,
      ncb_status_code: this.ncb_status_code,
      ncb_type: this.ncb_type,
      ncb_count: this.ncb_count,
      bank_code: this.bank_code,
      bank_mode: this.bank_mode,
      reference_id: this.reference_id,
      ndid_request_id: this.ndid_request_id,
      ndid_response: this.ndid_response,
      customer_id: this.customer_id,
      booking_no: this.booking_no,
      contract_id: this.contract_id,
      contract_no: this.contract_no,
      project_code: this.project_code,
      project_name: this.project_name,
      create_date: this.create_date,
      update_date: this.update_date,
      ncb_date_of_expiry: this.ncb_date_of_expiry,
      ndid_reference: this.ndid_reference,
      request_params: this.request_params,
    }, {
      id: this.id
    });
  }

  delete(request: Request, id: number): Promise<void> {
    return Master_Ncb.delete(request, {
      id: id
    });
  }

  static async find(request: Request, condition: IMaster_Ncb): Promise<Master_Ncb[]> {
    const recordset = await this.builder.find(request, condition);
    return recordset.map(item => new Master_Ncb(item));
  }

  static async findOne(request: Request, condition: IMaster_Ncb): Promise<Master_Ncb> {
    const item = await this.builder.findOne(request, condition);
    return item == null ? null as any : new Master_Ncb(item);
  }

  static async count(request: Request, condition: IMaster_Ncb): Promise<number> {
    return await this.builder.count(request, condition);
  }

  static insert(request: Request, params: IMaster_Ncb): Promise<string | number> {
    return this.builder.insert(request, params);
  }

  static update(request: Request, params: IMaster_Ncb, condition: IMaster_Ncb): Promise<void> {
    return this.builder.update(request, params, condition);
  }

  static delete(request: Request, condition: IMaster_Ncb): Promise<void> {
    return this.builder.delete(request, condition);
  }
}