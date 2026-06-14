import { NextResponse } from "next/server";
import { isDemoMode, listTransactions } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";
import { getSessionUsername, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: Request) {
  const username = getSessionUsername(request);

  if (!username) {
    return unauthorizedResponse();
  }

  if (isDemoMode()) {
    return NextResponse.json({ success: true, data: listTransactions(username), mode: "demo" });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: true, data: [] });
    }

    const result = await connection.execute(
      `SELECT ID, KULLANICI_ADI, ISLEM_TIPI, COIN_ID, COIN_SYMBOL, FIYAT, MIKTAR, TOPLAM, CREATED_AT
       FROM VW_KULLANICI_ISLEM_GECMISI
       WHERE KULLANICI_ADI = :username
       ORDER BY CREATED_AT DESC`,
      { username },
    );

    const transactions = result.rows?.map((row: unknown) => {
      const values = row as unknown[];

      return {
        id: values[0],
        username: values[1],
        type: values[2],
        coinId: values[3],
        coinSymbol: values[4],
        price: values[5],
        amount: values[6],
        total: values[7],
        createdAt: values[8],
      };
    }) ?? [];

    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error("Transaction history error:", error);
    return NextResponse.json({ success: true, data: [] });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
