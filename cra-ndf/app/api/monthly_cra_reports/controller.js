// app/api/monthly_cra_reports/controller.js
import { getMongoDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

// Fonction utilitaire pour obtenir la collection "activities"
const getActivitiesCollection = async (db) => {
  return db.collection("activities");
};

// Fonction utilitaire pour obtenir la collection "monthly_cra_reports"
const getMonthlyCraReportsCollection = async (db) => {
  return db.collection("monthly_cra_reports");
};

// Fonction pour récupérer les rapports mensuels
export async function getMonthlyReportsController(queryParams) {
  try {
    const db = await getMongoDb();
    const monthlyReportsCollection = await getMonthlyCraReportsCollection(db);

    const { userId, month, year, status } = queryParams;

    let matchStage = {};

    if (userId) {
      matchStage.user_id = userId;
    }
    if (month) {
      matchStage.month = parseInt(month);
    }
    if (year) {
      matchStage.year = parseInt(year);
    }
    if (status) {
      const statusArray = status.split(",");
      matchStage.status = { $in: statusArray };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $addFields: {
          userName: { $ifNull: ["$userName", "Utilisateur inconnu"] }, // Utilise le userName existant ou un fallback
          id: { $toString: "$_id" }, // Mappe _id à id pour le frontend
        },
      },
      { $sort: { year: -1, month: -1, submittedAt: -1 } },
    ];

    const monthlyReports = await monthlyReportsCollection
      .aggregate(pipeline)
      .toArray();

    console.log(
      "[Backend] getMonthlyReportsController: Rapports récupérés. Exemples de userName:",
      monthlyReports.slice(0, 3).map((r) => r.userName)
    );

    return { success: true, data: monthlyReports };
  } catch (error) {
    console.error("[Backend] Error fetching monthly CRA reports:", error);
    return { success: false, message: error.message };
  }
}

// Fonction pour créer ou mettre à jour un rapport mensuel (CRA Board)
export async function createOrUpdateMonthlyReportController(
  monthlyReportData,
  existingReportId = null
) {
  try {
    const db = await getMongoDb();
    const monthlyReportsCollection = await getMonthlyCraReportsCollection(db);

    const {
      user_id,
      userName, // Reçoit le userName du frontend
      month,
      year,
      total_days_worked,
      total_billable_days,
      activities_snapshot,
    } = monthlyReportData;

    console.log(
      `[Backend] createOrUpdateMonthlyReportController: userName reçu: "${userName}" pour userId: "${user_id}"`
    );

    if (!user_id || !month || !year) {
      return {
        success: false,
        message: "User ID, month, and year are required.",
      };
    }

    const report = {
      user_id: user_id,
      userName: userName, // Stocke le userName reçu
      month: parseInt(month),
      year: parseInt(year),
      total_days_worked: parseFloat(total_days_worked),
      total_billable_days: parseFloat(total_billable_days),
      activities_snapshot: activities_snapshot,
      status: "pending_review", // Statut initial lors de la création/mise à jour
      submittedAt: new Date(),
    };

    let result;
    if (existingReportId) {
      result = await monthlyReportsCollection.updateOne(
        { _id: new ObjectId(existingReportId) },
        { $set: report }
      );
      if (result.matchedCount === 0) {
        return {
          success: false,
          message: "Monthly report not found for update.",
        };
      }
      console.log(
        `[Backend] createOrUpdateMonthlyReportController: Rapport mensuel mis à jour pour ID: ${existingReportId}`
      );
    } else {
      result = await monthlyReportsCollection.updateOne(
        { user_id: user_id, month: report.month, year: report.year },
        { $set: report },
        { upsert: true } // Crée le document s'il n'existe pas, le met à jour sinon
      );
      console.log(
        `[Backend] createOrUpdateMonthlyReportController: Rapport mensuel créé/upserted. Upserted ID: ${result.upsertedId}`
      );
    }

    return {
      success: true,
      data: {
        ...report,
        id: result.upsertedId ? result.upsertedId.toString() : existingReportId,
      },
    };
  } catch (error) {
    console.error(
      "[Backend] Error creating or updating monthly CRA report:",
      error
    );
    return { success: false, message: error.message };
  }
}

// Fonction pour récupérer un rapport mensuel par ID (pour la visualisation détaillée)
export async function getMonthlyReportByIdController(reportId) {
  try {
    const db = await getMongoDb();
    const monthlyReportsCollection = await getMonthlyCraReportsCollection(db);
    const activitiesCollection = await getActivitiesCollection(db);

    console.log(
      `[Backend] getMonthlyReportByIdController: Tenter de récupérer le rapport mensuel pour ID: ${reportId}`
    );
    const report = await monthlyReportsCollection.findOne({
      _id: new ObjectId(reportId),
    });

    if (!report) {
      console.warn(
        `[Backend] getMonthlyReportByIdController: Rapport mensuel non trouvé pour ID: ${reportId}`
      );
      return { success: false, message: "Monthly report not found." };
    }
    console.log(
      `[Backend] getMonthlyReportByIdController: Rapport mensuel trouvé. userName: "${report.userName}"`
    );

    let populatedActivities = [];
    if (
      report.activities_snapshot &&
      Array.isArray(report.activities_snapshot) &&
      report.activities_snapshot.length > 0
    ) {
      const activityObjectIds = report.activities_snapshot
        .map((id) => {
          try {
            if (typeof id === "string" && ObjectId.isValid(id)) {
              return new ObjectId(id);
            } else {
              console.warn(
                `[Backend] ID d'activité invalide ou non-ObjectId trouvé: ${id}`
              );
              return null;
            }
          } catch (e) {
            console.error(
              `[Backend] Erreur lors de la conversion de l'ID en ObjectId pour ${id}:`,
              e
            );
            return null;
          }
        })
        .filter((id) => id !== null);

      if (activityObjectIds.length > 0) {
        populatedActivities = await activitiesCollection
          .find({ _id: { $in: activityObjectIds } })
          .map((doc) => ({ ...doc, id: doc._id.toString() }))
          .toArray();
        console.log(
          `[Backend] getMonthlyReportByIdController: Activités récupérées depuis la base de données:`,
          populatedActivities.length,
          "activités."
        );
      } else {
        console.warn(
          `[Backend] getMonthlyReportByIdController: Aucun ID d'activité valide à rechercher après filtrage.`
        );
      }
    } else {
      console.log(
        `[Backend] getMonthlyReportByIdController: Le champ activities_snapshot est vide ou n'existe pas dans le rapport.`
      );
    }

    const userName = report.userName || "Utilisateur inconnu"; // Fallback si userName n'est pas dans la DB

    return {
      success: true,
      data: {
        ...report,
        id: report._id.toString(), // Mappe _id à id ici aussi
        userName: userName,
        activities_snapshot: populatedActivities,
      },
    };
  } catch (error) {
    console.error("[Backend] Error fetching monthly CRA report by ID:", error);
    return { success: false, message: error.message };
  }
}

// Fonction pour mettre à jour le statut d'un rapport mensuel
export async function updateMonthlyReportStatusController(
  reportId,
  newStatus,
  reviewerId,
  rejectionReason = null
) {
  try {
    const db = await getMongoDb();
    const monthlyReportsCollection = await getMonthlyCraReportsCollection(db);

    let updateFields = {
      status: newStatus,
      reviewedAt: new Date(),
      reviewerId: reviewerId,
    };

    if (newStatus === "rejected") {
      updateFields.rejectionReason = rejectionReason;
    } else {
      updateFields.$unset = { rejectionReason: "" };
    }

    const result = await monthlyReportsCollection.updateOne(
      { _id: new ObjectId(reportId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        message: "Monthly report not found for status update.",
      };
    }
    console.log(
      `[Backend] updateMonthlyReportStatusController: Statut du rapport ${reportId} mis à jour à "${newStatus}"`
    );
    return {
      success: true,
      message: "Monthly report status updated successfully.",
    };
  } catch (error) {
    console.error("[Backend] Error updating monthly CRA report status:", error);
    return { success: false, message: error.message };
  }
}
