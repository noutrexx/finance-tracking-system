import { NextResponse } from "next/server";
import { isDemoMode, listPortfolio } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";

export async function POST(request: Request) {
  const { username } = await request.json();

  if (!username) {
    return NextResponse.json({ success: false, message: "Kullanıcı adı zorunludur." }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json({ success: true, data: listPortfolio(username), mode: "demo" });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: false, message: "Oracle bağlantı bilgileri eksik." }, { status: 500 });
    }

    const result = await connection.execute(
      `SELECT * FROM VW_KULLANICI_PORTFOYU WHERE KULLANICI_ADI = :username`,
      { username },
    );

    const portfolio = result.rows?.map((row: unknown) => {
      const values = row as unknown[];

      return {
        username: values[0],
        coinId: values[1],
        coinSymbol: values[2],
        buyPrice: values[3],
        amount: values[4],
        kayitId: values[5],
      };
    }) ?? [];

    return NextResponse.json({ success: true, data: portfolio });
  } catch (error) {
    console.error("Portfolio list error:", error);
    return NextResponse.json({ success: false, message: "Portföy okunamadı." }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
