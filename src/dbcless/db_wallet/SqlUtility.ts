import _ from "lodash";
import sql, { ISqlTypeFactory, ISqlType, Request } from "mssql";
import moment from "moment";

export class SqlBuilder {
    constructor(TABLE_NAME: string, SQL_COLUMN: ISqlColumn, IDENTITY_KEY: Array<string>, ALL_SNAKE_KEY: Array<string>) {
        this.init(TABLE_NAME, SQL_COLUMN, IDENTITY_KEY, ALL_SNAKE_KEY);
    }

    private TABLE_NAME: string;
    private SQL_COLUMN: ISqlColumn;
    private IDENTITY_KEY: Array<string>;
    private ALL_SNAKE_KEY: Array<string>;

    init(TABLE_NAME: string, SQL_COLUMN: ISqlColumn, IDENTITY_KEY: Array<string>, ALL_SNAKE_KEY: Array<string>) {
        this.TABLE_NAME = TABLE_NAME;
        this.SQL_COLUMN = SQL_COLUMN;
        this.IDENTITY_KEY = IDENTITY_KEY;
        this.ALL_SNAKE_KEY = ALL_SNAKE_KEY;
    }

    async find(request: Request, param: object) : Promise<object[]> {
        var [keys, params] = validateParams(param, false, this.ALL_SNAKE_KEY, this.IDENTITY_KEY);
        var qs = `
            SELECT *
            FROM [${this.TABLE_NAME}]
        `;
        qs += getWhereText(params, this.SQL_COLUMN);
        setWhereParams(request, params, this.SQL_COLUMN);
        const query = await request.query(qs);
        return snakeCaseKeys(query.recordset) as object[];
    }

    async findOne(request: Request, param: object) : Promise<object> {
        const recordset = await this.find(request, param);
        return recordset.length > 0 ? snakeCaseKeys(recordset[0]) : null;
    }

    async count(request: Request, param: object) : Promise<number> {
        var [keys, params] = validateParams(param, false, this.ALL_SNAKE_KEY, this.IDENTITY_KEY);
        var qs = `
            SELECT COUNT(0) AS RW_LEN
            FROM [${this.TABLE_NAME}]
        `;
        qs += getWhereText(params, this.SQL_COLUMN);
        setWhereParams(request, params, this.SQL_COLUMN);
        const query = await request.query(qs);
        return query.recordset.length == 0 ? 0 : query.recordset[0].RW_LEN
    }

    async insert(request: Request, param: object): Promise<string | number> {
        var [keys, params] = validateParams(param, true, this.ALL_SNAKE_KEY, this.IDENTITY_KEY);
        var qs = `
            INSERT INTO [${this.TABLE_NAME}]
            (
                ${keys.map((key, index) => `[${this.SQL_COLUMN[key].name}]`)}
            )
            VALUES
            (
                ${keys.map((key, index) => `@${this.SQL_COLUMN[key].name}`)}
            )
            SELECT SCOPE_IDENTITY() AS [SCOPE_IDENTITY];
        `;
        setRequestParams(request, params, this.SQL_COLUMN);
        const query = await request.query(qs);
        return (this.IDENTITY_KEY.length > 0 && query.recordset.length > 0) ? query.recordset[0].SCOPE_IDENTITY : "";
    }

    async update(request: Request, obj_update: object, obj_conditions: object) {
        var [keys, params] = validateParams(obj_update, true, this.ALL_SNAKE_KEY, this.IDENTITY_KEY);
        var [keys_condition, conditions] = validateParams(obj_conditions, false, this.ALL_SNAKE_KEY, this.IDENTITY_KEY);
        var qs = `
        UPDATE [${this.TABLE_NAME}]
        SET
            ${keys.map((key, index) => `[${this.SQL_COLUMN[key].name}] = @${this.SQL_COLUMN[key].name}`)}
        `;
        qs += getWhereText(conditions, this.SQL_COLUMN);
        setRequestParams(request, params, this.SQL_COLUMN);
        setWhereParams(request, conditions, this.SQL_COLUMN);
        await request.query(qs);
    }

    async delete(request: Request, param: object) {
        var [keys, params] = validateParams(param, false, this.ALL_SNAKE_KEY, this.IDENTITY_KEY);
        var qs = `
        DELETE [${this.TABLE_NAME}]
        `;
        qs += getWhereText(params, this.SQL_COLUMN);
        setWhereParams(request, params, this.SQL_COLUMN);
        await request.query(qs);
    }
}

export interface ISqlColumn {
    [key: string]: {
        name: string;
        type: ISqlTypeFactory;
        is_identity: boolean;
        is_primary: boolean;
    };
}

export function setRequestParams(
    request: Request,
    params: any,
    columns: ISqlColumn
) {
    _.forEach(params, (value, name) => {
        // if (value != null) {
        const item = { ...columns[name] };
        if (item.type == sql.DateTime) {
            item.type = sql.NVarChar;
            if (_.isDate(value)) {
                value = moment(value).format("YYYY-MM-DD HH:mm:ss.SSS");
            }
        }
        request.input(item.name, item.type as ISqlType, value);
        // }
    });
}

export function setWhereParams(
    request: Request,
    params: any,
    columns: ISqlColumn
) {
    _.forEach(params, (value, name) => {
        // if (value != null) {
        const item = { ...columns[name] };
        if (item.type == sql.DateTime) {
            item.type = sql.NVarChar;
            if (_.isDate(value)) {
                value = moment(value).format("YYYY-MM-DD HH:mm:ss.SSS");
            }
        }
        request.input("W_" + item.name, item.type as ISqlType, value);
        // }
    });
}

export function validateParams(
    params: any,
    removeIdentity: Boolean = false,
    snakeKeys: Array<string>,
    identityKeys: Array<string>
): [Array<string>, object] {
    var keys = _.keys(params);
    keys = _.intersection(keys, snakeKeys);
    if (removeIdentity) {
        keys = _.difference(keys, identityKeys);
    }
    params = _.pick(params, keys);
    return [keys, params];
}

export function getWhereText(params: any, columns: ISqlColumn) {
    let qs = "";
    let is_first = true;
    _.forEach(params, (value, key) => {
        if (is_first) {
            qs += "WHERE ";
        }
        if (value == null) {
            qs +=
                (is_first ? "" : "AND") + " [" + columns[key].name + "] IS NULL" + " ";
        } else {
            qs +=
                (is_first ? "" : "AND") +
                " [" +
                columns[key].name +
                "] = " +
                "@W_" +
                columns[key].name +
                " ";
        }
        if (is_first) {
            is_first = false;
        }
    });
    return qs;
}

export function snakeCaseKeys(
    objClass: object | Array<object> | any
): object | Array<object> {
    if (_.isArray(objClass)) {
        return objClass.map((item) => snakeCaseKeys(item));
    }

    if (_.isDate(objClass) || _.isObject(objClass) == false) {
        return objClass;
    }

    var result: any = {};

    _.map(objClass, (prop_value, prop_name) => {
        if (_.isArray(prop_value)) {
            result[_.snakeCase(prop_name)] = _.map(prop_value, (item) => {
                return snakeCaseKeys(item);
            });
        } else if (_.isDate(prop_value)) {
            result[_.snakeCase(prop_name)] = prop_value;
        } else if (_.isObject(prop_value)) {
            result[_.snakeCase(prop_name)] = snakeCaseKeys(prop_value);
        } else {
            result[_.snakeCase(prop_name)] = prop_value;
        }
    });

    return result;
}