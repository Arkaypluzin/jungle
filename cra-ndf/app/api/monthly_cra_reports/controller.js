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

    const { userId, month, year, status, reportType } = queryParams; // Récupère reportType

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

    // NOUVEAU: Filtrage par type de rapport
    if (reportType) {
      matchStage.report_type = reportType;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $addFields: {
          userName: { $ifNull: ["$userName", "Utilisateur inconnu"] }, // Utilise userName existant ou un fallback
          id: { $toString: "$_id" }, // Mappe _id vers id pour le frontend
        },
      },
      { $sort: { year: -1, month: -1, submittedAt: -1 } },
    ];

    const monthlyReports = await monthlyReportsCollection
      .aggregate(pipeline)
      .toArray();

    console.log(
      "[Backend] getMonthlyReportsController: Rapports récupérés. Exemples de userName:",
      monthlyReports.slice(0, 3).map((r) => r.userName),
      "avec filtres:",
      queryParams
    );

    return { success: true, data: monthlyReports };
  } catch (error) {
    console.error(
      "[Backend] Erreur lors de la récupération des rapports CRA mensuels:",
      error
    );
    return { success: false, message: error.message };
  }
}

// Fonction pour créer ou mettre à jour un rapport mensuel (Tableau CRA)
export async function createOrUpdateMonthlyReportController(
  monthlyReportData,
  existingReportId = null
) {
  try {
    const db = await getMongoDb();
    const monthlyReportsCollection = await getMonthlyCraReportsCollection(db);

    const {
      user_id,
      userName, // Reçoit userName du frontend
      month,
      year,
      total_days_worked,
      total_billable_days,
      activities_snapshot,
      report_type, // AJOUTÉ: Récupère le type de rapport (cra ou paid_leave)
    } = monthlyReportData;

    console.log(
      `[Backend] createOrUpdateMonthlyReportController: userName reçu: "${userName}", report_type: "${report_type}" pour userId: "${user_id}"`
    );

    if (!user_id || !month || !year || !report_type) {
      return {
        success: false,
        message:
          "L'ID utilisateur, le mois, l'année et le type de rapport sont requis.",
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
      report_type: report_type, // AJOUTÉ: Stocke le type de rapport
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
          message: "Rapport mensuel non trouvé pour la mise à jour.",
        };
      }
      console.log(
        `[Backend] createOrUpdateMonthlyReportController: Rapport mensuel mis à jour pour l'ID: ${existingReportId}`
      );
    } else {
      // Utilise user_id, month, year ET report_type pour un upsert unique
      result = await monthlyReportsCollection.updateOne(
        {
          user_id: user_id,
          month: report.month,
          year: report.year,
          report_type: report.report_type,
        },
        { $set: report },
        { upsert: true } // Crée le document s'il n'existe pas, le met à jour sinon
      );
      console.log(
        `[Backend] createOrUpdateMonthlyReportController: Rapport mensuel créé/upserté. ID upserté: ${result.upsertedId}`
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
      "[Backend] Erreur lors de la création ou de la mise à jour du rapport CRA mensuel:",
      error
    );
    return { success: false, message: error.message };
  }
}

// Fonction pour récupérer un rapport mensuel par ID (pour une visualisation détaillée)
export async function getMonthlyReportByIdController(reportId) {
  try {
    const db = await getMongoDb();
    const monthlyReportsCollection = await getMonthlyCraReportsCollection(db);
    const activitiesCollection = await getActivitiesCollection(db);

    console.log(
      `[Backend] getMonthlyReportByIdController: Tentative de récupération du rapport mensuel pour l'ID: ${reportId}`
    );
    const report = await monthlyReportsCollection.findOne({
      _id: new ObjectId(reportId),
    });

    if (!report) {
      console.warn(
        `[Backend] getMonthlyReportByIdController: Rapport mensuel non trouvé pour l'ID: ${reportId}`
      );
      return { success: false, message: "Rapport mensuel non trouvé." };
    }
    console.log(
      `[Backend] getMonthlyReportByIdController: Rapport mensuel trouvé. userName: "${
        report.userName
      }", month: ${report.month}, year: ${
        report.year
      }, activities_snapshot length: ${
        report.activities_snapshot ? report.activities_snapshot.length : 0
      }`
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
            // Assurez-vous que l'ID est une chaîne valide avant de tenter la conversion
            if (typeof id === "string" && ObjectId.isValid(id)) {
              return new ObjectId(id);
            } else {
              console.warn(
                `[Backend] ID d'activité invalide ou non-ObjectId trouvé dans activities_snapshot: ${id}. Ce document sera ignoré.`
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
        .filter((id) => id !== null); // Filtre les IDs nuls ou invalides

      if (activityObjectIds.length > 0) {
        console.log(
          `[Backend] getMonthlyReportByIdController: Tentative de récupération de ${activityObjectIds.length} activités. IDs à rechercher:`,
          activityObjectIds.map((o) => o.toString())
        );
        populatedActivities = await activitiesCollection
          .find({ _id: { $in: activityObjectIds } })
          .map((doc) => ({ ...doc, id: doc._id.toString() }))
          .toArray();
        console.log(
          `[Backend] getMonthlyReportByIdController: Activités récupérées de la base de données:`,
          populatedActivities.length,
          "activités. Premières activités (ID, type, date):",
          populatedActivities
            .slice(0, 3)
            .map((a) => ({
              id: a.id,
              type: a.type_activite,
              date: a.date_activite,
            }))
        );
        if (populatedActivities.length !== activityObjectIds.length) {
          console.warn(
            `[Backend] getMonthlyReportByIdController: Le nombre d'activités récupérées (${populatedActivities.length}) ne correspond pas au nombre d'IDs recherchés (${activityObjectIds.length}). Cela peut indiquer des activités manquantes ou des IDs incorrects dans la base de données 'activities'.`
          );
        }
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
        id: report._id.toString(), // Mappe _id vers id ici aussi
        userName: userName,
        activities_snapshot: populatedActivities,
      },
    };
  } catch (error) {
    console.error(
      "[Backend] Erreur lors de la récupération du rapport CRA mensuel par ID:",
      error
    );
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

    let updateOperation = {
      $set: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewerId: reviewerId,
      },
    };

    if (newStatus === "rejected") {
      updateOperation.$set.rejectionReason = rejectionReason;
    } else {
      // Si le statut n'est pas "rejected", assurez-vous que rejectionReason est supprimé s'il existe
      updateOperation.$unset = { rejectionReason: "" };
    }

    const result = await monthlyReportsCollection.updateOne(
      { _id: new ObjectId(reportId) },
      updateOperation // Utilisation de l'objet d'opération de mise à jour combiné
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        message: "Rapport mensuel non trouvé pour la mise à jour du statut.",
      };
    }
    console.log(
      `[Backend] updateMonthlyReportStatusController: Statut du rapport ${reportId} mis à jour à "${newStatus}"`
    );
    return {
      success: true,
      message: "Statut du rapport mensuel mis à jour avec succès.",
    };
  } catch (error) {
    console.error(
      "[Backend] Erreur lors de la mise à jour du statut du rapport CRA mensuel:",
      error
    );
    return { success: false, message: error.message };
  }
}
