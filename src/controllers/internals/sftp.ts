import { NextFunction, Request, Response } from "express";
import { createRequestSecond, createRequest } from "../../config";
import Client from "ssh2-sftp-client";
import JSZip from 'jszip';
import crypto from 'crypto';
import fs from "fs";
import sql from "mssql";
import path from "path";
import { Log_Report } from "../../dbcless/db_wallet";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";
import { snakeCaseKeys } from "../../utility";
import NodeRSA from 'node-rsa';

const privateKey = fs.readFileSync(
    path.join(__dirname, "../..", "keys", "ncb_sftp_private_key.pem"),
    { encoding: 'utf-8' }
);
const publicKey = fs.readFileSync(
    path.join(__dirname, "../..", "keys", "ncb_sftp_public_key.pem"),
    { encoding: 'utf-8' }
);

//format file name ICONxNCB_15022024.txt  ไฟล์ถ้ามีการแก้ไขก็ให้รันไฟล์ใหม่ทับของเก่าได้เลย 
let file_extension = ".txt";

//***Start API */
export const getReportNcb = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const log_report_data = await Log_Report.find(createRequest(), {})
        res.status(200).send({
            status: 200, message: `success`, data: log_report_data || []
        })
    } catch (error) {
        res.status(500).send({ status: 500, message: "error", data: error })
    }
}

export const retryReportNcb = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let log_id = req.body.id;
    try {
        const log_report_data = await Log_Report.findOne(createRequest(), {
            id: log_id
        })

        if (!log_report_data) {
            console.log(`log id ${log_id} , Not found data.`);
            return res.status(400).send({ status: 400, messsage: "Not found data." })
        }

        if (log_report_data.status === "success") {
            console.log(`log id ${log_id} , The file already exists.`);
            return res.status(400).send({ status: 400, messsage: "The file already exists." })
        }

        log_id = log_report_data?.id;
        let file_name = log_report_data?.name;
        let file_date: string = log_report_data?.date;
        console.log(`log id ${log_id} ,API retry report date ${file_date}`);
        let file: any = await createFileReportNcb(file_name, file_date);
        if (file.status == false) {
            throw file;
        }
        //upload file to server
        await uploadFileToSFTP(file_name, file.data.encrypted_file);

        //upadete satus success
        console.log(`File ${file_name} uploaded successfully.`);
        await Log_Report.update(createRequest(), {
            name: file_name,
            path: `${process.env.SFTP_FOLDER}/${file_name}`,
            status: "success",
            update_date: new Date(),
        }, {
            id: log_report_data.id,
        })


        res.status(200).send({
            status: 200, message: `File ${file_name} has been successfully uploaded.`
        })
    } catch (error) {
        //upadete satus fail
        console.log(`File uploaded fail, Error ===> ${error}`);
        await Log_Report.update(createRequest(), {
            status: "fail",
            update_date: new Date(),
            error_message: JSON.stringify(error)
        }, {
            id: log_id,
        })
        res.status(500).send({ status: 500, message: "File uploaded fail.", data: error })
    }
}

export const getfile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const files = req.files as Express.Multer.File[];
        var file = files[0];
        console.log(file);
        // const buffer = Buffer.from(ret.data as string, "binary");
        const iv = crypto.randomBytes(16).toString('hex');
        //const decipher = crypto.createDecipheriv('aes-256-ctr', '510f1d2884299ba63b7d1057a7c10cf3', 'ic0nte@mfileauth');
        const decipher = crypto.createDecipheriv('aes-256-ctr', privateKey, Buffer.from(iv, 'hex'));
        //decipher.setAutoPadding(true);
        let decryptedZipBuffer = Buffer.concat([decipher.update(file.buffer), decipher.final()]);
        console.log(decryptedZipBuffer);

        // Extract decrypted data from the ZIP buffer
        const zip = await JSZip.loadAsync(decryptedZipBuffer);
        const zipEntries = Object.values(zip.files);
        const decryptedData = await Promise.all(zipEntries.map(async (entry) => {
            console.log(entry);
            const name_splited = entry.name.split(".");
            let ext = name_splited[name_splited.length - 1];
            let filename = entry.name.replace(ext, "txt");
            let fileData = await entry.async('nodebuffer');

            fs.writeFileSync(filename, fileData);
            console.log(`Extracted: ${filename}`);
        }));

        res.send(true)
    } catch (error) {
        console.log(error)
        res.send(false)
    }
}

export const getfileDecrypt = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const files = req.files as Express.Multer.File[];
        var file = files[0];
        console.log(file);

        const decrypt_data = await decryptFile(file.buffer);
        console.log(decrypt_data);
        fs.writeFileSync(file.originalname, decrypt_data);

        res.send(true)
    } catch (error) {
        console.log(error)
        res.send(false)
    }
}

export const reportNcb = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { start_date, end_date } = req.body;

        // const dates = getDates(start_date, end_date)
        // console.log("dates =====>", dates);
        // //select date not have log
        // const date_sql = await createRequest()
        //     .input("date", sql.NVarChar, dates.join(","))
        //     .query(
        //         `
        //         DECLARE @TableAllDate TABLE (dateData NVARCHAR(50))
        //         INSERT INTO @TableAllDate (dateData) SELECT value FROM STRING_SPLIT(@date, ',')

        //         --SELECT Date FROM Log_Report WHERE [Date] IN (SELECT dateData FROM @TableAllDate) GROUP BY Date

        //         DELETE FROM @TableAllDate
        //         WHERE dateData IN (SELECT Date FROM Log_Report WHERE [Date] IN (SELECT dateData FROM @TableAllDate) GROUP BY Date);

        //         SELECT dateData FROM @TableAllDate
        //         `
        //     )

        const date_sql: any = await createRequest()
            .input("start_date", sql.NVarChar, start_date)
            .input("end_date", sql.NVarChar, end_date)
            .query(
                `
                DECLARE @TableAllDate TABLE (dateData DATE)
                INSERT INTO @TableAllDate (dateData)
                SELECT dateData
                FROM (
                    SELECT DATEADD(DAY, number, @start_date) AS dateData
                    FROM master..spt_values
                    WHERE type = 'P'
                    AND DATEADD(DAY, number, @start_date) <= @end_date
                    AND DATEADD(DAY, number, @start_date) < FORMAT(GETDATE(), 'yyyy-MM-dd')
                ) AS Dates
                
                SELECT dateData FROM @TableAllDate;
                DELETE FROM @TableAllDate
                WHERE dateData IN (SELECT Date FROM Log_Report WHERE [Date] IN (SELECT dateData FROM @TableAllDate) GROUP BY Date);
                
                SELECT dateData FROM @TableAllDate
            `
        )
        
        console.log("All dates before the current date ======>", date_sql.recordsets[0]);
        console.log("All dates of document retrieval ======>", date_sql.recordsets[1]);
        let file_upload_success = [];
        let count_file_success: number = 0;
        let file_upload_fail = [];
        let count_file_fail: number = 0;
        for (var i in date_sql.recordsets[1]) {
            let log_id: string = uuidv4();
            let date_data = moment(date_sql.recordsets[1][i].dateData).format("YYYY-MM-DD");
            let date = moment(date_sql.recordsets[1][i].dateData).format("DDMMYYYY");
            const file_name = `ICONxNCB_${date}${file_extension}`;
            try {
                //Log Report
                await Log_Report.insert(createRequest(), {
                    id: log_id,
                    sftp_ip: process.env.SFTP_IP,
                    name: file_name,
                    path: `${process.env.SFTP_FOLDER}/${file_name}`,
                    date: date_data,
                    status: "pending",
                    create_date: new Date(),
                })
                let file = await createFileReportNcb(file_name, date_data);

                if (file.status == false) {
                    throw file;
                }

                //upload file to server
                await uploadFileToSFTP(file_name, file.data.encrypted_file);

                //upadete satus success
                console.log(`File ${file_name} uploaded successfully.`);
                await Log_Report.update(createRequest(), {
                    status: "success",
                    update_date: new Date(),
                }, {
                    id: log_id,
                })

                file_upload_success.push(file_name)
                count_file_success += 1
            } catch (error) {
                console.log(`File  ${file_name} uploaded fail, Error ===> ${error}`);
                await Log_Report.update(createRequest(), {
                    status: "fail",
                    update_date: new Date(),
                    error_message: JSON.stringify(error)
                }, {
                    id: log_id,
                })
                file_upload_fail.push(file_name)
                count_file_fail += 1
            }
        }
        res.status(200).send({ status: 200, message: `${count_file_success} file uploaded successfully, ${count_file_fail} file uploaded fail.`, data: { file_upload_success: file_upload_success, file_upload_fail: file_upload_fail } })
    } catch (error) {
        res.status(500).send({ status: 500, message: error.message || "error" })
    }
}
//***End API */

//***Start Job */
export const reportNcbJob = async () => {
    let date_time: any = new Date();
    let date_data = moment(date_time.setDate(date_time.getDate() - 1)).format("YYYY-MM-DD");
    let date = moment(date_time).format("DDMMYYYY");
    let time = moment(date_time).format("HHmmss");
    let log_id: string = uuidv4();
    const file_name = `ICONxNCB_${date}${file_extension}`;
    try {
        //Log Report
        await Log_Report.insert(createRequest(), {
            id: log_id,
            sftp_ip: process.env.SFTP_IP,
            name: file_name,
            path: `${process.env.SFTP_FOLDER}/${file_name}`,
            //data: file_content,
            date: date_data,
            status: "pending",
            create_date: new Date(),
        })

        let file = await createFileReportNcb(file_name, date_data);

        if (file.status == false) {
            throw file;
        }

        //upload file to server
        await uploadFileToSFTP(file_name, file.data.encrypted_file);

        //upadete satus success
        console.log(`File ${file_name} uploaded successfully.`);
        await Log_Report.update(createRequest(), {
            status: "success",
            update_date: new Date(),
        }, {
            id: log_id,
        })

        return true
    } catch (error) {
        console.log(`File  ${file_name} uploaded fail, Error ===> ${error}`);
        await Log_Report.update(createRequest(), {
            status: "fail",
            update_date: new Date(),
            error_message: JSON.stringify(error)
        }, {
            id: log_id,
        })

        return false
    }
}

export const retryReportNcbJob = async () => {
    let date_time: any = new Date();
    let date_data = moment(date_time.setDate(date_time.getDate() - 1)).format("YYYY-MM-DD");
    let count = process.env.COUNT_RETRY;
    try {
        const log_report = await createRequest()
            .input("date", sql.NVarChar, date_data)
            .input("count_retry", sql.Int, parseInt(count))
            .query(
                `SELECT Id, SftpIP, Name, Path, Data, Date, Status, CountRetry
                FROM Log_Report
                WHERE Date = @date AND Status IN('pending','fail') AND CountRetry < @count_retry
            `)

        let log_report_data: any = snakeCaseKeys(log_report.recordset);
        if (log_report_data) {
            for (let i in log_report_data) {
                let log_id = log_report_data[i].id;
                let file_name = log_report_data[i]?.name;
                //file_name = `${file_name.substring(0, file_name.lastIndexOf("_"))}${file_extension}`;
                let count_retry = parseInt(log_report_data[i].count_retry + 1);
                //update count retry
                await Log_Report.update(createRequest(), {
                    count_retry: count_retry,
                    update_date: new Date(),
                }, {
                    id: log_id,
                });
                console.log(`log id ${log_id} ,Auto retry count ${count_retry}/${count}`);
                try {
                    let file_date: string = log_report_data[i]?.date;
                    let file: any = await createFileReportNcb(file_name, file_date);
                    if (file.status == false) {
                        throw file;
                    }
                    //upload file to server
                    await uploadFileToSFTP(file_name, file.data.encrypted_file);

                    //upadete satus success
                    console.log(`File ${file_name} uploaded successfully.`);
                    await Log_Report.update(createRequest(), {
                        name: file_name,
                        path: `${process.env.SFTP_FOLDER}/${file_name}`,
                        status: "success",
                        update_date: new Date(),
                    }, {
                        id: log_report_data[i].id,
                    })

                } catch (error) {
                    //upadete satus fail
                    console.log(`File  ${file_name} uploaded fail, Error ===> ${error}`);
                    await Log_Report.update(createRequest(), {
                        name: file_name,
                        path: `${process.env.SFTP_FOLDER}/${file_name}`,
                        status: "fail",
                        update_date: new Date(),
                        error_message: JSON.stringify(error)
                    }, {
                        id: log_id,
                    })
                }
            }
        }

        return true
    } catch (error) {
        return false
    }
}
//***End Job */

async function createFileReportNcb(file_name: string, date_data_ncb: string) {
    try {
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

        let ncb_data = await createRequestSecond()
            .input("ncb_id", sql.NVarChar, trans_id.join(","))
            .input("date", sql.Date, date_data_ncb)
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
                --AND CONVERT(date, n.UpdateDate) = CONVERT(date, getDate() - 1)
                AND CONVERT(date, n.UpdateDate) = @date
                ORDER BY n.CreateDate ASC
            `
            );

        let ncb_txt_data: any = "";
        ncb_data.recordset.forEach((element, index) => {
            let customer_data = JSON.parse(element.RequestParams)
            const paddedNumber = String(index + 2).padStart(6, '0');
            let trans_data = transaction_data.recordset.find(({ TransactionId }) => TransactionId === element.NcbId);
            let create_date = formatDate(trans_data.CreateDate, 'txt');
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
            ncb_txt_data += create_date.date;
            ncb_txt_data += create_date.time;
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
            + obj.header_company_ac + obj.header_company_name + moment(date_data_ncb).format("DDMMYYYY")
            + obj.header_service_code + obj.header_spare
        let ncb_total = obj.total_record_type + total_no + obj.total_bank_code + obj.total_company_ac
            + obj.total_debit_payment_comm + obj.total_debit_transection + payment_amt + credit_transection
            + obj.total_total_discount + obj.total_total_vat + obj.total_spare
        let ncb_txt = `${ncb_header}\n${ncb_txt_data}${ncb_total}`

        //เข้ารหัส file 
        //let encrypted_file = await createZipFile(file_name, ncb_txt, 'ic0nte@mfileauth');
        //let encrypted_file = await encryptFile(String(ncb_txt));
        let encrypted_file = Buffer.from(ncb_txt, 'utf-8');

        console.log(`Created file ${file_name} successfully.`);
        return ({
            status: true, meassage: `Created file ${file_name} successfully`, data: {
                encrypted_file: encrypted_file
            }
        });
    } catch (error) {
        console.log("Create file error:", error);
        return ({ status: false, meassage: `Create file error`, data: error });
    }
}

async function uploadFileToSFTP(file_name: string, file: any) {
    const sftp = new Client();
    try {
        await sftp.connect({
            host: process.env.SFTP_IP, //'10.1.0.4',
            port: parseInt(process.env.SFTP_PORT),
            username: process.env.SFTP_USER,//'adminicon',
            password: process.env.SFTP_PASSWORD  //'1c0nte@m2023'
        });
        await sftp.put(file, `${process.env.SFTP_FOLDER}/${file_name}`);
    } finally {
        await sftp.end();
    }
}

function encryptFile(data_string: string) {
    const publicRsaKey: any = new NodeRSA(publicKey);
    const encryptedData = publicRsaKey.encrypt(Buffer.from(data_string, 'utf8'), 'buffer');
    return encryptedData
}

function decryptFile(encrypted_data: any) {
    const privateRsaKey = new NodeRSA(privateKey);
    const decryptedDataBuffer = privateRsaKey.decrypt(encrypted_data);
    return decryptedDataBuffer
}

async function createZipFile(file_name: string, data: string, password: string) {
    const zip = new JSZip();
    zip.file(file_name, data);
    const zip_file = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const cipher = crypto.createCipheriv('aes-256-ctr', '510f1d2884299ba63b7d1057a7c10cf3', password);
    cipher.setAutoPadding(true);
    const encryptedData = Buffer.concat([cipher.update(zip_file), cipher.final()]);
    return encryptedData;
}

function createSpace(val: number) {
    let space = '';
    for (let i = 0; i < val; i++) {
        space += '\xa0'
    }
    return space
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
        time: time,
    }
}


// Returns an array of dates between the two dates
function getDates(start_date: any, end_date: any) {
    const dates = []
    let current_date = start_date;
    const addDays = function (days: any) {
        const date = new Date(this.valueOf())
        date.setDate(date.getDate() + days)
        return date
    }
    while (current_date <= end_date) {
        dates.push(moment(current_date).format("YYYY-MM-DD"))
        current_date = moment(addDays.call(current_date, 1)).format("YYYY-MM-DD")
    }
    return dates
}

function createKeyFile() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        // The standard secure default length for RSA keys is 2048 bits
        modulusLength: 2048,
    })

    // *********************************************************************
    //
    // To export the public key and write it to file:

    const exportedPublicKeyBuffer = publicKey.export({ type: 'pkcs1', format: 'pem' })
    fs.writeFileSync('public.pem', exportedPublicKeyBuffer, { encoding: 'utf-8' })
    // *********************************************************************


    // *********************************************************************
    //
    // To export the private key and write it to file

    const exportedPrivateKeyBuffer = privateKey.export({ type: 'pkcs1', format: 'pem' })
    fs.writeFileSync('private.pem', exportedPrivateKeyBuffer, { encoding: 'utf-8' })
}