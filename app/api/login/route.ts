import { NextResponse } from "next/server";
import { isDemoMode, login } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ success: false, message: "Username and password are required." }, { status: 400 });
  }

  if (isDemoMode()) {
    const success = login(username, password);
    return NextResponse.json({
      success,
      message: success ? "Signed in successfully." : "Username or password is incorrect.",
      mode: "demo",
    });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: false, message: "Oracle connection settings are missing." }, { status: 500 });
    }

    const result = await connection.execute(
      `SELECT 1 FROM KULLANICILAR WHERE KULLANICI_ADI = :username AND SIFRE = :password`,
      { username, password },
    );

    const success = Boolean(result.rows?.length);
    return NextResponse.json({
      success,
      message: success ? "Signed in successfully." : "Username or password is incorrect.",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, message: "Database connection failed." }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
