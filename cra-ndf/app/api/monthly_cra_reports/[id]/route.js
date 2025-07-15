// app/api/monthly_cra_reports/[id]/route.js
import { NextResponse } from "next/server";
import { getMonthlyReportByIdController } from "../controller"; // Chemin corrigé

export async function GET(request, { params }) {
  // Assurez-vous d'attendre les paramètres pour éviter l'erreur "Unexpected token '<'"
  const { id } = await params;

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

    // Retourne la propriété 'data', car le frontend attend l'objet rapport directement
    return NextResponse.json(reportResult.data, { status: 200 });
  } catch (error) {
    console.error(`Erreur API /api/monthly_cra_reports/${id} (GET):`, error);
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// La fonction PUT pour la mise à jour du statut a été déplacée vers
// app/api/monthly_cra_reports/[id]/status/route.js
