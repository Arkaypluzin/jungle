// app/api/monthly_cra_reports/[id]/route.js
// Ce fichier doit être dans le dossier app/api/monthly_cra_reports/[id]/
// et être nommé route.js

import { NextResponse } from "next/server";
import {
  getMonthlyReportByIdController,
  changeMonthlyReportStatusController,
  getActivitiesCollection, // Exporté depuis controller.js
  getMonthlyCraReportsCollection, // Exporté depuis controller.js
} from "../controller";
import { getMongoDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

// Fonction GET pour récupérer un rapport mensuel détaillé
export async function GET(request, { params }) {
  const { id } = params;
  const result = await getMonthlyReportByIdController(id);
  if (result.success) {
    return NextResponse.json(result.data, { status: 200 });
  } else {
    return NextResponse.json({ message: result.message }, { status: 404 });
  }
}

// Fonction PUT pour mettre à jour le statut d'un rapport mensuel
export async function PUT(request, { params }) {
  const { id } = params;
  const { status, reviewerId, rejectionReason } = await request.json();

  const result = await changeMonthlyReportStatusController(
    id,
    status,
    reviewerId,
    rejectionReason
  );

  if (result.success) {
    return NextResponse.json({ message: result.message }, { status: 200 });
  } else {
    return NextResponse.json({ message: result.message }, { status: 500 });
  }
}

// FONCTION CRUCIALE : DELETE pour supprimer un rapport mensuel et ses activités associées
export async function DELETE(request, { params }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { message: "L'ID du rapport est requis pour la suppression." },
      { status: 400 }
    );
  }

  try {
    const db = await getMongoDb();
    const monthlyReportsCollection = await getMonthlyCraReportsCollection(db);
    const activitiesCollection = await getActivitiesCollection(db);

    const reportToDelete = await monthlyReportsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!reportToDelete) {
      // Si le rapport n'existe pas, on renvoie 204 car l'objectif est atteint (il n'est plus là)
      return new Response("", { status: 204 }); // <-- CORRECTION ICI : Utilise new Response("", { status: 204 })
    }

    if (
      reportToDelete.activities_snapshot &&
      reportToDelete.activities_snapshot.length > 0
    ) {
      const activityObjectIds = reportToDelete.activities_snapshot
        .filter((activityId) => ObjectId.isValid(activityId))
        .map((activityId) => new ObjectId(activityId));

      if (activityObjectIds.length > 0) {
        const result = await activitiesCollection.deleteMany({
          _id: { $in: activityObjectIds },
        });
        console.log(
          `Backend: Supprimé ${result.deletedCount} activités associées au rapport ${id}.`
        );
      }
    }

    await monthlyReportsCollection.deleteOne({ _id: new ObjectId(id) });

    return new Response("", { status: 204 }); // <-- CORRECTION ICI : Utilise new Response("", { status: 204 })
  } catch (error) {
    console.error(`Erreur API /api/monthly_cra_reports/${id} (DELETE):`, error);
    return NextResponse.json(
      {
        message:
          error.message || "Erreur interne du serveur lors de la suppression.",
      },
      { status: 500 }
    );
  }
}
