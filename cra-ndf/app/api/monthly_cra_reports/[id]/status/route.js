// app/api/monthly_cra_reports/[id]/status/route.js
import { NextResponse } from "next/server";
import { changeMonthlyReportStatusController } from "../../controller"; // Adjust path if necessary

export async function PUT(request, { params }) {
  // Assurez-vous d'attendre les paramètres pour éviter l'erreur "Unexpected token '<'"
  const { id } = await params;
  const { status, reviewerId, rejectionReason } = await request.json();

  if (!id) {
    return NextResponse.json(
      { message: "L'ID du rapport est requis." },
      { status: 400 }
    );
  }
  if (!status || !["validated", "rejected"].includes(status)) {
    return NextResponse.json(
      { message: "Le statut fourni est invalide." },
      { status: 400 }
    );
  }
  if (
    status === "rejected" &&
    (!rejectionReason || rejectionReason.trim() === "")
  ) {
    return NextResponse.json(
      { message: "Un motif de rejet est requis pour le statut 'rejeté'." },
      { status: 400 }
    );
  }

  try {
    const updatedReportResult = await changeMonthlyReportStatusController(
      id,
      status,
      reviewerId,
      rejectionReason
    );

    if (updatedReportResult.success) {
      return NextResponse.json(updatedReportResult, { status: 200 });
    } else {
      // Retourne le message d'erreur du contrôleur avec un statut 500 ou 404 si approprié
      return NextResponse.json(
        {
          message:
            updatedReportResult.message ||
            "Erreur lors de la mise à jour du statut du rapport mensuel.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur API /api/monthly_cra_reports/${id}/status (PUT):`,
      error
    );
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
