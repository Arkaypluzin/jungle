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
      <div className="fixed inset-0" style={{ backgroundColor: 'rgba(100, 100, 100, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '28rem', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', color: '#9ca3af', fontSize: '1.5rem', fontWeight: 'bold' }}
          >
            &times;
          </button>
          <p style={{ color: '#b91c1c', textAlign: 'center' }}>
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

    // Temporairement ajuster les styles pour une meilleure capture
    const originalInputStyle = input.style.cssText;
    input.style.padding = '20px';
    input.style.boxShadow = 'none';
    input.style.backgroundColor = 'rgb(255, 255, 255)';
    input.style.color = 'rgb(51, 51, 51)';

    try {
      // Log the outerHTML before converting to canvas
      console.log("HTML content before html2canvas:", input.outerHTML);

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
      showMessage("PDF généré avec succès !", "success");
    } catch (error) {
      console.error("PDF Generation Error (Detailed): ", error);
      showMessage(
        `Une erreur est survenue lors de la génération du PDF. Détails: ${error.message || error}. ` +
        `Si l'erreur mentionne "oklch", cela signifie que des couleurs modernes non supportées par le générateur de PDF sont utilisées. ` +
        `Veuillez vérifier votre configuration Tailwind CSS (tailwind.config.js) ou vos fichiers CSS globaux pour remplacer les couleurs "oklch" par des formats comme "rgb()" ou des codes hexadécimaux.`,
        "error"
      );
    } finally {
      // Restaurer les styles originaux
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
    const type = activityTypeDefinitions.find(t => t.name && t.name.toLowerCase().includes("congé payé"));
    return type ? type.id : null;
  }, [activityTypeDefinitions]);


  return (
    <div className="fixed inset-0" style={{ backgroundColor: 'rgba(100, 100, 100, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem', overflowY: 'auto' }}>
      <div ref={reportRef} style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '64rem', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '1.5rem' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', color: '#9ca3af', fontSize: '1.5rem', fontWeight: 'bold' }}
        >
          &times;
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', textAlign: 'center' }}>
          Rapport de Synthèse - {monthName}
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          {/* Section Informations Générales */}
          <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '0.5rem' }}>Informations Générales</h3>
            <p style={{ marginBottom: '0.25rem' }}><strong style={{ fontWeight: 'bold' }}>Mois du rapport :</strong> {monthName}</p>
            <p style={{ marginBottom: '0.25rem' }}><strong style={{ fontWeight: 'bold' }}>Total jours d'activités sur jours ouvrés :</strong> {totalWorkingDaysActivitiesTime} jours</p>
            <p style={{ marginBottom: '0.25rem' }}><strong style={{ fontWeight: 'bold' }}>Total jours de congés payés :</strong> {totalPaidLeaveDaysInMonth} jours</p>
            <p style={{ marginBottom: '0.25rem' }}><strong style={{ fontWeight: 'bold' }}>Écart (Activités - Jours ouvrés) :</strong> {timeDifference} jours</p>
          </div>

          {/* Section Détail des Activités */}
          <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>Détail des Activités</h3>
            {allDaysWithActivities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {allDaysWithActivities.map(({ day, activities: dailyActivities, totalDailyTime, isWeekend: isWeekendDay }) => (
                  <div key={format(day, 'yyyy-MM-dd')} style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', backgroundColor: '#ffffff', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '0.25rem' }}>
                      {format(day, "EEEE dd MMMM yyyy", { locale: fr })} ({totalDailyTime}j)
                      {isWeekendDay && <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>(Week-end)</span>}
                      {isPublicHoliday(day) && <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>(Jour Férié)</span>}
                    </p>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      {dailyActivities.map((activity) => {
                        const clientName = getClientName(activity.client_id);
                        const activityTypeName = getActivityTypeName(activity.type_activite);
                        
                        let activityLineBgColor = '#eff6ff'; // Default (blue-50)
                        let activityLineTextColor = '#1e40af'; // Default (blue-800)

                        if (String(activity.type_activite) === String(paidLeaveTypeId)) {
                          activityLineBgColor = 'transparent'; // No specific background for leave
                          activityLineTextColor = '#4b5563'; // Revert to default text color
                        }

                        return (
                          <li key={activity.id} style={{ display: 'flex', flexWrap: 'wrap', padding: '0.25rem', borderRadius: '0.125rem', backgroundColor: activityLineBgColor, color: activityLineTextColor }}>
                            <span style={{ fontWeight: 'medium' }}>{activityTypeName} ({parseFloat(activity.temps_passe) || 0}j)</span>
                            {/* Conditionnel pour afficher le client et le tiret précédent */}
                            {clientName !== "Client Inconnu" && (
                              <>
                                <span style={{ margin: '0 0.25rem' }}>-</span>
                                <span>Client: {clientName}</span>
                              </>
                            )}
                            <span style={{ margin: '0 0.25rem' }}>-</span>

                            {activity.description && (
                              <>
                                <span style={{ margin: '0 0.25rem' }}>-</span>
                                <span style={{ fontStyle: 'italic' }}>"{activity.description}"</span>
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
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Aucune activité enregistrée pour ce mois.</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.75rem' }}>
          <button
            onClick={handleDownloadPdf}
            className="do-not-print" // Garde la classe pour l'ignorer lors de la capture
            style={{ backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', outline: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', transitionProperty: 'background-color', transitionDuration: '200ms' }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#b91c1c'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#dc2626'}
          >
            Télécharger PDF
          </button>
          <button
            onClick={onClose}
            style={{ backgroundColor: '#d1d5db', color: '#1f2937', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', outline: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', transitionProperty: 'background-color', transitionDuration: '200ms' }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#9ca3af'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#d1d5db'}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
