import { NextResponse } from "next/server";
import { addAsset, isDemoMode } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";

export async function POST(request: Request) {
  const { username, coinId, coinSymbol, price, amount } = await request.json();
  const normalizedAmount = Number(amount);
  const normalizedPrice = Number(price);

  if (!username || !coinId || !coinSymbol || normalizedAmount <= 0 || normalizedPrice <= 0) {
    return NextResponse.json({ success: false, message: "Eksik veya hatalı işlem bilgisi." }, { status: 400 });
  }

  if (isDemoMode()) {
    addAsset({ username, coinId, coinSymbol, buyPrice: normalizedPrice, amount: normalizedAmount });
    return NextResponse.json({ success: true, message: "Varlık demo portföye eklendi.", mode: "demo" });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: false, message: "Oracle bağlantı bilgileri eksik." }, { status: 500 });
    }

    await connection.execute(
      `BEGIN SP_COIN_EKLE(:username, :coinId, :coinSymbol, :price, :amount); END;`,
      { username, coinId, coinSymbol, price: normalizedPrice, amount: normalizedAmount },
    );

    await connection.commit();

    return NextResponse.json({ success: true, message: "Varlık portföye eklendi." });
  } catch (error) {
    console.error("Portfolio add error:", error);
    const message = error instanceof Error ? error.message : "İşlem başarısız.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
