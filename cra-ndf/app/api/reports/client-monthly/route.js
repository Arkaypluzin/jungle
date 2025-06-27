// app/api/reports/monthly-detailed/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { format, startOfMonth, endOfMonth, isValid, parseISO } from "date-fns";

const handleError = (message, status = 500) => {
  console.error("API Report Error:", message);
  return NextResponse.json({ message }, { status });
};

// GET handler pour récupérer les activités détaillées par mois
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const year = parseInt(searchParams.get("year"));
  const month = parseInt(searchParams.get("month")); // Mois 1-indexé

  if (!userId || isNaN(year) || isNaN(month)) {
    return handleError("User ID, year, or month is missing or invalid.", 400);
  }

  try {
    const monthStart = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
    const monthEnd = format(new Date(year, month, 0), "yyyy-MM-dd");

    let sql = `
      SELECT
        ca.id,
        COALESCE(ca.user_id, '') AS user_id,
        ca.date_activite,
        ca.temps_passe,
        ca.type_activite,
        ca.description_activite,
        ca.override_non_working_day,
        ca.status,
        ca.client_id,
        COALESCE(c.nom_client, 'Non attribué') AS client_name,
        COALESCE(at.name, 'Type Inconnu') AS activity_type_name_full, -- Nom complet du type d'activité
        COALESCE(ca.is_billable, 1) AS is_billable
      FROM cra_activities ca
      LEFT JOIN client c ON ca.client_id = c.id
      LEFT JOIN activity_type at ON ca.type_activite = at.name -- Joindre pour le nom complet du type d'activité
      WHERE ca.user_id = ?
        AND ca.date_activite BETWEEN ? AND ?
      ORDER BY ca.date_activite ASC, ca.type_activite ASC, ca.client_id ASC
    `;
    const values = [userId, monthStart, monthEnd];

    const [rows] = await db.execute(sql, values);

    // Formater les dates pour s'assurer qu'elles sont des objets Date pour le regroupement
    const formattedRows = rows.map((row) => ({
      ...row,
      date_activite: row.date_activite ? parseISO(row.date_activite) : null,
      temps_passe: parseFloat(row.temps_passe), // Assurer que temps_passe est un nombre
    }));

    return NextResponse.json(formattedRows);
  } catch (error) {
    return handleError(
      `Erreur lors de la récupération du rapport mensuel détaillé : ${error.message}`
    );
  }
}
