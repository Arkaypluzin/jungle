// app/api/monthly_cra_reports/controller.js
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../../lib/mongo";

async function getMonthlyReportsCollection() {
  const db = await getMongoDb();
  return db.collection("monthly_cra_reports");
}

async function getUsersCollection() {
  const db = await getMongoDb();
  return db.collection("users");
}

async function getActivitiesCollection() {
  const db = await getMongoDb();
  return db.collection("activities");
}

// --- Créer ou mettre à jour un rapport mensuel CRA ---
export async function createOrUpdateMonthlyReportController(reportData) {
  try {
    const collection = await getMonthlyReportsCollection();
    const usersCollection = await getUsersCollection();
    const now = new Date().toISOString();

    const userIdString = reportData.user_id;
    const user = await usersCollection.findOne({ clerkUserId: userIdString });
    const userName = user
      ? `${user.firstName} ${user.lastName}`
      : "Utilisateur inconnu";

    const existingReport = await collection.findOne({
      user_id: userIdString,
      month: reportData.month,
      year: reportData.year,
    });

    let result;
    if (existingReport) {
      console.log(
        `Controller: Monthly report for user ${userIdString} and month ${reportData.month}/${reportData.year} already exists. Updating.`
      );
      result = await collection.findOneAndUpdate(
        { _id: existingReport._id },
        {
          $set: {
            ...reportData,
            user_id: userIdString,
            userName: userName,
            activities_snapshot: reportData.activities_snapshot.map(
              (id) => new ObjectId(id)
            ),
            updatedAt: now,
            status: "pending_review",
            rejection_reason: null,
            reviewed_by: null,
          },
        },
        { returnDocument: "after" }
      );
      if (!result.value) {
        throw new Error("Échec de la mise à jour du rapport mensuel existant.");
      }
      console.log(
        `Controller: Monthly report for user ${userIdString} and month ${reportData.month}/${reportData.year} updated.`
      );
      return { ...result.value, id: result.value._id.toString() };
    } else {
      const newReport = {
        ...reportData,
        user_id: userIdString,
        userName: userName,
        activities_snapshot: reportData.activities_snapshot.map(
          (id) => new ObjectId(id)
        ),
        status: "pending_review",
        createdAt: now,
        updatedAt: now,
        rejection_reason: null,
        reviewed_by: null,
      };
      console.log(
        "Controller: Tentative de création de rapport mensuel:",
        newReport
      );
      const insertResult = await collection.insertOne(newReport);
      const createdReport = {
        ...newReport,
        _id: insertResult.insertedId,
        id: insertResult.insertedId.toString(),
      };
      console.log(
        "Controller: Rapport mensuel créé avec succès. ID:",
        createdReport.id
      );
      return createdReport;
    }
  } catch (error) {
    console.error("Erreur dans createOrUpdateMonthlyReportController:", error);
    throw new Error(
      "Impossible de créer/mettre à jour le rapport mensuel: " + error.message
    );
  }
}

// --- Récupérer les rapports mensuels ---
export async function getMonthlyReportsController({
  userId,
  month,
  year,
  status,
}) {
  try {
    const collection = await getMonthlyReportsCollection();
    const usersCollection = await getUsersCollection();
    const activitiesCollection = await getActivitiesCollection();

    let query = {};

    if (userId) {
      query.user_id = userId;
    }
    if (month) {
      query.month = parseInt(month, 10);
    }
    if (year) {
      query.year = parseInt(year, 10);
    }
    if (status) {
      const statuses = status
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
      if (statuses.length > 0) {
        query.status = { $in: statuses };
      }
    }

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "clerkUserId",
          as: "populatedUser",
        },
      },
      { $unwind: { path: "$populatedUser", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "activities",
          localField: "activities_snapshot",
          foreignField: "_id",
          as: "populatedActivities",
        },
      },
      {
        $project: {
          _id: 1,
          user_id: 1,
          month: 1,
          year: 1,
          total_days_worked: 1,
          total_billable_days: 1,
          status: 1,
          submitted_at: 1,
          reviewed_at: 1,
          reviewer_id: 1,
          rejection_reason: 1,
          userName: { $ifNull: ["$populatedUser.firstName", "$userName"] },
          activities_snapshot: "$populatedActivities",
        },
      },
      { $sort: { year: -1, month: -1, createdAt: -1 } },
    ];

    console.log(
      "Controller (getMonthlyReportsController): Exécution de l'agrégation avec le pipeline:",
      JSON.stringify(pipeline, null, 2)
    );
    const reports = await collection.aggregate(pipeline).toArray();
    console.log(
      `Controller (getMonthlyReportsController): ${reports.length} rapports mensuels trouvés.`
    );

    return reports.map((report) => ({ ...report, id: report._id.toString() }));
  } catch (error) {
    console.error("Erreur dans getMonthlyReportsController:", error);
    throw new Error(
      "Impossible de récupérer les rapports mensuels: " + error.message
    );
  }
}

// --- Mettre à jour le statut d'un rapport mensuel ---
export async function updateMonthlyReportStatusController(
  reportId,
  newStatus,
  reviewerId,
  rejectionReason = null
) {
  try {
    const monthlyReportsCollection = await getMonthlyReportsCollection(); // Renommé pour clarté
    const activitiesCollection = await getActivitiesCollection(); // Obtenir la collection d'activités
    const now = new Date().toISOString();

    console.log(
      `Controller (updateMonthlyReportStatusController): Tentative de mise à jour du rapport ID: ${reportId} vers statut: ${newStatus}`
    );
    console.log(
      `Controller (updateMonthlyReportStatusController): Relecteur ID: ${reviewerId}, Motif de rejet: ${rejectionReason}`
    );

    const updateDoc = {
      status: newStatus,
      reviewed_at: now,
      reviewer_id: reviewerId,
      updatedAt: now,
    };

    if (newStatus === "rejected") {
      updateDoc.rejection_reason = rejectionReason;
    } else {
      updateDoc.rejection_reason = null;
    }

    let objectIdReportId;
    try {
      objectIdReportId = new ObjectId(reportId);
      console.log(
        `Controller (updateMonthlyReportStatusController): ID converti en ObjectId: ${objectIdReportId}`
      );
    } catch (e) {
      console.error(
        `Controller (updateMonthlyReportStatusController): Erreur de conversion de l'ID '${reportId}' en ObjectId:`,
        e.message
      );
      throw new Error(
        "ID de rapport invalide fourni (doit être une chaîne hexadécimale de 24 caractères)."
      );
    }

    // 1. Mettre à jour le rapport mensuel
    const result = await monthlyReportsCollection.findOneAndUpdate(
      // Utilise monthlyReportsCollection
      { _id: objectIdReportId },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    if (!result.value) {
      console.warn(
        `Controller (updateMonthlyReportStatusController): Rapport mensuel avec ID ${reportId} non trouvé pour la mise à jour du statut.`
      );
      throw new Error(
        "Rapport mensuel non trouvé pour la mise à jour du statut."
      );
    }

    // 2. Propager le nouveau statut aux activités individuelles
    const activitiesToUpdateIds = result.value.activities_snapshot; // Récupère les IDs des activités snapshotées

    if (activitiesToUpdateIds && activitiesToUpdateIds.length > 0) {
      console.log(
        `Controller (updateMonthlyReportStatusController): Propagation du statut '${newStatus}' à ${activitiesToUpdateIds.length} activités.`
      );
      const updateActivitiesResult = await activitiesCollection.updateMany(
        { _id: { $in: activitiesToUpdateIds } }, // Trouve toutes les activités dont l'ID est dans la liste
        { $set: { status: newStatus, updated_at: now } } // Met à jour leur statut et la date de mise à jour
      );
      console.log(
        `Controller (updateMonthlyReportStatusController): ${updateActivitiesResult.modifiedCount} activités individuelles mises à jour.`
      );
    } else {
      console.log(
        "Controller (updateMonthlyReportStatusController): Aucune activité à propager pour ce rapport."
      );
    }

    console.log(
      `Controller (updateMonthlyReportStatusController): Rapport mensuel ${reportId} statut mis à jour à ${newStatus}.`
    );
    return { ...result.value, id: result.value._id.toString() };
  } catch (error) {
    console.error("Erreur dans updateMonthlyReportStatusController:", error);
    if (error.message.includes("input must be a 24 character hex string")) {
      throw new Error("ID de rapport invalide fourni.");
    }
    throw new Error(
      "Impossible de mettre à jour le statut du rapport mensuel: " +
        error.message
    );
  }
}

// --- Récupérer un rapport mensuel par ID ---
export async function getMonthlyReportByIdController(reportId) {
  try {
    const collection = await getMonthlyReportsCollection();
    const usersCollection = await getUsersCollection();
    const activitiesCollection = await getActivitiesCollection();

    console.log(
      `Controller (getMonthlyReportByIdController): Tentative de récupération du rapport ID: ${reportId}`
    );
    let objectIdReportId;
    try {
      objectIdReportId = new ObjectId(reportId);
      console.log(
        `Controller (getMonthlyReportByIdController): ID converti en ObjectId: ${objectIdReportId}`
      );
    } catch (e) {
      console.error(
        `Controller (getMonthlyReportByIdController): Erreur de conversion de l'ID '${reportId}' en ObjectId:`,
        e.message
      );
      throw new Error(
        "ID de rapport invalide fourni (doit être une chaîne hexadécimale de 24 caractères)."
      );
    }

    const report = await collection.findOne({ _id: objectIdReportId });
    if (!report) {
      console.warn(
        `Controller (getMonthlyReportByIdController): Rapport mensuel avec ID ${reportId} non trouvé.`
      );
      return null;
    }
    console.log(
      `Controller (getMonthlyReportByIdController): Rapport trouvé pour ID ${reportId}.`
    );

    const user = await usersCollection.findOne({ clerkUserId: report.user_id });

    const populatedActivities = await activitiesCollection
      .find({
        _id: { $in: report.activities_snapshot.map((id) => new ObjectId(id)) },
      })
      .toArray();

    return {
      ...report,
      userName: user
        ? `${user.firstName} ${user.lastName}`
        : "Utilisateur inconnu",
      activities_snapshot: populatedActivities,
      id: report._id.toString(),
    };
  } catch (error) {
    console.error("Erreur dans getMonthlyReportByIdController:", error);
    if (error.message.includes("input must be a 24 character hex string")) {
      throw new Error("ID de rapport invalide fourni.");
    }
    throw new Error(
      "Impossible de récupérer le rapport mensuel par ID: " + error.message
    );
  }
}

// --- Supprimer un rapport mensuel par ID (optionnel, pour l'exhaustivité) ---
export async function deleteMonthlyReportController(reportId) {
  try {
    const collection = await getMonthlyReportsCollection();
    console.log(
      `Controller (deleteMonthlyReportController): Tentative de suppression du rapport ID: ${reportId}`
    );
    let objectIdReportId;
    try {
      objectIdReportId = new ObjectId(reportId);
      console.log(
        `Controller (deleteMonthlyReportController): ID converti en ObjectId: ${objectIdReportId}`
      );
    } catch (e) {
      console.error(
        `Controller (deleteMonthlyReportController): Erreur de conversion de l'ID '${reportId}' en ObjectId:`,
        e.message
      );
      throw new Error(
        "ID de rapport invalide fourni (doit être une chaîne hexadécimale de 24 caractères)."
      );
    }

    const result = await collection.deleteOne({ _id: objectIdReportId });
    if (result.deletedCount === 0) {
      console.warn(
        `Controller (deleteMonthlyReportController): Rapport mensuel avec ID ${reportId} non trouvé pour la suppression.`
      );
      throw new Error("Rapport mensuel non trouvé pour la suppression.");
    }
    console.log(
      `Controller (deleteMonthlyReportController): Rapport mensuel ${reportId} supprimé avec succès.`
    );
    return { message: "Rapport mensuel supprimé avec succès." };
  } catch (error) {
    console.error("Erreur dans deleteMonthlyReportController:", error);
    if (error.message.includes("input must be a 24 character hex string")) {
      throw new Error("ID de rapport invalide fourni.");
    }
    throw new Error(
      "Impossible de supprimer le rapport mensuel: " + error.message
    );
  }
}
