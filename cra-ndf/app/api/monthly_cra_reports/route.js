// app/api/monthly_cra_reports/route.js
import { NextResponse } from "next/server";
import {
  getMonthlyReportsController,
  createOrUpdateMonthlyReportController, // <-- NOUVEL IMPORT
} from "./controller"; // Importez le contrôleur

// Gère les requêtes GET pour récupérer les rapports mensuels
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get("userId");
    const monthsParam = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");

    // Convertir les paramètres en tableau s'ils existent
    const userIds = userIdsParam ? userIdsParam.split(",") : null;
    const months = monthsParam ? monthsParam.split(",") : null;

    console.log(
      `API (Monthly Reports) GET: userIds=${userIds}, months=${months}, year=${year}, status=${status}`
    );

    const reports = await getMonthlyReportsController({
      userIds,
      months,
      year,
      status,
    });
    return NextResponse.json(reports, { status: 200 });
  } catch (error) {
    console.error("API (Monthly Reports) GET Error:", error);
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// Gère les requêtes POST pour créer ou mettre à jour un rapport mensuel
export async function POST(request) {
  try {
    const reportData = await request.json();
    console.log("API (Monthly Reports) POST: Données reçues:", reportData);

    // Appelle le contrôleur pour créer ou mettre à jour le rapport
    const newReport = await createOrUpdateMonthlyReportController(reportData);
    return NextResponse.json(newReport, { status: 201 });
  } catch (error) {
    console.error("API (Monthly Reports) POST Error:", error);
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// NOTE: Les méthodes PUT et DELETE (pour la validation/rejet par ID) seront dans [id]/route.js