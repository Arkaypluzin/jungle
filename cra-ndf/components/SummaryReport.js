// components/SummaryReport.js
"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
  isWeekend,
  addMonths,
  isSameMonth,
} from "date-fns";
import { fr } from "date-fns/locale";

export default function SummaryReport({
  craActivities = [],
  activityTypeDefinitions = [],
  monthToDisplay = null,
}) {
  const reportRef = useRef(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [publicHolidays, setPublicHolidays] = useState([]);

  useEffect(() => {
    const fetchPublicHolidays = async () => {
      try {
        const currentYear = format(new Date(), "yyyy");
        const nextYear = format(addMonths(new Date(), 12), "yyyy");

        const resCurrent = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${currentYear}/FR`
        );
        const holidaysCurrent = await resCurrent.json();

        const resNext = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${nextYear}/FR`
        );
        const holidaysNext = await resNext.json();

        const allHolidays = [...holidaysCurrent, ...holidaysNext];
        setPublicHolidays(allHolidays.map((h) => h.date));
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des jours fériés pour le rapport:",
          error
        );
      }
    };
    fetchPublicHolidays();
  }, []);

  const isPublicHoliday = useCallback(
    (date) => {
      const formattedDate = format(date, "yyyy-MM-dd");
      return publicHolidays.includes(formattedDate);
    },
    [publicHolidays]
  );

  const generatePdf = useCallback(async () => {
    if (!reportRef.current) {
      alert("Le rapport n'est pas prêt pour la génération PDF.");
      return;
    }

    setLoadingPdf(true);

    let styleElement = null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // Create a temporary style element to override potentially problematic CSS
      styleElement = document.createElement("style");
      styleElement.type = "text/css";
      // Aggressive overrides to simplify styles for html2canvas
      styleElement.innerHTML = `
        /* General resets for PDF generation compatibility */
        body, html, * {
          background-color: #FFFFFF !important; /* Force white background */
          color: #000000 !important; /* Force black text */
          box-shadow: none !important; /* Remove all shadows */
          filter: none !important; /* Remove all filters */
          background-image: none !important; /* Remove background images */
          animation: none !important; /* Remove animations */
          transition: none !important; /* Remove transitions */
          border-color: #E0E0E0 !important; /* Standardize border colors */
          outline: none !important; /* Remove focus outlines */
          text-shadow: none !important; /* Remove text shadows */
          /* Attempt to override modern color functions by forcing common properties to simple values */
          --tw-bg-opacity: 1 !important;
          --tw-text-opacity: 1 !important;
          --tw-border-opacity: 1 !important;
          --tw-ring-opacity: 1 !important;
          /* Ensure no gradients */
          background: #FFFFFF !important;
        }

        /* Specific Tailwind color class overrides to basic hex values */
        .bg-white { background-color: #FFFFFF !important; }
        .bg-blue-100 { background-color: #DBEAFE !important; }
        .bg-gray-100 { background-color: #F3F4F6 !important; }
        .bg-gray-200 { background-color: #E5E7EB !important; }
        .bg-red-100 { background-color: #FEE2E2 !important; }
        .bg-blue-200 { background-color: #BFDBFE !important; }
        .bg-red-200 { background-color: #FECACA !important; }
        .bg-blue-500 { background-color: #3B82F6 !important; }
        .bg-blue-600 { background-color: #2563EB !important; }
        .bg-red-500 { background-color: #EF4444 !important; }
        .bg-red-600 { background-color: #DC2626 !important; }
        .bg-green-500 { background-color: #22C55E !important; }
        .bg-gray-300 { background-color: #D1D5DB !important; }

        .text-gray-700 { color: #374151 !important; }
        .text-blue-800 { color: #1E40AF !important; }
        .text-gray-900 { color: #111827 !important; }
        .text-red-600 { color: #DC2626 !important; }
        .text-red-800 { color: #991B1B !important; }
        .text-gray-500 { color: #6B7280 !important; }
        .text-gray-800 { color: #1F2937 !important; }
        .text-gray-600 { color: #4B5563 !important; }
      `;
      document.head.appendChild(styleElement);

      const pdfFileName = monthToDisplay
        ? `recapitulatif_cra_${format(monthToDisplay, "yyyyMM")}.pdf`
        : `recapitulatif_cra_${format(new Date(), "yyyyMMdd")}.pdf`;

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: "#FFFFFF",
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

      pdf.save(pdfFileName);
      alert("Récapitulatif PDF généré avec succès !");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert(
        `Erreur lors de la génération du PDF: ${error.message}. Si l'erreur persiste, veuillez vérifier les couleurs CSS utilisées (par ex. "oklch" non supporté) ou d'autres propriétés CSS complexes.`
      );
    } finally {
      setLoadingPdf(false);
      // Remove the temporary style element in finally block
      if (styleElement && document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    }
  }, [monthToDisplay]); // monthToDisplay est maintenant une dépendance

  const groupedActivities = useCallback(() => {
    // Si monthToDisplay est fourni, ne traiter que les activités de ce mois
    const filteredActivities = monthToDisplay
      ? craActivities.filter((activity) =>
          isSameMonth(parseISO(activity.date_activite), monthToDisplay)
        )
      : craActivities;

    const years = Array.from(
      new Set(
        filteredActivities.map((activity) =>
          format(parseISO(activity.date_activite), "yyyy")
        )
      )
    ).sort();
    const report = {};

    years.forEach((year) => {
      report[year] = {};
      const yearStart = startOfYear(new Date(year, 0, 1));
      const yearEnd = endOfYear(new Date(year, 0, 1));
      const monthsInYear = eachMonthOfInterval({
        start: yearStart,
        end: yearEnd,
      });

      monthsInYear.forEach((monthDate) => {
        const monthKey = format(monthDate, "yyyy-MM", { locale: fr });
        // S'il y a un monthToDisplay, on ne crée l'entrée que pour ce mois
        if (!monthToDisplay || isSameMonth(monthDate, monthToDisplay)) {
          report[year][monthKey] = {
            label: format(monthDate, "MMMM", { locale: fr }),
            activities: [],
            absences: [],
            totalWorkedDays: 0,
            totalAbsenceDays: 0,
          };
        }
      });
    });

    filteredActivities.forEach((activity) => {
      const activityDate = parseISO(activity.date_activite);
      const year = format(activityDate, "yyyy");
      const monthKey = format(activityDate, "yyyy-MM", { locale: fr });

      // S'assurer que l'entrée pour le mois existe si elle a été filtrée précédemment
      if (report[year] && report[year][monthKey]) {
        const isAbsence =
          activity.type_activite && activity.type_activite.includes("Absence");
        if (isAbsence) {
          report[year][monthKey].absences.push(activity);
          report[year][monthKey].totalAbsenceDays += parseFloat(
            activity.temps_passe
          );
        } else {
          report[year][monthKey].activities.push(activity);
          report[year][monthKey].totalWorkedDays += parseFloat(
            activity.temps_passe
          );
        }
      }
    });

    // Supprimer les années ou mois vides qui auraient pu être créés par eachMonthOfInterval si monthToDisplay était actif
    for (const year in report) {
      for (const monthK in report[year]) {
        if (
          report[year][monthK].activities.length === 0 &&
          report[year][monthK].absences.length === 0 &&
          monthToDisplay &&
          !isSameMonth(parseISO(monthK), monthToDisplay)
        ) {
          delete report[year][monthK];
        }
      }
      if (Object.keys(report[year]).length === 0) {
        delete report[year];
      }
      report[year] = Object.fromEntries(
        Object.entries(report[year]).sort(([keyA], [keyB]) =>
          keyA.localeCompare(keyB)
        )
      );
    }
    return report;
  }, [craActivities, monthToDisplay]); // Ajouter monthToDisplay comme dépendance

  const reportData = groupedActivities();

  // Déterminer le titre du rapport
  const reportTitle = monthToDisplay
    ? `Récapitulatif des Activités CRA - ${format(monthToDisplay, "MMMM yyyy", {
        locale: fr,
      })}`
    : `Récapitulatif Annuel des Activités CRA`;

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8">
      <h2 className="text-3xl font-bold text-gray-700 mb-6 border-b-2 pb-2">
        {reportTitle}
      </h2>

      <div className="flex justify-center mb-6">
        <button
          onClick={generatePdf}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
          disabled={loadingPdf}
        >
          {loadingPdf
            ? "Génération PDF..."
            : `Télécharger le PDF ${
                monthToDisplay ? "pour ce mois" : "complet"
              }`}
        </button>
      </div>

      <div ref={reportRef} className="p-4 bg-white rounded-lg shadow-inner">
        {Object.keys(reportData).length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {monthToDisplay
              ? `Aucune activité enregistrée pour ${format(
                  monthToDisplay,
                  "MMMM yyyy",
                  { locale: fr }
                )}.`
              : "Aucune activité enregistrée pour le récapitulatif."}
          </p>
        ) : (
          Object.keys(reportData)
            .sort()
            .map((year) => (
              <div key={year} className="mb-8">
                <h3 className="text-2xl font-bold text-gray-800 border-b-2 pb-2 mb-4">
                  Année {year}
                </h3>
                {Object.keys(reportData[year]).map((monthKey) => {
                  const monthData = reportData[year][monthKey];
                  // S'assurer que le mois corresponde au mois affiché si monthToDisplay est actif
                  if (
                    monthToDisplay &&
                    !isSameMonth(parseISO(monthKey + "-01"), monthToDisplay)
                  ) {
                    return null;
                  }
                  if (
                    monthData.activities.length === 0 &&
                    monthData.absences.length === 0
                  ) {
                    return null;
                  }
                  return (
                    <div
                      key={monthKey}
                      className="mb-6 p-4 border border-gray-200 rounded-lg shadow-sm"
                    >
                      <h4 className="text-xl font-semibold text-gray-700 mb-3">
                        {monthData.label.charAt(0).toUpperCase() +
                          monthData.label.slice(1)}
                      </h4>

                      {monthData.activities.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-lg font-medium text-gray-600 mb-2 flex items-center">
                            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>{" "}
                            Activités (Jours travaillés:{" "}
                            {monthData.totalWorkedDays.toFixed(1)})
                          </h5>
                          <ul className="list-disc pl-5 space-y-1 text-gray-700">
                            {monthData.activities.map((activity) => {
                              const activityDate = parseISO(
                                activity.date_activite
                              );
                              const isWeekendDay = isWeekend(activityDate, {
                                weekStartsOn: 1,
                              });
                              const isPublicHolidayDay =
                                isPublicHoliday(activityDate);
                              const nonWorkingDayNote =
                                (isWeekendDay || isPublicHolidayDay) &&
                                activity.override_non_working_day
                                  ? " (Dérogation: Jours non-ouvrables)"
                                  : "";
                              return (
                                <li key={activity.id} className="text-sm">
                                  <span className="font-semibold">
                                    {format(
                                      parseISO(activity.date_activite),
                                      "dd/MM/yyyy"
                                    )}
                                  </span>
                                  : {activity.type_activite} - Client:{" "}
                                  {activity.client_name || "N/A"} -{" "}
                                  {activity.temps_passe}j -{" "}
                                  {activity.description_activite || "N/A"}
                                  {nonWorkingDayNote}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {monthData.absences.length > 0 && (
                        <div>
                          <h5 className="text-lg font-medium text-gray-600 mb-2 flex items-center">
                            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>{" "}
                            Absences (Jours absents:{" "}
                            {monthData.totalAbsenceDays.toFixed(1)})
                          </h5>
                          <ul className="list-disc pl-5 space-y-1 text-gray-700">
                            {monthData.absences.map((absence) => {
                              const absenceDate = parseISO(
                                absence.date_activite
                              );
                              const isWeekendDay = isWeekend(absenceDate, {
                                weekStartsOn: 1,
                              });
                              const isPublicHolidayDay =
                                isPublicHoliday(absenceDate);
                              const nonWorkingDayNote =
                                (isWeekendDay || isPublicHolidayDay) &&
                                absence.override_non_working_day
                                  ? " (Dérogation: Jours non-ouvrables)"
                                  : "";
                              return (
                                <li key={absence.id} className="text-sm">
                                  <span className="font-semibold">
                                    {format(
                                      parseISO(absence.date_activite),
                                      "dd/MM/yyyy"
                                    )}
                                  </span>
                                  : {absence.type_activite} -{" "}
                                  {absence.temps_passe}j -{" "}
                                  {absence.description_activite || "N/A"}
                                  {nonWorkingDayNote}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {monthData.activities.length === 0 &&
                        monthData.absences.length === 0 && (
                          <p className="text-gray-500 text-sm">
                            Aucune activité ou absence pour ce mois.
                          </p>
                        )}
                    </div>
                  );
                })}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
