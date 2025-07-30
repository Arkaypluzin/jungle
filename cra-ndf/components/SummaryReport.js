// components/SummaryReport.js
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { format, isValid, parseISO, isWeekend, eachDayOfInterval, isSameMonth, startOfMonth, endOfMonth, getDate } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

export default function SummaryReport({
  isOpen,
  onClose,
  month, // Le mois pour lequel générer le rapport
  activities, // La prop activities est de nouveau utilisée ici
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
  const signatureCanvasRef = useRef(null);
  const signatureCtxRef = useRef(null);
  const [signatureData, setSignatureData] = useState(null); // Stocke la signature en base64
  const [isDrawing, setIsDrawing] = useState(false); // Keep this for potential UI updates
  const isDrawingRef = useRef(false); // NEW: Ref to track drawing state for event handlers
  const [isSignatureLoading, setIsSignatureLoading] = useState(true); // État de chargement de la signature

  // Définition de monthName ici pour qu'il soit accessible partout
  const monthName = useMemo(() => {
    if (isValid(month)) {
      return format(month, "MMMM yyyy", { locale: fr });
    }
    return "Mois Inconnu";
  }, [month]);

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

  // Calcul des totaux (utilise la prop activities)
  const totals = useMemo(() => {
    if (!isValid(month)) {
      return {
        totalWorkingDays: 0,
        totalActivitiesTime: 0,
        totalWorkingDaysActivitiesTime: 0,
        totalPaidLeaveDaysInMonth: 0,
        nonWorkingDaysWorked: 0,
        totalOvertimeHours: 0,
        timeDifference: "0.00",
      };
    }

    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // --- Débogage de la liste des jours du mois ---
    console.log(`[Totals Debug] Month: ${format(month, 'yyyy-MM-dd')}`);
    console.log(`[Totals Debug] All days in month (${allDaysInMonth.length}):`, allDaysInMonth.map(d => format(d, 'yyyy-MM-dd')));


    const totalWorkingDays = allDaysInMonth.filter(
      (day) => {
        const isWknd = isWeekend(day, { weekStartsOn: 1 });
        const isPubHol = isPublicHoliday(day);
        // --- Débogage de chaque jour ---
        console.log(`[Totals Debug] Day: ${format(day, 'yyyy-MM-dd')}, isWeekend: ${isWknd}, isPublicHoliday: ${isPubHol}, isWorkingDay: ${!isWknd && !isPubHol}`);
        return !isWknd && !isPubHol;
      }
    ).length || 0;

    let totalActivitiesTime = 0;
    let totalWorkingDaysActivitiesTime = 0;
    let totalPaidLeaveDaysInMonth = 0;
    let nonWorkingDaysWorked = 0;
    let totalOvertimeHours = 0;

    const paidLeaveType = activityTypeDefinitions.find(t => t.name && t.name.toLowerCase().includes("congé payé"));
    const paidLeaveTypeId = paidLeaveType ? paidLeaveType.id : null;

    const overtimeType = activityTypeDefinitions.find(t => t.is_overtime);
    const overtimeTypeId = overtimeType ? overtimeType.id : null;

    activities.forEach(activity => { // Use activities prop here
      const duration = parseFloat(activity.temps_passe) || 0;
      totalActivitiesTime += duration;

      let dateObj = null;
      if (typeof activity.date_activite === "string") {
        dateObj = parseISO(activity.date_activite);
      } else if (activity.date_activite) {
        dateObj = new Date(activity.date_activite);
      }

      if (isValid(dateObj) && isSameMonth(dateObj, month)) {
        const isNonWorkingDay = isWeekend(dateObj, { weekStartsOn: 1 }) || isPublicHoliday(dateObj);

        if (isNonWorkingDay && duration > 0) {
          nonWorkingDaysWorked += duration;
        }

        if (!isNonWorkingDay) {
          totalWorkingDaysActivitiesTime += duration;
        }

        if (String(activity.type_activite) === String(paidLeaveTypeId)) {
          totalPaidLeaveDaysInMonth += duration;
        }

        if (String(activity.type_activite) === String(overtimeTypeId)) {
            totalOvertimeHours += duration;
        }
      }
    });

    const timeDifference = (totalActivitiesTime - totalWorkingDays).toFixed(2);

    console.log("[SummaryReport - Totals Final] Month:", format(month, 'yyyy-MM'));
    console.log("[SummaryReport - Totals Final] Calculated Total Working Days:", totalWorkingDays);
    console.log("[SummaryReport - Totals Final] Non-Working Days Worked:", nonWorkingDaysWorked);
    console.log("[SummaryReport - Totals Final] Total Overtime Hours:", totalOvertimeHours);


    return {
      totalWorkingDays,
      totalActivitiesTime,
      totalWorkingDaysActivitiesTime,
      totalPaidLeaveDaysInMonth,
      nonWorkingDaysWorked,
      totalOvertimeHours,
      timeDifference,
    };
  }, [month, activities, isPublicHoliday, activityTypeDefinitions]); // Depend on activities prop

  const {
    totalWorkingDays,
    totalActivitiesTime,
    totalWorkingDaysActivitiesTime,
    totalPaidLeaveDaysInMonth,
    nonWorkingDaysWorked,
    totalOvertimeHours,
    timeDifference,
  } = totals;

  // Effect for debugging
  useEffect(() => {
    if (isOpen) {
      console.log("[SummaryReport] Component is open. Props received:", {
        month: isValid(month) ? format(month, 'yyyy-MM-dd') : month,
        activitiesCount: activities.length, // Use activities prop here
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
    isOpen, month, activities, activityTypeDefinitions, clientDefinitions, // Depend on activities prop
    publicHolidays, craReportStatus, paidLeaveReportStatus, craReport,
    paidLeaveReport, userFirstName, totals
  ]);

  if (!isOpen) {
    return null;
  }

  // Initial check for essential data
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

  // Group activities by day and sort them for display (now includes ALL days of the month)
  const allDaysWithActivities = useMemo(() => {
    if (!isValid(month)) return [];

    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Create a map for quick lookup of activities by date
    const activitiesMap = new Map(); // Map<dateKey (YYYY-MM-DD), Array<Activity>>
    activities.forEach(activity => { // Use activities prop here
        let dateObj = null;
        if (typeof activity.date_activite === "string") {
            dateObj = parseISO(activity.date_activite);
        } else if (activity.date_activite) {
            dateObj = new Date(activity.date_activite);
        }

        if (isValid(dateObj) && isSameMonth(dateObj, month)) {
            const dateKey = format(dateObj, "yyyy-MM-dd");
            if (!activitiesMap.has(dateKey)) {
                activitiesMap.set(dateKey, []);
            }
            activitiesMap.get(dateKey).push({ ...activity, date_activite: dateObj });
        }
    });

    // Sort activities within each day
    activitiesMap.forEach(dailyActivities => {
        dailyActivities.sort((a, b) => {
            const dateA = a.date_activite.getTime();
            const dateB = b.date_activite.getTime();
            return dateA - dateB;
        });
    });

    // Now, iterate over all days in the month
    return allDaysInMonth.map(day => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dailyActivities = activitiesMap.get(dateKey) || [];
        const totalDailyTime = dailyActivities.reduce((sum, act) => sum + (parseFloat(act.temps_passe) || 0), 0);
        const isWeekendDay = isWeekend(day, { weekStartsOn: 1 });
        return { day, activities: dailyActivities, totalDailyTime, isWeekend: isWeekendDay };
    });
  }, [activities, month, isPublicHoliday]); // Depend on activities prop

  // Determine the ID of the "Congé Payé" type once
  const paidLeaveTypeId = useMemo(() => {
    const type = activityTypeDefinitions.find(t => t.name && t.name.toLowerCase().includes("congé payé"));
    return type ? type.id : null;
  }, [activityTypeDefinitions]);


  // Signature drawing logic
  useEffect(() => {
    console.log("[Signature] Signature canvas drawing useEffect ran.");
    const canvas = signatureCanvasRef.current;
    if (!canvas) {
      console.log("[Signature] Canvas ref is null, cannot attach listeners.");
      return;
    }

    // Set canvas dimensions explicitly based on its computed style
    // This ensures the drawing resolution matches the display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    signatureCtxRef.current = ctx;
    if (!ctx) {
      console.error("[Signature] Canvas 2D context is null, cannot draw.");
      return;
    }

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000'; // Black color for signature

    let lastX = 0;
    let lastY = 0;

    const getCoords = (e) => {
      const currentRect = canvas.getBoundingClientRect(); // Get latest position
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      return {
        x: clientX - currentRect.left,
        y: clientY - currentRect.top
      };
    };

    const startDrawing = (e) => {
      e.preventDefault(); // Prevent default browser actions (e.g., text selection, scrolling)
      isDrawingRef.current = true;
      setIsDrawing(true);
      const { x, y } = getCoords(e);
      lastX = x;
      lastY = y;
      ctx.beginPath(); // Start a new path for each stroke
      ctx.moveTo(lastX, lastY);
      console.log(`[Signature] startDrawing: event.type=${e.type}, x=${x}, y=${y}`);
    };

    const draw = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault(); // Prevent default browser actions (e.g., scrolling on touch)
      if (!signatureCtxRef.current) {
        console.error("[Signature] Canvas context is null during draw.");
        return;
      }
      const { x, y } = getCoords(e);
      signatureCtxRef.current.lineTo(x, y);
      signatureCtxRef.current.stroke();
      lastX = x;
      lastY = y;
      // console.log(`[Signature] drawing: event.type=${e.type}, x=${x}, y=${y}`); // Trop verbeux, décommenter si nécessaire
    };

    const stopDrawing = (e) => {
      isDrawingRef.current = false;
      setIsDrawing(false);
      if (signatureCtxRef.current) {
        signatureCtxRef.current.closePath(); // Close the current path
      }
      // Lorsque le dessin s'arrête, mettez à jour l'état signatureData pour la génération PDF
      if (signatureCanvasRef.current) {
        setSignatureData(signatureCanvasRef.current.toDataURL('image/png'));
      }
      console.log(`[Signature] stopDrawing: event.type=${e.type}`);
    };

    // Attacher les écouteurs d'événements
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing); // Arrêter le dessin si la souris quitte le canevas

    // Pour les appareils tactiles
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing); // Gérer l'interruption du toucher

    return () => {
      // Nettoyage : supprimer les écouteurs d'événements lorsque le composant est démonté ou que l'effet est réexécuté
      console.log("[Signature] Cleaning up signature canvas event listeners.");
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);

      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
      canvas.removeEventListener('touchcancel', stopDrawing);
    };
  }, []); // <--- IMPORTANT: Le tableau de dépendances vide garantit que cela ne s'exécute qu'une seule fois au montage

  // Charger la signature depuis l'API lorsque la modale s'ouvre
  useEffect(() => {
    const loadSignatureFromApi = async () => {
      if (!isOpen) {
        // Effacer le canevas et les données lorsque la modale se ferme
        setSignatureData(null);
        if (signatureCanvasRef.current) {
          const ctx = signatureCanvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
        }
        setIsSignatureLoading(true); // Réinitialiser l'état de chargement pour la prochaine ouverture
        return;
      }

      setIsSignatureLoading(true);
      try {
        // Utilisation de userFirstName comme ID unique. Dans une vraie application, utilisez un ID utilisateur plus robuste.
        const response = await fetch(`/api/signature?userId=${userFirstName}`); 
        if (response.ok) {
          const data = await response.json();
          if (data.image) {
            setSignatureData(data.image);
            if (signatureCanvasRef.current) {
              const ctx = signatureCanvasRef.current.getContext('2d');
              const img = new Image();
              img.onload = () => {
                ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
                ctx.drawImage(img, 0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
              };
              img.src = data.image;
            }
          } else {
            setSignatureData(null);
            if (signatureCanvasRef.current) {
              const ctx = signatureCanvasRef.current.getContext('2d');
              ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
            }
          }
        } else {
          console.error("Échec du chargement de la signature depuis l'API:", response.status, response.statusText);
          setSignatureData(null); // S'assurer qu'aucune ancienne signature n'est affichée
          if (signatureCanvasRef.current) {
            const ctx = signatureCanvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de la signature:", error);
        showMessage("Erreur lors du chargement de la signature: " + error.message, "error");
        setSignatureData(null);
        if (signatureCanvasRef.current) {
          const ctx = signatureCanvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
        }
      } finally {
        setIsSignatureLoading(false);
      }
    };

    loadSignatureFromApi();
  }, [isOpen, userFirstName, showMessage]); // Recharger lorsque la modale s'ouvre ou l'utilisateur change


  const clearSignature = async () => {
    if (signatureCanvasRef.current) {
      const ctx = signatureCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
      setSignatureData(null); // Effacer également les données stockées

      try {
        // Utilisation de userFirstName comme ID unique. Dans une vraie application, utilisez un ID utilisateur plus robuste.
        const response = await fetch(`/api/signature?userId=${userFirstName}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          showMessage("Signature effacée !", "info");
        } else {
          const errorData = await response.json();
          console.error("Échec de la suppression de la signature de l'API:", response.status, errorData.message);
          showMessage("Erreur lors de l'effacement de la signature: " + (errorData.message || response.statusText), "error");
        }
      } catch (error) {
        console.error("Erreur lors de la suppression de la signature:", error);
        showMessage("Erreur lors de l'effacement de la signature: " + error.message, "error");
      }
    }
  };

  const saveSignature = async () => {
    if (signatureCanvasRef.current) {
      const dataURL = signatureCanvasRef.current.toDataURL('image/png');
      setSignatureData(dataURL); // Mettre à jour l'état local immédiatement

      try {
        // Utilisation de userFirstName comme ID unique. Dans une vraie application, utilisez un ID utilisateur plus robuste.
        const response = await fetch('/api/signature', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: userFirstName, image: dataURL }), 
        });
        if (response.ok) {
          showMessage("Signature enregistrée avec succès !", "success");
        } else {
          const errorData = await response.json();
          console.error("Échec de l'enregistrement de la signature dans l'API:", response.status, errorData.message);
          showMessage("Erreur lors de l'enregistrement de la signature: " + (errorData.message || response.statusText), "error");
        }
      } catch (error) {
        console.error("Erreur lors de l'enregistrement de la signature:", error);
        showMessage("Erreur lors de l'enregistrement de la signature: " + error.message, "error");
      }
    }
  };


  const handleDownloadPdf = async () => {
    if (!isValid(month) || !activities || !clientDefinitions || !activityTypeDefinitions || !publicHolidays) {
      showMessage("Impossible de générer le PDF: Données essentielles manquantes ou invalides.", "error");
      return;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      let yPos = 10; // Position Y de départ
      const margin = 15; // Marges augmentées pour une meilleure lisibilité
      const defaultLineHeight = 5; // Hauteur de ligne réduite pour plus de contenu
      const sectionSpacing = 8; // Espacement entre les sections
      const itemSpacing = 1; // Espacement entre les éléments de liste
      const pageHeight = pdf.internal.pageSize.height;
      const pageWidth = pdf.internal.pageSize.width;
      const contentWidth = pageWidth - 2 * margin; // Largeur de la zone de contenu
      const activityRectPadding = 2; // Remplissage interne pour les rectangles d'activité (légèrement réduit)

      // Titre du rapport
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(31, 41, 55); // dark-gray-800 - rgb(31, 41, 55)
      pdf.text(`Rapport de Synthèse - ${monthName} (${userFirstName})`, pageWidth / 2, yPos, { align: 'center' }); // Nom d'utilisateur ajouté
      yPos += defaultLineHeight * 2;

      // Informations Générales
      pdf.setFontSize(12);
      pdf.setTextColor(30, 64, 175); // blue-800 - rgb(30, 64, 175)
      pdf.text("Informations Générales", margin, yPos);
      yPos += defaultLineHeight;
      
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 51, 51); // Gris foncé - rgb(51, 51, 51)
      pdf.text(`Mois du rapport : ${monthName}`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Total jours ouvrés dans le mois : ${totalWorkingDays} jours`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Total jours d'activités sur jours ouvrés : ${totalWorkingDaysActivitiesTime.toFixed(1)} jours`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Total jours de congés payés : ${totalPaidLeaveDaysInMonth.toFixed(1)} jours`, margin + 5, yPos);
      yPos += defaultLineHeight;
      // Toujours afficher ces champs, même s'ils sont à zéro
      pdf.text(`Jours non ouvrés travaillés : ${nonWorkingDaysWorked.toFixed(1)} jours`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Heures Supplémentaires : ${totalOvertimeHours.toFixed(1)} jours`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Écart (Activités - Jours ouvrés) : ${timeDifference} jours`, margin + 5, yPos);
      yPos += sectionSpacing;

      // Détail des Activités
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(31, 41, 55); // dark-gray-800 - rgb(31, 41, 55)
      pdf.text("Détail des Activités", margin, yPos);
      yPos += defaultLineHeight;

      if (allDaysWithActivities.length > 0) {
        // Regroupement des jours par 10
        const daysGrouped = [];
        let currentGroup = [];
        allDaysWithActivities.forEach((dayData, index) => {
          currentGroup.push(dayData);
          if ((index + 1) % 10 === 0 || (index + 1) === allDaysWithActivities.length) {
            daysGrouped.push(currentGroup);
            currentGroup = [];
          }
        });

        daysGrouped.forEach((group, groupIndex) => {
          if (groupIndex > 0) { // Ajouter un petit espace entre les groupes, mais pas avant le premier groupe
            yPos += sectionSpacing / 2;
          }

          const startDay = getDate(group[0].day);
          const endDay = getDate(group[group.length - 1].day);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(75, 85, 99); // gray-600
          pdf.text(`Jours ${startDay} - ${endDay} :`, margin, yPos);
          yPos += defaultLineHeight;


          group.forEach(({ day, activities: dailyActivities, totalDailyTime, isWeekend: isWeekendDay }) => {
            // Hauteur de l'en-tête du jour
            const dayHeaderHeight = defaultLineHeight;
            let estimatedActivitiesContentHeight = 0;

            // Estimer la hauteur pour chaque activité, en tenant compte de splitTextToSize
            dailyActivities.forEach(activity => {
              const clientName = getClientName(activity.client_id);
              const activityTypeName = getActivityTypeName(activity.type_activite);
              
              let activityTextContent = `${activityTypeName} (${parseFloat(activity.temps_passe).toFixed(1)}j)`;
              if (clientName !== "Client Inconnu") {
                activityTextContent += ` - Client: ${clientName}`;
              }
              if (activity.description) {
                activityTextContent += ` - "${activity.description}"`;
              }
              
              // Calculer la hauteur du texte pour le rectangle
              const textWidthForRect = contentWidth - (2 * activityRectPadding);
              const splitText = pdf.splitTextToSize(activityTextContent, textWidthForRect);
              estimatedActivitiesContentHeight += (splitText.length * defaultLineHeight) + itemSpacing + activityRectPadding; // Ajouter le remplissage pour chaque élément
            });

            // S'il n'y a pas d'activités, prévoir une ligne pour le message "Aucune activité"
            if (dailyActivities.length === 0) {
              estimatedActivitiesContentHeight += defaultLineHeight + (2 * activityRectPadding) + itemSpacing; // Hauteur pour le message
            }
            
            const totalHeightNeededForDayBlock = dayHeaderHeight + estimatedActivitiesContentHeight + itemSpacing; // Ajusté pour être plus compact

            // Vérifier si une nouvelle page est nécessaire avant de dessiner le bloc du jour
            if (yPos + totalHeightNeededForDayBlock > pageHeight - margin) {
              pdf.addPage();
              yPos = margin; // Réinitialiser la position Y pour la nouvelle page
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(12);
              pdf.setTextColor(31, 41, 55);
              pdf.text("Détail des Activités (suite)", margin, yPos);
              yPos += defaultLineHeight;
              // Rajouter l'en-tête du groupe sur la nouvelle page si c'est un nouveau groupe
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(11);
              pdf.setTextColor(75, 85, 99);
              pdf.text(`Jours ${startDay} - ${endDay} (suite) :`, margin, yPos);
              yPos += defaultLineHeight;
            }

            // Dessiner l'en-tête du jour
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0); // Noir
            let dayText = `${format(day, "EEEE dd MMMM yyyy", { locale: fr })} (${totalDailyTime.toFixed(1)}j)`;
            if (isWeekendDay) dayText += " (Week-end)";
            if (isPublicHoliday(day)) dayText += " (Jour Férié)";
            pdf.text(dayText, margin + 5, yPos);
            yPos += defaultLineHeight;

            // Dessiner les activités quotidiennes ou le message "Aucune activité"
            if (dailyActivities.length > 0) {
              dailyActivities.forEach((activity) => {
                const clientName = getClientName(activity.client_id);
                const activityTypeName = getActivityTypeName(activity.type_activite);
                const isLeaveActivity = String(activity.type_activite) === String(paidLeaveTypeId);

                // Couleurs de fond et de texte pour les "boîtes" d'activité
                let rectFillColor = [239, 246, 255]; // rgb(239, 246, 255) - Bleu très clair
                let textColor = [30, 64, 175]; // rgb(30, 64, 175) - Bleu foncé

                if (isLeaveActivity) {
                  rectFillColor = [220, 252, 231]; // rgb(220, 252, 231) - Vert très clair
                  textColor = [22, 101, 52]; // rgb(22, 101, 52) - Vert foncé
                }

                // Construction de la ligne de texte de l'activité
                let activityLine = `${activityTypeName} (${parseFloat(activity.temps_passe).toFixed(1)}j)`;
                if (clientName !== "Client Inconnu") {
                  activityLine += ` - Client: ${clientName}`;
                }
                if (activity.description) {
                  activityLine += ` - "${activity.description}"`; // Description après le client
                }

                // Utiliser splitTextToSize pour déterminer la hauteur réelle du texte
                const textX = margin + 5 + activityRectPadding;
                const rectX = margin + 5;
                const rectWidth = contentWidth - 5; // Largeur du rectangle (contentWidth - remplissage interne)
                const textMaxWidth = rectWidth - (2 * activityRectPadding); // Largeur maximale pour le texte dans le rectangle

                const splitText = pdf.splitTextToSize(activityLine, textMaxWidth);
                const actualTextHeight = splitText.length * defaultLineHeight;
                const rectHeight = actualTextHeight + (2 * activityRectPadding); // Hauteur du rectangle basée sur le texte + remplissage

                // Dessiner le rectangle de fond
                pdf.setFillColor(rectFillColor[0], rectFillColor[1], rectFillColor[2]);
                pdf.rect(rectX, yPos - itemSpacing, rectWidth, rectHeight, 'F'); // Dessiner un rectangle rempli

                // Dessiner le texte de l'activité
                pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
                pdf.text(splitText, textX, yPos + activityRectPadding); // Ajuster yPos pour le remplissage du texte
                yPos += rectHeight + itemSpacing; // Ajuster yPos en fonction de la hauteur du rectangle
              });
            } else {
              // Afficher "Aucune activité enregistrée" pour les jours sans activités
              const rectX = margin + 5;
              const rectWidth = contentWidth - 5;
              const rectHeight = defaultLineHeight + (2 * activityRectPadding); // Hauteur pour le message
              
              pdf.setFillColor(240, 240, 240); // Gris très clair pour les jours sans activités
              pdf.rect(rectX, yPos - itemSpacing, rectWidth, rectHeight, 'F');

              pdf.setTextColor(150, 150, 150); // Gris clair
              pdf.text("Aucune activité enregistrée", margin + 5 + activityRectPadding, yPos + activityRectPadding);
              yPos += rectHeight + itemSpacing;
            }
            yPos += itemSpacing; // Petite marge entre les jours
          });
          yPos += sectionSpacing / 2; // Espace supplémentaire après chaque groupe
        });
      }
      else { // Ce bloc else correspond à `if (allDaysWithActivities.length > 0)`
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150); // Gris clair
        pdf.text("Aucune activité enregistrée pour ce mois.", margin + 5, yPos);
        yPos += defaultLineHeight;
      }

      // Ajouter la signature en bas
      if (signatureData) {
        const signatureHeight = 40; // Hauteur fixe pour l'image de signature
        const signatureWidth = 100; // Largeur fixe pour l'image de signature
        const signatureX = pageWidth - margin - signatureWidth; // Aligner à droite
        let signatureY = pageHeight - margin - signatureHeight; // Position depuis le bas

        // Vérifier si la signature tient sur la page actuelle, sinon, ajouter une nouvelle page
        if (signatureY < yPos + sectionSpacing) { // Si la signature chevauche le contenu
          pdf.addPage();
          yPos = margin; // Réinitialiser yPos pour la nouvelle page
          signatureY = pageHeight - margin - signatureHeight;
        }

        pdf.addImage(signatureData, 'PNG', signatureX, signatureY, signatureWidth, signatureHeight);
        pdf.setFontSize(10);
        pdf.setTextColor(51, 51, 51);
        pdf.text(`Signature de ${userFirstName}`, signatureX + signatureWidth / 2, signatureY + signatureHeight + 5, { align: 'center' });
      }


      const monthYear = format(month, "MMMM_yyyy", { locale: fr });
      pdf.save(`Rapport_CRA_${userFirstName}_${monthYear}.pdf`);
      showMessage("PDF généré avec succès !", "success");
    } catch (error) {
      console.error("Erreur de génération PDF:", error);
      showMessage("Erreur lors de la génération du PDF: " + error.message, "error");
    }
  };


  return (
    <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4 font-inter ${isOpen ? "" : "hidden"}`}>
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Rapport Mensuel de ${userFirstName} - {monthName}
        </h2>

        {/* Section de signature */}
        <div className="flex flex-col items-center mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">Signature</h3>
          {isSignatureLoading ? (
            <div className="text-gray-500">Chargement de la signature...</div>
          ) : (
            <>
              <div className="relative w-full max-w-md h-40 border border-gray-300 rounded-md overflow-hidden bg-white">
                <canvas
                  ref={signatureCanvasRef}
                  className="w-full h-full border border-gray-400 bg-white cursor-crosshair" // Classes CSS pour la visibilité et le curseur
                  // Les attributs width et height sont maintenant définis dynamiquement dans useEffect
                  // mais les laisser ici peut servir de fallback initial ou pour la sémantique.
                  width="400"
                  height="160"
                ></canvas>
                {!signatureData && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                    Dessinez votre signature ici
                  </div>
                )}
              </div>
              <div className="flex space-x-4 mt-4">
                <button
                  onClick={clearSignature}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
                >
                  Effacer
                </button>
                <button
                  onClick={saveSignature}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
                >
                  Enregistrer
                </button>
              </div>
            </>
          )}
        </div>

        {/* Informations Générales */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">Informations Générales</h3>
          <p className="text-gray-700 mb-1">
            <span className="font-medium">Mois du rapport :</span> {monthName}
          </p>
          <p className="text-gray-700 mb-1">
            <span className="font-medium">Total jours ouvrés dans le mois :</span>{" "}
            {totalWorkingDays} jours
          </p>
          <p className="text-gray-700 mb-1">
            <span className="font-medium">Total jours d'activités sur jours ouvrés :</span>{" "}
            {totalWorkingDaysActivitiesTime.toFixed(1)} jours
          </p>
          <p className="text-gray-700 mb-1">
            <span className="font-medium">Total jours de congés payés :</span>{" "}
            {totalPaidLeaveDaysInMonth.toFixed(1)} jours
          </p>
          <p className="text-gray-700 mb-1">
            <span className="font-medium">Jours non ouvrés travaillés :</span>{" "}
            {nonWorkingDaysWorked.toFixed(1)} jours
          </p>
          <p className="text-gray-700 mb-1">
            <span className="font-medium">Heures Supplémentaires :</span>{" "}
            {totalOvertimeHours.toFixed(1)} jours
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Écart (Activités - Jours ouvrés) :</span>{" "}
            <span className={parseFloat(timeDifference) < 0 ? "text-red-600" : "text-green-600"}>
              {timeDifference} jours
            </span>
          </p>
        </div>

        {/* Détail des Activités */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50 flex-grow overflow-y-auto">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">Détail des Activités</h3>
          {allDaysWithActivities.length > 0 ? (
            <div className="space-y-4">
              {allDaysWithActivities.map(({ day, activities: dailyActivities, totalDailyTime, isWeekend: isWeekendDay }) => (
                <div key={format(day, "yyyy-MM-dd")} className="border-b border-gray-200 pb-2">
                  <h4 className={`font-semibold text-lg ${isWeekendDay || isPublicHoliday(day) ? "text-gray-500" : "text-gray-800"}`}>
                    {format(day, "EEEE dd MMMM yyyy", { locale: fr })} ({totalDailyTime.toFixed(1)}j)
                    {isWeekendDay && <span className="text-gray-500 ml-2">(Week-end)</span>}
                    {isPublicHoliday(day) && <span className="text-gray-500 ml-2">(Jour Férié)</span>}
                  </h4>
                  {dailyActivities.length > 0 ? (
                    <ul className="list-disc pl-5 text-gray-700">
                      {dailyActivities.map((activity) => {
                        const activityType = getActivityTypeName(activity.type_activite);
                        const clientName = getClientName(activity.client_id);
                        const isPaidLeave = String(activity.type_activite) === String(paidLeaveTypeId);
                        
                        let itemClass = "";
                        if (isPaidLeave) {
                          itemClass = "text-green-700 font-medium";
                        } else if (activityType.toLowerCase().includes("absence")) {
                          itemClass = "text-red-700 font-medium";
                        }

                        return (
                          <li key={activity.id} className={`text-sm ${itemClass}`}>
                            {activityType} ({parseFloat(activity.temps_passe).toFixed(1)}j) - Client: {clientName}
                            {activity.description && ` - "${activity.description}"`}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm italic pl-5">Aucune activité enregistrée pour ce jour.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">Aucune activité enregistrée pour ce mois.</p>
          )}
        </div>

        {/* Bouton de téléchargement PDF */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleDownloadPdf}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200"
          >
            Télécharger le Rapport PDF
          </button>
        </div>
      </div>
    </div>
  );
}
