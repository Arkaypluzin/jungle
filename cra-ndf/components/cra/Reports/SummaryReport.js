// SummaryReport.js
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { format, isValid, parseISO, isWeekend, eachDayOfInterval, isSameMonth, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { useSession } from "next-auth/react";

export default function SummaryReport({
  isOpen,
  onClose,
  month,
  activities,
  activityTypeDefinitions,
  clientDefinitions,
  showMessage,
  userFirstName,
  craReportStatus,
  paidLeaveReportStatus,
  craReport,
  paidLeaveReport,
  publicHolidays,
}) {
  const { data: session, status } = useSession();
  const reportRef = useRef();
  const signatureCanvasRef = useRef(null);
  const signatureCtxRef = useRef(null);
  const [signatureData, setSignatureData] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [isSignatureLoading, setIsSignatureLoading] = useState(true);
  const [hasDownloaded, setHasDownloaded] = useState(false);

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

  const getActivityTypeName = useCallback((activityTypeId) => {
    if (!activityTypeDefinitions || activityTypeDefinitions.length === 0) {
      return "Type Inconnu (définitions manquantes)";
    }
    const type = activityTypeDefinitions.find((t) => String(t.id) === String(activityTypeId));
    return type ? type.name : "Type Inconnu";
  }, [activityTypeDefinitions]);

  const getClientName = useCallback((clientId) => {
    if (!clientDefinitions || clientDefinitions.length === 0) {
      return "Client Inconnu (définitions manquantes)";
    }
    const client = clientDefinitions.find((c) => String(c.id) === String(clientId));
    return client ? client.nom_client : "Client Inconnu";
  }, [clientDefinitions]);

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
    
    const totalWorkingDays = allDaysInMonth.filter(
      (day) => !isWeekend(day, { weekStartsOn: 1 }) && !isPublicHoliday(day)
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
    
    activities.forEach(activity => {
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
    
    return {
      totalWorkingDays,
      totalActivitiesTime,
      totalWorkingDaysActivitiesTime,
      totalPaidLeaveDaysInMonth,
      nonWorkingDaysWorked,
      totalOvertimeHours,
      timeDifference,
    };
  }, [month, activities, isPublicHoliday, activityTypeDefinitions]);

  const {
    totalWorkingDays,
    totalActivitiesTime,
    totalWorkingDaysActivitiesTime,
    totalPaidLeaveDaysInMonth,
    nonWorkingDaysWorked,
    totalOvertimeHours,
    timeDifference,
  } = totals;

  const allDaysWithActivities = useMemo(() => {
    if (!isValid(month)) return [];

    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const activitiesMap = new Map();
    activities.forEach(activity => {
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
            const activityType = activityTypeDefinitions.find(t => String(t.id) === String(activity.type_activite));
            activitiesMap.get(dateKey).push({ ...activity, date_activite: dateObj, is_absence: activityType?.is_absence });
        }
    });

    activitiesMap.forEach(dailyActivities => {
        dailyActivities.sort((a, b) => {
            const dateA = a.date_activite.getTime();
            const dateB = b.date_activite.getTime();
            return dateA - dateB;
        });
    });

    return allDaysInMonth.map(day => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dailyActivities = activitiesMap.get(dateKey) || [];
        const totalDailyTime = dailyActivities.reduce((sum, act) => sum + (parseFloat(act.temps_passe) || 0), 0);
        const isWeekendDay = isWeekend(day, { weekStartsOn: 1 });
        return { day, activities: dailyActivities, totalDailyTime, isWeekend: isWeekendDay };
    });
  }, [activities, month, isPublicHoliday, activityTypeDefinitions]);

  const paidLeaveTypeId = useMemo(() => {
    const type = activityTypeDefinitions.find(t => t.name && t.name.toLowerCase().includes("congé payé"));
    return type ? type.id : null;
  }, [activityTypeDefinitions]);

  const clearSignature = useCallback(async () => {
    if (signatureCanvasRef.current && session?.user?.id) {
      const ctx = signatureCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
      setSignatureData(null);
      try {
        const response = await fetch(`/api/signature?userId=${session.user.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          showMessage("Signature effacée !", "info");
        } else {
          const errorData = await response.json();
          console.error("Failed to delete signature from API:", response.status, errorData.message);
          showMessage("Erreur lors de l'effacement de la signature: " + (errorData.message || response.statusText), "error");
        }
      } catch (error) {
        console.error("Error deleting signature:", error);
        showMessage("Erreur lors de l'effacement de la signature: " + error.message, "error");
      }
    } else {
      showMessage("Impossible d'effacer la signature. Connexion requise.", "error");
    }
  }, [session, showMessage]);

  const saveSignature = useCallback(async () => {
    if (signatureCanvasRef.current && session?.user?.id) {
      const dataURL = signatureCanvasRef.current.toDataURL('image/png');
      setSignatureData(dataURL);
      try {
        const response = await fetch('/api/signature', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // CORRECTION ICI : Ajout de l'ID utilisateur
            userId: session.user.id, 
            image: dataURL
          }),
        });
        if (response.ok) {
          showMessage("Signature enregistrée avec succès !", "success");
        } else {
          const errorData = await response.json();
          console.error("Failed to save signature to API:", response.status, errorData.message);
          showMessage("Erreur lors de l'enregistrement de la signature: " + (errorData.message || response.statusText), "error");
        }
      } catch (error) {
        console.error("Error saving signature:", error);
        showMessage("Erreur lors de l'enregistrement de la signature: " + error.message, "error");
      }
    } else {
      showMessage("Impossible d'enregistrer la signature. Connexion requise.", "error");
    }
  }, [session, showMessage]);

  const handleDownloadPdf = useCallback(async () => {
    if (!isValid(month) || !activities || !clientDefinitions || !activityTypeDefinitions || !publicHolidays) {
      showMessage("Impossible de générer le PDF: Données essentielles manquantes ou invalides.", "error");
      return;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      let yPos = 10;
      const margin = 15;
      const defaultLineHeight = 5;
      const sectionSpacing = 8;
      const itemSpacing = 1;
      const pageHeight = pdf.internal.pageSize.height;
      const pageWidth = pdf.internal.pageSize.width;
      const contentWidth = pageWidth - 2 * margin;
      const activityRectPadding = 2;

      const colors = {
        darkGray: [31, 41, 55],
        mediumGray: [75, 85, 99],
        textGray: [51, 51, 51],
        lightGrayBackground: [243, 244, 246],
        validatedGreen: [22, 101, 52],
        pendingYellow: [156, 101, 0],
        rejectedRed: [153, 27, 27],
        weekendDayBg: [249, 250, 251],
        holidayDayBg: [230, 230, 230],
        absenceRedBg: [254, 226, 226],
        absenceRedText: [153, 27, 27],
        regularActivityGreenBg: [220, 252, 231],
        regularActivityGreenText: [22, 101, 52],
      };

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(...colors.darkGray);
      pdf.text(`Rapport de Synthèse - ${monthName} (${userFirstName})`, pageWidth / 2, yPos, { align: 'center' });
      yPos += defaultLineHeight * 2;

      pdf.setFontSize(12);
      pdf.setTextColor(...colors.regularActivityGreenText);
      pdf.text("Informations Générales", margin, yPos);
      yPos += defaultLineHeight;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...colors.textGray);
      pdf.text(`Mois du rapport : ${monthName}`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Total jours ouvrés dans le mois : ${totalWorkingDays} jours`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Total jours activités sur jours ouvrés : ${totalWorkingDaysActivitiesTime.toFixed(1)} jours`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Total jours de congés payés : ${totalPaidLeaveDaysInMonth.toFixed(1)} jours`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Jours non ouvrés travaillés : ${nonWorkingDaysWorked.toFixed(1)} jours`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Heures Supplémentaires : ${totalOvertimeHours.toFixed(1)} jours`, margin + 5, yPos);
      yPos += defaultLineHeight;
      pdf.text(`Écart (Activités - Jours ouvrés) : ${timeDifference} jours`, margin + 5, yPos);
      yPos += sectionSpacing;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(...colors.regularActivityGreenText);
      pdf.text("Statuts des rapports :", margin, yPos);
      yPos += defaultLineHeight;

      const statutLabelX = margin + 5;
      const statutValueX = statutLabelX + 50;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...colors.textGray);

      let craStatusText = craReportStatus === "pending_review" ? "En attente" : craReportStatus === "validated" ? "Validé" : craReportStatus === "rejected" ? "Rejeté" : "Brouillon";
      let craStatusColor = craReportStatus === "pending_review" ? colors.pendingYellow : craReportStatus === "validated" ? colors.validatedGreen : craReportStatus === "rejected" ? colors.rejectedRed : colors.mediumGray;
      
      pdf.text(`Statut CRA : `, statutLabelX, yPos);
      pdf.setTextColor(...craStatusColor);
      pdf.text(craStatusText, statutValueX, yPos);
      pdf.setTextColor(...colors.textGray);
      if (craReportStatus === "rejected" && craReport?.rejection_reason) {
        yPos += defaultLineHeight;
        pdf.text(`  (Raison : ${craReport.rejection_reason})`, statutLabelX, yPos);
      }
      yPos += defaultLineHeight;

      let paidLeaveStatusText = paidLeaveReportStatus === "pending_review" ? "En attente" : paidLeaveReportStatus === "validated" ? "Validé" : paidLeaveReportStatus === "rejected" ? "Rejeté" : "Brouillon";
      let paidLeaveStatusColor = paidLeaveReportStatus === "pending_review" ? colors.pendingYellow : paidLeaveReportStatus === "validated" ? colors.validatedGreen : paidLeaveReportStatus === "rejected" ? colors.rejectedRed : colors.mediumGray;
      
      pdf.text(`Statut Congés Payés : `, statutLabelX, yPos);
      pdf.setTextColor(...paidLeaveStatusColor);
      pdf.text(paidLeaveStatusText, statutValueX, yPos);
      pdf.setTextColor(...colors.textGray);
      if (paidLeaveReportStatus === "rejected" && paidLeaveReport?.rejection_reason) {
        yPos += defaultLineHeight;
        pdf.text(`  (Raison : ${paidLeaveReport.rejection_reason})`, statutLabelX, yPos);
      }
      yPos += sectionSpacing;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(...colors.regularActivityGreenText);
      pdf.text("Détail des Activités", margin, yPos);
      yPos += defaultLineHeight;

      if (allDaysWithActivities.length > 0) {
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
          if (groupIndex > 0) {
            yPos += sectionSpacing / 2;
          }

          const startDay = format(group[0].day, 'd', { locale: fr });
          const endDay = format(group[group.length - 1].day, 'd', { locale: fr });
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(...colors.mediumGray);
          pdf.text(`Jours ${startDay} - ${endDay} :`, margin, yPos);
          yPos += defaultLineHeight;

          group.forEach(({ day, activities: dailyActivities, totalDailyTime, isWeekend: isWeekendDay }) => {
            const dayHeaderHeight = defaultLineHeight;
            let estimatedActivitiesContentHeight = 0;

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
              const textWidthForRect = contentWidth - (2 * activityRectPadding);
              const splitText = pdf.splitTextToSize(activityTextContent, textWidthForRect);
              estimatedActivitiesContentHeight += (splitText.length * defaultLineHeight) + itemSpacing + activityRectPadding;
            });

            if (dailyActivities.length === 0) {
              estimatedActivitiesContentHeight += defaultLineHeight + (2 * activityRectPadding) + itemSpacing;
            }

            const totalHeightNeededForDayBlock = dayHeaderHeight + estimatedActivitiesContentHeight + itemSpacing;

            if (yPos + totalHeightNeededForDayBlock > pageHeight - margin) {
              pdf.addPage();
              yPos = margin;
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(12);
              pdf.setTextColor(...colors.darkGray);
              pdf.text("Détail des Activités (suite)", margin, yPos);
              yPos += defaultLineHeight;
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(11);
              pdf.setTextColor(...colors.mediumGray);
              pdf.text(`Jours ${startDay} - ${endDay} (suite) :`, margin, yPos);
              yPos += defaultLineHeight;
            }

            let dayBgColor = null;
            if (isWeekendDay) {
                dayBgColor = colors.weekendDayBg;
            } else if (isPublicHoliday(day)) {
                dayBgColor = colors.holidayDayBg;
            }

            if (dayBgColor) {
                pdf.setFillColor(...dayBgColor);
                pdf.rect(margin, yPos - defaultLineHeight + itemSpacing, contentWidth, dayHeaderHeight + estimatedActivitiesContentHeight, 'F');
            }

            pdf.setFontSize(10);
            pdf.setTextColor(...colors.darkGray);
            let dayText = `${format(day, "EEEE dd MMMM yyyy", { locale: fr })} (${totalDailyTime.toFixed(1)}j)`;
            if (isWeekendDay) dayText += " (Week-end)";
            if (isPublicHoliday(day)) dayText += " (Jour Férié)";
            pdf.text(dayText, margin + 5, yPos);
            yPos += defaultLineHeight;

            if (dailyActivities.length > 0) {
              dailyActivities.forEach((activity) => {
                const clientName = getClientName(activity.client_id);
                const activityTypeName = getActivityTypeName(activity.type_activite);

                let rectFillColor = colors.regularActivityGreenBg;
                let textColor = colors.regularActivityGreenText;
                if (activity.is_absence) {
                    rectFillColor = colors.absenceRedBg;
                    textColor = colors.absenceRedText;
                }

                let activityLine = `${activityTypeName} (${parseFloat(activity.temps_passe).toFixed(1)}j)`;
                if (clientName !== "Client Inconnu") {
                  activityLine += ` - Client: ${clientName}`;
                }
                if (activity.description) {
                  activityLine += ` - "${activity.description}"`;
                }

                const textX = margin + 5 + activityRectPadding;
                const rectX = margin + 5;
                const rectWidth = contentWidth - 5;
                const textMaxWidth = rectWidth - (2 * activityRectPadding);

                const splitText = pdf.splitTextToSize(activityLine, textMaxWidth);
                const actualTextHeight = splitText.length * defaultLineHeight;
                const rectHeight = actualTextHeight + (2 * activityRectPadding);

                pdf.setFillColor(...rectFillColor);
                pdf.rect(rectX, yPos - itemSpacing, rectWidth, rectHeight, 'F');

                pdf.setTextColor(...textColor);
                pdf.text(splitText, textX, yPos + activityRectPadding);
                yPos += rectHeight + itemSpacing;
              });
            } else {
              const rectX = margin + 5;
              const rectWidth = contentWidth - 5;
              const rectHeight = defaultLineHeight + (2 * activityRectPadding);

              pdf.setFillColor(...colors.lightGrayBackground);
              pdf.rect(rectX, yPos - itemSpacing, rectWidth, rectHeight, 'F');

              pdf.setTextColor(...colors.mediumGray);
              pdf.text("Aucune activité enregistrée", margin + 5 + activityRectPadding, yPos + activityRectPadding);
              yPos += rectHeight + itemSpacing;
            }
            yPos += itemSpacing;
          });
          yPos += sectionSpacing / 2;
        });
      }
      else {
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.mediumGray);
        pdf.text("Aucune activité enregistrée pour ce mois.", margin + 5, yPos);
        yPos += defaultLineHeight;
      }

      const commonSignatureY = pageHeight - margin - 50; 
      const signatureLineWidth = 60;
      const dateLineWidth = 40;
      const spaceBetweenLines = 10;
      const signatureClientX = margin;
      const signatureUserX = pageWidth - margin - signatureLineWidth;

      if (signatureData) {
        let signatureHeight = 40;
        let signatureUserY = commonSignatureY - signatureHeight;
        let signatureLineY = commonSignatureY;
        
        if (signatureUserY < yPos + sectionSpacing) {
          pdf.addPage();
          yPos = margin;
          signatureUserY = pageHeight - margin - signatureHeight;
          signatureLineY = pageHeight - margin; 
        }

        pdf.addImage(signatureData, 'PNG', signatureUserX, signatureUserY, signatureLineWidth, signatureHeight);
        pdf.line(signatureUserX, signatureLineY, signatureUserX + signatureLineWidth, signatureLineY);

        const currentDate = format(new Date(), "dd/MM/yyyy", { locale: fr });
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.textGray);
        pdf.text(currentDate, signatureUserX + signatureLineWidth / 2, signatureLineY + 5, { align: 'center' });
        pdf.text(`Signature de ${userFirstName}`, signatureUserX + signatureLineWidth / 2, signatureLineY + 10, { align: 'center' });
      }

      const lineY = commonSignatureY;
      const textY = lineY + 5;
      const dateTextY = textY + 5;

      pdf.setFontSize(10);
      pdf.setTextColor(...colors.textGray);

      pdf.line(signatureClientX, lineY, signatureClientX + signatureLineWidth, lineY);
      pdf.text("Nom du Client:", signatureClientX + signatureLineWidth / 2, textY, { align: 'center' });

      pdf.line(signatureClientX + signatureLineWidth + spaceBetweenLines, lineY, signatureClientX + signatureLineWidth + spaceBetweenLines + dateLineWidth, lineY);
      pdf.text("Date", signatureClientX + signatureLineWidth + spaceBetweenLines + dateLineWidth / 2, textY, { align: 'center' });


      const monthYear = format(month, "MMMM_yyyy", { locale: fr });
      pdf.save(`Rapport_CRA_${userFirstName}_${monthYear}.pdf`);
      
      setHasDownloaded(true);
      
      showMessage("PDF généré avec succès !", "success");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      showMessage("Erreur lors de la génération du PDF: " + error.message, "error");
    }
  }, [activities, activityTypeDefinitions, clientDefinitions, month, monthName, userFirstName, showMessage, getClientName, getActivityTypeName, isPublicHoliday, craReportStatus, craReport, paidLeaveReportStatus, paidLeaveReport, totalWorkingDays, totalActivitiesTime, totalWorkingDaysActivitiesTime, totalPaidLeaveDaysInMonth, nonWorkingDaysWorked, totalOvertimeHours, timeDifference, allDaysWithActivities, signatureData, publicHolidays]);

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

  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    // Reset drawing state
    isDrawingRef.current = false;
    setIsDrawing(false);

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext('2d');
    signatureCtxRef.current = ctx;
    if (!ctx) return;

    // Set drawing properties
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';

    let lastX = 0;
    let lastY = 0;

    const getCoords = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDrawing = (e) => {
      if (isSignatureLoading || isDrawingRef.current) return;
      isDrawingRef.current = true;
      setIsDrawing(true);
      const { x, y } = getCoords(e);
      lastX = x;
      lastY = y;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
    };

    const draw = (e) => {
      if (!isDrawingRef.current || !signatureCtxRef.current) return;
      const { x, y } = getCoords(e);
      signatureCtxRef.current.lineTo(x, y);
      signatureCtxRef.current.stroke();
      lastX = x;
      lastY = y;
    };

    const stopDrawing = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      setIsDrawing(false);
      if (signatureCtxRef.current) signatureCtxRef.current.closePath();
      if (signatureCanvasRef.current) {
        setSignatureData(signatureCanvasRef.current.toDataURL('image/png'));
      }
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startDrawing(e);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      draw(e);
    }, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);

      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
      canvas.removeEventListener('touchcancel', stopDrawing);
    };
  }, [isSignatureLoading]);


  useEffect(() => {
    const loadSignatureFromApi = async () => {
      setIsSignatureLoading(true);

      if (status !== 'authenticated' || !session?.user?.id || !signatureCanvasRef.current) {
        setIsSignatureLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/signature?userId=${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          const signatureImage = data.image || null;
          setSignatureData(signatureImage);

          if (signatureImage) {
            const img = new Image();
            img.onload = () => {
              const ctx = signatureCanvasRef.current.getContext('2d');
              ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
              ctx.drawImage(img, 0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
            };
            img.src = signatureImage;
          }
          
        } else {
          console.error("Failed to load signature from API:", response.status, response.statusText);
          setSignatureData(null);
        }
      } catch (error) {
        console.error("Error fetching signature:", error);
        showMessage("Erreur lors du chargement de la signature: " + error.message, "error");
        setSignatureData(null);
      } finally {
        setIsSignatureLoading(false);
      }
    };

    if (isOpen) {
      loadSignatureFromApi();
    } else {
      setSignatureData(null);
      setIsSignatureLoading(true);
      setHasDownloaded(false);
    }
  }, [isOpen, session, status, showMessage]);

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
            Erreur: Impossible d afficher le rapport mensuel car des données essentielles sont manquantes ou invalides.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl relative overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Rapport Mensuel des Activités
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Rapport pour {userFirstName} - {monthName}
        </p>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-inner">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Informations Générales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-800">
            <p>
              <span className="font-medium">Mois du rapport :</span> {monthName}
            </p>
            <p>
              <span className="font-medium">Total jours ouvrés dans le mois :</span>{" "}
              {totalWorkingDays} jours
            </p>
            <p>
              <span className="font-medium">Total jours des activités sur jours ouvrés :</span>{" "}
              {totalWorkingDaysActivitiesTime.toFixed(1)} jours
            </p>
            <p>
              <span className="font-medium">Total jours de congés payés :</span>{" "}
              {totalPaidLeaveDaysInMonth.toFixed(1)} jours
            </p>
            <p>
              <span className="font-medium">Jours non ouvrés travaillés :</span>{" "}
              {nonWorkingDaysWorked.toFixed(1)} jours
            </p>
            <p>
              <span className="font-medium">Heures Supplémentaires :</span>{" "}
              {totalOvertimeHours.toFixed(1)} jours
            </p>
            <p>
              <span className="font-medium">Écart (Activités - Jours ouvrés) :</span>{" "}
              {timeDifference} jours
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-md font-semibold text-gray-700 mb-2">Statuts des rapports :</h4>
            <p>
              <span className="font-medium">Statut CRA :</span>{" "}
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  craReportStatus === "pending_review"
                    ? "bg-yellow-100 text-yellow-800"
                    : craReportStatus === "validated"
                    ? "bg-green-100 text-green-800"
                    : craReportStatus === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {craReportStatus === "pending_review"
                  ? "En attente"
                  : craReportStatus === "validated"
                  ? "Validé"
                  : craReportStatus === "rejected"
                  ? "Rejeté"
                  : "Brouillon"}
              </span>
              {craReportStatus === "rejected" && craReport?.rejection_reason && (
                <span className="text-xs text-red-700 ml-2">
                  (Raison : {craReport.rejection_reason})
                </span>
              )}
            </p>
            <p className="mt-2">
              <span className="font-medium">Statut Congés Payés :</span>{" "}
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  paidLeaveReportStatus === "pending_review"
                    ? "bg-yellow-100 text-yellow-800"
                    : paidLeaveReportStatus === "validated"
                    ? "bg-green-100 text-green-800"
                    : paidLeaveReportStatus === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {paidLeaveReportStatus === "pending_review"
                  ? "En attente"
                  : paidLeaveReportStatus === "validated"
                  ? "Validé"
                  : paidLeaveReportStatus === "rejected"
                  ? "Rejeté"
                  : "Brouillon"}
              </span>
              {paidLeaveReportStatus === "rejected" && paidLeaveReport?.rejection_reason && (
                <span className="text-xs text-red-700 ml-2">
                  (Raison : {paidLeaveReport.rejection_reason})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-inner">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Détail des Activités
          </h3>
          <div className="space-y-3">
            {allDaysWithActivities.length > 0 ? (
              allDaysWithActivities.map(({ day, activities: dailyActivities, totalDailyTime, isWeekend: isWeekendDay }) => (
                <div
                  key={format(day, "yyyy-MM-dd")}
                  className={`border-b border-gray-200 pb-2 last:border-b-0 ${
                    isWeekendDay || isPublicHoliday(day) ? 'bg-gray-100 p-2 rounded-md' : ''
                  }`}
                >
                  <p className="font-semibold text-gray-800 text-sm mb-1">
                    {format(day, "EEEE dd MMMM yyyy", { locale: fr })} ({totalDailyTime.toFixed(1)}j)
                    {isWeekendDay && <span className="text-gray-500 ml-2">(Week-end)</span>}
                    {isPublicHoliday(day) && <span className="text-gray-500 ml-2">(Jour Férié)</span>}
                  </p>
                  <div className="pl-4 space-y-1">
                    {dailyActivities.length > 0 ? (
                      dailyActivities.map((activity) => (
                        <p
                          key={activity.id}
                          className={`text-sm rounded-md p-1 ${
                            activity.is_absence
                              ? 'bg-red-50 text-red-800'
                              : 'bg-green-50 text-green-800'
                          }`}
                        >
                          - {getActivityTypeName(activity.type_activite)} (
                          {parseFloat(activity.temps_passe).toFixed(1)}j){" "}
                          {activity.client_id &&
                            `- Client: ${getClientName(activity.client_id)}`}
                          {activity.description &&
                            ` - "${activity.description}"`}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        Aucune activité enregistrée
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-center py-4">
                Aucune activité enregistrée pour ce mois.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center mt-6">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">Signature:</h4>
          <div className="relative w-full max-w-sm border border-gray-300 rounded-md overflow-hidden bg-white" style={{ height: '150px' }}>
            {isSignatureLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                <p className="text-gray-500">Chargement de la signature...</p>
              </div>
            )}
            <canvas
              ref={signatureCanvasRef}
              className="w-full h-full"
            ></canvas>
            {signatureData && !isDrawing && !isSignatureLoading && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                Signature chargée. Dessinez pour effacer.
              </div>
            )}
          </div>
          <div className="flex flex-col items-center mt-2">
            <div className="w-40 h-px bg-gray-400"></div>
            <p className="text-xs text-gray-500 mt-1">Signature de {userFirstName}</p>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={clearSignature}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 text-sm"
            >
              Effacer
            </button>
            <button
              onClick={saveSignature}
              // Désactiver le bouton si aucune signature n'est présente sur le canvas
              disabled={!signatureData}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enregistrer
            </button>
          </div>
        </div>
        
        {hasDownloaded && (
          <div className="flex flex-col items-center mt-8 pt-8 border-t border-gray-200">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Signature du Client:</h4>
            <div className="flex justify-center w-full gap-8">
              <div className="flex flex-col items-center">
                <div className="w-40 h-px bg-gray-400"></div>
                <p className="text-xs text-gray-500 mt-1">Nom du Client</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-24 h-px bg-gray-400"></div>
                <p className="text-xs text-gray-500 mt-1">Date</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
          >
            Fermer
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Télécharger le PDF
          </button>
        </div>
      </div>
    </div>
  );
}