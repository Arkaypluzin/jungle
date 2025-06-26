"use client";

import React, { useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, isValid } from "date-fns";
import { fr } from "date-fns/locale";

export default function SummaryReport({
  craActivities,
  activityTypeDefinitions,
  clientDefinitions, // Gardé ici pour d'éventuels futurs besoins ou si d'autres parties l'utilisent
  monthToDisplay,
  currentUserId,
  currentUserName,
  showMessage,
}) {
  const activitiesInMonth = useMemo(() => {
    if (!monthToDisplay || !craActivities) return [];

    if (!isValid(monthToDisplay)) {
      console.error(
        "SummaryReport: monthToDisplay est invalide",
        monthToDisplay
      );
      return [];
    }

    const monthStart = startOfMonth(monthToDisplay);
    const monthEnd = endOfMonth(monthToDisplay);

    return craActivities.filter(
      (activity) =>
        activity.user_id === currentUserId &&
        isValid(parseISO(activity.date_activite)) &&
        parseISO(activity.date_activite) >= monthStart &&
        parseISO(activity.date_activite) <= monthEnd
    );
  }, [craActivities, monthToDisplay, currentUserId]);

  const groupedActivities = useMemo(() => {
    const grouped = {};
    let totalDays = 0;

    activitiesInMonth.forEach((activity) => {
      if (!grouped[activity.type_activite]) {
        grouped[activity.type_activite] = {
          totalTime: 0,
          activities: [],
        };
      }
      grouped[activity.type_activite].totalTime += parseFloat(
        activity.temps_passe
      );
      grouped[activity.type_activite].activities.push(activity);

      totalDays += parseFloat(activity.temps_passe);
    });

    return {
      grouped,
      totalDays,
      totalBillableDays: 0,
      totalNonBillableDays: 0,
    };
  }, [activitiesInMonth]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-700 mb-4">
        Récapitulatif par Type d'Activité pour{" "}
        {format(monthToDisplay, "MMMM 'yyyy'", { locale: fr })}:
      </h3>
      {Object.keys(groupedActivities.grouped).length === 0 ? (
        <p className="text-gray-600">
          Aucune activité enregistrée pour ce mois.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                  Type d'activité
                </th>
                <th className="py-2 px-4 border-b text-right text-sm font-semibold text-gray-700">
                  Temps total (jours)
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedActivities.grouped).map(([type, data]) => (
                <tr key={type} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-left text-gray-800">
                    {type}
                  </td>
                  <td className="py-2 px-4 border-b text-right text-gray-800">
                    {data.totalTime.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td className="py-2 px-4 text-left text-gray-800">
                  Total général
                </td>
                <td className="py-2 px-4 text-right text-gray-800">
                  {groupedActivities.totalDays.toFixed(1)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-700 mt-8 mb-4">
        Détails des activités :
      </h3>
      {activitiesInMonth.length === 0 ? (
        <p className="text-gray-600">Aucun détail d'activité à afficher.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                  Date
                </th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                  Type
                </th>
                {/* <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Client</th> */}{" "}
                {/* Colonne Client supprimée */}
                <th className="py-2 px-4 border-b text-right text-sm font-semibold text-gray-700">
                  Temps (jours)
                </th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                  Description
                </th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {activitiesInMonth.map((activity) => {
                // const clientName = clientDefinitions.find(c => c.id === activity.client_id)?.nom_client || "N/A"; // Ligne retirée
                return (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-gray-800">
                      {format(parseISO(activity.date_activite), "dd MMM", {
                        locale: fr,
                      })}
                    </td>
                    <td className="py-2 px-4 border-b text-gray-800">
                      {activity.type_activite}
                    </td>
                    {/* <td className="py-2 px-4 border-b text-gray-800">{clientName}</td> */}{" "}
                    {/* Affichage du client retiré */}
                    <td className="py-2 px-4 border-b text-right text-gray-800">
                      {parseFloat(activity.temps_passe).toFixed(1)}
                    </td>
                    <td className="py-2 px-4 border-b text-gray-800">
                      {activity.description_activite || "N/A"}
                    </td>
                    <td className="py-2 px-4 border-b text-gray-800 capitalize">
                      {activity.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
