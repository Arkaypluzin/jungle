"use client";

import React, { useRef, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from "date-fns";
import { fr } from "date-fns/locale";

export default function DetailedCraReportModal({
  isOpen,
  onClose,
  reportData,
}) {
  const reportRef = useRef();

  // Déclarer les hooks avant tout return conditionnel
  const getClientName = useCallback(
    (clientId, clientDefinitions = []) => {
      const client = clientDefinitions.find((c) => c.id === clientId);
      return client ? client.nom_client : "Client Inconnu";
    },
    []
  );

  const getActivityTypeName = useCallback(
    (activityTypeId, activityTypeDefinitions = []) => {
      const type = activityTypeDefinitions.find((t) => t.id === activityTypeId);
      return type ? type.name : "Type Inconnu";
    },
    []
  );

  if (!isOpen || !reportData) return null;

  const {
    activities,
    clientDefinitions,
    activityTypeDefinitions,
    totalWorkingDaysInMonth,
    totalActivitiesTimeInMonth,
    timeDifference,
    currentMonth,
    userName,
  } = reportData;

  // Regrouper les activités par jour
  const activitiesByDay = activities.reduce((acc, activity) => {
    const dateKey = format(activity.date_activite, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(activity);
    return acc;
  }, {});

  // Générer tous les jours du mois
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const allDaysInMonth = eachDayOfInterval({ start, end });

  // Filtrer les jours ouvrés
  const workingDays = allDaysInMonth.filter((day) => {
    const dayOfWeek = getDay(day);
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  });

  const handleDownloadPdf = async () => {
    const input = reportRef.current;
    if (!input) {
      console.error("Élément du rapport introuvable pour la génération PDF.");
      return;
    }

    const originalStyles = input.style.cssText;
    input.style.padding = "20px";
    input.style.boxShadow = "none";

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        windowWidth: input.scrollWidth,
        windowHeight: input.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const monthYear = format(currentMonth, "MMMM_yyyy", { locale: fr });
      pdf.save(`Rapport_CRA_${userName}_${monthYear}.pdf`);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert(
        "Une erreur est survenue lors de la génération du PDF. Veuillez réessayer."
      );
    } finally {
      input.style.cssText = originalStyles;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-8">
        {/* Bouton Fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-3xl font-bold"
          aria-label="Fermer le rapport"
        >
          &times;
        </button>

        {/* Bouton Télécharger PDF */}
        <div className="text-center mb-6">
          <button
            onClick={handleDownloadPdf}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 text-lg font-semibold flex items-center justify-center mx-auto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l3-3m-3 3l-3-3m2-8h7a2 2 0 012 2v7a2 2 0 01-2 2h-7a2 2 0 01-2-2V5a2 2 0 012-2z"
              />
            </svg>
            Télécharger le rapport (PDF)
          </button>
        </div>

        {/* Contenu du Rapport */}
        <div
          ref={reportRef}
          className="p-6 bg-white rounded-lg font-sans text-gray-800"
        >
          <h1 className="text-4xl font-extrabold text-center text-indigo-700 mb-8">
            Rapport d&apos;Activité Mensuel
          </h1>

          {/* Section Informations Générales */}
          <div className="mb-8 border-b-2 border-indigo-200 pb-6">
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">
              Informations Générales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
              <p>
                <span className="font-semibold">Mois du rapport :</span>{" "}
                {format(currentMonth, "MMMM yyyy", { locale: fr })}
              </p>
              <p>
                <span className="font-semibold">
                  Jours ouvrés travaillé dans le mois :
                </span>{" "}
                {totalWorkingDaysInMonth} jours
              </p>
            </div>
          </div>

          {/* Détail des Activités par Jour */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">
              Détail des Activités
            </h2>
            {workingDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dailyActivities = activitiesByDay[dateKey] || [];
              const totalDailyTime = dailyActivities.reduce(
                (sum, act) => sum + act.duree_jours,
                0
              );

              const dayOfWeek = getDay(day);
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              if (isWeekend && dailyActivities.length === 0) return null;

              return (
                <div
                  key={dateKey}
                  className="mb-6 p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                >
                  <h3 className="text-xl font-semibold text-gray-700 mb-3 flex justify-between items-center">
                    <span>
                      {format(day, "EEEE dd MMMM yyyy", { locale: fr })}
                    </span>
                    <span className="text-base font-normal text-gray-500">
                      Total du jour: {totalDailyTime.toFixed(2)} jours
                    </span>
                  </h3>
                  {dailyActivities.length > 0 ? (
                    <ul className="space-y-3">
                      {dailyActivities.map((activity) => (
                        <li
                          key={activity.id}
                          className="bg-gray-50 p-3 rounded-md border border-gray-100"
                        >
                          <p className="text-gray-900 font-medium">
                            <span className="text-indigo-500">Client :</span>{" "}
                            {getClientName(activity.client_id, clientDefinitions)}
                          </p>
                          <p className="text-gray-700 text-sm">
                            <span className="text-indigo-500">Type :</span>{" "}
                            {getActivityTypeName(activity.activity_type_id, activityTypeDefinitions)}
                          </p>
                          <p className="text-gray-700 text-sm">
                            <span className="text-indigo-500">Durée :</span>{" "}
                            {activity.duree_jours.toFixed(2)} jours
                          </p>
                          {activity.description && (
                            <p className="text-gray-600 text-sm italic mt-1">
                              &quot;{activity.description}&quot;
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">
                      Aucune activité déclarée pour ce jour.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Statistiques et Résumé Final */}
          <div className="border-t-2 border-indigo-200 pt-6 mt-8">
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">
              Statistiques Clés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
              <p>
                <span className="font-semibold">
                  Nombre total d&apos;activités :
                </span>{" "}
                {activities.length}
              </p>
              <p>
                <span className="font-semibold">Clients uniques :</span>{" "}
                {
                  [
                    ...new Set(
                      activities.map((a) =>
                        getClientName(a.client_id, clientDefinitions)
                      )
                    ),
                  ].length
                }
              </p>
              <p>
                <span className="font-semibold">
                  Types d&apos;activités uniques :
                </span>{" "}
                {
                  [
                    ...new Set(
                      activities.map((a) =>
                        getActivityTypeName(a.activity_type_id, activityTypeDefinitions)
                      )
                    ),
                  ].length
                }
              </p>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-10">
            Généré le{" "}
            {format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}
          </p>
        </div>
      </div>
    </div>
  );
}
