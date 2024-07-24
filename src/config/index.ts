import sql from "mssql";

export let pool: sql.ConnectionPool;
export let poolSecond: sql.ConnectionPool;

// A_ICON_WALLET_DEV
export async function createPoolFirst(config: sql.config) {
  pool = await new sql.ConnectionPool({
    ...config
  }).connect();
}
export function createRequest(trans: sql.Transaction = null) {
  if (trans == null) {
    return pool.request();
  } else {
    return new sql.Request(trans);
  }
}

// A_DIGITAL_MORTGAGE_DEV
export async function createPoolSecond(config: sql.config) {
  poolSecond = await new sql.ConnectionPool({
    ...config
  }).connect();
}
export function createRequestSecond(trans: sql.Transaction = null) {
  if (trans == null) {
    return poolSecond.request();
  } else {
    return new sql.Request(trans);
  }
}





