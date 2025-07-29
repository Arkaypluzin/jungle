// components/SummaryReport.js
"use client";

import React, { useMemo, useRef, useCallback, useEffect } from "react";
import { format, isValid, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
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
  totalWorkingDays = 0,
  totalActivitiesTime = 0,
  timeDifference = "0.00",
  userFirstName,
}) {
  const reportRef = useRef();

  useEffect(() => {
    if (isOpen) {
      console.log("SummaryReport est ouvert. Props reçues:", {
        month, activities, activityTypeDefinitions, clientDefinitions,
        totalWorkingDays, totalActivitiesTime, timeDifference, userFirstName
      });
      if (!isValid(month)) {
        console.error("SummaryReport: Prop 'month' invalide lors de l'ouverture:", month);
      }
      if (!activities || activities.length === 0) {
        console.warn("SummaryReport: Aucune activité reçue ou tableau vide.");
      }
    }
  }, [isOpen, month, activities, activityTypeDefinitions, clientDefinitions, totalWorkingDays, totalActivitiesTime, timeDifference, userFirstName]);

  if (!isOpen) {
    return null;
  }

  // Fallback pour les props essentielles
  if (!month || !activities || !clientDefinitions || !activityTypeDefinitions) {
    console.error("SummaryReport: Données essentielles manquantes pour le rendu du rapport.", { month, activities, clientDefinitions, activityTypeDefinitions });
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(107, 114, 128, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem' }}>
        <div style={{ backgroundColor: 'rgb(255, 255, 255)', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '28rem', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'rgb(107, 114, 128)', fontSize: '1.875rem', fontWeight: 'bold', cursor: 'pointer' }}
            aria-label="Fermer"
          >
            &times;
          </button>
          <p style={{ color: 'rgb(220, 38, 38)', textAlign: 'center' }}>
            Erreur: Impossible d'afficher le rapport mensuel car des données essentielles sont manquantes.
          </p>
        </div>
      </div>
    );
  }

  if (!isValid(month)) {
    console.error("SummaryReport: Prop 'month' invalide reçue après le check initial:", month);
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(107, 114, 128, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem' }}>
        <div style={{ backgroundColor: 'rgb(255, 255, 255)', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '28rem', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'rgb(107, 114, 128)', fontSize: '1.875rem', fontWeight: 'bold', cursor: 'pointer' }}
            aria-label="Fermer"
          >
            &times;
          </button>
          <p style={{ color: 'rgb(220, 38, 38)', textAlign: 'center' }}>
            Erreur: Impossible d'afficher le rapport mensuel car la date est invalide.
          </p>
        </div>
      </div>
    );
  }

  const monthName = format(month, "MMMM yyyy", { locale: fr });

  const getClientName = useCallback((clientId) => {
    const client = clientDefinitions.find((c) => String(c.id) === String(clientId));
    return client ? client.nom_client : "Client Inconnu";
  }, [clientDefinitions]);

  const getActivityTypeName = useCallback((activityTypeId) => {
    const type = activityTypeDefinitions.find((t) => String(t.id) === String(activityTypeId));
    return type ? type.name : "Type Inconnu";
  }, [activityTypeDefinitions]);

  const activitiesByDay = useMemo(() => {
    const groups = {};
    activities.forEach((activity) => {
      let dateObj = null;
      if (typeof activity.date_activite === "string") {
        dateObj = parseISO(activity.date_activite);
      } else if (activity.date_activite) {
        dateObj = new Date(activity.date_activite);
      }

      if (isValid(dateObj)) {
        const dateKey = format(dateObj, "yyyy-MM-dd");
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push({ ...activity, date_activite: dateObj });
      } else {
        console.warn("SummaryReport: Ignorer l'activité avec date_activite invalide:", activity);
      }
    });
    return groups;
  }, [activities]);

  const startOfMonthDate = startOfMonth(month);
  const endOfMonthDate = endOfMonth(month);
  const allDaysInMonth = eachDayOfInterval({ start: startOfMonthDate, end: endOfMonthDate });

  const workingDays = allDaysInMonth.filter(day => {
    const dayOfWeek = getDay(day);
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  });

  const handleDownloadPdf = async () => {
    const input = reportRef.current;
    if (!input) {
      console.error("PDF Generation Error: Report element not found.");
      alert("Une erreur est survenue lors de la génération du PDF. Élément du rapport introuvable.");
      return;
    }

    // Sauvegarder les styles originaux pour les restaurer
    const originalInputStyle = input.style.cssText;
    
    // Appliquer des styles temporaires pour la capture
    input.style.padding = '20px';
    input.style.boxShadow = 'none';
    input.style.backgroundColor = 'rgb(255, 255, 255)'; // Forcer un fond blanc
    input.style.color = 'rgb(51, 51, 51)'; // Forcer une couleur de texte foncée

    try {
      const canvas = await html2canvas(input, {
        scale: 2, // Augmenter la résolution pour une meilleure qualité PDF
        useCORS: true, // Important si vous avez des images/ressources externes
        windowWidth: input.scrollWidth, // Capturer toute la largeur du contenu
        windowHeight: input.scrollHeight, // Capturer toute la hauteur du contenu
        logging: true, // Activer le logging pour le débogage d'html2canvas
        // Ignorer les éléments qui pourraient causer des problèmes de rendu (ex: scrollbars invisibles)
        ignoreElements: (element) => {
          return element.classList.contains('do-not-print'); // Ajoutez cette classe aux éléments à ignorer
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4"); // 'p' pour portrait, 'mm' pour millimètres, 'a4' pour le format
      const imgWidth = 210; // Largeur A4 en mm
      const pageHeight = 297; // Hauteur A4 en mm
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
      alert(`Une erreur est survenue lors de la génération du PDF. Détails: ${error.message || error}. Veuillez réessayer.`);
    } finally {
      // Restaurer les styles originaux après la capture
      input.style.cssText = originalInputStyle;
    }
  };


  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(107, 114, 128, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem', overflowY: 'auto' }}>
      <div style={{ backgroundColor: 'rgb(255, 255, 255)', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '56rem', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '2rem' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'rgb(107, 114, 128)', fontSize: '1.875rem', fontWeight: 'bold', cursor: 'pointer' }}
          aria-label="Fermer le rapport"
        >
          &times;
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <button
            onClick={handleDownloadPdf}
            style={{ backgroundColor: 'rgb(37, 99, 235)', color: 'rgb(255, 255, 255)', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', transitionProperty: 'background-color', transitionDuration: '300ms', fontSize: '1.125rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto', cursor: 'pointer' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style={{ height: '1.5rem', width: '1.5rem', marginRight: '0.5rem' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l3-3m-3 3l-3-3m2-8h7a2 2 0 012 2v7a2 2 0 01-2 2h-7a2 2 0 01-2-2V5a2 2 0 012-2z"
              />
            </svg>
            Télécharger le rapport (PDF)
          </button>
        </div>

        {/* Contenu du Rapport (sera capturé par html2canvas) */}
        {/* Styles inline agressifs pour forcer les couleurs compatibles */}
        <div
          ref={reportRef}
          style={{ padding: '1.5rem', backgroundColor: 'rgb(255, 255, 255)', borderRadius: '0.5rem', fontFamily: 'Arial, sans-serif', color: 'rgb(51, 51, 51)' }}
        >
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', textAlign: 'center', color: 'rgb(49, 46, 129)', marginBottom: '2rem' }}>
            Rapport d'Activité Mensuel
          </h1>

          <div style={{ marginBottom: '2rem', borderBottom: '2px solid rgb(224, 231, 255)', paddingBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'rgb(67, 56, 202)', marginBottom: '1rem' }}>
              Informations Générales
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '1.125rem' }}>
              <p style={{ color: 'rgb(51, 51, 51)' }}>
                <span style={{ fontWeight: '600' }}>Consultant :</span> {userFirstName}
              </p>
              <p style={{ color: 'rgb(51, 51, 51)' }}>
                <span style={{ fontWeight: '600' }}>Mois du rapport :</span>{" "}
                {monthName}
              </p>
              <p style={{ color: 'rgb(51, 51, 51)' }}>
                <span style={{ fontWeight: '600' }}>Jours ouvrés dans le mois :</span>{" "}
                {totalWorkingDays} jours
              </p>
              <p style={{ color: 'rgb(51, 51, 51)' }}>
                <span style={{ fontWeight: '600' }}>Temps total déclaré :</span>{" "}
                {totalActivitiesTime.toFixed(2)} jours
              </p>
              <p style={{ gridColumn: '1 / -1', color: 'rgb(51, 51, 51)' }}>
                <span style={{ fontWeight: '600' }}>Écart :</span>{" "}
                <span
                  style={{
                    fontWeight: 'bold',
                    color: parseFloat(timeDifference) < 0
                      ? 'rgb(220, 38, 38)' // red-600
                      : 'rgb(21, 128, 61)' // green-700
                  }}
                >
                  {timeDifference} jour(s)
                </span>
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'rgb(67, 56, 202)', marginBottom: '1rem' }}>
              Détail des Activités
            </h2>
            {workingDays.length === 0 && Object.keys(activitiesByDay).length === 0 ? (
                <p style={{ color: 'rgb(75, 85, 99)', fontStyle: 'italic' }}>Aucune activité enregistrée pour ce mois.</p>
            ) : (
                <>
                    {workingDays.map((day) => {
                        const dateKey = format(day, "yyyy-MM-dd");
                        const dailyActivities = activitiesByDay[dateKey] || [];
                        const totalDailyTime = dailyActivities.reduce((sum, act) => sum + (parseFloat(act.duree_jours) || 0), 0);

                        return (
                            <div key={dateKey} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid rgb(229, 231, 235)', borderRadius: '0.5rem', backgroundColor: 'rgb(255, 255, 255)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgb(55, 65, 81)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgb(55, 65, 81)' }}>
                                        {format(day, "EEEE dd MMMM yyyy", { locale: fr })}
                                    </span>
                                    <span style={{ fontSize: '1rem', fontWeight: '400', color: 'rgb(107, 114, 128)' }}>
                                        Total du jour: {totalDailyTime.toFixed(2)} jours
                                    </span>
                                </h3>
                                {dailyActivities.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {dailyActivities.map((activity) => (
                                            <li
                                                key={activity.id}
                                                style={{ backgroundColor: 'rgb(249, 250, 251)', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid rgb(243, 244, 246)' }}
                                            >
                                                <p style={{ color: 'rgb(17, 24, 39)', fontWeight: '500' }}>
                                                    <span style={{ color: 'rgb(99, 102, 241)' }}>Client :</span>{" "}
                                                    {getClientName(activity.client_id)}
                                                </p>
                                                <p style={{ color: 'rgb(55, 65, 81)', fontSize: '0.875rem' }}>
                                                    <span style={{ color: 'rgb(99, 102, 241)' }}>Type :</span>{" "}
                                                    {getActivityTypeName(activity.activity_type_id)}
                                                </p>
                                                <p style={{ color: 'rgb(55, 65, 81)', fontSize: '0.875rem' }}>
                                                    <span style={{ color: 'rgb(99, 102, 241)' }}>Durée :</span>{" "}
                                                    {(parseFloat(activity.duree_jours) || 0).toFixed(2)} jours
                                                </p>
                                                {activity.description && (
                                                    <p style={{ color: 'rgb(75, 85, 99)', fontSize: '0.875rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                                        "{activity.description}"
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ color: 'rgb(107, 114, 128)', fontStyle: 'italic' }}>Aucune activité déclarée pour ce jour ouvré.</p>
                                )}
                            </div>
                        );
                    })}
                    {Object.keys(activitiesByDay).filter(dateKey => {
                        const day = parseISO(dateKey);
                        const dayOfWeek = getDay(day);
                        return dayOfWeek === 0 || dayOfWeek === 6;
                    }).map(dateKey => {
                        const day = parseISO(dateKey);
                        const dailyActivities = activitiesByDay[dateKey] || [];
                        const totalDailyTime = dailyActivities.reduce((sum, act) => sum + (parseFloat(act.duree_jours) || 0), 0);
                        if (dailyActivities.length === 0) return null;

                        return (
                            <div key={dateKey} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid rgb(253, 230, 138)', borderRadius: '0.5rem', backgroundColor: 'rgb(255, 251, 235)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgb(55, 65, 81)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgb(55, 65, 81)' }}>
                                        {format(day, "EEEE dd MMMM yyyy", { locale: fr })} (Weekend)
                                    </span>
                                    <span style={{ fontSize: '1rem', fontWeight: '400', color: 'rgb(107, 114, 128)' }}>
                                        Total du jour: {totalDailyTime.toFixed(2)} jours
                                    </span>
                                </h3>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {dailyActivities.map((activity) => (
                                        <li
                                            key={activity.id}
                                            style={{ backgroundColor: 'rgb(249, 250, 251)', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid rgb(243, 244, 246)' }}
                                        >
                                            <p style={{ color: 'rgb(17, 24, 39)', fontWeight: '500' }}>
                                                <span style={{ color: 'rgb(99, 102, 241)' }}>Client :</span>{" "}
                                                {getClientName(activity.client_id)}
                                            </p>
                                            <p style={{ color: 'rgb(55, 65, 81)', fontSize: '0.875rem' }}>
                                                <span style={{ color: 'rgb(99, 102, 241)' }}>Type :</span>{" "}
                                                {getActivityTypeName(activity.activity_type_id)}
                                            </p>
                                            <p style={{ color: 'rgb(55, 65, 81)', fontSize: '0.875rem' }}>
                                                <span style={{ color: 'rgb(99, 102, 241)' }}>Durée :</span>{" "}
                                                {(parseFloat(activity.duree_jours) || 0).toFixed(2)} jours
                                            </p>
                                            {activity.description && (
                                                <p style={{ color: 'rgb(75, 85, 99)', fontSize: '0.875rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                                    "{activity.description}"
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </>
            )}
          </div>

          <div style={{ borderTop: '2px solid rgb(224, 231, 255)', paddingTop: '1.5rem', marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'rgb(67, 56, 202)', marginBottom: '1rem' }}>
              Statistiques Clés
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '1.125rem' }}>
              <p style={{ color: 'rgb(51, 51, 51)' }}>
                <span style={{ fontWeight: '600' }}>Nombre total d'activités :</span>{" "}
                {activities.length}
              </p>
              <p style={{ color: 'rgb(51, 51, 51)' }}>
                <span style={{ fontWeight: '600' }}>Clients uniques :</span>{" "}
                {[...new Set(activities.map(a => getClientName(a.client_id)))].length}
              </p>
              <p style={{ color: 'rgb(51, 51, 51)' }}>
                <span style={{ fontWeight: '600' }}>Types d'activités uniques :</span>{" "}
                {[...new Set(activities.map(a => getActivityTypeName(a.activity_type_id)))].length}
              </p>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: 'rgb(107, 114, 128)', fontSize: '0.875rem', marginTop: '2.5rem' }}>
            Généré le {format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}
          </p>
        </div>
      </div>
    </div>
  );
}
