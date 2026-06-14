import { NextResponse } from "next/server";
import { getSessionUsername, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: Request) {
  const username = getSessionUsername(request);

  if (!username) {
    return unauthorizedResponse();
  }

  return NextResponse.json({ success: true, username });
}
