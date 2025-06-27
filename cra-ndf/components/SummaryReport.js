"use client";

import React, { useMemo, useState, useCallback } from "react";
import { format, parseISO, startOfMonth, endOfMonth, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { sumBy } from "lodash";

export default function SummaryReport({
  craActivities,
  activityTypeDefinitions,
  clientDefinitions,
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
        activity.date_activite &&
        isValid(parseISO(activity.date_activite)) &&
        parseISO(activity.date_activite) >= monthStart &&
        parseISO(activity.date_activite) <= monthEnd
    );
  }, [craActivities, monthToDisplay, currentUserId]);

  const reportData = useMemo(() => {
    const grouped = {};
    let totalDays = 0;
    let totalBillableDays = 0;
    let totalNonBillableDays = 0;
    let totalOvertimeDays = 0;

    activitiesInMonth.forEach((activity) => {
      const isOvertime = activity.type_activite === "Heure supplémentaire";
      const timeSpent = parseFloat(activity.temps_passe) || 0;
      const isBillable = activity.is_billable === 1;

      if (!grouped[activity.type_activite]) {
        grouped[activity.type_activite] = {
          totalTime: 0,
          activities: [],
          isBillableType: isBillable,
        };
      }
      grouped[activity.type_activite].totalTime += timeSpent;
      grouped[activity.type_activite].activities.push(activity);

      totalDays += timeSpent;
      if (isBillable) {
        totalBillableDays += timeSpent;
      } else {
        totalNonBillableDays += timeSpent;
      }

      if (isOvertime) {
        totalOvertimeDays += timeSpent;
      }
    });

    const sortedGrouped = Object.keys(grouped)
      .sort()
      .reduce((obj, key) => {
        obj[key] = grouped[key];
        return obj;
      }, {});

    return {
      grouped: sortedGrouped,
      totalDays,
      totalBillableDays,
      totalNonBillableDays,
      totalOvertimeDays,
    };
  }, [activitiesInMonth]);

  const calculateMonthStatus = useCallback(() => {
    const totalCount = activitiesInMonth.length;
    if (totalCount === 0) return "empty";

    const validatedCount = activitiesInMonth.filter(
      (a) => a.status === "validated"
    ).length;
    const finalizedCount = activitiesInMonth.filter(
      (a) => a.status === "finalized"
    ).length;
    const draftCount = activitiesInMonth.filter(
      (a) => a.status === "draft"
    ).length;

    if (validatedCount === totalCount) return "validated";
    if (finalizedCount === totalCount) return "finalized";
    if (draftCount === totalCount) return "draft";

    if (validatedCount > 0 || finalizedCount > 0) return "mixed";

    return "draft";
  }, [activitiesInMonth]);

  const monthStatus = useMemo(
    () => calculateMonthStatus(),
    [calculateMonthStatus]
  );

  const handleDownloadMonthlyDetailedReport = () => {
    console.log("Attempting to download monthly detailed report.");
    console.log("Current monthStatus:", monthStatus);

    if (monthStatus !== "validated") {
      showMessage(
        "Le rapport mensuel détaillé n'est disponible que pour les mois validés.",
        "warning"
      );
      console.log("Download blocked: Month is not validated.");
      return;
    }

    const year = format(monthToDisplay, "yyyy");
    const month = parseInt(format(monthToDisplay, "MM"));

    let reportPath = `/reports/monthly-detailed/${currentUserId}/${year}/${month}`;

    const baseUrl = window.location.origin;
    const currentPathname = window.location.pathname;
    let finalReportUrl = `${baseUrl}${reportPath}`;

    if (
      !reportPath.startsWith("/cra-manager") &&
      currentPathname.startsWith("/cra-manager")
    ) {
      reportPath = `/cra-manager${reportPath}`;
    }
    finalReportUrl = `${baseUrl}${reportPath}`;

    console.log("Report parameters:", { currentUserId, year, month });
    console.log("Generated report URL (adjusted):", finalReportUrl);

    window.open(finalReportUrl, "_blank");
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Rapport d'activité
      </h2>
      <div className="mb-8 p-4 bg-blue-50 rounded-lg shadow-sm">
        <p className="text-lg text-blue-800 font-semibold mb-2">
          Période : {format(monthToDisplay, "MMMM", { locale: fr })}
        </p>
        <p className="text-lg text-blue-800 font-semibold">
          Utilisateur : {currentUserName}
        </p>
      </div>

      {activitiesInMonth.length === 0 ? (
        <p className="text-gray-600 text-center py-4">
          Aucune activité enregistrée pour ce mois.
        </p>
      ) : (
        <>
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">
              Statistiques globales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-center">
              <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600">Total jours travaillés</p>
                <p className="text-2xl font-bold text-gray-800">
                  {reportData.totalDays.toFixed(1)}
                </p>
              </div>
              <div className="bg-green-100 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-green-700">Jours facturables</p>
                <p className="text-2xl font-bold text-green-800">
                  {reportData.totalBillableDays.toFixed(1)}
                </p>
              </div>
              <div className="bg-red-100 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-red-700">Jours non facturables</p>
                <p className="text-2xl font-bold text-red-800">
                  {reportData.totalNonBillableDays.toFixed(1)}
                </p>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-purple-700">
                  Heures supplémentaires
                </p>
                <p className="text-2xl font-bold text-purple-800">
                  {reportData.totalOvertimeDays.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">
              Répartition par type d'activité
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-700">
                      Type d'activité
                    </th>
                    <th className="py-3 px-4 border-b text-right text-sm font-semibold text-gray-700">
                      Temps total (jours)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.grouped).map(([type, data]) => (
                    <tr key={type} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b text-left text-gray-800 text-base">
                        {type}
                      </td>
                      <td className="py-2 px-4 border-b text-right text-gray-800 text-base">
                        {data.totalTime.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">
              Détails des activités
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-700">
                      Type
                    </th>
                    <th className="px-4 py-3 border-b text-left text-xs font-semibold text-gray-700">
                      Client
                    </th>
                    <th className="px-4 py-3 border-b text-right text-xs font-semibold text-gray-700">
                      Temps (j)
                    </th>
                    <th className="px-4 py-3 border-b text-left text-xs font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="px-4 py-3 border-b text-left text-xs font-semibold text-gray-700">
                      Statut
                    </th>
                    <th className="px-4 py-3 border-b text-left text-xs font-semibold text-gray-700">
                      Facturable
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activitiesInMonth.map((activity) => {
                    const clientName =
                      clientDefinitions.find((c) => c.id === activity.client_id)
                        ?.nom_client || "N/A";
                    return (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border-b text-gray-800 text-sm">
                          {format(
                            parseISO(activity.date_activite),
                            "dd/MM/yyyy"
                          )}
                        </td>
                        <td className="py-2 px-4 border-b text-gray-800 text-sm">
                          {activity.type_activite}
                        </td>
                        <td className="py-2 px-4 border-b text-gray-800 text-sm">
                          {clientName}
                        </td>
                        <td className="py-2 px-4 border-b text-right text-gray-800 text-sm">
                          {parseFloat(activity.temps_passe).toFixed(1)}
                        </td>
                        <td className="py-2 px-4 border-b text-gray-800 text-sm">
                          {activity.description_activite ||
                            "Aucune description"}
                        </td>
                        <td className="py-2 px-4 border-b text-gray-800 text-sm capitalize">
                          {activity.status}
                        </td>
                        <td className="py-2 px-4 border-b text-gray-800 text-sm">
                          {activity.is_billable === 1 ? "Oui" : "Non"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-700 mb-4">
              Télécharger le rapport mensuel détaillé
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Ce rapport n'est disponible que lorsque toutes les activités du
              mois sont **validées**.
            </p>

            <div className="flex justify-center">
              <button
                onClick={handleDownloadMonthlyDetailedReport}
                disabled={monthStatus !== "validated"}
                className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300
                  ${
                    monthStatus === "validated"
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-400 text-gray-700 cursor-not-allowed"
                  }`}
              >
                Télécharger le rapport détaillé
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
