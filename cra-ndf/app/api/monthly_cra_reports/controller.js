// app/api/monthly_cra_reports/controller.js
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../../lib/mongo"; // Assurez-vous que ce chemin est correct

async function getMonthlyReportsCollection() {
  const db = await getMongoDb();
  return db.collection("monthly_cra_reports"); // Nom de votre collection pour les rapports mensuels
}

async function getUsersCollection() {
  const db = await getMongoDb();
  return db.collection("users"); // Nom de votre collection d'utilisateurs
}

async function getActivitiesCollection() {
  const db = await getMongoDb();
  return db.collection("activities"); // Pour récupérer les détails des activités snapshot
}

// --- Créer ou mettre à jour un rapport mensuel CRA ---
export async function createOrUpdateMonthlyReportController(reportData) {
  try {
    const collection = await getMonthlyReportsCollection();
    const usersCollection = await getUsersCollection();
    const now = new Date().toISOString();

    // L'ID utilisateur provenant du frontend (reportData.user_id) est une chaîne (ex: "user_xxxx")
    // Nous allons le stocker tel quel dans le rapport mensuel.
    const userIdString = reportData.user_id;

    // Rechercher l'utilisateur dans la collection 'users' en utilisant le champ 'clerkUserId'
    // ASSUREZ-VOUS QUE VOTRE COLLECTION 'users' A UN CHAMP 'clerkUserId' QUI CONTIENT CET ID.
    // Si votre ID utilisateur est l'ObjectId MongoDB de l'utilisateur, alors vous devrez utiliser :
    // const user = await usersCollection.findOne({ _id: new ObjectId(userIdString) });
    // MAIS si userIdString n'est PAS un ObjectId valide, cela causera l'erreur.
    // La solution la plus robuste est de stocker l'ID de Clerk/NextAuth comme une chaîne simple.
    const user = await usersCollection.findOne({ clerkUserId: userIdString }); // <-- CORRECTION ICI
    const userName = user
      ? `${user.firstName} ${user.lastName}`
      : "Utilisateur inconnu";

    // Vérifier si un rapport pour cet utilisateur et ce mois/année existe déjà
    const existingReport = await collection.findOne({
      user_id: userIdString, // <-- CORRECTION ICI : Utiliser la chaîne userIdString
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
            user_id: userIdString, // <-- CORRECTION ICI : Assurer que l'ID est stocké comme chaîne
            userName: userName,
            activities_snapshot: reportData.activities_snapshot.map(
              (id) => new ObjectId(id)
            ), // Les IDs d'activités sont toujours des ObjectIds
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
        user_id: userIdString, // <-- CORRECTION ICI : Stocker l'ID comme chaîne
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
  userId, // Cet userId est l'ID Clerk de l'utilisateur connecté (chaîne)
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
      // Filtrer par l'ID de l'utilisateur si nécessaire (l'ID est une chaîne)
      query.user_id = userId; // <-- CORRECTION ICI : Comparer directement la chaîne
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
          localField: "user_id", // Champ dans monthly_cra_reports (stocké comme chaîne)
          foreignField: "clerkUserId", // <-- CORRECTION ICI : Joindre sur le champ 'clerkUserId' dans la collection 'users'
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
      "Controller: Exécution de l'agrégation pour les rapports mensuels avec le pipeline:",
      JSON.stringify(pipeline, null, 2)
    );
    const reports = await collection.aggregate(pipeline).toArray();
    console.log(`Controller: ${reports.length} rapports mensuels trouvés.`);

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
    const collection = await getMonthlyReportsCollection();
    const now = new Date().toISOString();

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

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(reportId) },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    if (!result.value) {
      throw new Error(
        "Rapport mensuel non trouvé pour la mise à jour du statut."
      );
    }
    console.log(
      `Controller: Monthly report ${reportId} status updated to ${newStatus}.`
    );
    return { ...result.value, id: result.value._id.toString() };
  } catch (error) {
    console.error("Erreur dans updateMonthlyReportStatusController:", error);
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

    const report = await collection.findOne({ _id: new ObjectId(reportId) });
    if (!report) {
      return null;
    }

    // Populer l'utilisateur et les activités pour le rapport détaillé
    // Utiliser le champ 'clerkUserId' pour la jointure
    const user = await usersCollection.findOne({ clerkUserId: report.user_id }); // <-- CORRECTION ICI
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
    throw new Error(
      "Impossible de récupérer le rapport mensuel par ID: " + error.message
    );
  }
}

// --- Supprimer un rapport mensuel par ID (optionnel, pour l'exhaustivité) ---
export async function deleteMonthlyReportController(reportId) {
  try {
    const collection = await getMonthlyReportsCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(reportId) });
    if (result.deletedCount === 0) {
      throw new Error("Rapport mensuel non trouvé pour la suppression.");
    }
    console.log(`Controller: Monthly report ${reportId} deleted.`);
    return { message: "Rapport mensuel supprimé avec succès." };
  } catch (error) {
    console.error("Erreur dans deleteMonthlyReportController:", error);
    throw new Error(
      "Impossible de supprimer le rapport mensuel: " + error.message
    );
  }
}
