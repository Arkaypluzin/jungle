// app/api/test-activity-read/route.js
import { NextResponse } from "next/server";
import { testActivityRead } from "../monthly_cra_reports/controller"; // Importez la nouvelle fonction de test

export async function GET() {
  try {
    console.log("[Backend] API /api/test-activity-read (GET) called.");
    const testResult = await testActivityRead();
    return NextResponse.json(testResult, {
      status: testResult.success ? 200 : 500,
    });
  } catch (error) {
    console.error("[Backend] Erreur API /api/test-activity-read (GET):", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Erreur interne du serveur lors du test de lecture.",
      },
      { status: 500 }
    );
  }
}
