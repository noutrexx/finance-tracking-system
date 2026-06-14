import { NextResponse } from "next/server";
import { isDemoMode, listPortfolio } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";
import { getSessionUsername, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: Request) {
  const username = getSessionUsername(request);

  if (!username) {
    return unauthorizedResponse();
  }

  if (isDemoMode()) {
    return NextResponse.json({ success: true, data: listPortfolio(username), mode: "demo" });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: false, message: "Oracle connection settings are missing." }, { status: 500 });
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
    return NextResponse.json({ success: false, message: "Portfolio could not be loaded." }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
