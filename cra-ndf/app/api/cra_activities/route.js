// app/api/cra_activities/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { format } from "date-fns";

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
      ca.user_id,
      ca.date_activite,
      ca.temps_passe,
      ca.type_activite,
      ca.description_activite,
      ca.override_non_working_day,
      ca.status
      -- client_id et client_name sont supprimés ici
    FROM cra_activities ca
    -- LEFT JOIN client c ON ca.client_id = c.id est supprimé
  `;
  const values = [];

  if (userId) {
    sql += ` WHERE ca.user_id = ?`;
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
      // client_id est supprimé ici
    } = await request.json();

    console.log("API CRA (POST) : Données reçues :", {
      date_activite,
      temps_passe,
      type_activite,
      user_id,
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
      (user_id, date_activite, temps_passe, type_activite, description_activite, override_non_working_day, status)
      VALUES (?, ?, ?, ?, ?, ?, 'draft')
    `;
    const values = [
      user_id,
      date_activite,
      parseFloat(temps_passe),
      type_activite,
      description_activite,
      override_non_working_day ? 1 : 0,
      // client_id est supprimé ici
    ];

    const [result] = await db.execute(sql, values);

    // Récupérer l'activité nouvellement insérée sans le client_id
    const [newActivityRow] = await db.execute(
      `SELECT id, user_id, date_activite, temps_passe, type_activite, 
              description_activite, override_non_working_day, status
       FROM cra_activities
       WHERE id = ?`,
      [result.insertId]
    );

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
          // client_id est supprimé ici
        } = body;

        console.log("API CRA (PUT - update-activity) : Données reçues :", {
          id,
          date_activite,
          temps_passe,
          type_activite,
          user_id,
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

        const [existingActivity] = await db.execute(
          "SELECT user_id, status FROM cra_activities WHERE id = ?",
          [id]
        );
        if (!existingActivity) {
          return handleError("Activité non trouvée.", 404);
        }
        if (existingActivity.user_id !== user_id) {
          return handleError(
            "Accès non autorisé à cette activité (discordance d'ID utilisateur).",
            403
          );
        }
        if (existingActivity.status === "finalized") {
          return handleError(
            "L'activité finalisée ne peut pas être modifiée.",
            403
          );
        }

        const sql = `
          UPDATE cra_activities
          SET date_activite = ?, temps_passe = ?, type_activite = ?, description_activite = ?, override_non_working_day = ?
          WHERE id = ?
        `;
        const values = [
          date_activite,
          parseFloat(temps_passe),
          type_activite,
          description_activite,
          override_non_working_day ? 1 : 0,
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
        return handleError("Action non reconnue.", 400);
    }
  } catch (error) {
    return handleError(
      `Erreur lors de la mise à jour/action de l'activité CRA : ${error.message}`
    );
  }
}

// ======================= GESTIONNAIRE DE REQUÊTE DELETE =======================
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const userId = searchParams.get("userId");

  if (!id || !userId) {
    return handleError(
      "ID d'activité ou ID utilisateur manquant pour la suppression.",
      400
    );
  }

  try {
    const [existingActivity] = await db.execute(
      "SELECT user_id, status FROM cra_activities WHERE id = ?",
      [id]
    );
    if (!existingActivity) {
      return handleError("Activité non trouvée.", 404);
    }
    if (existingActivity.status === "finalized") {
      return handleError(
        "L'activité finalisée ne peut pas être supprimée.",
        403
      );
    }
    if (existingActivity.user_id !== userId) {
      return handleError(
        "Accès non autorisé à cette activité (discordance d'ID utilisateur).",
        403
      );
    }

    const sql = `DELETE FROM cra_activities WHERE id = ?`;
    await db.execute(sql, [id]);

    return NextResponse.json({ message: "Activité supprimée avec succès." });
  } catch (error) {
    return handleError(
      `Erreur lors de la suppression de l'activité CRA : ${error.message}`
    );
  }
}
