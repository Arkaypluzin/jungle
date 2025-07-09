// app/api/monthly_cra_reports/[id]/route.js
import { NextResponse } from "next/server";
import {
  updateMonthlyReportStatusController,
  getMonthlyReportByIdController, // Pourrait être utile pour un GET par ID
} from "../controller"; // Chemin relatif vers le contrôleur dans le même dossier parent

// Gère les requêtes GET pour récupérer un rapport mensuel par son ID (optionnel, mais bonne pratique)
export async function GET(request, { params }) {
  try {
    const { id } = params; // Récupère l'ID depuis l'URL dynamique
    console.log(`API (Monthly Reports) GET by ID: ID=${id}`);

    const report = await getMonthlyReportByIdController(id);

    if (!report) {
      return NextResponse.json(
        { message: "Rapport mensuel non trouvé." },
        { status: 404 }
      );
    }
    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error(
      `API (Monthly Reports) GET by ID Error (${params.id}):`,
      error
    );
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// Gère les requêtes PUT pour mettre à jour le statut (valider/rejeter) d'un rapport mensuel
export async function PUT(request, { params }) {
  try {
    const { id } = params; // Récupère l'ID du rapport à mettre à jour
    const { status, rejection_reason, reviewed_by } = await request.json(); // Récupère les données du corps de la requête

    if (!status || !reviewed_by) {
      return NextResponse.json(
        {
          message:
            "Le statut et l'ID du réviseur sont requis pour la mise à jour.",
        },
        { status: 400 }
      );
    }

    console.log(
      `API (Monthly Reports) PUT: ID=${id}, Status=${status}, RejectionReason=${rejection_reason}, Reviewer=${reviewed_by}`
    );

    const updatedReport = await updateMonthlyReportStatusController(
      id,
      status,
      reviewed_by,
      rejection_reason // Passez le motif de rejet au contrôleur
    );

    return NextResponse.json(updatedReport, { status: 200 });
  } catch (error) {
    console.error(`API (Monthly Reports) PUT Error (${params.id}):`, error);
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// Gère les requêtes DELETE pour supprimer un rapport mensuel (optionnel)
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    // Implémenter la logique de suppression dans le contrôleur si nécessaire
    // const deleted = await deleteMonthlyReportController(id);
    // return NextResponse.json({ message: "Rapport supprimé avec succès." }, { status: 200 });
    return NextResponse.json(
      { message: "La suppression n'est pas implémentée pour le moment." },
      { status: 501 }
    );
  } catch (error) {
    console.error(`API (Monthly Reports) DELETE Error (${params.id}):`, error);
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
