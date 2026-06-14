import { NextResponse } from "next/server";
import { isDemoMode, login } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";
import { hashPassword, isPasswordHash, setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ success: false, message: "Username and password are required." }, { status: 400 });
  }

  if (isDemoMode()) {
    const success = login(username, password);
    const response = NextResponse.json({
      success,
      message: success ? "Signed in successfully." : "Username or password is incorrect.",
      mode: "demo",
    });
    if (success) setSessionCookie(response, username);
    return response;
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: false, message: "Oracle connection settings are missing." }, { status: 500 });
    }

    const result = await connection.execute(
      `SELECT SIFRE FROM KULLANICILAR WHERE KULLANICI_ADI = :username`,
      { username },
    );

    const storedPassword = (result.rows?.[0] as unknown[] | undefined)?.[0];
    const success =
      typeof storedPassword === "string" &&
      (isPasswordHash(storedPassword) ? verifyPassword(password, storedPassword) : storedPassword === password);

    if (success && !isPasswordHash(storedPassword)) {
      await connection.execute(
        `UPDATE KULLANICILAR SET SIFRE = :passwordHash WHERE KULLANICI_ADI = :username`,
        { passwordHash: hashPassword(password), username },
      );
      await connection.commit();
    }

    const response = NextResponse.json({
      success,
      message: success ? "Signed in successfully." : "Username or password is incorrect.",
    });
    if (success) setSessionCookie(response, username);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, message: "Database connection failed." }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
