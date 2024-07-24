import { NextFunction, Request, Response } from "express";
import { snakeCaseKeys } from "../../utility";
import { createRequest, pool } from "../../config";
import sql from "mssql";
import _ from "lodash";
import {
    Master_Developer,
    Master_Email,
    Transaction_Email,
    Transaction_Report
} from "../../dbcless/db_wallet";
import * as XLSX from "sheetjs-style";
import { sendMail } from "../../services/email.service";
import fs from "fs";
import axios from "axios";

export const getEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { developer_code } = req.body;

        const email = await Master_Email.findOne(createRequest(), {
            developer_code: developer_code
        });

        res.status(200).send({
            status: 200, message: "succcess", data: {
                email_to: email?.email_to || "",
                email_cc: email?.email_cc || "",
                send_date: email?.send_date || ""
            }
        });
    } catch (error) {
        res.status(500).send({ status: 500, message: error.message });
    }
}

export const updateEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { developer_code, email_to, email_cc, send_date } = req.body;
        const email_data = await Master_Email.findOne(createRequest(), {
            developer_code: developer_code
        });

        if (!email_data) {
            await Master_Email.insert(createRequest(), {
                developer_code: developer_code,
                email_to: email_to,
                email_cc: email_cc,
                send_date: send_date
            });
        } else {
            await Master_Email.update(createRequest(), {
                email_to: email_to,
                email_cc: email_cc,
                send_date: send_date,
                update_date: new Date()
            }, {
                developer_code: developer_code,
            });
        }

        await Transaction_Email.update(createRequest(), {
            status: "fail",
            send_to: email_to,
            send_cc: email_cc || "",
            effective_date: new Date(),
            update_date: new Date()
        }, {
            status: "wait email",
            developer_code: developer_code
        })

        res.status(200).send({
            status: 200, message: "แก้ไขอีเมลสำเร็จ", data: {
                email_to: email_to || "",
                email_cc: email_cc || "",
                send_date: send_date || ""
            }
        });
    } catch (error) {
        res.status(500).send({ status: 500, message: error.message });
    }
}

export const transactionEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { year,
            month,
            developer_code,
            status,
            current_page,
            per_page } = req.body;

        let status_tran = "";
        switch (status) {
            case "สำเร็จ":
                status_tran = "success";
                break;
            case "ไม่สำเร็จ":
                status_tran = "fail";
                break;
            case "กรุณาตั้งค่าอีเมล":
                status_tran = "wait email";
                break;
            case "รอดำเนินการ":
                status_tran = "pending";
                break;
        }

        const email_q: any = await createRequest()
            .input("year", sql.NVarChar, year || "")
            .input("month", sql.NVarChar, month || "")
            .input("developer_code", sql.NVarChar, developer_code || "")
            .input("status", sql.NVarChar, status_tran || "")
            .input("limit", sql.Int, per_page || 10)
            .input("offset", sql.Int, current_page || 1)
            .query(`
                SELECT e.JobId as Id, r.Month, r.Year,
                    e.Subject , e.DeveloperCode, d.DeveloperName,
                    FORMAT(ISNULL(e.SentDate, e.CreateDate) , 'dd/MM/yyyy') as SentDate, 
                    CASE WHEN e.Status = 'success' THEN 'สำเร็จ' 
                        WHEN  e.Status = 'fail' THEN 'ไม่สำเร็จ'
                        WHEN  e.Status = 'wait email' THEN 'กรุณาตั้งค่าอีเมล'
                        ELSE 'รอดำเนินการ' END as Status, r.IsConflict
                FROM Transaction_Email e
                INNER JOIN Transaction_Report r ON r.ReportId = e.JobId
                INNER JOIN Master_Developer d ON e.DeveloperCode = d.DeveloperCode
                WHERE e.DeveloperCode LIKE'%'+ @developer_code +'%' 
                AND r.MonthNumber LIKE'%' + @month +'%' AND r.Year LIKE'%'+ @year +'%'
                AND e.Status LIKE'%' + @status + '%'
                ORDER BY e.CreateDate, e.SentDate desc
        
                OFFSET (@offset-1)*@limit ROWS
                FETCH NEXT @limit ROWS ONLY
                SET @offset = @offset + 1


                SELECT COUNT(0) AS Total 
                FROM Transaction_Email e
                INNER JOIN Transaction_Report r ON r.ReportId = e.JobId
                INNER JOIN Master_Developer d ON e.DeveloperCode = d.DeveloperCode
                WHERE e.DeveloperCode LIKE'%'+ @developer_code +'%' 
                AND r.MonthNumber LIKE'%' + @month +'%' AND r.Year LIKE'%'+ @year +'%'
                AND e.Status LIKE'%' + @status + '%'
            `)

        res.status(200).send({
            status: 200, message: "succcess", total: email_q?.recordsets[1][0]?.Total || 0, data: snakeCaseKeys(email_q?.recordsets[0]) || []
        });
    } catch (error) {
        res.status(500).send({ status: 500, message: error.message });
    }
}

export const conflictReportBulk = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id, developer_code } = req.body;

        const report_email = await createRequest()
            .input("developer_code", sql.NVarChar, developer_code)
            .input("id", sql.NVarChar, id)
            .query(`
            SELECT TOP 1 e.SendTo, e.SendCC, e.Subject, e.Body, e.DeveloperCode, e.ErrorCount, e.Status, 
            r.ReportId, r.Type, r.Data, r.DataConflict, r.Month, r.MonthNumber, r.Year, r.IsConflict
            FROM Transaction_Email e 
            INNER JOIN Transaction_Report r ON e.JobId = r.ReportId AND e.DeveloperCode = r.DeveloperCode AND r.Type = 'bulk'
            WHERE e.DeveloperCode = @developer_code AND e.JobId = @id
            `)
        if (!report_email.recordset[0] || !report_email?.recordset[0]?.IsConflict || !report_email?.recordset[0]?.DataConflict) {
            return res.status(400).send({ status: 400, message: "ไม่พบข้อมูลรายงาน" });
        }

        let report = snakeCaseKeys(report_email.recordset[0]);
        let report_id = report?.report_id;
        let file_name = `summary_report_${report.month_number}${report.year}.xlsx`;
        let report_data = JSON.parse(report.data_conflict);
        const gen_excel = await genExcelBulkSummary(report_data);

        res.status(200).send({
            status: 200, message: "success", data: { report_id: report_id, file_name: file_name, workbook: gen_excel.workbook }
        });
    } catch (error) {
        res.status(error?.status || 500).send({ status: error?.status || 500, message: error.message || "ไม่สำเร็จ" });
    }
}

export const resendEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id, developer_code } = req.body;

        const report_email = await createRequest()
            .input("developer_code", sql.NVarChar, developer_code)
            .input("id", sql.NVarChar, id)
            .query(`
            SELECT TOP 1 e.SendTo, e.SendCC, e.Subject, e.Body, e.DeveloperCode, e.ErrorCount, e.Status, 
            r.ReportId, r.Type, r.Data, r.Month, r.MonthNumber, r.Year
            FROM Transaction_Email e 
            INNER JOIN Transaction_Report r ON e.JobId = r.ReportId AND e.DeveloperCode = r.DeveloperCode AND r.Type = 'bulk'
            WHERE e.Status <> 'success' AND e.ErrorCount <= 5 AND e.DeveloperCode = @developer_code AND e.JobId = @id
            `)
        if (!report_email.recordset[0]) {
            return res.status(400).send({ status: 400, message: "ไม่พบข้อมูลรายงานการส่งอีเมล หรือส่งอีเมลนี้ไปแล้ว" });
        }

        let report = snakeCaseKeys(report_email.recordset[0]);
        if (report?.status === "wait email") {
            return res.status(400).send({ status: 400, message: "ไม่สามารถส่งอีเมลได้ กรุณาตั้งค่าอีเมลบริษัท" });
        }
        let report_id = report?.report_id;
        let file_name = `summary_report_${report.month_number}${report.year}.xlsx`;
        let data = JSON.parse(report_email.recordset[0].Data);
        await genExcelBulkSummary(data);
        //send email

        let report_data = JSON.parse(report.data);
        const gen_excel = await genExcelBulkSummary(report_data);
       // XLSX.writeFile(gen_excel.workbook, 'example_with_image.xlsx');

        let attachments = [
            {
                filename: file_name,
                content: Buffer.from(gen_excel.buffer, 'binary')
            }
        ]
        const email_data: any = {
            send_to: report.send_to,
            send_cc: report?.send_cc ? `${report?.send_cc},${process.env.EMAIL_SUPPORT}` : "",
            subject: report.subject,
            text: report.body,
            html: "",
            attachments: attachments,
        }

        //send mail
        const send_email = await sendMail(email_data);

        if (!send_email.status) { throw send_email.error }

        await Transaction_Email.update(
            createRequest(),
            {
                effective_date: new Date(),
                sent_date: new Date(),
                update_date: new Date(),
                status: "success",
            },
            {
                job_id: report_id,
            }
        );

        await Transaction_Report.update(
            createRequest(),
            {
                status: "success",
                update_date: new Date()
            },
            {
                report_id: report_id,
            }
        );

        res.status(200).send({
            status: 200, message: "ส่งอีเมลสำเร็จ"
        });
    } catch (error) {
        res.status(error?.status || 500).send({ status: error?.status || 500, message: error.message || "ส่งอีเมลไม่สำเร็จ" });
    }
}

export const conflictDownload = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id, developer_code } = req.body;

        const email: any = await Transaction_Email.findOne(createRequest(), {
            job_id: id,
            developer_code: developer_code
        });

        //send email

        res.status(200).send({
            status: 200, message: "ส่งอีเมลสำเร็จ"
        });
    } catch (error) {
        res.status(500).send({ status: 500, message: error.message });
    }
}

export const sendMailBulkSummaryJob = async () => {
    try {
        const report_email = await createRequest()
            .query(`
            SELECT e.SendTo, e.SendCC, e.Subject, e.Body, e.DeveloperCode, e.ErrorCount, e.Status, 
            r.ReportId, r.Type, r.Data, r.Month, r.MonthNumber, r.Year
            FROM Transaction_Email e 
            INNER JOIN Transaction_Report r ON e.JobId = r.ReportId AND e.DeveloperCode = r.DeveloperCode AND r.Type = 'bulk'
            WHERE e.Status <> 'success' AND e.Status <> 'wait email' AND e.ErrorCount <= 5 
            `)
        let retry = 1;
        let retry_count = 0;
        for (var i in report_email.recordset) {
            let report = snakeCaseKeys(report_email.recordset[i]);
            let developer_code = report?.developer_code;
            let report_id = report?.report_id;
            let file_name = `summary_report_${report.month_number}${report.year}.xlsx`;
            while (retry <= 5) {
                try {
                    let report_data = JSON.parse(report.data);
                    const gen_excel = await genExcelBulkSummary(report_data);

                    let attachments = [
                        {
                            filename: file_name,
                            content: Buffer.from(gen_excel.buffer, 'binary')
                        }
                    ]
                    const email_data: any = {
                        send_to: report.send_to,
                        send_cc: report?.send_cc ? `${report?.send_cc},${process.env.EMAIL_SUPPORT}` : "",
                        subject: report.subject,
                        text: report.body,
                        html: "",
                        attachments: attachments,
                    }

                    //send mail
                    const send_email = await sendMail(email_data);

                    if (!send_email.status) { throw send_email.error }

                    await Transaction_Email.update(
                        createRequest(),
                        {
                            effective_date: new Date(),
                            sent_date: new Date(),
                            update_date: new Date(),
                            status: "success",
                        },
                        {
                            job_id: report_id,
                        }
                    );

                    await Transaction_Report.update(
                        createRequest(),
                        {
                            status: "success",
                            update_date: new Date()
                        },
                        {
                            report_id: report_id,
                        }
                    );

                    break;
                } catch (error) {
                    retry_count += 1;
                    await Transaction_Email.update(
                        createRequest(),
                        {
                            effective_date: new Date(),
                            error_date: new Date(),
                            error_count: retry_count,
                            error_message: error.message,
                            status: "fail",
                        },
                        {
                            job_id: report_id,
                        }
                    );

                    retry++
                }
            }
        }

        return true
    } catch (error) {
        return false
    }
}

async function genExcelBulkSummary(data: any) {
    let border_style = {
        top: { style: 'thin', color: { auto: 1 } },
        bottom: { style: 'thin', color: { auto: 1 } },
        left: { style: 'thin', color: { auto: 1 } },
        right: { style: 'thin', color: { auto: 1 } }
    }

    let table__style = {
        font: { color: { rgb: "000000" }, bold: false, sz: 14, },
        alignment: { horizontal: 'center' },
        border: border_style
    }


    let header_style = {
        font: { color: { rgb: "ffffff" }, bold: false, sz: 14, },
        alignment: { horizontal: "center", vertical: 'center' },
        fill: { fgColor: { rgb: "800000" } },
        border: border_style
    };

    //*** Start worksheet1: Summary Report **/ 
    const styleCell = (cs: any, ce: any, rs: any, re: any, style: any) => {
        for (let rowNum = rs; rowNum <= re; rowNum++) {
            for (let colNum = cs; colNum <= ce; colNum++) {
                const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
                worksheet1[cellAddress].s = style;
            }
        }
    }

    var worksheet1 = XLSX.utils.aoa_to_sheet([["บริษัท ไอคอน เฟรมเวิร์ค จำกัด (สำนักงานใหญ่)\nทรู ดิจิทัล พาร์ค สุขุมวิท 101 ตึกฟีนิกซ์ ชั้น 6 ห้องเลขที่ 602 ถนนสุขุมวิท\nแขวงบางจาก เขตพระโขนง กรุงเทพมหานคร ประเทศไทย 10260, โทร. 02-746-4903\n\nIcon Framework Co., Ltd., 101 True Digital Park, Phoenix Building, Floor 6 Room 602, Sukhumvit Road, Bangchak, Phrakhanong,\nBangkok 10260, Thailand, www.iconframework.com, Tel: 02-026-3802"]])
    worksheet1['!rows'] = [];
    worksheet1['!rows'][0] = { hpx: 150 };
    worksheet1["A1"].s = { font: { color: { rgb: "000000 " }, bold: false, sz: 14, }, alignment: { horizontal: "right", vertical: 'center' }, }
    const response = await axios.get(`${process.env.URL}/images/logo-iconframework.png`, { responseType: 'arraybuffer' });
    const imageBase64 = Buffer.from(response.data, 'binary').toString('base64');
    const sheetImage = {
        '!': [{ hpx: 100, wpx: 100, ref: 'A1' }],
        'A1': { t: 'b', v: imageBase64, f: 'logo-iconframework.png' }
    };
    worksheet1['!images'] = [sheetImage];

    XLSX.utils.sheet_add_aoa(worksheet1, [["สรุปการตรวจสอบเครดิตบูโร และยื่นขอสินเชื่อ\n(Summary of Credit Bureau Checks and Apply for a Loan)"]], { origin: "A3" });
    worksheet1["A3"].s = { font: { color: { rgb: "800000" }, sz: 20, }, alignment: { horizontal: "center", vertical: 'center' } }
    worksheet1['!rows'][2] = { hpx: 70 };

    XLSX.utils.sheet_add_aoa(worksheet1, [[`วันที่ระหว่าง (Date between) : ${data?.bulk_sum_data?.between_date}`],
    [`ชื่อบริษัท (Company name) : ${data?.bulk_sum_data?.developer_name}`]], { origin: "A5" });
    styleCell(0, 0, 4, 5, { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "left", vertical: 'center' } });

    XLSX.utils.sheet_add_aoa(worksheet1, [[
        "ที่\n(No.)",
        "รายการ\n(Detail)",
        "จำนวน\n(Quantity)",
        "ราคาต่อหน่วย\n(Unit price)",
        "ราคา (บาท)\n(Price (Baht))"
    ]], {
        origin: "A8",
    })
    worksheet1['!rows'][7] = { hpx: 40 };

    styleCell(0, 4, 7, 7, header_style)

    let data_tran_table: any = []
    for (var i in data?.bulk_sum_data?.transantion_all) {
        let tran = data?.bulk_sum_data?.transantion_all[i];
        data_tran_table.push([tran.no, tran.detail, tran.quantity, tran.unit_price, tran.price])
    }
    XLSX.utils.sheet_add_json(worksheet1, data_tran_table, { skipHeader: true, origin: "A9" })
    const range_tran = XLSX.utils.decode_range(worksheet1['!ref']);
    styleCell(0, range_tran.e.c, 8, range_tran.e.r, table__style)
    styleCell(1, 1, 8, range_tran.e.r, { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "left", vertical: 'center' }, border: border_style })
    styleCell(4, 4, 8, range_tran.e.r, { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "right", vertical: 'center' }, border: border_style })

    XLSX.utils.sheet_add_json(worksheet1, [["Bulk Free"]], { skipHeader: true, origin: "A12" })
    worksheet1['A12'].s = { font: { color: { rgb: "000000" }, bold: true, sz: 14, }, alignment: { horizontal: "left", vertical: 'center' } }

    let data_tran_free_table: any = []
    for (var i in data?.bulk_sum_data?.transantion_free) {
        let tran = data?.bulk_sum_data?.transantion_free[i];
        data_tran_free_table.push([tran.no, tran.detail, tran.quantity, tran.unit_price, tran.price])
    }
    XLSX.utils.sheet_add_json(worksheet1, data_tran_free_table, { skipHeader: true, origin: "A13" })
    const range_free = XLSX.utils.decode_range(worksheet1['!ref']);
    styleCell(0, range_free.e.c, 12, range_free.e.r, table__style)
    styleCell(1, 1, 12, range_free.e.r, { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "left", vertical: 'center' }, border: border_style });
    styleCell(4, 4, 12, range_free.e.r, { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "right", vertical: 'center' }, border: border_style });

    XLSX.utils.sheet_add_json(worksheet1, [["ค่าใช้จ่ายก่อนหัก Bulk Free"],
    ["หักจาก Bulk Free"],
    ["รวมทั้งสิ้น"]], { skipHeader: true, origin: "B16" })
    styleCell(1, 1, 15, 16, { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "right", vertical: 'center' } });
    worksheet1['B18'].s = { font: { color: { rgb: "000000" }, bold: true, sz: 14, }, alignment: { horizontal: "right", vertical: 'center' } };

    XLSX.utils.sheet_add_json(worksheet1, [[data?.bulk_sum_data?.summary_price?.price_total],
    [data?.bulk_sum_data?.summary_price?.free_price_total],
    [data?.bulk_sum_data?.summary_price?.net_price_total]], { skipHeader: true, origin: "E16" })
    worksheet1['E16'].s = { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "right", vertical: 'center' } };
    worksheet1['E17'].s = {
        font: { color: { rgb: "000000" }, bold: false, sz: 14, },
        alignment: { horizontal: "right", vertical: 'center' },
        border: {
            bottom: { style: 'thin', color: { auto: 1 } }
        }
    }
    worksheet1['E18'].s = {
        font: { color: { rgb: "000000" }, bold: true, sz: 14, },
        alignment: { horizontal: "right", vertical: 'center' },
        border: {
            bottom: { style: 'double', color: { auto: 1 } }
        }
    }

    XLSX.utils.sheet_add_json(worksheet1, [[`สรุป Bulk คงเหลือ (Summary of Bulk remaining) : ${data?.bulk_sum_data?.bulk_remaining?.summary_of_bulk_date}`]], { skipHeader: true, origin: "A20" })
    XLSX.utils.sheet_add_json(worksheet1, [["Bulk Cradit"], ["Bulk Free Transaction"]], { skipHeader: true, origin: "B21" })
    XLSX.utils.sheet_add_json(worksheet1, [[data?.bulk_sum_data?.bulk_remaining?.credit_total_balance, "บาท (Baht)"],
    [data?.bulk_sum_data?.bulk_remaining?.credit_free_total_balance, "บาท (Baht)"]], { skipHeader: true, origin: "D21" })
    worksheet1['A20'].s = { font: { color: { rgb: "000000" }, bold: true, sz: 14, }, alignment: { horizontal: "left", vertical: 'center' } }
    styleCell(1, 1, 20, 21, { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "left", vertical: 'center' } });
    styleCell(3, 4, 20, 21, { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "right", vertical: 'center' } });

    worksheet1['!merges'] =
        [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
            { s: { r: 11, c: 0 }, e: { r: 11, c: 1 } },
            { s: { r: 15, c: 1 }, e: { r: 15, c: 3 } },
            { s: { r: 16, c: 1 }, e: { r: 16, c: 3 } },
            { s: { r: 17, c: 1 }, e: { r: 17, c: 3 } },
            { s: { r: 19, c: 0 }, e: { r: 19, c: 1 } }
        ];
    worksheet1["!cols"] = [
        { wch: 10 },
        { wch: 70 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
    ];
    //*** end worksheet1: Summary Report **/ 

    //*** Start worksheet2: Detail Report **/ 
    const styleCell2 = (cs: any, ce: any, rs: any, re: any, style: any) => {
        for (let rowNum = rs; rowNum <= re; rowNum++) {
            for (let colNum = cs; colNum <= ce; colNum++) {
                const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
                worksheet2[cellAddress].s = style;
            }
        }
    }

    const worksheet2 = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.sheet_add_aoa(worksheet2, [["บริษัท ไอคอน เฟรมเวิร์ค จำกัด (สำนักงานใหญ่) ทรู ดิจิทัล พาร์ค สุขุมวิท 101 ตึกฟีนิกซ์ ชั้น 6 ห้องเลขที่ 602 ถนนสุขุมวิท แขวงบางจาก เขตพระโขนง กรุงเทพมหานคร ประเทศไทย 10260, โทร. 02-746-4903"]], { origin: "C2" });
    XLSX.utils.sheet_add_aoa(worksheet2, [["Icon Framework Co., Ltd., 101 True Digital Park, Phoenix Building, Floor 6 Room 602, Sukhumvit Road, Bangchak, Phrakhanong, Bangkok 10260, Thailand, www.iconframework.com, Tel: 02-026-3802"]], { origin: "C3" });
    XLSX.utils.sheet_add_json(worksheet2, [["รายงานสรุปยอดลูกค้าที่ตรวจสอบเครดิตบูโร และยื่นขอสินเชื่อของบริษัทอสังหาริมทรัพย์"]], { skipHeader: true, origin: "A6" })
    XLSX.utils.sheet_add_aoa(worksheet2, [[`วันที่ระหว่าง (Date between) : ${data?.bulk_sum_data?.between_date}`],
    [`ชื่อบริษัท (Company name) : ${data?.bulk_sum_data?.developer_name}`]], { origin: "A8" });
    styleCell2(2, 2, 1, 2, { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "left", vertical: 'center' } });
    worksheet2['A6'].s = { font: { color: { rgb: "800000" }, sz: 20, }, alignment: { vertical: 'center' } };
    styleCell2(0, 0, 7, 8, { font: { color: { rgb: "000000" }, bold: false, sz: 14, }, alignment: { horizontal: "left", vertical: 'center' } });

    //header table
    XLSX.utils.sheet_add_aoa(worksheet2, [[
        "รายการที่",
        "วัน-เวลา ที่ทำรายการ",
        "หมายเลข Unit",
        "เลขที่ใบจอง",
        "เลขที่สัญญา",
        "Member ID(REM)",
        "โครงการ",
        "ชื่อ - สกุลลูกค้า",
        "เลขที่บัตรประชาชน",
        "เบอร์โทร"
    ]], { origin: "A11" })
    XLSX.utils.sheet_add_aoa(worksheet2, [["การทำรายการ"]], { origin: "K11" })
    XLSX.utils.sheet_add_aoa(worksheet2, [["NCB", "ยื่นขอสินเชื่อ"]], { origin: "K12" })
    XLSX.utils.sheet_add_aoa(worksheet2, [[
        "วันที่ชำระค่าบริการ",
        "เวลาที่ชำระค่าบริการ",
        "ค่าบริการ NCB + ยื่นขอสินเชื่อ",
        "ยื่นขอสินเชื่อ",
        "รวมค่าบริการ",
    ]], { origin: "M11" })

    styleCell2(0, 9, 10, 10, header_style);
    styleCell2(12, 16, 10, 10, header_style);
    worksheet2['!autofilter'] = { ref: "K12:L12" };
    styleCell2(10, 11, 11, 11, header_style)
    worksheet2['K11'].s = header_style;

    let data_detail_table: any = [];
    for (var i in data?.bulk_sum_detail?.bulk_detail) {
        let detail_data = data?.bulk_sum_detail?.bulk_detail[i];
        data_detail_table.push([
            detail_data.no,
            detail_data.create_date,
            detail_data.unit_no,
            detail_data.booking_no,
            detail_data.contract_no,
            detail_data.member_id,
            detail_data.project_name,
            detail_data.customer_name,
            detail_data.citizen_id,
            detail_data.mobile_number,
            detail_data.ncb_date,
            detail_data.loan_date,
            detail_data.paid_date,
            detail_data.paid_time,
            detail_data.price_ncb_and_loan,
            detail_data.price_loan,
            detail_data.price_total
        ])
    }
    XLSX.utils.sheet_add_json(worksheet2, data_detail_table, { skipHeader: true, origin: "A13" })
    var range = XLSX.utils.decode_range(worksheet2['!ref']);
    styleCell2(0, 16, 12, range.e.r, table__style);
    XLSX.utils.sheet_add_aoa(worksheet2, [["รวมค่าบริการ"]], { origin: `N${range.e.r + 2}` })
    XLSX.utils.sheet_add_aoa(worksheet2, [[data?.bulk_sum_detail?.total_price?.price_ncb_and_loan_total,
    data?.bulk_sum_detail?.total_price?.price_loan_total,
    data?.bulk_sum_detail?.total_price?.price_all_total]], { origin: `O${range.e.r + 2}` })
    worksheet2[`N${range.e.r + 2}`].s = { fill: { fgColor: { rgb: "f2f2f2" } }, font: { color: { rgb: "000000" }, bold: true, sz: 14, }, alignment: { horizontal: "right", vertical: 'center' } };
    worksheet2[`O${range.e.r + 2}`].s = { fill: { fgColor: { rgb: "f2f2f2" } }, font: { color: { rgb: ")00000" }, sz: 14, }, alignment: { horizontal: "center", vertical: 'center' } };
    worksheet2[`P${range.e.r + 2}`].s = { fill: { fgColor: { rgb: "f2f2f2" } }, font: { color: { rgb: ")00000" }, sz: 14, }, alignment: { horizontal: "center", vertical: 'center' } };
    worksheet2[`Q${range.e.r + 2}`].s = { fill: { fgColor: { rgb: "f2f2f2" } }, font: { color: { rgb: ")00000" }, bold: true, sz: 14, }, alignment: { horizontal: "center", vertical: 'center' } };

    worksheet2['!merges'] =
        [
            { s: { r: 10, c: 0 }, e: { r: 11, c: 0 } },
            { s: { r: 10, c: 1 }, e: { r: 11, c: 1 } },
            { s: { r: 10, c: 2 }, e: { r: 11, c: 2 } },
            { s: { r: 10, c: 3 }, e: { r: 11, c: 3 } },
            { s: { r: 10, c: 4 }, e: { r: 11, c: 4 } },
            { s: { r: 10, c: 5 }, e: { r: 11, c: 5 } },
            { s: { r: 10, c: 6 }, e: { r: 11, c: 6 } },
            { s: { r: 10, c: 7 }, e: { r: 11, c: 7 } },
            { s: { r: 10, c: 8 }, e: { r: 11, c: 8 } },
            { s: { r: 10, c: 9 }, e: { r: 11, c: 9 } },
            { s: { r: 10, c: 10 }, e: { r: 10, c: 11 } },
            { s: { r: 10, c: 12 }, e: { r: 11, c: 12 } },
            { s: { r: 10, c: 13 }, e: { r: 11, c: 13 } },
            { s: { r: 10, c: 14 }, e: { r: 11, c: 14 } },
            { s: { r: 10, c: 15 }, e: { r: 11, c: 15 } },
            { s: { r: 10, c: 16 }, e: { r: 11, c: 16 } },
            //{ s: { r: range.e.r + 1, c: 0 }, e: { r: range.e.r + 1, c: 13 } }
        ];

    worksheet2["!cols"] = [
        { wch: 10 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 30 },
        { wch: 20 },
        { wch: 20 },
    ];

    //*** End worksheet2: Detail Report **/
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet1, 'Summary Report');
    XLSX.utils.book_append_sheet(workbook, worksheet2, 'Detail Report');
    // const outputPath = 'aligned_with_image.xlsx';
    // XLSX.writeFile(workbook, outputPath);

    // /* generate buffer */
    var buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // console.log('Excel file with image created:', outputPath);

    return { workbook: workbook, buffer: buffer };
}