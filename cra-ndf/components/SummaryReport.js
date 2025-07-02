// components/SummaryReport.js
"use client";

import React, { useMemo } from "react";
import { format, startOfMonth, endOfMonth, isValid } from "date-fns"; // parseISO n'est plus nécessaire ici
import { fr } from "date-fns/locale";

export default function SummaryReport({
  craActivities = [],
  activityTypeDefinitions = [],
  clientDefinitions = [],
  monthToDisplay,
  currentUserId,
  currentUserName,
  showMessage,
}) {
  const activitiesInMonth = useMemo(() => {
    if (!monthToDisplay || !isValid(monthToDisplay)) return [];

    const monthStart = startOfMonth(monthToDisplay);
    const monthEnd = endOfMonth(monthToDisplay);

    return craActivities.filter(
      (activity) =>
        activity.user_id === currentUserId &&
        activity.date_activite &&
        isValid(activity.date_activite) && // MODIFICATION CLÉ : Supprimé parseISO
        activity.date_activite >= monthStart && // MODIFICATION CLÉ : Comparaison directe d'objets Date
        activity.date_activite <= monthEnd // MODIFICATION CLÉ : Comparaison directe d'objets Date
    );
  }, [craActivities, monthToDisplay, currentUserId]);

  const monthlySummary = useMemo(() => {
    const summary = {};
    let totalDays = 0;

    activitiesInMonth.forEach((activity) => {
      let activityTypeName = activity.type_activite;
      // Reclasser "Type Inconnu" en "Heure supplémentaire" pour le rapport
      if (!activityTypeName || activityTypeName === "Type Inconnu") {
        activityTypeName = "Heure supplémentaire";
      }

      const timeSpent = parseFloat(activity.temps_passe) || 0;

      if (!summary[activityTypeName]) {
        summary[activityTypeName] = {
          total: 0,
          billable: 0,
          nonBillable: 0,
        };
      }
      summary[activityTypeName].total += timeSpent;
      if (activity.is_billable === 1) {
        summary[activityTypeName].billable += timeSpent;
      } else {
        summary[activityTypeName].nonBillable += timeSpent;
      }
      totalDays += timeSpent;
    });

    // Trier les types d'activité pour un affichage cohérent
    const sortedActivityTypes = Object.keys(summary).sort();

    return { summary, totalDays, sortedActivityTypes };
  }, [activitiesInMonth]);

  const { summary, totalDays, sortedActivityTypes } = monthlySummary;

  if (!monthToDisplay || !isValid(monthToDisplay)) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600">
        Veuillez sélectionner un mois pour afficher le résumé.
      </div>
    );
  }

  if (activitiesInMonth.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600">
        Aucune activité trouvée pour{" "}
        {format(monthToDisplay, "MMMM", { locale: fr })}.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        Résumé Mensuel pour {format(monthToDisplay, "MMMM", { locale: fr })}
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type d'activité
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total (jours)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Facturable (jours)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Non Facturable (jours)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedActivityTypes.map((type) => (
              <tr key={type}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {activityTypeDefinitions.find((def) => def.name === type)
                    ?.name_full || type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  {summary[type].total.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  {summary[type].billable.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  {summary[type].nonBillable.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold">
              <td className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Total Général
              </td>
              <td className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                {totalDays.toFixed(2)}
              </td>
              <td className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                {Object.values(summary)
                  .reduce((sum, s) => sum + s.billable, 0)
                  .toFixed(2)}
              </td>
              <td className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                {Object.values(summary)
                  .reduce((sum, s) => sum + s.nonBillable, 0)
                  .toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
