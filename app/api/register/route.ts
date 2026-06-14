import { NextResponse } from "next/server";
import { isDemoMode, register } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ success: false, message: "Username and a password of at least 8 characters are required." }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json({ ...register(username, password), mode: "demo" });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: false, message: "Oracle connection settings are missing." }, { status: 500 });
    }

    const checkUser = await connection.execute(
      `SELECT 1 FROM KULLANICILAR WHERE KULLANICI_ADI = :username`,
      { username },
    );

    if (checkUser.rows?.length) {
      return NextResponse.json({ success: false, message: "This username is already taken." });
    }

    await connection.execute(
      `INSERT INTO KULLANICILAR (KULLANICI_ADI, SIFRE, ROL) VALUES (:username, :password, 'user')`,
      { username, password: hashPassword(password) },
    );

    await connection.commit();

    return NextResponse.json({ success: true, message: "Account created. You can sign in now." });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, message: "A technical error occurred during registration." }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
