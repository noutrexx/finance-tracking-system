import { NextResponse } from "next/server";
import { isDemoMode, login } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ success: false, message: "Kullanıcı adı ve şifre zorunludur." }, { status: 400 });
  }

  if (isDemoMode()) {
    const success = login(username, password);
    return NextResponse.json({
      success,
      message: success ? "Giriş başarılı." : "Kullanıcı adı veya şifre hatalı.",
      mode: "demo",
    });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: false, message: "Oracle bağlantı bilgileri eksik." }, { status: 500 });
    }

    const result = await connection.execute(
      `SELECT 1 FROM KULLANICILAR WHERE KULLANICI_ADI = :username AND SIFRE = :password`,
      { username, password },
    );

    const success = Boolean(result.rows?.length);
    return NextResponse.json({
      success,
      message: success ? "Giriş başarılı." : "Kullanıcı adı veya şifre hatalı.",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, message: "Veritabanı bağlantı hatası." }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
