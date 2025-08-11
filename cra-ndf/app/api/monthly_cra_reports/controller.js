// app/api/monthly_cra_reports/controller.js
import { getMongoDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

// Fonction utilitaire pour obtenir la collection "activities"
export const getActivitiesCollection = async (db) => {
  return db.collection("cra_activities");
};

// Fonction utilitaire pour obtenir la collection "monthly_cra_reports"
export const getMonthlyCraReportsCollection = async (db) => {
  return db.collection("monthly_cra_reports");
};

// Fonction pour récupérer les rapports mensuels
export async function getMonthlyReportsController(queryParams) {
  try {
    const db = await getMongoDb();
    const monthlyReportsCollection = await getMonthlyCraReportsCollection(db);

    const { userId, month, year, status, reportType } = queryParams;

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

    if (reportType) {
      matchStage.report_type = reportType;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $addFields: {
          userName: { $ifNull: ["$userName", "Utilisateur inconnu"] },
          id: { $toString: "$_id" },
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
      userName,
      month,
      year,
      total_days_worked,
      total_billable_days,
      activities_snapshot,
      report_type,
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
      userName: userName,
      month: parseInt(month),
      year: parseInt(year),
      total_days_worked: parseFloat(total_days_worked),
      total_billable_days: parseFloat(total_billable_days),
      activities_snapshot: activities_snapshot,
      status: "pending_review", // Le statut initial est toujours 'pending_review' lors de la création/mise à jour
      submittedAt: new Date(),
      report_type: report_type,
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
      result = await monthlyReportsCollection.updateOne(
        {
          user_id: user_id,
          month: report.month,
          year: report.year,
          report_type: report.report_type,
        },
        { $set: report },
        { upsert: true }
      );
      console.log(
        `[Backend] createOrUpdateMonthlyReportController: Rapport mensuel créé/upserté. ID upserté: ${result.upsertedId}`
      );
    }

    if (
      result.upsertedId &&
      report.activities_snapshot &&
      report.activities_snapshot.length > 0
    ) {
      console.log(
        `[Backend DEBUG] Newly created/upserted monthly report ID: ${result.upsertedId.toString()}`
      );
      console.log(
        `[Backend DEBUG] Activities snapshot in newly created/upserted report:`,
        report.activities_snapshot.map((id) => id.toString())
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

    console.log(`[Backend DEBUG] Connected to DB Name: "${db.databaseName}"`);
    console.log(
      `[Backend DEBUG] Activities Collection Name: "${activitiesCollection.collectionName}"`
    );
    console.log(
      `[Backend DEBUG] Initial reportId received: "${reportId}" (Type: ${typeof reportId})`
    );

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
    console.log(`[Backend DEBUG] Monthly Report _id: ${report._id.toString()}`);

    let populatedActivities = [];
    if (
      report.activities_snapshot &&
      Array.isArray(report.activities_snapshot) &&
      report.activities_snapshot.length > 0
    ) {
      // Simplification du map pour éviter l'erreur de parsing
      const activityObjectIds = report.activities_snapshot
        .map(id => {
          try {
            if (typeof id === "string" && ObjectId.isValid(id)) {
              return new ObjectId(id);
            } else {
              console.warn(`[Backend] ID d'activité invalide ou non-ObjectId trouvé dans activities_snapshot: ${id}. Ce document sera ignoré.`);
              return null;
            }
          } catch (e) {
            console.error(`[Backend] Erreur lors de la conversion de l'ID en ObjectId pour ${id}:`, e);
            return null;
          }
        })
        .filter((id) => id !== null);

      console.log(
        `[Backend] getMonthlyReportByIdController: Après conversion/filtrage, IDs d'objets valides à rechercher: ${activityObjectIds.length}`,
        activityObjectIds.map((o) => o.toString())
      );

      if (activityObjectIds.length > 0) {
        const firstIdToTest = activityObjectIds[0];
        const firstIdToTestString = firstIdToTest.toString();

        console.log(
          `[Backend DEBUG] Test 1: Performing findOne with ObjectId for ID: ${firstIdToTestString}`
        );
        const singleActivityTestObjectId = await activitiesCollection.findOne({
          _id: firstIdToTest,
        });
        console.log(
          `[Backend DEBUG] Test 1 Result (ObjectId):`,
          singleActivityTestObjectId
            ? `Found (ID: ${singleActivityTestObjectId._id.toString()})`
            : `Not Found`
        );

        console.log(
          `[Backend DEBUG] Test 2: Performing findOne with String for ID: ${firstIdToTestString}`
        );
        const singleActivityTestString = await activitiesCollection.findOne({
          _id: firstIdToTestString,
        });
        console.log(
          `[Backend DEBUG] Test 2 Result (String):`,
          singleActivityTestString
            ? `Found (ID: ${singleActivityTestString._id.toString()})`
            : `Not Found`
        );

        console.log(
          `[Backend DEBUG] Test 3: Performing findOne with Regex for ID: /${firstIdToTestString}/`
        );
        const singleActivityTestRegex = await activitiesCollection.findOne({
          _id: { $regex: `^${firstIdToTestString}$` },
        });
        console.log(
          `[Backend DEBUG] Test 3 Result (Regex):`,
          singleActivityTestRegex
            ? `Found (ID: ${singleActivityTestRegex._id.toString()})`
            : `Not Found`
        );

        const findQuery = { _id: { $in: activityObjectIds } };
        console.log(
          `[Backend DEBUG] Executing activitiesCollection.find() with query:`,
          findQuery
        );

        const rawActivitiesFromDb = await activitiesCollection
          .find(findQuery)
          .toArray();

        console.log(
          `[Backend DEBUG] Raw activities from DB fetched: ${rawActivitiesFromDb.length}`
        );
        if (rawActivitiesFromDb.length > 0) {
          populatedActivities = rawActivitiesFromDb.map((act) => ({
            ...act,
            id: act._id.toString(),
          }));
        }
      } else {
        console.warn(
          `[Backend] getMonthlyReportByIdController: Aucun ID d'activité valide trouvé dans activities_snapshot.`
        );
      }
    } else {
      console.log(
        `[Backend] getMonthlyReportByIdController: Pas d'activités à peupler pour ce rapport.`
      );
    }

    return {
      success: true,
      data: {
        ...report,
        id: report._id.toString(),
        activities_snapshot: populatedActivities,
      },
    };
  } catch (error) {
    console.error(
      "[Backend] Erreur lors de la récupération du rapport mensuel par ID:",
      error
    );
    return { success: false, message: error.message };
  }
}

// Fonction pour changer le statut d'un rapport mensuel (ex. 'pending_review' à 'approved')
export async function changeMonthlyReportStatusController(reportId, newStatus) {
  try {
    const db = await getMongoDb();
    const monthlyReportsCollection = await getMonthlyCraReportsCollection(db);

    const updateResult = await monthlyReportsCollection.updateOne(
      { _id: new ObjectId(reportId) },
      { $set: { status: newStatus } }
    );

    if (updateResult.matchedCount === 0) {
      return {
        success: false,
        message: "Rapport mensuel non trouvé pour mise à jour du statut.",
      };
    }

    return { success: true, message: `Statut mis à jour en '${newStatus}'.` };
  } catch (error) {
    console.error(
      "[Backend] Erreur lors du changement de statut du rapport mensuel:",
      error
    );
    return { success: false, message: error.message };
  }
}
