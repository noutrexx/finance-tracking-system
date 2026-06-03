import { NextResponse } from "next/server";
import { isDemoMode, sellAsset } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";

export async function POST(request: Request) {
  const { username, coinId, amount } = await request.json();
  const normalizedAmount = Number(amount);

  if (!username || !coinId || normalizedAmount <= 0) {
    return NextResponse.json({ success: false, message: "Eksik veya hatalı satış bilgisi." }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json({ ...sellAsset(username, coinId, normalizedAmount), mode: "demo" });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: false, message: "Oracle bağlantı bilgileri eksik." }, { status: 500 });
    }

    await connection.execute(
      `BEGIN SP_COIN_SAT(:username, :coinId, :amount); END;`,
      { username, coinId, amount: normalizedAmount },
    );

    await connection.commit();

    return NextResponse.json({ success: true, message: "Satış işlemi başarılı." });
  } catch (error) {
    console.error("Portfolio sell error:", error);
    return NextResponse.json({ success: false, message: "Satış işlemi başarısız." }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
