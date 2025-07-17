// components/SummaryReport.js
"use client"; // Assurez-vous que ce composant est un Client Component

import React, { useMemo } from "react";
import { format, isWeekend, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function SummaryReport({
  month,
  activities,
  activityTypeDefinitions,
  clientDefinitions,
  totalWorkingDays,
  totalActivitiesTime,
  timeDifference,
  isPublicHoliday,
  userFirstName,
  onClose,
  onOpenMonthlyReportPreview,
}) {
  // Vérification défensive pour la prop 'month'
  if (!isValid(month)) {
    console.error("SummaryReport: Prop 'month' invalide reçue:", month);
    // Retourne un message d'erreur ou null pour éviter le crash
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mt-6">
        <p>
          Erreur: Impossible d'afficher le rapport mensuel car la date est
          invalide.
        </p>
      </div>
    );
  }

  const monthName = format(month, "MMMM yyyy", { locale: fr });

  // Trier les activités par date
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      // S'assurer que date_activite est un objet Date valide pour la comparaison
      const dateA =
        a.date_activite && isValid(a.date_activite)
          ? a.date_activite
          : new Date(0); // Fallback à une date valide pour le tri
      const dateB =
        b.date_activite && isValid(b.date_activite)
          ? b.date_activite
          : new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  }, [activities]);

  const groupedActivities = useMemo(() => {
    const groups = {};
    sortedActivities.forEach((activity) => {
      // S'assurer que activity.date_activite est valide avant de la formater
      if (isValid(activity.date_activite)) {
        const dateKey = format(activity.date_activite, "yyyy-MM-dd");
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(activity);
      } else {
        console.warn(
          "SummaryReport: Ignorer l'activité avec date_activite invalide lors du regroupement:",
          activity
        );
      }
    });
    return groups;
  }, [sortedActivities]);

  const dailySummaries = useMemo(() => {
    return Object.keys(groupedActivities).map((dateKey) => {
      const date = parseISO(dateKey); // dateKey est une chaîne, parseISO est correct ici
      const activitiesForDay = groupedActivities[dateKey];
      const totalTimeForDay = activitiesForDay.reduce(
        (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
        0
      );
      // Vérifications défensives avant d'utiliser les dates
      const isWeekendDay =
        isValid(date) && isWeekend(date, { weekStartsOn: 1 });
      const isHoliday = isValid(date) && isPublicHoliday(date);
      const isNonWorkingDay = isWeekendDay || isHoliday;

      return {
        date,
        totalTime: totalTimeForDay,
        activities: activitiesForDay,
        isWeekend: isWeekendDay,
        isHoliday: isHoliday,
        isNonWorkingDay: isNonWorkingDay,
      };
    });
  }, [groupedActivities, isPublicHoliday]);

  const renderActivityDetails = (activity) => {
    const activityType = activityTypeDefinitions.find(
      (def) => String(def.id) === String(activity.type_activite)
    );
    const client = clientDefinitions.find(
      (def) => String(def.id) === String(activity.client_id)
    );

    return (
      <div key={activity.id} className="text-sm text-gray-700 ml-4">
        <p>
          <span className="font-semibold">Type:</span>{" "}
          {activityType ? activityType.name : "Inconnu"}
        </p>
        {client && (
          <p>
            <span className="font-semibold">Client:</span> {client.nom_client}
          </p>
        )}
        <p>
          <span className="font-semibold">Temps passé:</span>{" "}
          {activity.temps_passe} jours
        </p>
        {activity.description_activite && (
          <p>
            <span className="font-semibold">Description:</span>{" "}
            {activity.description_activite}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-inner mt-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-gray-800">
          Rapport Mensuel pour {monthName}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onOpenMonthlyReportPreview}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
          >
            Prévisualiser
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200"
          >
            Fermer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 text-gray-700">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="font-semibold">Jours ouvrés dans le mois:</p>
          <p className="text-lg">{totalWorkingDays}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="font-semibold">Temps total enregistré:</p>
          <p className="text-lg">{totalActivitiesTime.toFixed(2)} jours</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="font-semibold">Écart:</p>
          <p
            className={`text-lg ${
              timeDifference > 0
                ? "text-red-600"
                : timeDifference < 0
                ? "text-orange-600"
                : "text-green-600"
            }`}
          >
            {timeDifference} jours
          </p>
        </div>
      </div>

      <h4 className="text-xl font-semibold text-gray-800 mb-3">
        Détail par jour:
      </h4>
      {dailySummaries.length === 0 ? (
        <p className="text-gray-600">
          Aucune activité enregistrée pour ce mois.
        </p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar p-2">
          {dailySummaries.map((daySummary) => (
            <div
              key={
                isValid(daySummary.date)
                  ? format(daySummary.date, "yyyy-MM-dd")
                  : `invalid-${Math.random()}`
              }
              className={`p-4 rounded-lg shadow-sm ${
                daySummary.isNonWorkingDay
                  ? "bg-yellow-50 border border-yellow-200"
                  : "bg-white border border-gray-200"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-bold text-lg text-gray-800">
                  {isValid(daySummary.date)
                    ? format(daySummary.date, "EEEE dd MMMM", { locale: fr })
                    : "Date invalide"}
                  {daySummary.isWeekend && (
                    <span className="ml-2 text-sm text-yellow-700">
                      (Weekend)
                    </span>
                  )}
                  {daySummary.isHoliday && (
                    <span className="ml-2 text-sm text-yellow-700">
                      (Jour Férié)
                    </span>
                  )}
                </h5>
                <span className="font-semibold text-blue-600">
                  {daySummary.totalTime.toFixed(2)} jours
                </span>
              </div>
              <div className="space-y-2">
                {daySummary.activities.map((activity) =>
                  renderActivityDetails(activity)
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
