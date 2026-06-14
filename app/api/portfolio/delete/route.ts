import { NextResponse } from "next/server";
import { isDemoMode, sellAsset } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";
import { getSessionUsername, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: Request) {
  const username = getSessionUsername(request);
  const { coinId, amount, price } = await request.json();
  const normalizedAmount = Number(amount);
  const normalizedPrice = Number(price);

  if (!username) {
    return unauthorizedResponse();
  }

  if (!coinId || normalizedAmount <= 0) {
    return NextResponse.json({ success: false, message: "Missing or invalid sale details." }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json({ ...sellAsset(username, coinId, normalizedAmount, normalizedPrice), mode: "demo" });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ success: false, message: "Oracle connection settings are missing." }, { status: 500 });
    }

    await connection.execute(
      `BEGIN SP_COIN_SAT(:username, :coinId, :amount); END;`,
      { username, coinId, amount: normalizedAmount },
    );

    await connection.commit();

    return NextResponse.json({ success: true, message: "Sale completed." });
  } catch (error) {
    console.error("Portfolio sell error:", error);
    return NextResponse.json({ success: false, message: "Sale failed." }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
