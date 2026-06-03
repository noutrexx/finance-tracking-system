import oracledb from "oracledb";

export async function getOracleConnection() {
  const user = process.env.ORACLE_USER;
  const password = process.env.ORACLE_PASSWORD;
  const connectString = process.env.ORACLE_CONNECT_STRING;

  if (!user || !password || !connectString) {
    return null;
  }

  return oracledb.getConnection({ user, password, connectString });
}
