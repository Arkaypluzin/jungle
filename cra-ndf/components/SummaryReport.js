// components/SummaryReport.js
"use client";

import React, { useMemo, useRef, useCallback, useEffect } from "react";
import { format, isValid, parseISO, isWeekend, eachDayOfInterval, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function SummaryReport({
  isOpen,
  onClose,
  month,
  activities,
  activityTypeDefinitions,
  clientDefinitions,
  showMessage,
  userFirstName,
  // PROPS REÇUES DU CRABOARD POUR LES STATUTS ET JOURS FÉRIÉS
  craReportStatus,
  paidLeaveReportStatus,
  craReport,
  paidLeaveReport,
  publicHolidays,
}) {
  const reportRef = useRef();

  const isPublicHoliday = useCallback(
    (date) => {
      if (!isValid(date) || !publicHolidays) return false;
      const formattedDate = format(date, "yyyy-MM-dd");
      return publicHolidays.includes(formattedDate);
    },
    [publicHolidays]
  );

  // Memoize getActivityTypeName
  const getActivityTypeName = useCallback((activityTypeId) => {
    if (!activityTypeDefinitions || activityTypeDefinitions.length === 0) {
      return "Type Inconnu (définitions manquantes)";
    }
    const type = activityTypeDefinitions.find((t) => String(t.id) === String(activityTypeId));
    return type ? type.name : "Type Inconnu";
  }, [activityTypeDefinitions]);

  // Memoize getClientName
  const getClientName = useCallback((clientId) => {
    if (!clientDefinitions || clientDefinitions.length === 0) {
      return "Client Inconnu (définitions manquantes)";
    }
    const client = clientDefinitions.find((c) => String(c.id) === String(clientId));
    return client ? client.nom_client : "Client Inconnu";
  }, [clientDefinitions]);

  // Calcul des totaux
  const totals = useMemo(() => {
    if (!isValid(month)) {
      return {
        totalWorkingDays: 0,
        totalActivitiesTime: 0,
        totalWorkingDaysActivitiesTime: 0,
        totalPaidLeaveDaysInMonth: 0,
        timeDifference: "0.00",
      };
    }

    const monthStart = format(month, 'yyyy-MM-01');
    const monthEnd = format(month, 'yyyy-MM-t');
    const allDaysInMonth = eachDayOfInterval({ start: new Date(monthStart), end: new Date(monthEnd) });

    const totalWorkingDays = allDaysInMonth.filter(
      (day) => !isWeekend(day, { weekStartsOn: 1 }) && !isPublicHoliday(day)
    ).length || 0;

    let totalActivitiesTime = 0;
    let totalWorkingDaysActivitiesTime = 0;
    let totalPaidLeaveDaysInMonth = 0;

    const paidLeaveType = activityTypeDefinitions.find(t => t.name && t.name.toLowerCase().includes("congé payé"));
    const paidLeaveTypeId = paidLeaveType ? paidLeaveType.id : null;

    activities.forEach(activity => {
      const duration = parseFloat(activity.temps_passe) || 0;
      totalActivitiesTime += duration;

      let dateObj = null;
      if (typeof activity.date_activite === "string") {
        dateObj = parseISO(activity.date_activite);
      } else if (activity.date_activite) {
        dateObj = new Date(activity.date_activite);
      }

      if (isValid(dateObj)) {
        if (!isWeekend(dateObj, { weekStartsOn: 1 }) && !isPublicHoliday(dateObj)) {
          totalWorkingDaysActivitiesTime += duration;
        }

        if (String(activity.type_activite) === String(paidLeaveTypeId)) {
          totalPaidLeaveDaysInMonth += duration;
        }
      }
    });

    const timeDifference = (totalActivitiesTime - totalWorkingDays).toFixed(2);

    return {
      totalWorkingDays,
      totalActivitiesTime,
      totalWorkingDaysActivitiesTime,
      totalPaidLeaveDaysInMonth,
      timeDifference,
    };
  }, [month, activities, isPublicHoliday, activityTypeDefinitions]);

  const {
    totalWorkingDays,
    totalActivitiesTime,
    totalWorkingDaysActivitiesTime,
    totalPaidLeaveDaysInMonth,
    timeDifference,
  } = totals;

  // Effect pour le débogage
  useEffect(() => {
    if (isOpen) {
      console.log("[SummaryReport] Component is open. Props received:", {
        month: isValid(month) ? format(month, 'yyyy-MM-dd') : month,
        activitiesCount: activities.length,
        activityTypeDefinitionsCount: activityTypeDefinitions.length,
        clientDefinitionsCount: clientDefinitions.length,
        publicHolidaysCount: publicHolidays ? publicHolidays.length : 0,
        craReportStatus,
        paidLeaveReportStatus,
        userFirstName,
        calculatedTotals: totals,
        sampleActivities: activities.slice(0, 3).map(a => ({ id: a.id, type_activite: a.type_activite, temps_passe: a.temps_passe })),
        sampleActivityTypeDefinitions: activityTypeDefinitions.slice(0, 3).map(def => ({ id: def.id, name: def.name })),
      });
    }
  }, [
    isOpen, month, activities, activityTypeDefinitions, clientDefinitions,
    publicHolidays, craReportStatus, paidLeaveReportStatus, craReport,
    paidLeaveReport, userFirstName, totals
  ]);

  if (!isOpen) {
    return null;
  }

  if (!isValid(month) || !activities || !clientDefinitions || !activityTypeDefinitions || !publicHolidays) {
    console.error("[SummaryReport] Essential data missing or invalid for report rendering.", { month, activities, clientDefinitions, activityTypeDefinitions, publicHolidays });
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            &times;
          </button>
          <p className="text-red-700 text-center">
            Erreur: Impossible d'afficher le rapport mensuel car des données essentielles sont manquantes ou invalides.
          </p>
        </div>
      </div>
    );
  }

  const monthName = format(month, "MMMM yyyy", { locale: fr });

  const handleDownloadPdf = async () => {
    const input = reportRef.current;
    if (!input) {
      console.error("PDF Generation Error: Report element not found.");
      showMessage("Une erreur est survenue lors de la génération du PDF. Élément du rapport introuvable.", "error");
      return;
    }

    const originalInputStyle = input.style.cssText;
    input.style.padding = '20px';
    input.style.boxShadow = 'none';
    input.style.backgroundColor = 'rgb(255, 255, 255)';
    input.style.color = 'rgb(51, 51, 51)';

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        windowWidth: input.scrollWidth,
        windowHeight: input.scrollHeight,
        logging: true,
        ignoreElements: (element) => element.classList.contains('do-not-print')
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

      const monthYear = format(month, "MMMM_yyyy", { locale: fr });
      pdf.save(`Rapport_CRA_${userFirstName}_${monthYear}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error (Detailed): ", error);
      showMessage(`Une erreur est survenue lors de la génération du PDF. Détails: ${error.message || error}. Veuillez réessayer.`, "error");
    } finally {
      input.style.cssText = originalInputStyle;
    }
  };

  // Group activities by day and sort them for display
  const allDaysWithActivities = useMemo(() => {
    const groups = {};
    activities.forEach((activity) => {
      let dateObj = null;
      if (typeof activity.date_activite === "string") {
        dateObj = parseISO(activity.date_activite);
      } else if (activity.date_activite) {
        dateObj = new Date(activity.date_activite);
      }

      if (isValid(dateObj) && isSameMonth(dateObj, month)) {
        const dateKey = format(dateObj, "yyyy-MM-dd");
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push({ ...activity, date_activite: dateObj });
      } else {
        console.warn("[SummaryReport] Ignoring activity with invalid date_activite or out of month:", activity);
      }
    });

    return Object.keys(groups)
      .sort()
      .map(dateKey => {
        const day = parseISO(dateKey);
        const dailyActivities = groups[dateKey] || [];
        const totalDailyTime = dailyActivities.reduce((sum, act) => sum + (parseFloat(act.temps_passe) || 0), 0);
        const isWeekendDay = isWeekend(day, { weekStartsOn: 1 });
        return { day, activities: dailyActivities, totalDailyTime, isWeekend: isWeekendDay };
      });
  }, [activities, month, isPublicHoliday]);

  // Déterminer l'ID du type "Congé Payé" une seule fois
  const paidLeaveTypeId = useMemo(() => {
    const type = activityTypeDefinitions.find(
      (t) => t.name && t.name.toLowerCase().includes("congé payé")
    );
    return type ? type.id : null;
  }, [activityTypeDefinitions]);


  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4 overflow-y-auto">
      <div ref={reportRef} className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Rapport de Synthèse - {monthName}
        </h2>

        <div className="space-y-6">
          {/* Section Informations Générales */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Informations Générales</h3>
            <p><strong>Mois du rapport :</strong> {monthName}</p>
            <p><strong>Total jours d'activités sur jours ouvrés :</strong> {totalWorkingDaysActivitiesTime} jours</p>
            <p><strong>Total jours de congés payés :</strong> {totalPaidLeaveDaysInMonth} jours</p>
            <p><strong>Écart (Activités - Jours ouvrés) :</strong> {timeDifference} jours</p>
          </div>

          {/* SECTION POUR LES STATUTS DES RAPPORTS PAR LE MANAGER - ENTIÈREMENT SUPPRIMÉE */}
          {/* (Commenté ou supprimé précédemment) */}

          {/* Section Détail des Activités */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Détail des Activités</h3>
            {allDaysWithActivities.length > 0 ? (
              <div className="space-y-4">
                {allDaysWithActivities.map(({ day, activities: dailyActivities, totalDailyTime, isWeekend: isWeekendDay }) => (
                  <div key={format(day, 'yyyy-MM-dd')} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm">
                    <p className="font-bold text-gray-800 mb-1">
                      {format(day, "EEEE dd MMMM yyyy", { locale: fr })} ({totalDailyTime}j)
                      {isWeekendDay && <span className="ml-2 text-sm text-gray-500">(Week-end)</span>}
                      {isPublicHoliday(day) && <span className="ml-2 text-sm text-gray-500">(Jour Férié)</span>}
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                      {dailyActivities.map((activity) => {
                        const clientName = getClientName(activity.client_id);
                        const activityTypeName = getActivityTypeName(activity.type_activite);
                        
                        let statusColorClass = 'text-gray-700';
                        if (activity.status === 'validated') statusColorClass = 'text-green-600';
                        if (activity.status === 'pending_review') statusColorClass = 'text-yellow-600';
                        if (activity.status === 'rejected') statusColorClass = 'text-red-600';
                        if (activity.status === 'finalized') statusColorClass = 'text-purple-600';

                        // Déterminer la couleur de fond de la ligne d'activité
                        let activityLineBgClass = 'bg-blue-50'; // Couleur de fond par défaut (bleu clair)
                        let activityLineTextColorClass = 'text-blue-800'; // Couleur de texte par défaut

                        if (String(activity.type_activite) === String(paidLeaveTypeId)) {
                          // Si c'est un congé payé, pas de couleur de fond spécifique, utiliser le fond de la liste
                          activityLineBgClass = ''; // Pas de couleur de fond
                          activityLineTextColorClass = 'text-gray-700'; // Revenir à la couleur de texte par défaut
                        }

                        return (
                          <li key={activity.id} className={`flex flex-wrap p-1 rounded-sm ${activityLineBgClass} ${activityLineTextColorClass}`}>
                            <span className="font-medium">{activityTypeName} ({parseFloat(activity.temps_passe) || 0}j)</span>
                            {/* Conditionnel pour afficher le client et le tiret précédent */}
                            {clientName !== "Client Inconnu" && (
                              <>
                                <span className="mx-1">-</span>
                                <span>Client: {clientName}</span>
                              </>
                            )}
                            <span className="mx-1">-</span>
                            <span className={`font-medium ${statusColorClass}`}>Statut: {activity.status}</span>
                            {activity.description && (
                              <>
                                <span className="mx-1">-</span>
                                <span className="italic">"{activity.description}"</span>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Aucune activité enregistrée pour ce mois.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={handleDownloadPdf}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200 do-not-print"
          >
            Télécharger PDF
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
