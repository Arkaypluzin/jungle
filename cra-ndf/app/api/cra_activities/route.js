// app/api/cra_activities/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // Importation de 'db' nommée
import { format } from "date-fns";
import { fr } from "date-fns/locale"; // S'assurer que fr est importé si utilisé dans des logs ou messages d'API

// Fonction utilitaire pour gérer les réponses d'erreur
const handleError = (message, status = 500) => {
  console.error("Erreur API :", message);
  return NextResponse.json({ message }, { status });
};

// Fonction pour récupérer les activités CRA
async function getCraActivities(userId = null) {
  let sql = `
    SELECT
      ca.id,
      COALESCE(ca.user_id, '') AS user_id, 
      COALESCE(ca.date_activite, '') AS date_activite, 
      ca.temps_passe,
      ca.type_activite,
      ca.description_activite,
      ca.override_non_working_day,
      ca.status,
      ca.client_id, 
      c.nom_client AS client_name,
      COALESCE(ca.is_billable, 1) AS is_billable -- Récupérer is_billable directement de cra_activities, par défaut à 1
    FROM cra_activities ca
    LEFT JOIN client c ON ca.client_id = c.id 
  `;
  const values = [];

  if (userId) {
    sql += ` WHERE COALESCE(ca.user_id, '') = ?`;
    values.push(userId);
  }

  sql += ` ORDER BY ca.date_activite DESC`;

  const [rows] = await db.execute(sql, values);
  return rows;
}

// ======================= GESTIONNAIRE DE REQUÊTE GET =======================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  try {
    let activities;
    if (userId) {
      activities = await getCraActivities(userId);
    } else {
      activities = await getCraActivities();
    }

    return NextResponse.json(activities);
  } catch (error) {
    return handleError(
      `Erreur lors de la récupération des activités CRA : ${error.message}`
    );
  }
}

// ======================= GESTIONNAIRE DE REQUÊTE POST =======================
export async function POST(request) {
  try {
    const {
      date_activite,
      temps_passe,
      type_activite,
      description_activite,
      override_non_working_day,
      user_id,
      client_id,
      is_billable, // Récupérer le nouveau champ is_billable du frontend
    } = await request.json();

    console.log("API CRA (POST) : Données reçues :", {
      date_activite,
      temps_passe,
      type_activite,
      client_id,
      user_id,
      is_billable,
    });

    const missingFields = [];
    if (!date_activite) missingFields.push("date d'activité");
    if (
      temps_passe === undefined ||
      temps_passe === null ||
      isNaN(parseFloat(temps_passe))
    )
      missingFields.push("temps passé");
    if (!type_activite) missingFields.push("type d'activité");
    if (!user_id) missingFields.push("ID utilisateur");

    if (missingFields.length > 0) {
      return handleError(
        `Données essentielles manquantes ou invalides : ${missingFields.join(
          ", "
        )}.`,
        400
      );
    }

    const sql = `
      INSERT INTO cra_activities 
      (user_id, date_activite, temps_passe, type_activite, description_activite, override_non_working_day, status, client_id, is_billable)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `;
    const values = [
      user_id,
      date_activite,
      parseFloat(temps_passe),
      type_activite,
      description_activite,
      override_non_working_day ? 1 : 0,
      client_id,
      is_billable ? 1 : 0, // Enregistrer la valeur de is_billable reçue du frontend
    ];

    const [result] = await db.execute(sql, values);

    // Récupérer la nouvelle activité avec le statut is_billable directement de cra_activities
    const [newActivityRowResult] = await db.execute(
      `SELECT ca.id, COALESCE(ca.user_id, '') AS user_id, COALESCE(ca.date_activite, '') AS date_activite, ca.temps_passe, ca.type_activite, 
              ca.description_activite, ca.override_non_working_day, ca.status, 
              ca.client_id, c.nom_client AS client_name, COALESCE(ca.is_billable, 1) AS is_billable
       FROM cra_activities ca
       LEFT JOIN client c ON ca.client_id = c.id
       WHERE ca.id = ?`,
      [result.insertId]
    );
    const newActivityRow = newActivityRowResult[0];

    return NextResponse.json(newActivityRow, { status: 201 });
  } catch (error) {
    return handleError(
      `Erreur lors de l'ajout de l'activité CRA : ${error.message}`
    );
  }
}

// ======================= GESTIONNAIRE DE REQUÊTE PUT =======================
export async function PUT(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    const body = await request.json();

    switch (action) {
      case "update-activity": {
        const {
          id,
          date_activite,
          temps_passe,
          type_activite,
          description_activite,
          override_non_working_day,
          user_id,
          client_id,
          is_billable, // Récupérer le nouveau champ is_billable du frontend
        } = body;

        console.log("API CRA (PUT - update-activity) : Données reçues :", {
          id,
          date_activite,
          temps_passe,
          type_activite,
          client_id,
          user_id,
          is_billable,
        });

        const missingFields = [];
        if (!id) missingFields.push("ID d'activité");
        if (!date_activite) missingFields.push("date d'activité");
        if (
          temps_passe === undefined ||
          temps_passe === null ||
          isNaN(parseFloat(temps_passe))
        )
          missingFields.push("temps passé");
        if (!type_activite) missingFields.push("type d'activité");
        if (!user_id) missingFields.push("ID utilisateur");

        if (missingFields.length > 0) {
          return handleError(
            `Données essentielles manquantes ou invalides pour la mise à jour : ${missingFields.join(
              ", "
            )}.`,
            400
          );
        }

        const [existingActivityResult] = await db.execute(
          "SELECT COALESCE(user_id, '') AS user_id, status FROM cra_activities WHERE id = ?",
          [id]
        );
        const existingActivity = existingActivityResult[0];

        if (!existingActivity) {
          return handleError("Activité non trouvée.", 404);
        }

        console.log(`Debug User ID Check (UPDATE) - Activity ID: ${id}`);
        console.log(`  Request User ID (from token/session): '${user_id}'`);
        console.log(
          `  DB User ID (from cra_activities table): '${existingActivity.user_id}'`
        );
        console.log(`  IDs Match: ${existingActivity.user_id === user_id}`);

        if (existingActivity.user_id !== user_id) {
          return handleError(
            "Accès non autorisé à cette activité (discordance d'ID utilisateur).",
            403
          );
        }
        if (
          existingActivity.status === "finalized" ||
          existingActivity.status === "validated"
        ) {
          return handleError(
            "L'activité finalisée ou validée ne peut pas être modifiée.",
            403
          );
        }

        const sql = `
          UPDATE cra_activities
          SET date_activite = ?, temps_passe = ?, type_activite = ?, description_activite = ?, override_non_working_day = ?, client_id = ?, is_billable = ?
          WHERE id = ?
        `;
        const values = [
          date_activite,
          parseFloat(temps_passe),
          type_activite,
          description_activite,
          override_non_working_day ? 1 : 0,
          client_id,
          is_billable ? 1 : 0, // Mettre à jour avec la valeur de is_billable reçue du frontend
          id,
        ];
        await db.execute(sql, values);

        return NextResponse.json({
          message: "Activité mise à jour avec succès.",
        });
      }

      case "finalize-month": {
        const { year, month, userId } = body;
        if (!year || !month || !userId) {
          return handleError(
            "Année, mois ou ID utilisateur manquant pour la finalisation.",
            400
          );
        }

        const startDate = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
        const endDate = format(new Date(year, month, 0), "yyyy-MM-dd");

        const sql = `
          UPDATE cra_activities
          SET status = 'finalized'
          WHERE user_id = ?
            AND date_activite BETWEEN ? AND ?
            AND status = 'draft'
        `;
        const values = [userId, startDate, endDate];
        await db.execute(sql, values);

        return NextResponse.json({ message: "Mois finalisé avec succès." });
      }

      case "revert-finalization": {
        const { userId, year, month } = body;
        if (!userId || !year || !month) {
          return handleError(
            "ID utilisateur, année ou mois manquant pour l'annulation de la finalisation.",
            400
          );
        }

        const startDate = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
        const endDate = format(new Date(year, month, 0), "yyyy-MM-dd");

        const sql = `
          UPDATE cra_activities
          SET status = 'draft'
          WHERE user_id = ?
            AND date_activite BETWEEN ? AND ?
            AND status = 'finalized'
        `;
        const values = [userId, startDate, endDate];
        await db.execute(sql, values);

        return NextResponse.json({
          message: "Finalisation annulée avec succès.",
        });
      }

      case "update-month-status": {
        const { targetUserId, year, month, newStatus, message } = body;
        if (!targetUserId || !year || !month || !newStatus) {
          return handleError(
            "Données manquantes pour la mise à jour du statut du mois.",
            400
          );
        }

        const startDate = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
        const endDate = format(new Date(year, month, 0), "yyyy-MM-dd");

        let updateSql = "";
        let updateValues = [];
        let successMessage = "";
        let errorMessage = "";

        if (newStatus === "validated") {
          updateSql = `
                UPDATE cra_activities
                SET status = 'validated'
                WHERE user_id = ?
                AND date_activite BETWEEN ? AND ?
                AND status = 'finalized'
            `;
          updateValues = [targetUserId, startDate, endDate];
          successMessage = `CRA du mois ${format(
            new Date(year, month - 1),
            "MMMM",
            { locale: fr }
          )} validé pour l'utilisateur ${targetUserId}. Message: "${
            message || "Aucun message."
          }"`;
          errorMessage = `Aucune activité finalisée trouvée pour valider pour l'utilisateur ${targetUserId} pour ${format(
            new Date(year, month - 1),
            "MMMM",
            { locale: fr }
          )}.`;
        } else if (newStatus === "invalidated") {
          updateSql = `
                UPDATE cra_activities
                SET status = 'draft' 
                WHERE user_id = ?
                AND date_activite BETWEEN ? AND ?
                AND (status = 'finalized' OR status = 'validated')
            `;
          updateValues = [targetUserId, startDate, endDate];
          successMessage = `CRA du mois ${format(
            new Date(year, month - 1),
            "MMMM",
            { locale: fr }
          )} invalidé pour l'utilisateur ${targetUserId}. Message: "${
            message || "Aucun message."
          }"`;
          errorMessage = `Aucune activité finalisée/validée trouvée pour invalider pour l'utilisateur ${targetUserId} pour ${format(
            new Date(year, month - 1),
            "MMMM",
            { locale: fr }
          )}.`;
        } else {
          return handleError("Statut de mise à jour non pris en charge.", 400);
        }

        const [result] = await db.execute(updateSql, updateValues);

        if (result.affectedRows === 0) {
          return handleError(errorMessage, 404);
        }
        console.log(successMessage);
        return NextResponse.json({ message: successMessage });
      }

      case "send-cra": {
        const { userId, year, month, userName } = body;
        if (!userId || !year || !month || !userName) {
          return handleError(
            "ID utilisateur, nom, année ou mois manquant pour la soumission du CRA.",
            400
          );
        }

        console.log(
          `Simulation de la soumission du CRA pour ${userName} (ID : ${userId}) pour le mois ${month}/${year}.`
        );
        return NextResponse.json({
          message: "CRA envoyé avec succès (simulation).",
        });
      }

      default:
        return handleError("Action non valide.", 400);
    }
  } catch (error) {
    return handleError(
      `Erreur lors de la mise à jour de l'activité CRA : ${error.message}`
    );
  }
}

// ======================= GESTIONNAIRE DE REQUÊTE DELETE =======================
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const userId = searchParams.get("userId");
  const bypassAuth = searchParams.get("bypassAuth") === "true";

  if (!id) {
    return handleError("ID d'activité manquant.", 400);
  }
  if (!userId) {
    return handleError("ID utilisateur manquant pour la suppression.", 400);
  }

  try {
    const [existingActivityResult] = await db.execute(
      "SELECT COALESCE(user_id, '') AS user_id, status FROM cra_activities WHERE id = ?",
      [id]
    );
    const existingActivity = existingActivityResult[0];

    if (!existingActivity) {
      return handleError("Activité non trouvée.", 404);
    }

    console.log(`Debug User ID Check (DELETE) - Activity ID: ${id}`);
    console.log(`  Request User ID (from URL): '${userId}'`);
    console.log(
      `  DB User ID (from cra_activities table): '${existingActivity.user_id}'`
    );
    console.log(`  IDs Match: ${existingActivity.user_id === userId}`);
    console.log(`  Bypass Auth (for reset month): ${bypassAuth}`);

    if (!bypassAuth && existingActivity.user_id !== userId) {
      return handleError(
        "Accès non autorisé à cette activité (discordance d'ID utilisateur).",
        403
      );
    }
    if (
      existingActivity.status === "finalized" ||
      existingActivity.status === "validated"
    ) {
      return handleError(
        "L'activité finalisée ou validée ne peut pas être supprimée.",
        403
      );
    }

    const sql = "DELETE FROM cra_activities WHERE id = ?";
    await db.execute(sql, [id]);

    return NextResponse.json({
      message: "Activité CRA supprimée avec succès.",
    });
  } catch (error) {
    return handleError(
      `Erreur lors de la suppression de l'activité CRA : ${error.message}`
    );
  }
}
