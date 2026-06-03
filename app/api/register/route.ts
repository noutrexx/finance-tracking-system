import { NextResponse } from "next/server";
import { isDemoMode, register } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ success: false, message: "Kullanıcı adı ve şifre zorunludur." }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json({ ...register(username, password), mode: "demo" });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: false, message: "Oracle bağlantı bilgileri eksik." }, { status: 500 });
    }

    const checkUser = await connection.execute(
      `SELECT 1 FROM KULLANICILAR WHERE KULLANICI_ADI = :username`,
      { username },
    );

    if (checkUser.rows?.length) {
      return NextResponse.json({ success: false, message: "Bu kullanıcı adı zaten alınmış." });
    }

    await connection.execute(
      `INSERT INTO KULLANICILAR (KULLANICI_ADI, SIFRE, ROL) VALUES (:username, :password, 'user')`,
      { username, password },
    );

    await connection.commit();

    return NextResponse.json({ success: true, message: "Kayıt başarılı. Şimdi giriş yapabilirsiniz." });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, message: "Kayıt sırasında teknik bir hata oluştu." }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
