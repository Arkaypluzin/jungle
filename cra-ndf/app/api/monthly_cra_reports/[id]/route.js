// app/api/monthly_cra_reports/[id]/route.js
import { NextResponse } from "next/server";
import { getMonthlyReportByIdController } from "../controller";

// Correct way to access params in Next.js App Router Route Handlers
export async function GET(request, { params }) {
  const { id } = params; // 'params' is directly an object, no 'await' needed here.

  if (!id) {
    return NextResponse.json(
      { message: "L'ID du rapport est requis." },
      { status: 400 }
    );
  }

  try {
    const reportResult = await getMonthlyReportByIdController(id);

    if (!reportResult.success) {
      return NextResponse.json(
        { message: reportResult.message || "Rapport mensuel non trouvé." },
        { status: 404 }
      );
    }

    return NextResponse.json(reportResult.data, { status: 200 });
  } catch (error) {
    console.error(`Erreur API /api/monthly_cra_reports/${id} (GET):`, error);
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
