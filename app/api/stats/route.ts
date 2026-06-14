import { NextResponse } from "next/server";
import { isDemoMode, stats } from "@/lib/demoStore";
import { getOracleConnection } from "@/lib/oracle";
import { getSessionUsername, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: Request) {
  if (!getSessionUsername(request)) {
    return unauthorizedResponse();
  }

  if (isDemoMode()) {
    return NextResponse.json({ ...stats(), mode: "demo" });
  }

  let connection;

  try {
    connection = await getOracleConnection();

    if (!connection) {
      return NextResponse.json({ users: 0, tracking: 0, logs: 0 });
    }

    const result = await connection.execute(`SELECT * FROM VW_SISTEM_OZETI`);
    const row = result.rows?.[0] ?? [0, 0, 0];

    return NextResponse.json({
      users: row[0],
      tracking: row[1],
      logs: row[2],
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ users: 0, tracking: 0, logs: 0 });
  } finally {
    if (connection) {
      await connection.close().catch(console.error);
    }
  }
}
