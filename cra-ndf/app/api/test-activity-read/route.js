// app/api/test-activity-read/route.js
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { success: true, message: "API test désactivée." },
    { status: 200 }
  );
}
