// app/api/reports/client-monthly/route.js
import { NextResponse } from "next/server";
import { db } from "../../../../lib/db"; // Chemin relatif vers lib/db.js
import { format, startOfMonth, endOfMonth, isValid, parseISO } from "date-fns";

const handleError = (message, status = 500) => {
  console.error("API Client Monthly Report Error:", message);
  return NextResponse.json({ message }, { status });
};

// GET handler pour récupérer les activités détaillées par client et par mois
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const year = parseInt(searchParams.get("year"));
  const month = parseInt(searchParams.get("month")); // Mois 1-indexé
  const clientId = searchParams.get("clientId"); // NOUVEAU : Récupération du clientId

  if (!userId || isNaN(year) || isNaN(month) || !clientId) {
    return handleError(
      "User ID, year, month, or client ID is missing or invalid.",
      400
    );
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
        COALESCE(at.name, 'Type Inconnu') AS activity_type_name_full,
        COALESCE(ca.is_billable, 1) AS is_billable
      FROM cra_activities ca
      LEFT JOIN client c ON ca.client_id = c.id
      LEFT JOIN activity_type at ON ca.type_activite = at.name
      WHERE ca.user_id = ?
        AND ca.client_id = ? -- NOUVEAU : Filtrage par client
        AND ca.date_activite BETWEEN ? AND ?
      ORDER BY ca.date_activite ASC, ca.type_activite ASC
    `;
    const values = [userId, clientId, monthStart, monthEnd]; // NOUVEAU : Ajout de clientId aux valeurs

    const [rows] = await db.execute(sql, values);

    const formattedRows = rows.map((row) => ({
      ...row,
      // CORRECTION ICI : Assurez-vous que date_activite est une chaîne formatée
      date_activite: row.date_activite
        ? format(new Date(row.date_activite), "yyyy-MM-dd")
        : null,
      temps_passe: parseFloat(row.temps_passe),
    }));

    return NextResponse.json(formattedRows);
  } catch (error) {
    return handleError(
      `Erreur lors de la récupération du rapport mensuel par client : ${error.message}`
    );
  }
}
