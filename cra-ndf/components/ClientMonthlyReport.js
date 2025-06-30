// components/MonthlyDetailedReport.js
import React, { useMemo } from "react";
import { format, isValid } from "date-fns";
import { fr } from "date-fns/locale";

export default function MonthlyDetailedReport({
  reportData,
  userId,
  year,
  month,
  userName,
}) {
  const groupedActivities = useMemo(() => {
    const groups = {};
    reportData.forEach((activity) => {
      if (activity.date_activite && isValid(activity.date_activite)) {
        const dateKey = format(activity.date_activite, "yyyy-MM-dd");
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(activity);
      }
    });

    // Sort days chronologically
    const sortedDates = Object.keys(groups).sort();

    // Sort activities within each day by type and client
    const sortedGroups = {};
    sortedDates.forEach((dateKey) => {
      sortedGroups[dateKey] = groups[dateKey].sort((a, b) => {
        // Sort by type_activite
        if (a.type_activite < b.type_activite) return -1;
        if (a.type_activite > b.type_activite) return 1;
        // Then by client_name
        if (a.client_name < b.client_name) return -1;
        if (a.client_name > b.client_name) return 1;
        return 0;
      });
    });

    return sortedGroups;
  }, [reportData]);

  const totalDaysForMonth = useMemo(() => {
    return reportData
      .reduce(
        (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
        0
      )
      .toFixed(1);
  }, [reportData]);

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-5xl mx-auto my-8 print:shadow-none print:my-0 print:p-0">
      <div className="text-center mb-8 print:mb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">
          Rapport d'activité Mensuel Détaillé
        </h1>
        <h2 className="text-xl text-gray-700 mb-1 print:text-lg">
          Pour {userName} -{" "}
          {format(new Date(year, month - 1), "MMMM", { locale: fr })}
        </h2>
        <p className="text-md text-gray-600 print:text-sm">
          Total général pour le mois : {totalDaysForMonth} jours
        </p>
      </div>

      {Object.keys(groupedActivities).length === 0 ? (
        <p className="text-center text-gray-600 py-8">
          Aucune activité trouvée pour ce mois-ci.
        </p>
      ) : (
        <div className="space-y-6 print:space-y-3">
          {Object.keys(groupedActivities).map((dateKey) => {
            const activities = groupedActivities[dateKey];
            const dayDate = activities[0].date_activite; // Toutes les activités du groupe ont la même date

            return (
              <div
                key={dateKey}
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm print:border-none print:shadow-none"
              >
                <h3 className="bg-blue-50 px-4 py-2 text-lg font-semibold text-blue-800 print:bg-gray-100 print:text-base">
                  {format(dayDate, "EEEE dd MMMM", { locale: fr })}
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 print:bg-white">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-sm">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-sm">
                          Client
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-sm">
                          Description
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:text-sm">
                          Temps (jours)
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider print:text-sm">
                          Facturable
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-100">
                      {activities.map((activity) => (
                        <tr
                          key={activity.id}
                          className="hover:bg-gray-50 print:hover:bg-white"
                        >
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 print:text-xs">
                            {activity.activity_type_name_full ||
                              activity.type_activite}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 print:text-xs">
                            {activity.client_name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 print:text-xs">
                            {activity.description_activite || "N/A"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900 font-medium print:text-xs">
                            {activity.temps_passe.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-center text-sm text-gray-900 print:text-xs">
                            {activity.is_billable === 1 ? "Oui" : "Non"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-right text-xl font-bold text-gray-800 border-t pt-4 print:mt-4 print:pt-2 print:text-lg">
        Total général pour le mois : {totalDaysForMonth} jours
      </div>

      <div className="mt-10 text-center print:hidden">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
        >
          Imprimer / Télécharger en PDF
        </button>
      </div>
    </div>
  );
}
