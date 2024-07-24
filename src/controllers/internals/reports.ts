import { Request, Response } from "express";
import { createRequestSecond, createRequest } from "../../config";
import sql from "mssql";
import _, { isNull } from "lodash";
import { maskCard, CardMaskOptions, maskString, StringMaskOptions } from 'maskdata';
import { Master_Developer, Master_Project } from "../../dbcless/db_digital_mortdage";
import fs from 'fs';
import { snakeCaseKeys } from "../../utility";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { Master_Email, Transaction_Email, Transaction_Report } from "../../dbcless/db_wallet";
let number_of_customer: string;

export const reportNcb = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            developer_code,
            project_code,
            start_date,
            end_date,
            start_send_date,
            end_send_date,
        } = req.body;
        number_of_customer = req.body.number_of_customer

        let transaction_data = await createRequest()
            .query(` 
                SELECT TransactionId 
                FROM Transaction_Activity_Log
                WHERE Type = 'หักเครดิต(ncb)' AND IsCredit = '1'
            `)
        let trans_id: any = [];
        transaction_data.recordset.forEach(element => {
            trans_id.push(element.TransactionId)
        })

        let check_date = '';
        if (start_date && end_date) {
            check_date = 'AND CONVERT(date, n.CreateDate) BETWEEN @start_date AND @end_date';
        }
        let check_date_sent = '';
        if (start_date && end_date) {
            check_date = 'AND CONVERT(date, n.UpdateDate) BETWEEN @start_send_date AND @end_send_date';
        }

        let ncb_data = await createRequestSecond()
            .input("ncb_id", sql.NVarChar, trans_id.join(","))
            .input("developer_code", sql.NVarChar, developer_code)
            .input("project_code", sql.NVarChar, project_code)
            .input("start_date", sql.NVarChar, start_date)
            .input("end_date", sql.NVarChar, end_date)
            .input("start_send_date", sql.NVarChar, start_send_date)
            .input("end_send_date", sql.NVarChar, end_send_date)
            .query(
                `
                DECLARE @TempTable TABLE (NcbId NVARCHAR(50))
                INSERT INTO @TempTable (NcbId) SELECT value FROM STRING_SPLIT(@ncb_id, ',')

                SELECT  n.CreateDate, n.NcbId, d.DeveloperName, p.ProjectName, n.RequestParams
                , c.Name, n.UpdateDate, n.ReferenceId, n.NdidRequestId
                FROM Master_Ncb  n 
                LEFT JOIN Master_Project p ON n.ProjectCode = p.ProjectCode 
                LEFT JOIN Master_Developer d ON p.DeveloperCode = d.DeveloperCode
                LEFT JOIN Master_Ncb_Status c ON n.NcbStatusCode = c.NcbStatusCode 
                WHERE n.NcbId IN ( SELECT NcbId FROM @TempTable) 
                AND p.DeveloperCode LIKE '%' + @developer_code + '%'  
                AND p.ProjectCode LIKE  '%' +  @project_code + '%'
                ${check_date}
                ${check_date_sent}
                ORDER BY n.CreateDate ASC
            `
            );
        let format_props: any = [];
        ncb_data.recordset.forEach((element, index) => {
            let request_params = JSON.parse(element.RequestParams)
            const paddedNumber = String(index + 1).padStart(6, '0');
            let date_create = formatDate(element.CreateDate);
            let date_respond = formatDate(element.UpdateDate);
            let card_id = maskNumber(request_params.citizen_id)
            let phone = maskNumber(request_params.mobile_number)
            let name = maskName(request_params.customer_name)

            format_props.push(
                {
                    no: index + 1,
                    date: date_create.date,
                    ncb_id: element.NcbId,
                    dev_name: element.DeveloperName,
                    project_name: element.ProjectName,
                    unit_code: '',
                    data_type: 'D',
                    customer_no: paddedNumber,
                    customer_name: name,
                    customer_id: card_id,
                    customer_phone: phone,
                    ncb_pay: 200,
                    ncb_commission: 60,
                    ncb_fee: 140,
                    ncb_status: element.Name,
                    ncb_respond_date: date_respond.date,
                    ndid: element.NdidRequestId,
                    ncb_token: '',
                    set_id: element.ReferenceId,
                }
            )
        })

        let found: any;
        if (number_of_customer) {
            found = await format_props.find(serchData);
        };
        let date = formatDate(Date.now())
        let data_select = number_of_customer ? found : format_props

        let sum_ncb_pay = (200 * (found ? 1 : data_select ? data_select.length : 0))
        let sum_ncb_commission = (60 * (found ? 1 : data_select ? data_select.length : 0))
        let sum_ncb_fee = (140 * (found ? 1 : data_select ? data_select.length : 0))

        res.status(200).send({
            status: 200,
            message: "success",
            export_date: date.date,
            sum_ncb_pay: sum_ncb_pay,
            sum_ncb_commission: sum_ncb_commission,
            sum_ncb_fee: sum_ncb_fee,
            data: data_select
        });
    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}
export const reportNcbText = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            developer_code,
            project_code,
            start_date,
            end_date,
            start_send_date,
            end_send_date,
        } = req.body;
        number_of_customer = req.body.number_of_customer

        let obj = {
            // header
            header_record_type: 'H', //1-1 
            header_sequence_no: '000001', //2-6 H000001  1 หมายถึงบรรทัดที่ 1
            header_bank_code: '999', //8-3
            header_company_ac: createSpace(10), //11-10
            header_company_name: createSpace(27) + 'ICONFRAMEWORK', //21-40
            header_affective_date: createSpace(8), //61-8 DDMMYYYY Day - 1 หรือวันที่ของรายการที่ใช้ประมวลผล
            header_service_code: createSpace(8), //69-8
            header_spare: createSpace(180), //77-180
            // data
            data_record_type: 'D', //1-1 
            data_sequence_no: '000001',  //2-6 run ตามจำนวนข้อมูล  D000002  2 หมายถึงบรรทัดที่ 2  ....D000003 D000004 ไปเรื่อยๆตามข้อมูล
            data_bank_code: createSpace(3), //8-3
            data_company_account: createSpace(10), //11-10
            data_payment_date: '', //21-8 วันที่จ่าย DDMMYYYY  *
            data_payment_time: '', //29-6 วันที่จ่าย HHMMSS *
            data_customer_name: '', //35-50
            data_customer_id: '', //85-20 customet No/Ref 1
            data_customer_phone: '', //105-20  Ref 2
            data_ref_ndid: '', //125-20  Ref 3
            data_branch_no: createSpace(4), //145-4  
            data_teller_no: createSpace(4), //149-4  
            data_kind_of_transection: 'C', //153-1
            data_transection_code: '000', //154-3 by p'oat
            data_cheque_no: createSpace(7), //157-7
            data_amount: '0000000020000', //164-13 fix 200  * 100 ใช้เป็นหน่วยสตางค์
            data_cheque_bank_code: createSpace(3), //177-3
            data_spare: createSpace(77), //180-77
            // total
            total_record_type: 'T', //1-1 
            total_sequence_no: 'sum data + 2',  //2-6  > 6 หลัก เปลี่ยนไฟล์ใหม่ T000003 3 หมายถึงบรรทัดที่ 3  ตัวเลขคือเลขบรรทัดที่ข้อมูลอยู่
            total_bank_code: createSpace(3),  //8-3
            total_company_ac: createSpace(10), //11-10
            total_debit_payment_comm: createSpace(13), //21-13
            total_debit_transection: createSpace(6), //34-6
            total_debit_payment_amt: '', //40-13 200 * Data
            total_credit_transection: '', //53-6 sum Data
            total_total_discount: createSpace(13), //59-13
            total_total_vat: createSpace(10), //72-10
            total_spare: createSpace(175), //82-175
        }


        let transaction_data = await createRequest()
            .query(` 
            SELECT t.TransactionId, o.CreateDate
            FROM  Transaction_Activity_Log t
            LEFT JOIN  Transaction_Out_Log o ON t.ReferanceId = o.OrderCode
            WHERE t.Type = 'หักเครดิต(ncb)' AND t.IsCredit = '1'
        `)
        let trans_id: any = [];
        transaction_data.recordset.forEach(element => {
            trans_id.push(element.TransactionId)
        })

        let check_date = '';
        if (start_date && end_date) {
            check_date = 'AND CONVERT(date, n.CreateDate) BETWEEN @start_date AND @end_date';
        }
        let check_date_sent = '';
        if (start_date && end_date) {
            check_date = 'AND CONVERT(date, n.UpdateDate) BETWEEN @start_send_date AND @end_send_date';
        }

        let ncb_data = await createRequestSecond()
            .input("ncb_id", sql.NVarChar, trans_id.join(","))
            .input("developer_code", sql.NVarChar, developer_code)
            .input("project_code", sql.NVarChar, project_code)
            .input("start_date", sql.NVarChar, start_date)
            .input("end_date", sql.NVarChar, end_date)
            .input("start_send_date", sql.NVarChar, start_send_date)
            .input("end_send_date", sql.NVarChar, end_send_date)
            .query(
                `
                DECLARE @TempTable TABLE (NcbId NVARCHAR(50))
                INSERT INTO @TempTable (NcbId) SELECT value FROM STRING_SPLIT(@ncb_id, ',')

                SELECT  n.NcbId, n.RequestParams, n.NdidReference, n.IconReferenceNdid
                FROM Master_Ncb  n 
                LEFT JOIN Master_Project p ON n.ProjectCode = p.ProjectCode 
                LEFT JOIN Master_Developer d ON p.DeveloperCode = d.DeveloperCode
                LEFT JOIN Master_Ncb_Status c ON n.NcbStatusCode = c.NcbStatusCode 
                WHERE n.NcbId IN ( SELECT NcbId FROM @TempTable) 
                AND c.NcbStatusCode = 'NCB05'
                AND p.DeveloperCode LIKE '%' + @developer_code + '%'  
                AND p.ProjectCode LIKE  '%' +  @project_code + '%'
                ${check_date}
                ${check_date_sent}
                ORDER BY n.CreateDate ASC
            `
            );

        let ncb_txt_data: any = "";
        ncb_data.recordset.forEach((element, index) => {
            let customer_data = JSON.parse(element.RequestParams)
            const paddedNumber = String(index + 2).padStart(6, '0');
            let trans_data = transaction_data.recordset.find(({ TransactionId }) => TransactionId === element.NcbId);
            let date = formatDate(trans_data.CreateDate, 'txt');
            let check_name_length = (50 - (customer_data.customer_name.length))

            let space_name = createSpace(check_name_length);
            let space_id = createSpace(7);
            let space_phone = createSpace(10);
            let ndid_length = 20 - (JSON.stringify(element.IconReferenceNdid).length);
            let space_ndid = createSpace(ndid_length);

            ncb_txt_data += obj.data_record_type;
            ncb_txt_data += paddedNumber;
            ncb_txt_data += obj.data_bank_code;
            ncb_txt_data += obj.data_company_account;
            ncb_txt_data += date.date;
            ncb_txt_data += date.time;
            ncb_txt_data += space_name + customer_data.customer_name;
            ncb_txt_data += space_id + customer_data.citizen_id;
            ncb_txt_data += space_phone + customer_data.mobile_number;
            ncb_txt_data += space_ndid + element.IconReferenceNdid;
            ncb_txt_data += obj.data_branch_no;
            ncb_txt_data += obj.data_teller_no;
            ncb_txt_data += obj.data_kind_of_transection;
            ncb_txt_data += obj.data_transection_code;
            ncb_txt_data += obj.data_cheque_no;
            ncb_txt_data += obj.data_amount;
            ncb_txt_data += obj.data_cheque_bank_code;
            ncb_txt_data += obj.data_spare;
            ncb_txt_data += '\n';
        });

        const total_no = String(ncb_data.recordset.length + 2).padStart(6, '0');
        const credit_transection = String(ncb_data.recordset.length).padStart(6, '0');
        const payment_amt = String((ncb_data.recordset.length) * 200 * 100).padStart(13, '0');
        let ncb_header = obj.header_record_type + obj.header_sequence_no + obj.header_bank_code
            + obj.header_company_ac + obj.header_company_name + obj.header_affective_date
            + obj.header_service_code + obj.header_spare
        let ncb_total = obj.total_record_type + total_no + obj.total_bank_code + obj.total_company_ac
            + obj.total_debit_payment_comm + obj.total_debit_transection + payment_amt + credit_transection
            + obj.total_total_discount + obj.total_total_vat + obj.total_spare
        let ncb_txt = ncb_header + '\n' + ncb_txt_data + ncb_total

        const filePath = 'report-ncb.txt';
        const fileContent = ncb_txt;
        fs.writeFile(filePath, fileContent, (err) => {
            if (err) {
                res.status(500).send('Error creating the file');
                return;
            }
            res.download(filePath, (err) => {
                if (err) {
                    console.error('Error downloading the file:', err);
                }
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error('Error deleting the file:', err);
                    }
                });
            });
        });
    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}

export const reportLoan = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            developer_code,
            project_code,
            start_date,
            end_date,
            booking_no,
            contract_no
        } = req.body;

        let report_type = req.url

        let transaction_data = await createRequest()
            .query(` 
            SELECT DISTINCT  a.TransactionId,  o.CreateDate, o.Status
            FROM Transaction_Activity_Log a
            LEFT JOIN Transaction_Out_Log o on a.ReferanceId = o.OrderCode
            WHERE a.Type = 'หักเครดิต(ncb)' AND a.IsCredit = '1'
        `)
        let trans_id: any = [];
        transaction_data.recordset.forEach(element => {
            trans_id.push(element.TransactionId)
        })

        let check_date = '';
        if (start_date && end_date) {
            check_date = 'AND CONVERT(date,  n.CreateDate ) BETWEEN @start_date AND @end_date';
        }

        let ncb_data = await createRequestSecond()
            .input("ncb_id", sql.NVarChar, trans_id.join(","))
            .input("developer_code", sql.NVarChar, developer_code)
            .input("project_code", sql.NVarChar, project_code)
            .input("start_date", sql.NVarChar, start_date)
            .input("end_date", sql.NVarChar, end_date)
            .input("booking_no", sql.NVarChar, booking_no)
            .input("contract_no", sql.NVarChar, contract_no)
            .query(
                `
                DECLARE @TempTable TABLE (NcbId NVARCHAR(50))
                INSERT INTO @TempTable (NcbId) SELECT value FROM STRING_SPLIT(@ncb_id, ',')

                SELECT  n.NcbId, n.CreateDate, n.BookingNo,u.UnitNo, n.ContractNo, p.DeveloperName, p.ProjectName, n.RequestParams, c.Name, n.UpdateDate, n.ReferenceId, n.NdidRequestId
                FROM Master_Ncb  n 
                LEFT JOIN Master_Project p ON n.ProjectCode = p.ProjectCode 
                LEFT JOIN Master_Developer d ON p.DeveloperCode = d.DeveloperCode
                LEFT JOIN Master_Ncb_Status c ON n.NcbStatusCode = c.NcbStatusCode 
                LEFT JOIN Master_Unit u ON n.UnitId = u.UnitId
                WHERE n.NcbId IN ( SELECT NcbId FROM @TempTable) 
                AND p.DeveloperCode LIKE '%' + @developer_code + '%'  
                AND p.ProjectCode LIKE  '%' +  @project_code + '%'
                AND ISNULL(n.BookingNo, '') LIKE '%' + @booking_no + '%'
                AND ISNULL(n.ContractNo, '') LIKE '%' + @contract_no + '%'
                ${check_date}
                ORDER BY n.CreateDate ASC
                `
            )

        let format_props: any = [];
        ncb_data.recordset.forEach((element, index) => {

            let customer_data = JSON.parse(element.RequestParams)
            let trans_data = transaction_data.recordset.find(({ TransactionId }) => TransactionId === element.NcbId);
            const paddedNumber = String(index + 1).padStart(7, '0');
            let date_create = formatDate(element.CreateDate);
            let date_pay = formatDate(trans_data.CreateDate);
            let date_sent_ncb = element.UpdateDate ? formatDate(element.UpdateDate) : formatDate(element.CreateDate);
            let set_name = customer_data.customer_name
            let card_id = maskNumber(customer_data.citizen_id);
            let phone = maskNumber(customer_data.mobile_number);
            let name = maskName(set_name);

            format_props.push(
                {
                    no: index + 1,
                    create_date: date_create.date,
                    unit_no: element.UnitNo != null ? element.UnitNo : '',
                    booking_no: element.BookingNo,
                    contract_no: element.ContractNo != null ? element.ContractNo : '',
                    customer_id_rem: customer_data["member_id"] ? customer_data.member_id : '',
                    developer_name: element.DeveloperName,
                    project_name: element.ProjectName,
                    customer_name: name,
                    citizen_id: card_id,
                    mobile_number: phone,
                    service: 500,
                    pay_date: date_pay.date,
                    pay_time: date_pay.time,
                    status: trans_data.Status,
                    date_sent_NCB: date_sent_ncb.date,
                }
            )
            if (report_type === '/report/loan/1') {
                format_props[index].request_id_ndid = element.NdidRequestId
                format_props[index].ncb_token = ''
                format_props[index].reference_icon = paddedNumber
                format_props[index].request_id_set = element.ReferenceId
            }
        })
        let sum_service = (500 * (format_props.length))
        let date = formatDate(Date.now())

        res.status(200).send({
            status: 200,
            message: "success",
            export_date: date.date,
            sum_service: sum_service,
            data: format_props
        });

    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}
export const reportLoanSelf = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            start_date,
            end_date,
            developer_code,
            project_code,
            booking_no,
            contract_no
        } = req.body;

        let transaction_data = await createRequest()
            .query(` 
            SELECT TransactionId, Description, CreateDate, UpdateDate 
            FROM Transaction_Activity_Log
            WHERE Type = 'หักเครดิต(loan)' 
            AND IsCredit = '1'
        `)
        let trans_id: any = [];
        transaction_data.recordset.forEach(element => {
            trans_id.push(element.TransactionId)
        })

        let check_date = '';
        if (start_date && end_date) {
            check_date = 'AND CONVERT(date, l2.CreateDate ) BETWEEN @start_date AND @end_date';
        }

        let loan_data = await createRequestSecond()
            .input("start_date", sql.NVarChar, start_date)
            .input("end_date", sql.NVarChar, end_date)
            .input("loan_id", sql.NVarChar, trans_id.join(","))
            .input("developer_code", sql.NVarChar, developer_code)
            .input("project_code", sql.NVarChar, project_code)
            .input("booking_no", sql.NVarChar, booking_no)
            .input("contract_no", sql.NVarChar, contract_no)
            .query(
                `
            DECLARE @TempTable TABLE (LoanId NVARCHAR(50))
            INSERT INTO @TempTable (LoanId) SELECT value FROM STRING_SPLIT(@loan_id, ',')

            SELECT l2.CreateDate, l1.LoanId, u.UnitNo, l2.BookingNo, l2.ContractNo, c.MemberId, 
	        d.DeveloperName, p.ProjectName, l1.CustomerData, String_AGG(b.BankCode, ',') as Bank

            FROM Mapping_Loan l1
                LEFT JOIN Master_Loan l2 ON l1.LoanId = l2.LoanId
                LEFT JOIN Master_Unit u ON l2.UnitId = u.UnitId
                LEFT JOIN Master_Customer c ON l1.CustomerId = c.CustomerId
                LEFT JOIN Master_Developer d ON l2.DeveloperCode = d.DeveloperCode
                LEFT JOIN Master_Project p ON l2.ProjectCode = p.ProjectCode
                LEFT JOIN Mapping_Loan_Bank b ON l1.LoanId = b.LoanId AND b.IsSelectBank = '1'
            WHERE l1.LoanId IN ( SELECT LoanId FROM @TempTable)
                AND l1.TypeOfBorrower = 'Borrower'
                AND l2.DeveloperCode LIKE '%%'
                AND l2.ProjectCode LIKE '%%'
                AND ISNULL(l2.BookingNo, '') LIKE '%%'
                AND ISNULL(l2.ContractNo, '') LIKE '%%'
                ${check_date}
                GROUP BY l2.CreateDate, l1.LoanId, u.UnitNo, l2.BookingNo, l2.ContractNo, c.MemberId, 
                    d.DeveloperName, p.ProjectName, l1.CustomerData
                ORDER BY l2.CreateDate ASC
            `
            )

        let bank_list: any[] = [];
        let format_props: any = [];

        loan_data.recordset.forEach((element, index) => {
            let customer_data = JSON.parse(element.CustomerData)
            bank_list.push(isNull(element.Bank) ? [] : element.Bank.split(","))
            let trans_data = transaction_data.recordset.find(({ TransactionId }) => TransactionId === element.LoanId);
            let date = formatDate(element.CreateDate)
            let bulk_date = formatDate(trans_data.UpdateDate);
            let set_name = customer_data.customer.first_name + ' ' + customer_data.customer.last_name;
            let card_id = maskNumber(customer_data.customer.citizen_id)
            let phone = maskNumber(customer_data.customer.mobile_number)
            let name = maskName(set_name)

            format_props.push(
                {
                    no: index + 1,
                    create_date: date.date,
                    unit_no: element.UnitNo,
                    booking_no: element.BookingNo,
                    contract_no: element.ContractNo != null ? element.ContractNo : '',
                    customer_id_rem: element.MemberId != null ? element.MemberId : '',
                    developer_name: element.DeveloperName,
                    project_name: element.ProjectName,
                    customer_name: name,
                    citizen_id: card_id,
                    mobile_number: phone,
                    service: 300,
                    bulk_date: bulk_date.date,
                    bulk_time: bulk_date.time
                }
            )
            let size: number[] = [];
            let data: any[] = []
            bank_list.forEach(element => {
                data.push(element)
                size.push(element.length)
            })
            let bank_size = Math.max(...size);
            for (let i = 0; i < bank_size; i++) {
                format_props[index][`bank_${i + 1}`] = data[index][i] ? data[index][i] : ''
            }

            format_props[index]['banks'] = data[index]
        })

        let sum_service = (300 * (format_props.length))
        let item = format_props.length
        let date = formatDate(Date.now())
        res.status(200).send({
            status: 200,
            message: "success",
            export_date: date.date,
            sum_service: sum_service,
            sum_item: item,
            data: format_props,
        });
    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}
export const reportNdid = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            start_date,
            end_date
        } = req.body;

        let check_date = '';
        if (start_date && end_date) {
            check_date = 'AND CONVERT(date, a.CreateDate ) BETWEEN @start_date AND @end_date';
        }
        let stamp_data = await createRequest()
            .input("start_date", sql.NVarChar, start_date)
            .input("end_date", sql.NVarChar, end_date)
            .query(` 
                SELECT DISTINCT OrderCode, COUNT(OrderCode) as SumStamp
                    FROM  Transaction_Stamp_Log
                GROUP BY OrderCode
            `)
        let ndid_id: any = [];
        let stamp = 0;
        stamp_data.recordset.forEach(element => {
            ndid_id.push(element.OrderCode)
        })

        let stamp_code = await createRequestSecond()
            .input("start_date", sql.NVarChar, start_date)
            .input("end_date", sql.NVarChar, end_date)
            .input("ndid", sql.NVarChar, ndid_id.join(","))
            .query(
                `
                DECLARE @TempTable TABLE (NdidId NVARCHAR(MAX))
                INSERT INTO @TempTable (NdidId) SELECT value FROM STRING_SPLIT(@ndid, ',')

                SELECT a.NdidRequestId,b.Name as Status, c.Name as Partner
                FROM  Master_Ncb a
                LEFT JOIN Master_Ncb_Status b ON a.NcbStatusCode = b.NcbStatusCode 
                LEFT JOIN Master_Idp c ON a.BankCode = c.IdpId 
                WHERE  a.NdidRequestId IN ( SELECT NdidId FROM @TempTable)
                ${check_date}
            `
            )
        let format_props: any = [];
        stamp_code.recordset.forEach((element, index) => {
            let data_sum_stamp = stamp_data.recordset.find(({ OrderCode }) => OrderCode === element.NdidRequestId);
            format_props.push(
                {
                    no: index + 1,
                    partner_name: element.Partner,
                    role: 'RP',
                    ndid: element.NdidRequestId,
                    status: element.Status,
                    sum_stamp: data_sum_stamp.SumStamp
                }
            )
            stamp += data_sum_stamp.SumStamp
        })

        let item = format_props.length;
        let price = stamp * 3;
        let date = formatDate(Date.now())

        res.status(200).send({
            status: 200,
            message: "success",
            export_date: date.date,
            sum_item: item,
            sum_stamp: stamp,
            sum_price: price,
            data: format_props,
        });
    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}
export const reportSet = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            start_date,
            end_date
        } = req.body;

        let stamp_data = await createRequest()
            .query(` 
            select  Type, OrderCode, CreateDate
            from (
                  select Id, trans.Type , trans.OrderCode , trans.CreateDate, row_number() over (partition by trans.OrderCode order by Id desc) as rn
                   from Transaction_Stamp_Log AS trans
                  ) as t
            where t.rn = 1
        `)
        let ndid_id: any = [];
        stamp_data.recordset.forEach(element => {
            ndid_id.push(element.OrderCode)
        })

        let check_date = '';
        if (start_date && end_date) {
            check_date = 'AND CONVERT(date, a.CreateDate ) BETWEEN @start_date AND @end_date';
        }

        let set_data = await createRequestSecond()
            .input("start_date", sql.NVarChar, start_date)
            .input("end_date", sql.NVarChar, end_date)
            .input("ndid", sql.NVarChar, ndid_id.join(","))
            .query(`
            DECLARE @TempTable TABLE (NdidId NVARCHAR(MAX))
            INSERT INTO @TempTable (NdidId) SELECT value FROM STRING_SPLIT(@ndid, ',')

            SELECT a.ReferenceId,a.NdidRequestId, c.IdpId, a.CreateDate
            FROM  Master_Ncb a
            LEFT JOIN Master_Idp c ON a.BankCode = c.IdpId 
            WHERE  a.NdidRequestId IN ( SELECT NdidId FROM @TempTable)
            ${check_date}
        `)
        let format_props: any = [];
        set_data.recordset.forEach((element, index) => {
            let data_stamp = stamp_data.recordset.find(({ OrderCode }) => OrderCode === element.NdidRequestId);
            let date_create = formatDate(element.CreateDate)
            let date_update = formatDate(data_stamp.CreateDate)
            format_props.push(
                {
                    no: index + 1,
                    partner_name: "SET",
                    role: 'RP',
                    set: element.ReferenceId,
                    ndid: element.NdidRequestId,
                    create_date: date_create.date,
                    create_time: date_create.time,
                    update_date: date_update.date,
                    update_time: date_update.time,
                    status: data_stamp.Type,
                    price: 0,
                    idp: element.IdpId
                }
            )
        })
        let item = format_props.length;
        let price = item * 5;
        let date = formatDate(Date.now())
        res.status(200).send({
            status: 200,
            message: "success",
            export_date: date.date,
            sum_item: item,
            sum_price: price,
            data: format_props
        });

    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}

function formatDate(date_val: any, format_date?: string) {
    const set_date = new Date(date_val);
    let set_month = set_date.getMonth()
    let month: number = set_month + 1
    let date: any = '';
    let time: any = '';
    if (format_date != 'txt') {
        date = set_date.getDate() + '/' + month + '/' + set_date.getFullYear();
        time = set_date.getHours() + ':' + set_date.getMinutes() + ':' + set_date.getSeconds();
    } else {
        const paddedMonth = String(month).padStart(2, '0');
        const paddedDate = String(set_date.getDate()).padStart(2, '0');
        date = paddedDate + paddedMonth + set_date.getFullYear();

        const padded_hours = String(set_date.getHours()).padStart(2, '0');
        const padded_minutes = String(set_date.getMinutes()).padStart(2, '0');
        const padded_seconds = String(set_date.getSeconds()).padStart(2, '0');
        time = padded_hours + padded_minutes + padded_seconds;
    }
    return {
        date: date,
        time: time
    }
}
function maskNumber(val: string) {
    const options: CardMaskOptions = {
        maskWith: '*',
        unmaskedStartDigits: 3,
        unmaskedEndDigits: 3,
    };
    const data = maskCard(val, options);
    return data
}
function maskName(val: string) {
    let str = val.slice(4, -4)
    const stringMaskOptions: StringMaskOptions = {
        maskWith: "*",
        values: [str],
        maskAll: false,
        maskSpace: false
    };
    const strAfterMasking = maskString(val, stringMaskOptions);
    return strAfterMasking
}
function serchData(val: any) {
    return val.customer_no === number_of_customer;
}
function createSpace(val: number) {
    let space = '';
    for (let i = 0; i < val; i++) {
        space += '\xa0'
    }
    return space
}

export const developerList = async (
    req: Request,
    res: Response
) => {
    try {
        const dev_data = await Master_Developer.find(
            createRequestSecond(), {
        });
        let data: any = [];
        dev_data.forEach(element => {
            data.push({
                code: element.developer_code,
                name: element.developer_name,
            })
        })
        res.status(200).send({
            status: 200,
            message: "success",
            data: data
        });

    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}
export const projectList = async (
    req: Request,
    res: Response
) => {
    try {
        const project_data = await Master_Project.find(
            createRequestSecond(), {
        });
        let data: any = [];
        project_data.forEach(element => {
            data.push({
                code: element.project_code,
                name: element.project_name,
            })
        })
        res.status(200).send({
            status: 200,
            message: "success",
            data: data
        });

    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}

export const reportInSummary = async (
    req: Request,
    res: Response) => {
    try {
        const {
            period,
            start_date,
            end_date
        } = req.body;

        let check_date_sms = '';
        let check_date_ncb = '';
        let check_date_loan = '';
        if (start_date && end_date) {
            check_date_sms = 'WHERE CONVERT(date, o.CreateDate) BETWEEN @start_date AND @end_date';
            check_date_ncb = 'AND CONVERT(date, n.UpdateDate) BETWEEN @start_date AND @end_date';
            check_date_loan = 'AND CONVERT(date, l.UpdateDate) BETWEEN @start_date AND @end_date';
        }

        const sum_data: any = await createRequestSecond()
            .input("period", sql.Int, parseInt(period) || 0)
            .input("start_date", sql.NVarChar, start_date)
            .input("end_date", sql.NVarChar, end_date)
            .query(`
                CREATE TABLE #reporttable (Name NVARCHAR(100), IdCard NVARCHAR(100), Sms INT, Ncb INT, Loan INT, CreateDate NVARCHAR(100), Status NVARCHAR(100));

                INSERT INTO #reporttable (Name, IdCard, Sms, Ncb, Loan, CreateDate, Status)
                SELECT Name, IdCard, sum(Sms) as Sms, sum(Ncb) as Ncb, sum(Loan) as Loan,  
                    FORMAT(CreateDate, 'dd/MM/yyyy HH:mm') as CreateDate, Status
                FROM(
                    SELECT c.FirstName as Name,
                        o.CitizenId as IdCard,
                        count(*) as Sms,
                        0 as Ncb,
                        0 AS Loan,
                        o.CreateDate,
                        o.Token as Id,
                        CASE WHEN CONVERT(date, o.CreateDate + @period) >= CONVERT(date, getDate()) THEN ''
                        ELSE 'unsuccess' END as Status
                    FROM Transaction_Sms_Otp o
                    INNER JOIN Master_Customer c ON o.CitizenId = c.CitizenId
                    ${check_date_sms}
                    GROUP BY c.FirstName, o.CitizenId, o.CreateDate, o.Token

                    UNION ALL

                    SELECT c.FirstName as Name,
                        c.CitizenId as IdCard,
                        0 as Sms,
                        count(*) as Ncb,
                        0 AS Loan,
                        n.CreateDate,
                        n.NcbId as Id,
                        'success' as Status
                    FROM Master_Ncb n
                    INNER JOIN Master_Customer c ON n.CustomerId = c.CustomerId
                    INNER JOIN Master_Unit u ON n.UnitId = u.UnitId AND n.ProjectCode = n.ProjectCode
                    WHERE n.NcbStatusCode <> 'NCB01' AND u.DeveloperCode LIKE'%%' 
                    ${check_date_ncb}
                    GROUP BY c.FirstName, c.CitizenId, n.CreateDate, n.NcbId

                    UNION ALL

                    SELECT c.FirstName as Name,
                        c.CitizenId as IdCard,
                        0 as Sms,
                        0 as Ncb,
                        count(*) as Loan,
                        l.UpdateDate as CreateDate,
                        ml.LoanId as Id,
                        'success' as Status
                    FROM Master_Loan l
                    INNER JOIN Mapping_Loan ml ON l.LoanId = ml.LoanId 
                    INNER JOIN Master_Customer c ON c.CustomerId = ml.CustomerId
                    WHERE l.Status <> 'active' AND l.DeveloperCode LIKE'%%'
                    ${check_date_loan}
                    GROUP BY c.FirstName, c.CitizenId, l.UpdateDate,  ml.LoanId
                ) R
                GROUP BY Name, IdCard, CreateDate, Status
                order by Name , CreateDate asc

                SELECT Name, CONCAT(LEFT(IdCard, 3), '*******', RIGHT(IdCard, 3)) AS IdCard, 
                    Sms,Ncb, Loan , CreateDate, IdCard as CitizenId
                FROM #reporttable 

                SELECT Name, 
                    CONCAT(LEFT(IdCard, 3), '*******', RIGHT(IdCard, 3)) AS IdCard, 
                    SmsTotal,
                    NcbTotal, 
                    LoanTotal, 
                    CASE WHEN CountSuccess > 0 Then 'Success'
                        WHEN CountUnsuccess = 0 and CountSuccess = 0 THEN ''
                        ELSE 'Unsuccess' END 
                    as Status,
                    IdCard as CitizenId
                FROM (
                    SELECT Name, IdCard, sum(Sms) as SmsTotal, sum(Ncb) as NcbTotal, sum(Loan) as LoanTotal,
                        sum(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS CountSuccess,
                        sum(CASE WHEN status = 'unsuccess' THEN 1 ELSE 0 END) AS CountUnsuccess,
                        sum(CASE WHEN status = '' THEN 1 ELSE 0 END) AS CountEmpty
                    FROM #reporttable 
                    GROUP BY Name, IdCard
                ) T
                ORDER BY  Name

                DROP TABLE #reporttable
            `)

        let sum_list: any = [];
        let no: number = 0;
        if (sum_data.recordsets) {
            let sum_tran_data: any = snakeCaseKeys(sum_data.recordsets[0]);
            let sum_total_data: any = snakeCaseKeys(sum_data.recordsets[1]);
            let group_tran: any = _.groupBy(sum_tran_data, "citizen_id");
            let group_total: any = _.groupBy(sum_total_data, "citizen_id");
            for (const wkey in group_tran) {
                let tran_data: any = [];
                await group_tran[wkey].forEach((element: any, index: any) => {
                    tran_data.push(_.omit(element, ["name", "id_card", "citizen_id"]));
                });
                let total_data: any = group_total[wkey];
                no += 1;
                sum_list.push({
                    no: no,
                    name: total_data[0].name,
                    id_card: total_data[0].id_card,
                    transection: tran_data,
                    total: _.omit(total_data[0], ["name", "id_card", "citizen_id"])
                });
            }
        }

        res.status(200).send({
            status: 200,
            message: "success",
            data: sum_list
        })
    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}

export const reportInSumMonitering = async (
    req: Request,
    res: Response) => {
    try {
        const {
            year
        } = req.body;

        const sum_data: any = await createRequestSecond()
            .input("year", sql.NVarChar, year)
            .query(`
                CREATE TABLE #sumtable (Year NVARCHAR(100), Month NVARCHAR(100), Sms INT, Ncb INT, Loan INT, SmsOverRate NVARCHAR(200), NcbLoanRate NVARCHAR(100), MonthNumber INT);

                INSERT INTO #sumtable (Year, Month, Sms, Ncb, Loan, SmsOverRate, NcbLoanRate, MonthNumber)
                    SELECT Year, Month, sum(Sms) as Sms, sum(ncb) as Ncb, sum(Loan) as Loan, 
                            CONCAT(CONVERT(DECIMAL(18,2),ISNULL( ((SUM(Sms)- (SUM(ncb) + SUM(Loan)))/( NULLIF(SUM(ncb) + SUM(Loan) + 0.0 , 0))) * 100, 100)),'%') as SmsOverRate,
                            CONCAT(CONVERT(DECIMAL(18,2), ISNULL( ( ((SUM(ncb) + SUM(Loan)) - SUM(Sms))/(NULLIF(SUM(Sms) + 0.0,0))) * 100  , 100)), '%') as NcbLoanRate, 
                            MonthNumber
                    FROM (
                        SELECT YEAR(CreateDate) as Year,
                            DATENAME(month, CreateDate) AS Month, 
                            count(*) as Sms,
                            0 as Ncb,
                            0 AS Loan,
                            MONTH(CreateDate) as MonthNumber
                        FROM Transaction_Sms_Otp
                        WHERE YEAR(CreateDate) LIKE '%'+ @year +'%'
                        GROUP BY YEAR(CreateDate),DATENAME(month, CreateDate), MONTH(CreateDate)
            
                        UNION ALL
            
                        SELECT YEAR(n.UpdateDate) as Year,
                            DATENAME(month, n.UpdateDate) AS Month,
                            0 as Sms,
                            COUNT(*) AS Ncb,
                            0 as Loan,
                            MONTH(u.UpdateDate) as MonthNumber
                        FROM Master_ncb n
                        INNER JOIN Master_Unit u ON n.UnitId = u.UnitId AND n.ProjectCode = n.ProjectCode
                        WHERE n.NcbStatusCode <> 'NCB01' AND u.DeveloperCode LIKE'%%' AND YEAR(u.UpdateDate) LIKE '%'+ @year +'%'
                        GROUP BY YEAR(n.UpdateDate),DATENAME(month, n.UpdateDate), MONTH(u.UpdateDate)
            
                        UNION ALL
            
                        SELECT YEAR(l.UpdateDate) as Year,
                            DATENAME(month, l.UpdateDate) AS Month, 
                            0 as Sms,
                            0 as Ncb,
                            COUNT(*) AS Loan,
                            MONTH(l.UpdateDate) as MonthNumber
                        FROM Master_Loan l
                        INNER JOIN Mapping_Loan ml ON l.LoanId = ml.LoanId AND ml.TypeOfBorrower = 'Borrower'
                        WHERE l.Status <> 'active' AND l.DeveloperCode LIKE'%%' AND YEAR(l.UpdateDate) LIKE'%'+ @year +'%'
                        GROUP BY YEAR(l.UpdateDate),DATENAME(month, l.UpdateDate), MONTH(l.UpdateDate)
                    ) R
                    GROUP BY Year, Month, MonthNumber
                    ORDER BY   Year,  MonthNumber asc
                    
                SELECT Year, Month, Sms, Ncb, Loan, SmsOverRate, NcbLoanRate
                FROM #sumtable
                ORDER BY   Year, MonthNumber asc

                SELECT Year, SUM(Sms) as SmsTotal, SUM(Ncb) as NcbTotal, SUM(Loan) as LoanTotal, 
                    CONCAT(CONVERT(DECIMAL(18,2),ISNULL( ((SUM(Sms)- (SUM(ncb) + SUM(Loan)))/( NULLIF(SUM(ncb) + SUM(Loan) + 0.0 , 0))) * 100, 100)),'%') as SmsOverRateTotal,
                    CONCAT(CONVERT(DECIMAL(18,2), ISNULL( ( ((SUM(ncb) + SUM(Loan)) - SUM(Sms))/(NULLIF(SUM(Sms) + 0.0,0))) * 100  , 100)), '%') as NcbLoanRateTotal
                FROM #sumtable
                GROUP BY Year
                    
                DROP TABLE #sumtable
            `)

        let sum_list: any = [];
        if (sum_data.recordsets) {
            let sum_tran_data: any = snakeCaseKeys(sum_data.recordsets[0]);
            let sum_total_data: any = snakeCaseKeys(sum_data.recordsets[1]);
            let group_tran: any = _.groupBy(sum_tran_data, "year");
            let group_total: any = _.groupBy(sum_total_data, "year");
            for (const wkey in group_tran) {
                let tran_data: any = [];
                // const month_list: any = await generateMonthList();
                // const merged_data = await _.uniqBy([...group_tran[wkey], ...month_list], 'month_number');
                // const tran_data_month = await _.orderBy(merged_data.map(item => (
                //     {
                //     ...item,
                //     sms: item.sms || 0,
                //     ncb: item.ncb || 0,
                //     loan: item.loan || 0,
                //     sms_over_rate: item.sms_over_rate || "0%",
                //     ncb_loan_rate: item.ncb_loan_rate || "0%",
                //     year: item.year || wkey,
                // })), 'month_number');
                await group_tran[wkey].forEach((element: any, index: any) => {
                    tran_data.push(_.omit(element, ["year"]));
                });
                let total_data: any = group_total[wkey];
                sum_list.push({
                    year: wkey,
                    transection: tran_data,
                    total: _.omit(total_data[0], ["year"])
                });
            }
        }

        res.status(200).send({
            status: 200,
            message: "success",
            data: sum_list
        })
    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}

export const reportInSumByDev = async (
    req: Request,
    res: Response) => {
    try {
        const {
            year,
            developer_code
        } = req.body;

        const sum_data: any = await createRequestSecond()
            .input("year", sql.NVarChar, year)
            .input("developer_code", sql.NVarChar, developer_code)
            .query(`
                CREATE TABLE #sumdevtable (DeveloperCode NVarChar(200), DeveloperName NVarChar(200), Year NVARCHAR(100), Month NVARCHAR(100), Ncb INT, Loan INT, MonthNumber INT);

                INSERT INTO #sumdevtable (DeveloperCode, DeveloperName, Year, Month, Ncb, Loan, MonthNumber)
                    SELECT DeveloperCode, DeveloperName, Year, Month,  sum(Ncb) as Ncb, sum(Loan) as Loan , MonthNumber
                    FROM (
                        SELECT u.DeveloperCode,  d.DeveloperName, YEAR(n.UpdateDate) as Year,
                            DATENAME(month, n.UpdateDate) AS Month, 
                            COUNT(*) AS Ncb ,
                            0 as Loan,
                            MONTH(n.UpdateDate) as MonthNumber
                        FROM Master_Ncb n
                            INNER JOIN Master_Unit u ON n.UnitId = u.UnitId AND n.ProjectCode = n.ProjectCode
                            INNER JOIN Master_Developer d ON u.DeveloperCode = d.DeveloperCode
                        WHERE n.NcbStatusCode <> 'NCB01' AND u.DeveloperCode LIKE'%'+ @developer_code +'%' AND YEAR(u.UpdateDate) LIKE '%'+ @year +'%'
                        GROUP BY u.DeveloperCode,  d.DeveloperName, YEAR(n.UpdateDate),DATENAME(month, n.UpdateDate), MONTH(n.UpdateDate)
            
                        UNION ALL
            
                        SELECT l.DeveloperCode,  d.DeveloperName, YEAR(l.UpdateDate) as Year,
                            DATENAME(month, l.UpdateDate) AS Month, 
                            0 as Ncb,
                            COUNT(*) AS Loan,
                            MONTH(l.UpdateDate) as MonthNumber
                        FROM Master_Loan l
                            INNER JOIN Mapping_Loan ml ON l.LoanId = ml.LoanId AND ml.TypeOfBorrower = 'Borrower'
                            INNER JOIN Master_Developer d ON l.DeveloperCode = d.DeveloperCode
                        WHERE l.Status <> 'active' AND l.DeveloperCode LIKE'%'+ @developer_code +'%' AND YEAR(l.UpdateDate) LIKE '%'+ @year +'%'
                        GROUP BY l.DeveloperCode,  d.DeveloperName, YEAR(l.UpdateDate),DATENAME(month, l.UpdateDate), MONTH(l.UpdateDate)
                    ) R
                    GROUP BY DeveloperCode, DeveloperName, Year, Month, MonthNumber
                    ORDER BY  DeveloperCode, Year, MonthNumber asc
            
                SELECT DeveloperCode, DeveloperName, Year, Month, Ncb, Loan 
                FROM #sumdevtable 
                ORDER BY Year, MonthNumber, DeveloperCode
            
                SELECT DeveloperCode, SUM(Ncb) as NcbTotal, SUM(Loan) as LoanTotal 
                FROM #sumdevtable  
                GROUP BY DeveloperCode
            
                DROP TABLE #sumdevtable
            `)

        let sum_list: any = [];
        if (sum_data.recordsets) {
            let sum_tran_data: any = snakeCaseKeys(sum_data.recordsets[0]);
            let sum_total_data: any = snakeCaseKeys(sum_data.recordsets[1]);
            let group_tran: any = _.groupBy(sum_tran_data, "developer_code");
            let group_total: any = _.groupBy(sum_total_data, "developer_code");
            for (const wkey in group_tran) {
                let tran_data: any = [];
                let group_year_tran: any = _.groupBy(group_tran[wkey], "year");
                for (const year in group_year_tran) {
                    let data: any = [];
                    await group_year_tran[year].forEach((element: any, index: any) => {
                        data.push(_.omit(element, ["developer_code", "developer_name", "year"]));
                    });
                    tran_data.push({ year: year, data: data });
                }

                let total_data: any = group_total[wkey];
                sum_list.push({
                    developer_code: wkey,
                    developer_name: group_tran[wkey][0].developer_name,
                    transection: tran_data,
                    total: _.omit(total_data[0], ["developer_code"])
                });
            }
        }

        res.status(200).send({
            status: 200,
            message: "success",
            data: sum_list
        })
    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}


export const reportBulkSummary = async (
    req: Request,
    res: Response) => {
    try {
        const {
            start_date,
            end_date,
            developer_code,
            project_code,
        } = req.body;

        if (!start_date || !end_date || !developer_code) {
            return { status: 400, message: "กรุณาระบุ start_date, end_date และ developer_code" }
        }

        const developer = await Master_Developer.findOne(createRequest(), {
            developer_code: developer_code
        })

        if (!developer) {
            return res.status(400).send({ status: 400, message: "ไม่พบข้อมูลบริษัท" })
        }

        req.body.developer_name = developer?.developer_name;

        const summary_data = await reportBulkSumaryData(req.body);
        if (summary_data.status != 200) {
            throw summary_data;
        }

        res.status(200).send({
            status: 200,
            message: "success",
            data: summary_data?.data
        })
    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}

export const reportBulkDetail = async (
    req: Request,
    res: Response) => {
    try {
        const {
            start_date,
            end_date,
            developer_code,
            project_code,
        } = req.body;

        if (!start_date || !end_date || !developer_code) {
            return res.status(400).send({ status: 400, message: "กรุณาระบุ start_date, end_date และ developer_code" })
        }

        const developer = await Master_Developer.findOne(createRequest(), {
            developer_code: developer_code
        })

        if (!developer) {
            return res.status(400).send({ status: 400, message: "ไม่พบข้อมูลบริษัท" })
        }

        req.body.developer_name = developer?.developer_name;
        const summary_data = await reportBulkDetailData(req.body);
        if (summary_data.status != 200) {
            throw summary_data;
        }

        res.status(200).send({
            status: 200,
            message: "success",
            data: summary_data?.data
        })
    } catch (error) {
        res.status(500).send({ status: error.status || 500, message: error.message });
    }
}

export const reportBulkSummaryJob = async () => {
    try {
        const developer_all = await Master_Developer.find(createRequest(), {
            is_active: 1,
        });

        for (var i in developer_all) {
            let developer = developer_all[i];
            let developer_code = developer?.developer_code;
            try {
                const data: any = {
                    developer_code: developer_code,
                    developer_name: developer?.developer_name
                }

                const bulk_sum_data = await reportBulkSumaryData(data);
                if (bulk_sum_data.status == 200) {
                    const report_dup = await createRequest()
                        .input("developer_code", sql.NVarChar, developer_code)
                        .input("year", sql.NVarChar, bulk_sum_data?.data?.year)
                        .input("month", sql.NVarChar, bulk_sum_data?.data?.month)
                        .query(`
                        SELECT TOP 1 * FROM Transaction_Report 
                        WHERE Type = 'bulk' AND DeveloperCode = @developer_code AND Year = @year AND Month = @month
                        AND Status IN ('success','pending', 'wait email')
                    `)
                    let report_id = report_dup?.recordset[0]?.ReportId || "";

                    if (!report_dup.recordset[0]) {
                        const bulk_sum_detail = await reportBulkDetailData(data);
                        if (bulk_sum_detail.status == 200) {
                            const data_report: any = {
                                bulk_sum_data: bulk_sum_data?.data?.bulk_sum_data,
                                bulk_sum_detail: bulk_sum_detail?.data?.bulk_sum_detail
                            }
                            const data_coflict_report: any = {
                                bulk_sum_data: bulk_sum_data?.data?.bulk_conflict_data,
                                bulk_sum_detail: bulk_sum_detail?.data?.conflict_bulk_sum_detail
                            }
                            report_id = uuidv4();
                            await Transaction_Report.insert(createRequest(), {
                                report_id: report_id,
                                type: 'bulk',
                                data: JSON.stringify(data_report),
                                data_conflict: JSON.stringify(data_coflict_report),
                                is_conflict: bulk_sum_data?.data?.is_conflict,
                                developer_code: developer_code,
                                status: "pending",
                                month_number: bulk_sum_data?.data?.month_number,
                                month: bulk_sum_data?.data?.month,
                                year: bulk_sum_data?.data?.year,
                                create_date: new Date()
                            })
                        }
                    }

                    if (report_id) {
                        const tran_email = await Transaction_Email.findOne(createRequest(), {
                            job_id: report_id
                        })

                        if (!tran_email) {
                            let status = "pending";
                            const email = await Master_Email.findOne(createRequest(), {
                                developer_code: developer_code
                            })
                            if (!email || !email?.email_to) {
                                status = "wait email";
                            }

                            //insert tran email
                            await Transaction_Email.insert(createRequest(), {
                                send_to: email?.email_to || "",
                                send_cc: email?.email_cc ? `${email?.email_cc},` : "",
                                subject: `รายการสรุปยอดค่าใช้จ่ายประจำเดือน${bulk_sum_data?.data?.month}`,
                                body: `เรียน ${bulk_sum_data?.data?.bulk_sum_data?.developer_name}\n\nรายการสรุปยอดค่าใช้จ่ายประจำเดือน${bulk_sum_data?.data?.month}\nระหว่างวันที่ ${bulk_sum_data?.data?.bulk_sum_data?.between_date}\n\n\n\nขอแสดงความนับถือ\nบริษัท ไอคอน เฟรมเวิร์ค จำกัด`,
                                developer_code: developer_code,
                                create_date: new Date(),
                                error_count: 0,
                                status: status,
                                job_id: report_id
                            })
                        }

                    }
                }
            } catch (error) {
                console.log(`${developer_code}, Bulk Report error`);
            }
        }

        return true
    } catch (error) {
        return false
    }
}

export async function reportBulkSumaryData(data: any) {
    try {
        const {
            start_date,
            end_date,
            developer_code,
            developer_name,
            project_code,
        } = data;

        let database_dmg = process.env.DB_NAME_SECOND;

        const sum_data: any = await createRequest()
            .input("developer_code", sql.NVarChar, developer_code)
            .input("project_code", sql.NVarChar, project_code || '')
            .input("start", sql.NVarChar, start_date)
            .input("end", sql.NVarChar, end_date)
            .query(`
            DECLARE @start_date NVARCHAR(50) = @start
            DECLARE @end_date NVARCHAR(50) = @end
            --Find the start date of Month
            SET @start_date =
                (SELECT CASE WHEN ISNULL(@start_date, '') <> '' THEN @start_date ELSE(SELECT DATEFROMPARTS(YEAR(DATEADD(MONTH, -1, getDate())), MONTH(DATEADD(MONTH, -1, getDate())), 1)) END)
            SET @end_date = (SELECT CASE WHEN ISNULL(@end_date, '') <> '' THEN @end_date ELSE(SELECT DATEADD(DAY, -1, DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(DATEADD(MONTH, -1, getDate())), MONTH(DATEADD(MONTH, -1, getDate())), 1)))) END)
            DECLARE @month NVARCHAR(50) = FORMAT(CONVERT(DATETIME, @start_date), 'MMMM', 'th-TH')

                --map tran x set
            CREATE TABLE #temptran(TransactionId NVARCHAR(50), IsSet BIT)
            INSERT INTO #temptran(TransactionId, IsSet)
            SELECT DISTINCT n.NcbId as TransactionId,
                    CASE WHEN(n.NdidRequestId IN(SELECT OrderCode FROM Transaction_Stamp_Log) AND n.ReferenceId IS NOT NULL) OR(n.ReferenceId IN(SELECT OrderCode FROM Transaction_Stamp_Log))
            THEN 1 ELSE 0 END as IsSet
                FROM[${database_dmg}].[dbo].[Master_Ncb] n
            INNER JOIN[${database_dmg}].[dbo].[Master_Unit] u ON u.UnitId = n.UnitId AND u.DeveloperCode = @developer_code
            WHERE n.NcbStatusCode <> 'NCB01' AND n.ProjectCode LIKE'%' + @project_code + '%' 
            
            UNION ALL
            
            SELECT DISTINCT LoanId as TransactionId, IsSet = 1
                FROM[${database_dmg}].[dbo].[Master_Loan] 
            WHERE Status <> 'active' AND DeveloperCode = @developer_code AND ProjectCode LIKE'%' + @project_code + '%'
            
            
            CREATE TABLE #tempall(Detail NVARCHAR(200), Quantity INT, UnitPrice INT, Price INT, Month NVARCHAR(50), Type NVARCHAR(50))
            INSERT INTO #tempall(Detail, Quantity, UnitPrice, Price, Month, Type)
                VALUES(CONCAT('Loan Transaction Case 300 THB - เดือน', @month), 0, 300, 0, MONTH(@start_date), 'Loan'),
                    (CONCAT('NCB Transaction Case 500 THB - เดือน', @month), 0, 500, 0, MONTH(@start_date), 'NCB')
            
            CREATE TABLE #tempfree(Detail NVARCHAR(200), Quantity INT, UnitPrice INT, Price INT, Month NVARCHAR(50), Type NVARCHAR(50))
            INSERT INTO #tempfree(Detail, Quantity, UnitPrice, Price, Month, Type)
                VALUES('Bulk Free Loan Transaction Case 300 THB (Amount 0 Transaction)', 0, 300, 0, MONTH(@start_date), 'Loan'),
                    ('Bulk Free NCB Transaction Case 500 THB (Amount 0 Transaction)', 0, 500, 0, MONTH(@start_date), 'NCB')
            
            -------  start tran data -----------
                --transantion all
            CREATE TABLE #temptranall(Detail NVARCHAR(200), Quantity INT, UnitPrice INT, Price INT, Month NVARCHAR(50), Type NVARCHAR(50))
            INSERT INTO #temptranall(Detail, Quantity, UnitPrice, Price, Month, Type)
            SELECT CONCAT((CASE WHEN o.Amount = 500 THEN 'NCB' WHEN o.Amount = 300 THEN 'Loan' ELSE ''END), ' Transaction Case ', o.Amount, ' THB - เดือน', FORMAT(a.UpdateDate, 'MMMM', 'th-TH') ) as Detail,
                    COUNT(*) as Quantity, o.Amount as UnitPrice, (COUNT(*) * o.Amount) as Price, MONTH(a.UpdateDate) as Month, (CASE WHEN o.Amount = 500 THEN 'NCB' WHEN o.Amount = 300 THEN 'Loan' ELSE ''END) as Type
            FROM Transaction_Activity_Log a
            INNER JOIN Transaction_Out_Log o ON o.OrderCode = a.ReferanceId
            INNER JOIN Master_Developer d ON d.Id = a.DeveloperId AND d.DeveloperCode = @developer_code
                WHERE
                a.TransactionId IN(
                    SELECT TransactionId FROM #temptran WHERE IsSet = 1
                )
            AND CONVERT(date, a.UpdateDate) BETWEEN @start_date AND @end_date AND a.DescriptionCode = 'success'
            GROUP BY o.Amount, a.Type, MONTH(a.UpdateDate), FORMAT(a.UpdateDate, 'MMMM', 'th-TH')
            ORDER BY MONTH(a.UpdateDate)

                --transantion bulk free
            CREATE TABLE #temptranfree(Detail NVARCHAR(200), Quantity INT, UnitPrice INT, Price INT, Month NVARCHAR(50), Type NVARCHAR(50))
            INSERT INTO #temptranfree(Detail, Quantity, UnitPrice, Price, Month, Type)
            SELECT CONCAT((CASE WHEN o.Amount = 500 THEN 'Bulk Free NCB' WHEN o.Amount = 300 THEN 'Bulk Free Loan' ELSE ''END), ' Transaction Case ', o.Amount, ' THB', ' (Amount ', COUNT(*), ' Transaction)' ) as Detail,
                    COUNT(*) as Quantity, o.Amount as UnitPrice, (COUNT(*) * o.Amount) as Price,
                    MONTH(a.UpdateDate) as Month, (CASE WHEN o.Amount = 500 THEN 'NCB' WHEN o.Amount = 300 THEN 'Loan' ELSE ''END) as Type
            FROM Transaction_Activity_Log a
            INNER JOIN Transaction_Out_Log o ON o.OrderCode = a.ReferanceId
            INNER JOIN Master_Developer d ON  d.Id = a.DeveloperId AND d.DeveloperCode = @developer_code
                WHERE
                a.TransactionId IN(
                    SELECT TransactionId FROM #temptran WHERE IsSet = 1
                )
            AND CONVERT(date, a.UpdateDate) BETWEEN @start_date AND @end_date 
            AND a.DescriptionCode = 'success' AND a.IsCredit = 1 AND a.IsCreditFree = 1
            GROUP BY o.Amount, a.Type, MONTH(a.UpdateDate)
            ORDER BY MONTH(a.UpdateDate)
            -------  end tran data -----------

            -------  start conflict data -----------
            -- conflict transantion all
            CREATE TABLE #tempconflicttranall (Detail NVARCHAR(200), Quantity INT, UnitPrice INT, Price INT, Month NVARCHAR(50), Type NVARCHAR(50))
            INSERT INTO #tempconflicttranall (Detail, Quantity, UnitPrice, Price, Month, Type)
            SELECT CONCAT((CASE WHEN o.Amount = 500 THEN 'NCB' WHEN o.Amount = 300 THEN 'Loan' ELSE ''END), ' Transaction Case ', o.Amount , ' THB - เดือน',FORMAT(a.UpdateDate, 'MMMM', 'th-TH') ) as Detail, 
            COUNT(*) as Quantity, o.Amount as UnitPrice, (COUNT(*) * o.Amount) as Price, MONTH(a.UpdateDate) as Month, (CASE WHEN o.Amount = 500 THEN 'NCB' WHEN o.Amount = 300 THEN 'Loan' ELSE ''END) as Type
            FROM Transaction_Activity_Log a
            INNER JOIN Transaction_Out_Log o ON o.OrderCode = a.ReferanceId
            INNER JOIN Master_Developer d ON d.Id = a.DeveloperId AND d.DeveloperCode = @developer_code
            WHERE 
            a.TransactionId IN(
                SELECT TransactionId FROM #temptran WHERE IsSet = 0
            )
            AND 
            CONVERT(date, a.UpdateDate) BETWEEN @start_date AND @end_date AND a.DescriptionCode = 'success'
            GROUP BY o.Amount, a.Type, MONTH(a.UpdateDate),FORMAT(a.UpdateDate, 'MMMM', 'th-TH')
            ORDER BY MONTH(a.UpdateDate)
            
            -- conflict transantion bulk free
            CREATE TABLE #tempconflicttranfree (Detail NVARCHAR(200), Quantity INT, UnitPrice INT, Price INT, Month NVARCHAR(50), Type NVARCHAR(50))
            INSERT INTO #tempconflicttranfree (Detail, Quantity, UnitPrice, Price, Month, Type)
            SELECT CONCAT((CASE WHEN o.Amount = 500 THEN 'Bulk Free NCB' WHEN o.Amount = 300 THEN 'Bulk Free Loan' ELSE ''END),' Transaction Case ', o.Amount , ' THB', ' (Amount ' ,COUNT(*), ' Transaction)' ) as Detail, 
            COUNT(*) as Quantity, o.Amount as UnitPrice, (COUNT(*) * o.Amount) as Price, MONTH(a.UpdateDate) as Month, (CASE WHEN o.Amount = 500 THEN 'NCB' WHEN o.Amount = 300 THEN 'Loan' ELSE ''END) as Type
            FROM Transaction_Activity_Log a
            INNER JOIN Transaction_Out_Log o ON o.OrderCode = a.ReferanceId
            INNER JOIN Master_Developer d ON  d.Id = a.DeveloperId AND d.DeveloperCode = @developer_code
            WHERE 
            a.TransactionId IN(
                SELECT TransactionId FROM #temptran WHERE IsSet = 0
            )
            AND 
            CONVERT(date, a.UpdateDate) BETWEEN @start_date AND @end_date AND a.DescriptionCode = 'success' AND a.IsCredit = 1 AND a.IsCreditFree = 1
            GROUP BY o.Amount, a.Type, MONTH(a.UpdateDate)
            ORDER BY MONTH(a.UpdateDate)
            -------  end conflict data -----------

            -------  start select data -----------
                --0 transantion all
            SELECT ROW_NUMBER() OVER (ORDER BY a.Month) AS No, Detail, SUM(Quantity) as Quantity, UnitPrice, CAST(CONVERT(DECIMAL(18, 2), SUM(Price)) AS VARCHAR(255) ) as Price
                FROM(
                    SELECT Detail, Quantity, UnitPrice, Price, Type, Month FROM #temptranall
                UNION ALL
                SELECT Detail, Quantity, UnitPrice, Price, Type, Month FROM #tempall
                )a
            GROUP BY a.Detail, a.Type, a.UnitPrice, a.Month
            ORDER BY a.Month asc

                --1 transantion free
            SELECT ROW_NUMBER() OVER (ORDER BY f.Detail) AS No, Detail, SUM(Quantity) as Quantity, CONCAT('-', UnitPrice) as UnitPrice, CONCAT('-', CONVERT(DECIMAL(18, 2), SUM(Price))) as Price
                FROM(
                    SELECT Detail, Quantity, UnitPrice, Price, Type FROM #temptranfree
                UNION ALL
                SELECT Detail, Quantity, UnitPrice, Price, Type FROM #tempfree WHERE Type NOT IN(SELECT Type FROM #temptranfree)
                )f
            GROUP BY f.Detail, f.Type, f.UnitPrice

                --2 summary price
            SELECT CAST(CONVERT(DECIMAL(18, 2), SUM(PriceTotal)) AS VARCHAR(255) ) as PriceTotal,
                    CONCAT('-', CONVERT(DECIMAL(18, 2), SUM(FreePriceTotal))) as FreePriceTotal,
                    CAST(CONVERT(DECIMAL(18, 2), (SUM(PriceTotal) - SUM(FreePriceTotal))) AS VARCHAR(255) ) as NetPriceTotal
                FROM(
                    SELECT SUM(Price) as PriceTotal, 0 as FreePriceTotal FROM #temptranall
                UNION ALL 
                SELECT 0 as PriceTotal, SUM(Price) as FreePriceTotal FROM #temptranfree
                )S

                --3 Summary of Bulk remaining
            SELECT FORMAT(GETDATE(), 'dd/MM/yyyy, hh:mm tt') AS SummaryOfBulkDate, ISNULL(b.TotalBalance, 0) as CreditTotalBalance, ISNULL(f.TotalBalance, 0) as CreditFreeTotalBalance
            FROM Master_Developer d
            LEFT JOIN Master_Credit_Balance b ON b.DeveloperId = d.Id
            LEFT JOIN Master_Credit_Free f ON f.DeveloperId = d.Id AND f.ExpiredDate >= getDate() 
            WHERE d.DeveloperCode = @developer_code
            -------  end select data -----------
            
                --4 start - end date
            SELECT CONCAT(FORMAT(CAST(@start_date AS date), 'dd/MM/yyyy'), ' - ', FORMAT(CAST(@end_date AS date), 'dd/MM/yyyy')) as BetweenDate,
                    YEAR(CAST(@start_date AS date)) as Year, @month as Month, FORMAT(CAST(@start_date AS date),'MM') as MonthNumber
                
            -------  start select conflict data -----------
                --5 conflict
            SELECT TransactionId, IsSet FROM #temptran WHERE IsSet = 0
                    
            -- 6 transantion all
            SELECT ROW_NUMBER() OVER (ORDER BY a.Month) AS No, Detail, SUM(Quantity) as Quantity, UnitPrice, CAST(CONVERT(DECIMAL(18,2),SUM(Price)) AS VARCHAR(255) ) as Price
            FROM(
                SELECT Detail, Quantity, UnitPrice, Price, Type, Month FROM #tempconflicttranall
                UNION ALL
                SELECT Detail, Quantity, UnitPrice, Price, Type, Month FROM #tempall
            )a
            GROUP BY a.Detail, a.Type, a.UnitPrice, a.Month
            ORDER BY a.Month asc
            
            -- 7 transantion free
            SELECT  ROW_NUMBER() OVER (ORDER BY f.Detail) AS No, Detail, SUM(Quantity) as Quantity, CONCAT('-',UnitPrice) as UnitPrice, CONCAT('-',CONVERT(DECIMAL(18,2),SUM(Price))) as Price
            FROM(
                SELECT Detail, Quantity, UnitPrice, Price, Type FROM #tempconflicttranfree
                UNION ALL
                SELECT Detail, Quantity, UnitPrice, Price, Type FROM #tempfree WHERE Type NOT IN ( SELECT Type FROM #temptranfree)
            )f
            GROUP BY f.Detail, f.Type, f.UnitPrice
            
            -- 8 summary price
            SELECT CAST(CONVERT(DECIMAL(18,2),SUM(PriceTotal)) AS VARCHAR(255) ) as PriceTotal, CONCAT('-',CONVERT(DECIMAL(18,2),SUM(FreePriceTotal))) as FreePriceTotal, 
            CAST(CONVERT(DECIMAL(18,2),(SUM(PriceTotal) - SUM(FreePriceTotal))) AS VARCHAR(255) ) as NetPriceTotal
            FROM(
                SELECT SUM(Price) as PriceTotal, 0 as FreePriceTotal FROM #tempconflicttranall
                UNION ALL 
                SELECT 0 as PriceTotal, SUM(Price) as FreePriceTotal FROM #tempconflicttranfree
            )S
            
            -- 9 Summary of Bulk remaining
            SELECT FORMAT(GETDATE(), 'dd/MM/yyyy, hh:mm tt') AS SummaryOfBulkDate, ISNULL(b.TotalBalance,0) as CreditTotalBalance, ISNULL(f.TotalBalance,0) as CreditFreeTotalBalance
            FROM Master_Developer d
            LEFT JOIN Master_Credit_Balance b ON b.DeveloperId = d.Id
            LEFT JOIN Master_Credit_Free f ON f.DeveloperId = d.Id AND f.ExpiredDate >= getDate() 
            WHERE d.DeveloperCode = @developer_code
            -------  end select conflict data -----------

            DROP TABLE #temptranall, #temptranfree, #tempall, #tempfree, #temptran, #tempconflicttranall, #tempconflicttranfree
            `)

        let bulk_sum_data: any = [];
        let bulk_conflict_data: any = [];
        let is_conflict: boolean = false;
        let month: string = '';
        let month_number: string = '';
        let year: string = '';
        if (sum_data.recordsets) {
            let between_date = sum_data?.recordsets[4][0]?.BetweenDate;
            let transantion_all: any = snakeCaseKeys(sum_data.recordsets[0]);
            let transantion_free: any = snakeCaseKeys(sum_data.recordsets[1]);
            let summary_price: any = snakeCaseKeys(sum_data.recordsets[2][0]);
            let bulk_remaining: any = snakeCaseKeys(sum_data.recordsets[3][0]);
            let conflict_check: any = snakeCaseKeys(sum_data.recordsets[5]);
            let conflict_all: any = snakeCaseKeys(sum_data.recordsets[6]);
            let conflict_free: any = snakeCaseKeys(sum_data.recordsets[7]);
            let conflict_summary_price: any = snakeCaseKeys(sum_data.recordsets[8][0]);
            let conflict_bulk_remaining: any = snakeCaseKeys(sum_data.recordsets[9][0]);

            if (conflict_check?.length > 0) {
                is_conflict = true
            }

            year = sum_data?.recordsets[4][0]?.Year;
            month = sum_data?.recordsets[4][0]?.Month;
            month_number = sum_data?.recordsets[4][0]?.MonthNumber;

            bulk_sum_data.push({
                between_date: between_date,
                developer_name: developer_name,
                transantion_all: transantion_all || [],
                transantion_free: transantion_free || [],
                summary_price: summary_price || [],
                bulk_remaining: bulk_remaining || [],
            })

            bulk_conflict_data.push({
                between_date: between_date,
                developer_name: developer_name,
                transantion_all: conflict_all || [],
                transantion_free: conflict_free || [],
                summary_price: conflict_summary_price || [],
                bulk_remaining: conflict_bulk_remaining || [],
            });

        }

        return {
            status: 200, message: "success", data: {
                year: String(year),
                month: month,
                month_number: month_number,
                bulk_sum_data: bulk_sum_data[0] || {},
                bulk_conflict_data: bulk_conflict_data[0] || {},
                is_conflict: is_conflict
            }
        }
    } catch (error) {
        return { status: error.status || 500, message: error.message };
    }
}

export async function reportBulkDetailData(data: any) {
    try {
        const {
            start_date,
            end_date,
            developer_code,
            developer_name,
            project_code,
        } = data;

        let database_dmg = process.env.DB_NAME_SECOND;

        const sum_data: any = await createRequest()
            .input("developer_code", sql.NVarChar, developer_code)
            .input("project_code", sql.NVarChar, project_code || '')
            .input("start", sql.NVarChar, start_date)
            .input("end", sql.NVarChar, end_date)
            .query(`
            DECLARE @start_date NVARCHAR(50) = @start
            DECLARE @end_date NVARCHAR(50) = @end
                --Find the start date of Month
            SET @start_date =
                (SELECT CASE WHEN ISNULL(@start_date, '') <> '' THEN @start_date ELSE(SELECT DATEFROMPARTS(YEAR(DATEADD(MONTH, -1, getDate())), MONTH(DATEADD(MONTH, -1, getDate())), 1)) END )
            SET @end_date = (SELECT CASE WHEN ISNULL(@end_date, '') <> '' THEN @end_date ELSE(SELECT DATEADD(DAY, -1, DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(DATEADD(MONTH, -1, getDate())), MONTH(DATEADD(MONTH, -1, getDate())), 1)))) END)
            DECLARE @month NVARCHAR(50) = FORMAT(CONVERT(DATETIME, @start_date), 'MMMM', 'th-TH')

                --map tran x set
            CREATE TABLE #temptran(TransactionId NVARCHAR(50), IsSet BIT)
            INSERT INTO #temptran(TransactionId, IsSet)
            SELECT DISTINCT n.NcbId as TransactionId,
                    CASE WHEN(n.NdidRequestId IN(SELECT OrderCode FROM Transaction_Stamp_Log) AND n.ReferenceId IS NOT NULL) OR(n.ReferenceId IN(SELECT OrderCode FROM Transaction_Stamp_Log))
            THEN 1 ELSE 0 END as IsSet
                FROM[${database_dmg}].[dbo].[Master_Ncb] n
            INNER JOIN[${database_dmg}].[dbo].[Master_Unit] u ON u.UnitId = n.UnitId AND u.DeveloperCode = @developer_code
            WHERE n.NcbStatusCode <> 'NCB01' AND n.ProjectCode LIKE'%' + @project_code + '%' 
            
            UNION ALL
            
            SELECT DISTINCT LoanId as TransactionId, IsSet = 1
                FROM[${database_dmg}].[dbo].[Master_Loan] 
            WHERE Status <> 'active' AND DeveloperCode = @developer_code AND ProjectCode LIKE'%' + @project_code + '%'
            
            ---- start tran data ----
            CREATE TABLE #tempncb(TransactionId NVARCHAR(100), CreateDate DATETIME, UnitNo NVARCHAR(50), BookingNo NVARCHAR(50), ContractNo NVARCHAR(100), MemberId NVARCHAR(100), DeveloperName NVARCHAR(100), ProjectName NVARCHAR(100), CustomerName NVARCHAR(100), CitizenId NVARCHAR(100), MobileNumber NVARCHAR(100), NcbDate DATETIME, LoanDate DATETIME, PaidDate DATETIME, PriceNcbAndLoan INT, PriceLoan INT, PriceTotal INT)
            CREATE TABLE #temploan(TransactionId NVARCHAR(100), TypeOfBorrower NVARCHAR(100), CreateDate DATETIME, UnitNo NVARCHAR(50), BookingNo NVARCHAR(50), ContractNo NVARCHAR(100), MemberId NVARCHAR(100), DeveloperName NVARCHAR(100), ProjectName NVARCHAR(100), CustomerName NVARCHAR(100), CitizenId NVARCHAR(100), MobileNumber NVARCHAR(100), NcbDate DATETIME, LoanDate DATETIME, PaidDate DATETIME, PriceNcbAndLoan INT, PriceLoan INT, PriceTotal INT)
                --NCB
            INSERT INTO #tempncb(TransactionId, CreateDate, UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName, CitizenId, MobileNumber, NcbDate, LoanDate, PaidDate, PriceNcbAndLoan, PriceLoan, PriceTotal)
            SELECT n.NcbId as TransactionId, w.CreateDate, u.UnitNo, n.BookingNo, n.ContractNo,
                    JSON_VALUE(n.RequestParams, '$.member_id') as MemberId,
                    d.DeveloperName, n.ProjectName,
                    JSON_VALUE(n.RequestParams, '$.customer_name') as CustomerName,
                    JSON_VALUE(n.RequestParams, '$.citizen_id') as CitizenId,
                    JSON_VALUE(n.RequestParams, '$.mobile_number') as MobileNumber,
                    ISNULL(n.UpdateDate, n.CreateDate) as NcbDate,
                    NULL as LoanDate, w.PaidDate as PaidDate, ISNULL(w.PriceNcbAndLoan, 0) as PriceNcbAndLoan, 0 as PriceLoan, 0 as PriceTotal
                FROM[${database_dmg}].[dbo].[Master_Ncb] n
            INNER JOIN[${database_dmg}].[dbo].[Master_Customer] c ON n.CustomerId = c.CustomerId
            INNER JOIN[${database_dmg}].[dbo].[Master_Unit] u ON n.UnitId = u.UnitId
            INNER JOIN[${database_dmg}].[dbo].[Master_Developer] d ON u.DeveloperCode = d.DeveloperCode
            INNER JOIN(
                    SELECT ISNULL(log.UpdateDate, log.CreateDate) as CreateDate, log.TransactionId, out.CreateDate as PaidDate, out.Amount as PriceNcbAndLoan 
                FROM Transaction_Activity_Log log
                LEFT JOIN Transaction_Out_Log out ON log.ReferanceId = out.OrderCode
                WHERE log.DescriptionCode = 'success'
                )w ON n.NcbId = w.TransactionId
            WHERE w.TransactionId IN(
                    SELECT TransactionId FROM #temptran WHERE IsSet = 1
                )
            AND n.RequestParams LIKE'{%%}' AND n.NcbStatusCode <> 'NCB01' AND u.DeveloperCode = @developer_code
            AND CONVERT(date, w.CreateDate) BETWEEN @start_date AND @end_date

                --Loan
            INSERT INTO #temploan(TransactionId, TypeOfBorrower, CreateDate, UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName, CitizenId, MobileNumber, NcbDate, LoanDate, PaidDate, PriceNcbAndLoan, PriceLoan, PriceTotal)
            SELECT l.LoanId as TransactionId, m.TypeOfBorrower, w.CreateDate, u.UnitNo, l.BookingNo, l.ContractNo, '' as MemberId, d.DeveloperName, u.ProjectName,
                    CONCAT(JSON_VALUE(m.CustomerData, '$.customer.prefix_Name'), JSON_VALUE(m.CustomerData, '$.customer.first_name'), ' ', JSON_VALUE(m.CustomerData, '$.customer.last_name')) as CustomerName,
                    JSON_VALUE(m.CustomerData, '$.customer.citizen_id') as CitizenId,
                    JSON_VALUE(m.CustomerData, '$.customer.mobile_number') as MobileNumber,
                    NULL as NcbDate, ISNULL(l.UpdateDate, l.CreateDate) as LoanDate,
                    w.PaidDate as PaidDate, 0 as PriceNcbAndLoan, ISNULL(w.PriceLoan, 0) as PriceLoan, 0 as PriceTotal
                FROM[${database_dmg}].[dbo].[Master_Loan] l
            INNER JOIN[${database_dmg}].[dbo].[Mapping_Loan] m ON l.LoanId = m.LoanId
            INNER JOIN[${database_dmg}].[dbo].[Master_Customer] c ON m.CustomerId = c.CustomerId
            INNER JOIN[${database_dmg}].[dbo].[Master_Unit] u ON l.UnitId = u.UnitId
            INNER JOIN[${database_dmg}].[dbo].[Master_Developer] d ON l.DeveloperCode = d.DeveloperCode
            INNER JOIN(
                    SELECT ISNULL(log.UpdateDate, log.CreateDate) as CreateDate, log.TransactionId, out.CreateDate as PaidDate, out.Amount as PriceLoan 
                FROM Transaction_Activity_Log log
                LEFT JOIN Transaction_Out_Log out ON log.ReferanceId = out.OrderCode
                WHERE log.DescriptionCode = 'success'
                )w ON l.LoanId = w.TransactionId
            WHERE w.TransactionId IN(
                    SELECT TransactionId FROM #temptran WHERE IsSet = 1
                )
            AND l.Status = 'inprogress' AND l.DeveloperCode = @developer_code
            AND CONVERT(date, w.CreateDate) BETWEEN @start_date AND @end_date
            ORDER BY l.BookingNo

                --insert bulk detail to  #tempdetail 
            CREATE TABLE #tempdetail(CreateDate DATETIME, UnitNo NVARCHAR(50), BookingNo NVARCHAR(50), ContractNo NVARCHAR(100), MemberId NVARCHAR(100), DeveloperName NVARCHAR(100), ProjectName NVARCHAR(100), CustomerName NVARCHAR(100), CitizenId NVARCHAR(100), MobileNumber NVARCHAR(100), NcbDate DATETIME, LoanDate DATETIME, PaidDate DATETIME, PriceNcbAndLoan INT, PriceLoan INT, PriceTotal INT)
            INSERT INTO #tempdetail(CreateDate, UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName, CitizenId, MobileNumber, NcbDate, LoanDate, PaidDate, PriceNcbAndLoan, PriceLoan, PriceTotal)
            SELECT CreateDate, UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName, CitizenId, MobileNumber, NcbDate, LoanDate, PaidDate, PriceNcbAndLoan, PriceLoan, (SUM(PriceNcbAndLoan) + SUM(PriceLoan)) as PriceTotal
                FROM(
                    SELECT n.TransactionId, n.CreateDate, n.UnitNo, n.BookingNo, n.ContractNo, n.MemberId, n.DeveloperName, n.ProjectName, n.CustomerName,
                    n.CitizenId, n.MobileNumber, n.NcbDate, ISNULL(t.LoanDate, n.LoanDate) as LoanDate, n.PaidDate, n.PriceNcbAndLoan,
                    ISNULL(t.PriceLoan, n.PriceLoan) as PriceLoan, n.PriceTotal
            FROM #tempncb n
            LEFT JOIN(
                        SELECT TransactionId, CreateDate, UnitNo, BookingNo, ContractNo, ProjectName, CustomerName, CitizenId, LoanDate, PaidDate, PriceLoan
                FROM #temploan WHERE TypeOfBorrower = 'Borrower'
                    )t ON t.BookingNo = n.BookingNo AND t.CitizenId = n.CitizenId
            UNION
            SELECT TransactionId, CreateDate, UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName,
                    CitizenId, MobileNumber, NcbDate, LoanDate, CASE WHEN TypeOfBorrower = 'Co-Borrower' THEN NULL ELSE PaidDate END as PaidDate, PriceNcbAndLoan,
                    CASE WHEN TypeOfBorrower = 'Co-Borrower' THEN 0 ELSE PriceLoan END as PriceLoan, PriceTotal
            FROM #temploan
            WHERE CONCAT(BookingNo, CitizenId) NOT IN(SELECT CONCAT(BookingNo, CitizenId) FROM #tempncb)
                )t
            GROUP BY CreateDate, UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName,
                    CitizenId, MobileNumber, NcbDate, LoanDate, PaidDate, PriceNcbAndLoan, PriceLoan
            ORDER BY t.CreateDate, t.BookingNo
            ---- end tran data ----

            ---- start conflict data ----
            CREATE TABLE #tempconflictncb (TransactionId NVARCHAR(100), CreateDate DATETIME, UnitNo NVARCHAR(50), BookingNo NVARCHAR(50),ContractNo NVARCHAR(100), MemberId NVARCHAR(100), DeveloperName NVARCHAR(100), ProjectName NVARCHAR(100), CustomerName NVARCHAR(100), CitizenId NVARCHAR(100), MobileNumber NVARCHAR(100), NcbDate DATETIME, LoanDate DATETIME, PaidDate DATETIME, PriceNcbAndLoan INT, PriceLoan INT, PriceTotal INT)
            CREATE TABLE #tempconflictloan (TransactionId NVARCHAR(100), TypeOfBorrower NVARCHAR(100), CreateDate DATETIME, UnitNo NVARCHAR(50), BookingNo NVARCHAR(50),ContractNo NVARCHAR(100), MemberId NVARCHAR(100), DeveloperName NVARCHAR(100), ProjectName NVARCHAR(100), CustomerName NVARCHAR(100), CitizenId NVARCHAR(100), MobileNumber NVARCHAR(100), NcbDate DATETIME, LoanDate DATETIME, PaidDate DATETIME, PriceNcbAndLoan INT, PriceLoan INT, PriceTotal INT)
            --NCB
            INSERT INTO #tempconflictncb (TransactionId, CreateDate , UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName, CitizenId, MobileNumber, NcbDate, LoanDate, PaidDate, PriceNcbAndLoan, PriceLoan, PriceTotal)
            SELECT n.NcbId as TransactionId , w.CreateDate, u.UnitNo, n.BookingNo, n.ContractNo, 
            JSON_VALUE(n.RequestParams,'$.member_id') as MemberId, 
            d.DeveloperName, n.ProjectName,
            JSON_VALUE(n.RequestParams,'$.customer_name') as CustomerName,
            JSON_VALUE(n.RequestParams,'$.citizen_id') as CitizenId,
            JSON_VALUE(n.RequestParams,'$.mobile_number') as MobileNumber,
            ISNULL(n.UpdateDate, n.CreateDate) as NcbDate, 
            NULL as LoanDate, w.PaidDate as PaidDate, ISNULL(w.PriceNcbAndLoan,0) as PriceNcbAndLoan, 0 as PriceLoan, 0 as PriceTotal
            FROM [${database_dmg}].[dbo].[Master_Ncb] n
            INNER JOIN [${database_dmg}].[dbo].[Master_Customer] c ON n.CustomerId = c.CustomerId
            INNER JOIN [${database_dmg}].[dbo].[Master_Unit] u ON n.UnitId = u.UnitId
            INNER JOIN [${database_dmg}].[dbo].[Master_Developer] d ON u.DeveloperCode = d.DeveloperCode
            INNER JOIN (
                SELECT ISNULL(log.UpdateDate, log.CreateDate) as CreateDate,log.TransactionId, out.CreateDate as PaidDate, out.Amount as PriceNcbAndLoan 
                FROM Transaction_Activity_Log log
                LEFT JOIN Transaction_Out_Log out ON log.ReferanceId = out.OrderCode
                WHERE log.DescriptionCode = 'success'
            )w ON n.NcbId = w.TransactionId
            WHERE w.TransactionId IN(
                SELECT TransactionId FROM #temptran WHERE IsSet = 0
            )
            AND n.RequestParams LIKE'{%%}' AND n.NcbStatusCode <> 'NCB01' AND u.DeveloperCode = @developer_code
            AND CONVERT(date, w.CreateDate) BETWEEN @start_date AND @end_date
            
            --Loan
            INSERT INTO #tempconflictloan (TransactionId, TypeOfBorrower, CreateDate , UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName, CitizenId, MobileNumber, NcbDate, LoanDate, PaidDate, PriceNcbAndLoan, PriceLoan, PriceTotal)
            SELECT l.LoanId as TransactionId, m.TypeOfBorrower, w.CreateDate ,u.UnitNo, l.BookingNo, l.ContractNo, '' as MemberId, d.DeveloperName, u.ProjectName,
            CONCAT(JSON_VALUE(m.CustomerData,'$.customer.prefix_Name'),JSON_VALUE(m.CustomerData,'$.customer.first_name'),' ',JSON_VALUE(m.CustomerData,'$.customer.last_name')) as CustomerName, 
            JSON_VALUE(m.CustomerData,'$.customer.citizen_id') as CitizenId,
            JSON_VALUE(m.CustomerData,'$.customer.mobile_number') as MobileNumber,
            NULL as NcbDate, ISNULL(l.UpdateDate, l.CreateDate) as LoanDate, 
            w.PaidDate as PaidDate, 0 as PriceNcbAndLoan, ISNULL(w.PriceLoan,0) as PriceLoan, 0 as PriceTotal
            FROM [${database_dmg}].[dbo].[Master_Loan] l
            INNER JOIN [${database_dmg}].[dbo].[Mapping_Loan] m ON l.LoanId = m.LoanId
            INNER JOIN [${database_dmg}].[dbo].[Master_Customer] c ON m.CustomerId = c.CustomerId
            INNER JOIN [${database_dmg}].[dbo].[Master_Unit] u ON l.UnitId = u.UnitId
            INNER JOIN [${database_dmg}].[dbo].[Master_Developer] d ON l.DeveloperCode = d.DeveloperCode
            INNER JOIN (
                SELECT ISNULL(log.UpdateDate, log.CreateDate) as CreateDate,log.TransactionId, out.CreateDate as PaidDate, out.Amount as PriceLoan 
                FROM Transaction_Activity_Log log
                LEFT JOIN Transaction_Out_Log out ON log.ReferanceId = out.OrderCode
                WHERE log.DescriptionCode = 'success'
            )w ON l.LoanId = w.TransactionId
            WHERE w.TransactionId IN(
                SELECT TransactionId FROM #temptran WHERE IsSet = 0
            )
            AND l.Status = 'inprogress' AND l.DeveloperCode = @developer_code
            AND CONVERT(date, w.CreateDate) BETWEEN @start_date AND @end_date
            ORDER BY l.BookingNo
            
            -- insert bulk detail to  #tempconflictdetail 
            CREATE TABLE #tempconflictdetail (CreateDate DATETIME, UnitNo NVARCHAR(50), BookingNo NVARCHAR(50),ContractNo NVARCHAR(100), MemberId NVARCHAR(100), DeveloperName NVARCHAR(100), ProjectName NVARCHAR(100), CustomerName NVARCHAR(100), CitizenId NVARCHAR(100), MobileNumber NVARCHAR(100), NcbDate DATETIME, LoanDate DATETIME, PaidDate DATETIME, PriceNcbAndLoan INT, PriceLoan INT, PriceTotal INT)
            INSERT INTO #tempconflictdetail (CreateDate , UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName, CitizenId, MobileNumber, NcbDate, LoanDate, PaidDate, PriceNcbAndLoan, PriceLoan, PriceTotal)
            SELECT CreateDate , UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName, CitizenId, MobileNumber, NcbDate, LoanDate, PaidDate, PriceNcbAndLoan, PriceLoan, (SUM(PriceNcbAndLoan) + SUM(PriceLoan)) as PriceTotal 
            FROM(
            SELECT n.TransactionId, n.CreateDate , n.UnitNo, n.BookingNo, n.ContractNo, n.MemberId, n.DeveloperName, n.ProjectName, n.CustomerName, 
            n.CitizenId, n.MobileNumber, n.NcbDate, ISNULL(t.LoanDate, n.LoanDate) as LoanDate, n.PaidDate, n.PriceNcbAndLoan, 
            ISNULL(t.PriceLoan, n.PriceLoan) as PriceLoan, n.PriceTotal
            FROM #tempconflictncb n
            LEFT JOIN (
                SELECT TransactionId, CreateDate , UnitNo, BookingNo, ContractNo, ProjectName, CustomerName, CitizenId, LoanDate, PaidDate, PriceLoan
                FROM #tempconflictloan WHERE TypeOfBorrower = 'Borrower'
            )t ON t.BookingNo = n.BookingNo AND t.CitizenId = n.CitizenId
            UNION
            SELECT TransactionId, CreateDate , UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName, 
            CitizenId, MobileNumber, NcbDate, LoanDate, CASE WHEN TypeOfBorrower = 'Co-Borrower' THEN NULL ELSE PaidDate END as PaidDate, PriceNcbAndLoan,
            CASE WHEN TypeOfBorrower = 'Co-Borrower' THEN 0 ELSE PriceLoan END as PriceLoan, PriceTotal
            FROM #tempconflictloan
            WHERE CONCAT(BookingNo,CitizenId) NOT IN (SELECT CONCAT(BookingNo,CitizenId) FROM #tempconflictncb)
            )t
            GROUP BY CreateDate , UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, CustomerName, 
            CitizenId, MobileNumber, NcbDate, LoanDate, PaidDate, PriceNcbAndLoan, PriceLoan
            ORDER BY t.CreateDate, t.BookingNo
            ---- end conflict data ----

            ---- start select tran data ----
                --0 bulk detail
            SELECT ROW_NUMBER() OVER (ORDER BY CreateDate) AS No, FORMAT(CreateDate, 'dd/MM/yyyy, HH:MM') as CreateDate, UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName,
                    CONCAT(LEFT(CustomerName, 4), '********', RIGHT(CustomerName, 4)) as CustomerName,
                    CONCAT(LEFT(CitizenId, 3), '*******', RIGHT(CitizenId, 3)) as CitizenId,
                    CONCAT(LEFT(MobileNumber, 3), '****', RIGHT(MobileNumber, 3)) as MobileNumber,
                    ISNULL(FORMAT(NcbDate, 'dd/MM/yyyy, HH:MM'), '') as NcbDate, ISNULL(FORMAT(LoanDate, 'dd/MM/yyyy, HH:MM'), '') as LoanDate,
                    ISNULL(FORMAT(PaidDate, 'dd/MM/yyyy'), '') as PaidDate, ISNULL(FORMAT(PaidDate, 'HH:MM'), '') as PaidTime,
                    PriceNcbAndLoan, PriceLoan, PriceTotal 
            FROM #tempdetail
            ORDER BY CreateDate, BookingNo

                --1 sum total price
            SELECT ISNULL(SUM(PriceNcbAndLoan),0) as PriceNcbAndLoanTotal, ISNULL(SUM(PriceLoan),0)as PriceLoanTotal, ISNULL(SUM(PriceTotal),0) as PriceAllTotal
            FROM #tempdetail
            ---- end select tran data ----

            ---- start select conflict data ----
                -- 2 bulk detail
            SELECT ROW_NUMBER() OVER (ORDER BY CreateDate) AS No, FORMAT(CreateDate, 'dd/MM/yyyy, HH:MM') as CreateDate, UnitNo, BookingNo, ContractNo, MemberId, DeveloperName, ProjectName, 
            CONCAT(LEFT(CustomerName, 4), '********', RIGHT(CustomerName, 4)) as CustomerName,
            CONCAT(LEFT(CitizenId, 3), '*******', RIGHT(CitizenId, 3)) as CitizenId, 
            CONCAT(LEFT(MobileNumber, 3), '****', RIGHT(MobileNumber, 3)) as MobileNumber, 
            ISNULL(FORMAT(NcbDate, 'dd/MM/yyyy, HH:MM'),'') as NcbDate,  ISNULL(FORMAT(LoanDate, 'dd/MM/yyyy, HH:MM'),'') as LoanDate, 
            ISNULL(FORMAT(PaidDate, 'dd/MM/yyyy'),'') as PaidDate, ISNULL(FORMAT(PaidDate, 'HH:MM'),'') as PaidTime,
            PriceNcbAndLoan, PriceLoan, PriceTotal 
            FROM #tempconflictdetail
            ORDER BY CreateDate, BookingNo
            
                -- 3 sum total price
            SELECT ISNULL(SUM(PriceNcbAndLoan),0) as PriceNcbAndLoanTotal, ISNULL(SUM(PriceLoan),0)as PriceLoanTotal, ISNULL(SUM(PriceTotal),0) as PriceAllTotal
            FROM #tempconflictdetail
            ---- end select conflict data ----

                --4 start - end date
            SELECT CONCAT(FORMAT(CAST(@start_date AS date), 'dd/MM/yyyy'), ' - ', FORMAT(CAST(@end_date AS date), 'dd/MM/yyyy')) as BetweenDate,
                    YEAR(CAST(@start_date AS date)) as Year, @month as Month

            DROP TABLE #tempncb, #temploan, #temptran, #tempdetail, #tempconflictncb, #tempconflictloan, #tempconflictdetail
                    `)

        let bulk_sum_detail: any = [];
        let conflict_bulk_sum_detail: any = [];
        let month: string = '';
        let year: string = '';
        if (sum_data.recordsets) {
            let between_date = sum_data?.recordsets[4][0]?.BetweenDate;
            let bulk_detail: any = snakeCaseKeys(sum_data.recordsets[0]);
            let total_price: any = snakeCaseKeys(sum_data.recordsets[1][0]);
            let conflict_bulk_detail: any = snakeCaseKeys(sum_data.recordsets[2]);
            let conflict_total_price: any = snakeCaseKeys(sum_data.recordsets[3][0]);

            year = sum_data?.recordsets[2][0]?.Year;
            month = sum_data?.recordsets[2][0]?.Month;

            bulk_sum_detail.push({
                between_date: between_date,
                developer_name: developer_name,
                bulk_detail: _.orderBy(bulk_detail, 'no') || [],
                total_price: total_price || {}
            })

            conflict_bulk_sum_detail.push({
                between_date: between_date,
                developer_name: developer_name,
                bulk_detail: _.orderBy(conflict_bulk_detail, 'no') || [],
                total_price: conflict_total_price || {}
            })
        }

        return {
            status: 200, message: "success", data: {
                year: year,
                month: month,
                bulk_sum_detail: bulk_sum_detail[0] || {},
                conflict_bulk_sum_detail: conflict_bulk_sum_detail[0] || {}
            }
        }
    } catch (error) {
        return { status: error.status || 500, message: error.message };
    }
}

function generateMonthList() {
    const months = [
        { month: 'January', month_number: 1 },
        { month: 'February', month_number: 2 },
        { month: 'March', month_number: 3 },
        { month: 'April', month_number: 4 },
        { month: 'May', month_number: 5 },
        { month: 'June', month_number: 6 },
        { month: 'July', month_number: 7 },
        { month: 'August', month_number: 8 },
        { month: 'September', month_number: 9 },
        { month: 'October', month_number: 10 },
        { month: 'November', month_number: 11 },
        { month: 'December', month_number: 12 }
    ];

    return months;
}
