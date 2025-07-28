// components/CraBoard.js
"use client"; // Assurez-vous que c'est bien présent

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isWeekend,
  isValid,
  eachDayOfInterval,
  isBefore,
  isToday,
  startOfDay,
  endOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";

// Import sub-components
import CraCalendar from "./cra/CraCalendar";
import CraControls from "./cra/CraControls";
import CraSummary from "./cra/CraSummary";
import ActivityModal from "./ActivityModal";
import MonthlyReportPreviewModal from "./MonthlyReportPreviewModal";
import SummaryReport from "./SummaryReport";

export default function CraBoard({
  activities = [],
  activityTypeDefinitions = [],
  clientDefinitions = [],
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  fetchActivitiesForMonth,
  userId,
  userFirstName,
  showMessage,
  currentMonth: propCurrentMonth,
  onMonthChange,
  readOnly = false, // Cette prop est la lecture seule globale du composant parent
  monthlyReports = [],
  rejectionReason = null, // Cette prop est maintenant utilisée directement pour le bandeau RO
  onSendMonthlyReport,
}) {
  console.log("[CraBoard] --- Rendu du composant CraBoard (Début) ---");
  console.log(
    "[CraBoard] Props reçues: activités.longueur:",
    activities.length,
    "ID utilisateur:",
    userId,
    "Mois actuel:",
    isValid(propCurrentMonth)
      ? format(propCurrentMonth, "yyyy-MM-dd")
      : "Date invalide",
    "Lecture seule (globale):",
    readOnly
  );
  console.log(
    "[CraBoard] Rapports mensuels reçus (prop monthlyReports):",
    monthlyReports
  );
  console.log("[CraBoard] Prop rejectionReason (directe):", rejectionReason);

  // --- 1. Déclarations d'état et de références (useState, useRef) ---
  const [currentMonth, setCurrentMonth] = useState(
    propCurrentMonth && isValid(propCurrentMonth)
      ? startOfMonth(propCurrentMonth)
      : startOfMonth(new Date())
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingActivity, setEditingActivity] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSelectedDays, setTempSelectedDays] = useState([]);

  const [publicHolidays, setPublicHolidays] = useState([]);

  const [isDeletingActivityFlag, setIsDeletingActivityFlag] = useState(false);
  const deletionTimeoutRef = useRef(null);

  const [activityToDelete, setActivityToDelete] = useState(null);

  const [showSummaryReport, setShowSummaryReport] = useState(false);
  const [summaryReportMonth, setSummaryReportMonth] = useState(null);
  const [showMonthlyReportPreview, setShowMonthlyReportPreview] =
    useState(false);
  const [monthlyReportPreviewData, setMonthlyReportPreviewData] =
    useState(null);

  const [draggedActivity, setDraggedActivity] = useState(null);
  const [isDraggingActivity, setIsDraggingActivity] = useState(false);
  const [isValidDropTarget, setIsValidDropTarget] = useState(false);

  const [isDraggingMultiSelect, setIsDraggingMultiSelect] = useState(false);
  const [dragStartDayForSelection, setDragStartDayForSelection] =
    useState(null);

  const [multiSelectType, setMultiSelectType] = useState("activity");

  // NOUVEAU: État pour gérer le verrouillage de la sélection de jour unique
  const [isSingleDaySelectionLocked, setIsSingleDaySelectionLocked] =
    useState(false);

  const craBoardRef = useRef(null);
  // NOUVEAU REF: Pour suivre si le bouton de la souris est enfoncé sur un jour du calendrier
  const isMouseDownOnCalendarDayRef = useRef(false);
  // NOUVEAU REF: Pour stocker les coordonnées du clic initial pour la détection de drag
  const mouseDownCoordsRef = useRef({ x: 0, y: 0 });
  // Seuil en pixels pour détecter un drag (vs un simple clic)
  const DRAG_THRESHOLD = 5;

  // Utilise la prop showMessage si fournie, sinon logue simplement
  const localShowMessage =
    showMessage ||
    ((msg, type) => console.log(`[Message ${type.toUpperCase()}]: ${msg}`));

  // --- 2. Fonctions useCallback de base (dépendances minimales) ---

  const paidLeaveTypeId = useMemo(() => {
    const type = activityTypeDefinitions.find(
      (t) => t.name && t.name.toLowerCase().includes("congé payé")
    );
    return type ? type.id : null;
  }, [activityTypeDefinitions]);

  const fetchPublicHolidays = useCallback(
    async (year) => {
      try {
        const response = await fetch(`/api/public_holidays?year=${year}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Échec de la récupération des jours fériés."
          );
        }
        const data = await response.json();
        setPublicHolidays(
          data.map((holiday) => startOfDay(new Date(holiday.date)))
        );
      } catch (err) {
        console.error(
          "CraBoard: Erreur lors de la récupération des jours fériés:",
          err
        );
        localShowMessage(
          `Impossible de charger les jours fériés : ${err.message}. Veuillez réessayer.`,
          "error"
        );
        setPublicHolidays([]);
      }
    },
    [localShowMessage]
  );

  const isPublicHoliday = useCallback(
    (date) => {
      if (!isValid(date)) return false;
      const formattedDate = format(date, "yyyy-MM-dd");
      return publicHolidays.some(
        (holidayDate) => format(holidayDate, "yyyy-MM-dd") === formattedDate
      );
    },
    [publicHolidays]
  );

  const isNonWorkingDay = useCallback(
    (date) => {
      return isWeekend(date, { weekStartsOn: 1 }) || isPublicHoliday(date);
    },
    [isPublicHoliday]
  );

  const handleCloseActivityModal = useCallback(() => {
    console.log(
      "[CraBoard - DEBUG] handleCloseActivityModal: Réinitialisation du formulaire d'activité."
    );
    setIsModalOpen(false);
    setEditingActivity(null);
    setSelectedDate(new Date());
    setTempSelectedDays([]); // <-- C'est ici que tempSelectedDays est réinitialisé après la fermeture de la modale
    // NOUVEAU: Réinitialiser le verrouillage de la sélection de jour unique
    setIsSingleDaySelectionLocked(false);
  }, []);

  // --- Valeurs mémorisées (useMemo) ---
  const activitiesForCurrentMonth = useMemo(() => {
    return activities.filter((activity) => {
      const isUserMatch = String(activity.user_id) === String(userId);
      const isDateValid =
        activity.date_activite && isValid(new Date(activity.date_activite));
      const isMonthMatch =
        isDateValid &&
        isValid(currentMonth) &&
        isSameMonth(new Date(activity.date_activite), currentMonth);
      return isUserMatch && isDateValid && isMonthMatch;
    });
  }, [activities, currentMonth, userId]);

  const activitiesByDay = useMemo(() => {
    const activitiesMap = new Map();
    activitiesForCurrentMonth.forEach((activity) => {
      if (activity.date_activite && isValid(new Date(activity.date_activite))) {
        const dateKey = format(new Date(activity.date_activite), "yyyy-MM-dd");
        if (!activitiesMap.has(dateKey)) {
          activitiesMap.set(dateKey, []);
        }
        activitiesMap.get(dateKey).push(activity);
      }
    });
    return activitiesMap;
  }, [activitiesForCurrentMonth]);

  const { craReport, paidLeaveReport } = useMemo(() => {
    console.log(
      "[CraBoard - useMemo] Calcul des rapports craReport/paidLeaveReport..."
    );
    console.log("[CraBoard - useMemo] monthlyReports:", monthlyReports);
    console.log("[CraBoard - useMemo] userId:", userId);
    console.log("[CraBoard - useMemo] currentMonth:", currentMonth);

    // Si en mode lecture seule et un seul rapport est fourni (comme dans la modal ReceivedCras)
    if (readOnly && monthlyReports.length === 1) {
      const singleReport = monthlyReports[0];
      console.log(
        "[CraBoard - useMemo] Mode lecture seule avec un seul rapport:",
        singleReport
      );

      if (singleReport.report_type === "cra") {
        return { craReport: singleReport, paidLeaveReport: null };
      } else if (singleReport.report_type === "paid_leave") {
        return { craReport: null, paidLeaveReport: singleReport };
      }
    }

    // Logique standard pour le mode non-lecture seule ou plusieurs rapports
    const currentMonthCraReport = monthlyReports.find(
      (report) =>
        String(report.user_id) === String(userId) &&
        report.month ===
          (isValid(currentMonth) ? currentMonth.getMonth() + 1 : -1) &&
        report.year ===
          (isValid(currentMonth) ? currentMonth.getFullYear() : -1) &&
        report.report_type === "cra"
    );
    const currentMonthPaidLeaveReport = monthlyReports.find(
      (report) =>
        String(report.user_id) === String(userId) &&
        report.month ===
          (isValid(currentMonth) ? currentMonth.getMonth() + 1 : -1) &&
        report.year ===
          (isValid(currentMonth) ? currentMonth.getFullYear() : -1) &&
        report.report_type === "paid_leave"
    );

    console.log(
      "[CraBoard - useMemo] craReport trouvé (mode standard):",
      currentMonthCraReport
    );
    console.log(
      "[CraBoard - useMemo] paidLeaveReport trouvé (mode standard):",
      currentMonthPaidLeaveReport
    );

    return {
      craReport: currentMonthCraReport,
      paidLeaveReport: currentMonthPaidLeaveReport,
    };
  }, [monthlyReports, userId, currentMonth, readOnly]); // Dépendances inchangées

  const craReportStatus = craReport ? craReport.status : "empty";
  const paidLeaveReportStatus = paidLeaveReport
    ? paidLeaveReport.status
    : "empty";

  // Déterminer le statut global du rapport pour les bandeaux
  const overallReportStatus = useMemo(() => {
    if (
      craReportStatus === "validated" ||
      paidLeaveReportStatus === "validated"
    )
      return "validated";
    if (
      craReportStatus === "pending_review" ||
      paidLeaveReportStatus === "pending_review"
    )
      return "pending";
    if (craReportStatus === "rejected" || paidLeaveReportStatus === "rejected")
      return "refused";
    return "empty";
  }, [craReportStatus, paidLeaveReportStatus]);

  const overallRejectionReason = useMemo(() => {
    if (
      craReportStatus === "rejected" &&
      craReport &&
      craReport.rejection_reason
    )
      return craReport.rejection_reason;
    if (
      paidLeaveReportStatus === "rejected" &&
      paidLeaveReport &&
      paidLeaveReport.rejection_reason
    )
      return paidLeaveReport.rejection_reason;
    return null;
  }, [craReportStatus, paidLeaveReportStatus, craReport, paidLeaveReport]);

  // Déterminer si les activités CRA sont éditables
  const isCraEditable = useMemo(() => {
    // CRA est éditable si:
    // 1. La prop globale 'readOnly' est false
    // 2. Le statut du rapport CRA est 'empty', 'draft', ou 'rejected'
    return (
      !readOnly && ["empty", "draft", "rejected"].includes(craReportStatus)
    );
  }, [craReportStatus, readOnly]);

  // Déterminer si les activités de congés payés sont éditables
  const isPaidLeaveEditable = useMemo(() => {
    // Congé Payé est éditable si:
    // 1. La prop globale 'readOnly' est false
    // 2. Le statut du rapport de Congé Payé est 'empty', 'draft', ou 'rejected'
    return (
      !readOnly &&
      ["empty", "draft", "rejected"].includes(paidLeaveReportStatus)
    );
  }, [paidLeaveReportStatus, readOnly]);

  const isAnyReportEditable = useMemo(() => {
    return isCraEditable || isPaidLeaveEditable;
  }, [isCraEditable, isPaidLeaveEditable]);

  console.log("[CraBoard] Calculated isCraEditable:", isCraEditable);
  console.log(
    "[CraBoard] Calculated isPaidLeaveEditable:",
    isPaidLeaveEditable
  );
  console.log("[CraBoard] Global readOnly prop:", readOnly);
  console.log("[CraBoard] Current Report Status (CRA):", craReportStatus);
  console.log(
    "[CraBoard] Current Report Status (Paid Leave):",
    paidLeaveReportStatus
  );

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const startDisplay = startOfWeek(start, { weekStartsOn: 1 });
    const endDisplay = endOfWeek(end, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDisplay, end: endDisplay });
  }, [currentMonth]);

  /**
   * Gère la sauvegarde d'une activité (ajout ou mise à jour).
   * Appelée depuis ActivityModal.
   * @param {Object} activityData - Les données de la nouvelle activité.
   */
  const handleSaveActivity = useCallback(
    async (activityData) => {
      if (readOnly) {
        // Vérifie la prop globale readOnly en premier
        localShowMessage(
          "Opération de sauvegarde désactivée en mode lecture seule. Vos modifications ne seront pas enregistrées.",
          "info"
        );
        return;
      }

      const isCRAActivity =
        String(activityData.type_activite) !== String(paidLeaveTypeId);
      const isPaidLeaveActivity =
        String(activityData.type_activite) === String(paidLeaveTypeId);

      // Vérifier l'éditabilité spécifique au type d'activité
      if (isCRAActivity && !isCraEditable) {
        localShowMessage(
          "Impossible de sauvegarder cette activité. Le rapport CRA est verrouillé.",
          "info"
        );
        return;
      }
      if (isPaidLeaveActivity && !isPaidLeaveEditable) {
        localShowMessage(
          "Impossible de sauvegarder cette activité. Le rapport de congés payés est verrouillé.",
          "info"
        );
        return;
      }

      try {
        const payload = {
          ...activityData,
          user_id: userId,
          status: activityData.id ? activityData.status : "draft",
        };
        payload.temps_passe = parseFloat(payload.temps_passe);

        if (activityData.id) {
          // Si activityData a un ID, c'est une mise à jour
          const originalActivity = activities.find(
            (a) => String(a.id) === String(activityData.id)
          );
          if (!originalActivity) {
            localShowMessage(
              "Activité originale non trouvée pour la mise à jour. Veuillez rafraîchir la page.",
              "error"
            );
            return;
          }

          const targetDate = new Date(payload.date_activite);
          const targetDateKey = format(targetDate, "yyyy-MM-dd");

          const activitiesOnTargetDay =
            activitiesByDay.get(targetDateKey) || [];
          const totalTimeExcludingEdited = activitiesOnTargetDay
            .filter((a) => String(a.id) !== String(originalActivity.id))
            .reduce((sum, act) => sum + (parseFloat(act.temps_passe) || 0), 0);

          const newTotalTimeForDay =
            totalTimeExcludingEdited + payload.temps_passe;

          if (newTotalTimeForDay > 1) {
            localShowMessage(
              `La mise à jour de cette activité à ${
                payload.temps_passe
              }j dépasserait la limite de 1 jour pour le ${format(
                targetDate,
                "dd/MM/yyyy"
              )}. Total actuel : ${totalTimeExcludingEdited.toFixed(1)}j.`,
              "error"
            );
            return;
          }

          await onUpdateActivity(activityData.id, payload);
          localShowMessage("Activité sauvegardée avec succès !", "success");
        } else {
          // C'est une nouvelle activité
          const daysToProcess =
            tempSelectedDays.length > 0
              ? tempSelectedDays
              : selectedDate
              ? [selectedDate]
              : [];

          if (daysToProcess.length === 0) {
            console.error(
              "Aucun jour sélectionné pour la création d'activité."
            );
            localShowMessage(
              "Aucun jour sélectionné pour la création d'activité. Veuillez sélectionner au moins un jour.",
              "error"
            );
            return;
          }

          let successCount = 0;
          let errorCount = 0;

          for (const day of daysToProcess) {
            const dayKey = format(day, "yyyy-MM-dd");
            const existingActivitiesOnDay = activitiesByDay.get(dayKey) || [];
            const existingTimeOnDay = existingActivitiesOnDay.reduce(
              (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
              0
            );
            const newTotalTimeForDay = existingTimeOnDay + payload.temps_passe;

            if (newTotalTimeForDay > 1) {
              localShowMessage(
                `L'ajout de ${payload.temps_passe}j au ${format(
                  day,
                  "dd/MM/yyyy"
                )} dépasserait la limite de 1 jour pour cette date. Total actuel : ${existingTimeOnDay.toFixed(
                  1
                )}j.`,
                "error"
              );
              errorCount++;
              continue;
            }

            if (
              isNonWorkingDay(day) &&
              !isPaidLeaveActivity &&
              !activityData.override_non_working_day
            ) {
              console.warn(
                `Tentative d'ajout d'activité normale un jour non ouvrable (multi-sélection): ${format(
                  day,
                  "yyyy-MM-dd"
                )}. Ignoré.`
              );
              errorCount++;
              continue;
            }
            const newActivityPayload = {
              ...payload,
              date_activite: format(day, "yyyy-MM-dd"),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            try {
              await onAddActivity(newActivityPayload);
              successCount++;
            } catch (error) {
              console.error(
                `Erreur lors de l'ajout de l'activité pour le jour ${format(
                  day,
                  "yyyy-MM-dd"
                )}:`,
                error
              );
              errorCount++;
            }
          }
          if (successCount > 0) {
            localShowMessage(
              `Ajout de ${successCount} activités réussi ! ${
                errorCount > 0
                  ? `(${errorCount} échecs sur jours non ouvrés ou autres)`
                  : ""
              }`,
              errorCount > 0 ? "warning" : "success"
            );
          } else if (errorCount > 0) {
            localShowMessage(
              "Échec de l'ajout de toutes les activités sélectionnées. Veuillez vérifier les jours non ouvrés ou les limites de temps.",
              "error"
            );
          }
        }
      } catch (error) {
        console.error(
          "CraBoard: Erreur lors de la sauvegarde de l'activité:",
          error
        );
        localShowMessage(
          `Échec de la sauvegarde : ${error.message}. Veuillez réessayer.`,
          "error"
        );
      } finally {
        handleCloseActivityModal();
        if (!readOnly && fetchActivitiesForMonth) {
          // Utilise la prop globale readOnly ici
          fetchActivitiesForMonth(currentMonth);
        }
      }
    },
    [
      onAddActivity,
      onUpdateActivity,
      localShowMessage,
      userId,
      readOnly, // Utilise la prop globale readOnly
      paidLeaveTypeId,
      isCraEditable,
      isPaidLeaveEditable,
      tempSelectedDays,
      selectedDate,
      isNonWorkingDay,
      handleCloseActivityModal,
      fetchActivitiesForMonth,
      currentMonth,
      activities,
      activitiesByDay,
    ]
  );

  /**
   * Confirme et exécute la suppression d'une activité.
   * Cette fonction est maintenant appelée directement depuis requestDeleteFromCalendar.
   * @param {Object} activityToDel - L'objet activité à supprimer.
   */
  const confirmDeleteActivity = useCallback(
    async (activityToDel) => {
      const activity = activityToDel; // Utilise l'activité passée directement

      if (readOnly) {
        // Vérifie la prop globale readOnly en premier
        localShowMessage(
          "Opération de suppression désactivée en mode lecture seule. Vous ne pouvez pas supprimer d'activités.",
          "info"
        );
        return;
      }

      if (!activity) {
        console.error("Aucune activité à supprimer fournie.");
        localShowMessage(
          "Aucune activité n'a été sélectionnée pour la suppression. Veuillez réessayer.",
          "error"
        );
        return;
      }

      const isCRAActivityType =
        String(activity.type_activite) !== String(paidLeaveTypeId);
      const isPaidLeaveActivityType =
        String(activity.type_activite) === String(paidLeaveTypeId);

      if (isCRAActivityType && !isCraEditable) {
        localShowMessage(
          `Activité CRA verrouillée : le rapport est au statut '${craReportStatus}'. Suppression impossible.`,
          "info"
        );
        return;
      }
      if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
        localShowMessage(
          `Activité de congés payés verrouillée : le rapport est au statut '${paidLeaveReportStatus}'. Suppression impossible.`,
          "info"
        );
        return;
      }

      // Re-vérifier le statut de l'activité elle-même (doit être brouillon ou rejeté pour être supprimable)
      if (!["draft", "rejected"].includes(activity.status)) {
        localShowMessage(
          `Activité verrouillée : statut '${activity.status}'. Suppression impossible.`,
          "info"
        );
        return;
      }

      if (String(activity.user_id) !== String(userId)) {
        localShowMessage(
          "Vous ne pouvez pas supprimer les activités d'autres utilisateurs. Veuillez contacter un administrateur.",
          "error"
        );
        return;
      }

      try {
        setEditingActivity(null);

        setIsDeletingActivityFlag(true);
        if (deletionTimeoutRef.current) {
          clearTimeout(deletionTimeoutRef.current);
        }

        await onDeleteActivity(activity.id);
        localShowMessage("Activité supprimée avec succès !", "success");
        if (!readOnly && fetchActivitiesForMonth) {
          // Utilise la prop globale readOnly ici
          fetchActivitiesForMonth(currentMonth);
        }
      } catch (error) {
        console.error(
          "CraBoard: Erreur lors de la suppression de l'activité:",
          error
        );
        localShowMessage(
          `Échec de la suppression : ${error.message}. Veuillez réessayer.`,
          "error"
        );
      } finally {
        setActivityToDelete(null); // Réinitialise l'activité à supprimer
        deletionTimeoutRef.current = setTimeout(() => {
          setIsDeletingActivityFlag(false);
        }, 500);
      }
    },
    [
      onDeleteActivity,
      localShowMessage,
      fetchActivitiesForMonth,
      currentMonth,
      readOnly, // Utilise la prop globale readOnly
      paidLeaveTypeId,
      userId,
      isCraEditable,
      isPaidLeaveEditable,
      craReportStatus,
      paidLeaveReportStatus,
      setEditingActivity,
      setIsDeletingActivityFlag,
    ]
  );

  /**
   * Gère la demande de suppression d'une activité. Appelle directement confirmDeleteActivity.
   * @param {string} activityId - L'ID de l'activité à supprimer.
   * @param {Event} event - L'événement de clic.
   */
  const requestDeleteFromCalendar = useCallback(
    async (activityId, event) => {
      event.stopPropagation();
      console.log(
        `[CraBoard - DEBUG] requestDeleteFromCalendar appelée pour l'ID d'activité: ${activityId}`
      );

      if (readOnly) {
        // Vérifie la prop globale readOnly en premier
        localShowMessage(
          "Opération de suppression d'activité désactivée en mode lecture seule. Vous ne pouvez pas supprimer d'activités.",
          "info"
        );
        return;
      }

      const activity = activities.find(
        (act) => String(act.id) === String(activityId)
      );
      if (!activity) {
        console.error("Activité non trouvée pour la suppression:", activityId);
        localShowMessage(
          "Activité non trouvée pour la suppression. Elle a peut-être déjà été supprimée.",
          "error"
        );
        return;
      }

      const isCRAActivityType =
        String(activity.type_activite) !== String(paidLeaveTypeId);
      const isPaidLeaveActivityType =
        String(activity.type_activite) === String(paidLeaveTypeId);

      if (isCRAActivityType && !isCraEditable) {
        localShowMessage(
          `Activité CRA verrouillée : le rapport est au statut '${craReportStatus}'. Suppression impossible.`,
          "info"
        );
        return;
      }
      if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
        localShowMessage(
          `Activité de congés payés verrouillée : le rapport est au statut '${paidLeaveReportStatus}'. Suppression impossible.`,
          "info"
        );
        return;
      }

      // Re-vérifier le statut de l'activité elle-même (doit être brouillon ou rejeté pour être supprimable)
      if (!["draft", "rejected"].includes(activity.status)) {
        localShowMessage(
          `Activité verrouillée : statut '${activity.status}'. Suppression impossible.`,
          "info"
        );
        return;
      }

      if (String(activity.user_id) !== String(userId)) {
        localShowMessage(
          "Vous ne pouvez pas supprimer les activités d'autres utilisateurs. Veuillez contacter un administrateur.",
          "error"
        );
        return;
      }

      // Appelle directement la fonction de suppression
      confirmDeleteActivity(activity);
    },
    [
      readOnly, // Utilise la prop globale readOnly
      activities,
      localShowMessage,
      paidLeaveTypeId,
      userId,
      isCraEditable,
      isPaidLeaveEditable,
      craReportStatus,
      paidLeaveReportStatus,
      confirmDeleteActivity, // confirmDeleteActivity doit être défini AVANT requestDeleteFromCalendar
    ]
  );

  /**
   * Gère le clic sur une cellule de jour du calendrier. Ouvre le formulaire ActivityModal pour la création ou l'édition.
   * Cette fonction est TOUJOURS active pour l'interaction d'un seul jour.
   * @param {Date} dayDate - La date du jour cliqué.
   * @param {Event} e - L'événement de clic de souris.
   */
  const handleDayClick = useCallback(
    (dayDate, e) => {
      // Ignorer si un glisser-déposer (activité individuelle ou multi-sélection) est en cours
      if (
        isDraggingActivity ||
        isDeletingActivityFlag ||
        isDraggingMultiSelect // Ajouté pour le contrôle
      ) {
        console.log(
          "[CraBoard - DEBUG] handleDayClick: Ignoré en raison d'un glisser-déposer/suppression en cours."
        );
        return;
      }
      // Ignorer si le clic provient d'un élément d'activité (géré par handleActivityClick)
      if (e && e.target.closest(".cra-activity-item")) {
        console.log(
          "[CraBoard - DEBUG] handleDayClick: Ignoré car le clic provient d'une activité."
        );
        return;
      }

      console.log(
        `[CraBoard - DEBUG] handleDayClick (mode jour unique) appelée pour le jour: ${
          isValid(dayDate) ? format(dayDate, "yyyy-MM-dd") : "Date invalide"
        }`
      );

      if (readOnly) {
        // Vérifie la prop globale readOnly en premier
        localShowMessage(
          "La modification d'activité est désactivée en mode lecture seule. Vous ne pouvez pas ajouter ou modifier d'activités.",
          "info"
        );
        return;
      }

      const dateKey = isValid(dayDate) ? format(dayDate, "yyyy-MM-dd") : null;
      if (!dateKey) {
        console.error("handleDayClick: Date invalide reçue.");
        return;
      }
      const existingActivitiesForDay = activitiesByDay.get(dateKey) || [];
      const totalTimeForDay = existingActivitiesForDay
        ? existingActivitiesForDay.reduce(
            (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
            0
          )
        : 0;

      if (existingActivitiesForDay && existingActivitiesForDay.length > 0) {
        const activity = existingActivitiesForDay[0];
        // Vérifier les flags d'éditabilité spécifiques
        const isCRAActivityType =
          String(activity.type_activite) !== String(paidLeaveTypeId);
        const isPaidLeaveActivityType =
          String(activity.type_activite) === String(paidLeaveTypeId);

        if (isCRAActivityType && !isCraEditable) {
          localShowMessage(
            `Activité CRA verrouillée : le rapport est au statut '${craReportStatus}'. Modification impossible.`,
            "info"
          );
          return;
        }
        if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
          localShowMessage(
            `Activité de congés payés verrouillée : le rapport est au statut '${paidLeaveReportStatus}'. Modification impossible.`,
            "info"
          );
          return;
        }

        // Re-vérifier le statut de l'activité elle-même (doit être brouillon ou rejeté pour être modifiable)
        if (!["draft", "rejected"].includes(activity.status)) {
          localShowMessage(
            `Activité verrouillée : statut '${activity.status}'. Modification impossible.`,
            "info"
          );
          return;
        }

        if (String(activity.user_id) !== String(userId)) {
          localShowMessage(
            "Vous ne pouvez pas modifier les activités d'autres utilisateurs. Veuillez contacter un administrateur.",
            "error"
          );
          return;
        }

        setSelectedDate(dayDate);
        setEditingActivity(activity);
        setTempSelectedDays([]); // S'assurer qu'il n'y a pas de jours temporaires pour un clic simple
        setIsModalOpen(true);
        // NOUVEAU: Verrouiller la sélection de jour unique
        setIsSingleDaySelectionLocked(true);
        console.log(
          `[CraBoard - DEBUG] handleDayClick: Formulaire ouvert pour le jour: ${format(
            dayDate,
            "yyyy-MM-dd"
          )} (édition)`
        );
      } else {
        if (totalTimeForDay >= 1) {
          localShowMessage(
            "Vous avez déjà atteint la limite de 1 jour pour cette date. Veuillez modifier une activité existante ou en supprimer une pour ajouter une nouvelle.",
            "warning"
          );
          return;
        }
        // Vérifier si N'IMPORTE QUEL type d'activité peut être ajouté
        // Si les deux sont non éditables, on bloque l'ajout de nouvelles activités.
        if (!isCraEditable && !isPaidLeaveEditable) {
          localShowMessage(
            "Impossible d'ajouter des activités. Les rapports CRA et de congés payés sont verrouillés.",
            "info"
          );
          return;
        }
        setSelectedDate(dayDate);
        setEditingActivity(null);
        setTempSelectedDays([]); // S'assurer qu'il n'y a pas de jours temporaires pour un clic simple
        setIsModalOpen(true);
        // NOUVEAU: Verrouiller la sélection de jour unique
        setIsSingleDaySelectionLocked(true);
        console.log(
          `[CraBoard - DEBUG] handleDayClick: Formulaire ouvert pour le jour: ${format(
            dayDate,
            "yyyy-MM-dd"
          )} (nouvelle activité)`
        );
      }
    },
    [
      localShowMessage,
      activitiesByDay,
      readOnly, // Utilise la prop globale readOnly
      paidLeaveTypeId,
      isCraEditable,
      isPaidLeaveEditable,
      craReportStatus,
      paidLeaveReportStatus,
      isDeletingActivityFlag,
      isDraggingActivity,
      isDraggingMultiSelect, // Ajouté pour le contrôle
      userId,
      setSelectedDate,
      setEditingActivity,
      setTempSelectedDays,
      setIsModalOpen,
      setIsSingleDaySelectionLocked, // Ajouté comme dépendance
    ]
  );

  /**
   * Gère le clic sur un élément d'activité existant (pour l'édition/suppression).
   * Cette fonction est TOUJOURS active.
   * @param {Object} activity - L'objet activité cliqué.
   */
  const handleActivityClick = useCallback(
    (activity) => {
      // Ignorer si un glisser-déposer (activité individuelle ou multi-sélection) est en cours
      if (
        isDeletingActivityFlag ||
        isDraggingActivity ||
        isDraggingMultiSelect ||
        isSingleDaySelectionLocked // NOUVEAU: Ignorer si le mode de sélection unique est verrouillé
      ) {
        console.log(
          "[CraBoard - DEBUG] handleActivityClick: Ignoré en raison d'un glisser-déposer/suppression/verrouillage en cours."
        );
        return;
      }
      console.log(
        `[CraBoard - DEBUG] handleActivityClick appelée pour l'ID d'activité: ${activity.id}`
      );

      if (readOnly) {
        // Vérifie la prop globale readOnly en premier
        localShowMessage(
          "La modification d'activité est désactivée en mode lecture seule. Vous ne pouvez pas modifier ou supprimer d'activités.",
          "info"
        );
        return;
      }

      const currentActivity = activities.find(
        (a) => String(a.id) === String(activity.id)
      );
      if (!currentActivity) {
        console.warn(
          `[CraBoard - DEBUG] handleActivityClick: L'activité ID ${activity.id} non trouvée dans l'état actuel, annulation de l'ouverture du formulaire.`
        );
        localShowMessage(
          "L'activité n'existe plus ou a été supprimée. Veuillez rafraîchir la page.",
          "error"
        );
        setEditingActivity(null);
        return;
      }

      if (String(currentActivity.user_id) !== String(userId)) {
        localShowMessage(
          "Vous ne pouvez pas modifier les activités d'autres utilisateurs. Veuillez contacter un administrateur.",
          "error"
        );
        return;
      }
      // Vérifier les flags d'éditabilité spécifiques
      const isCRAActivityType =
        String(currentActivity.type_activite) !== String(paidLeaveTypeId);
      const isPaidLeaveActivityType =
        String(currentActivity.type_activite) === String(paidLeaveTypeId);

      if (isCRAActivityType && !isCraEditable) {
        localShowMessage(
          `Activité CRA verrouillée : le rapport est au statut '${craReportStatus}'. Modification impossible.`,
          "info"
        );
        return;
      }
      if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
        localShowMessage(
          `Activité de congés payés verrouillée : le rapport est au statut '${paidLeaveReportStatus}'. Modification impossible.`,
          "info"
        );
        return;
      }

      // Re-vérifier le statut de l'activité elle-même
      if (!["draft", "rejected"].includes(currentActivity.status)) {
        localShowMessage(
          `Activité verrouillée : statut '${currentActivity.status}'. Modification impossible.`,
          "info"
        );
        return;
      }

      if (
        !currentActivity.date_activite ||
        !isValid(new Date(currentActivity.date_activite))
      ) {
        console.error(
          "CraBoard: Date d'activité invalide depuis la base de données",
          currentActivity.date_activite
        );
        localShowMessage(
          "Erreur : Date d'activité existante invalide. Impossible de modifier. Veuillez contacter le support.",
          "error"
        );
        return;
      }
      setSelectedDate(new Date(currentActivity.date_activite));
      setEditingActivity(currentActivity);
      setTempSelectedDays([]);
      setIsModalOpen(true);
      // NOUVEAU: Verrouiller la sélection de jour unique si on édite une activité existante
      setIsSingleDaySelectionLocked(true);
      console.log(
        `[CraBoard - DEBUG] handleActivityClick: Formulaire ouvert pour l'activité ID: ${currentActivity.id}`
      );
    },
    [
      localShowMessage,
      userId,
      readOnly, // Utilise la prop globale readOnly
      paidLeaveTypeId,
      isCraEditable,
      isPaidLeaveEditable,
      craReportStatus,
      paidLeaveReportStatus,
      activities,
      isDeletingActivityFlag,
      isDraggingActivity,
      isDraggingMultiSelect,
      isSingleDaySelectionLocked, // Ajouté comme dépendance
      setSelectedDate,
      setEditingActivity,
      setTempSelectedDays,
      setIsModalOpen,
      setIsSingleDaySelectionLocked, // Ajouté comme dépendance
    ]
  );

  /**
   * Gère le début du glisser-déposer d'une activité individuelle.
   * Cette fonction est TOUJOURS active.
   * @param {Event} e - L'événement de glisser-déposer.
   * @param {Object} activity - L'activité en cours de glisser-déposer.
   */
  const handleDragStartActivity = useCallback(
    (e, activity) => {
      // NOUVEAU: Bloquer si le mode de sélection de jour unique est verrouillé
      if (isSingleDaySelectionLocked) {
        e.preventDefault();
        localShowMessage(
          "Impossible de glisser-déposer. Le calendrier est en mode de sélection de jour unique. Fermez la modale pour déverrouiller.",
          "info"
        );
        return;
      }

      // Si le mode multi-sélection est actif, empêcher le glisser-déposer individuel
      if (multiSelectType !== "activity" && multiSelectType !== "paid_leave") {
        localShowMessage(
          "Le glisser-déposer d'activité est désactivé en mode de sélection multiple. Veuillez changer de mode.",
          "info"
        );
        e.preventDefault();
        return;
      }
      // S'assurer que la sélection multi-jours n'est pas active lors du démarrage d'un glisser-déposer d'activité individuelle
      setIsDraggingMultiSelect(false);
      setTempSelectedDays([]);
      setDragStartDayForSelection(null);

      // Vérifier l'éditabilité avant de permettre le drag
      const isCRAActivityType =
        String(activity.type_activite) !== String(paidLeaveTypeId);
      const isPaidLeaveActivityType =
        String(activity.type_activite) === String(paidLeaveTypeId);

      if (
        readOnly || // Si la prop globale readOnly est vraie
        (isCRAActivityType && !isCraEditable) || // Ou si c'est une activité CRA et le CRA n'est pas éditable
        (isPaidLeaveActivityType && !isPaidLeaveEditable) || // Ou si c'est une activité Congé Payé et le Congé Payé n'est pas éditable
        String(activity.user_id) !== String(userId) // Ou si l'activité n'appartient pas à l'utilisateur
      ) {
        e.preventDefault();
        localShowMessage(
          "Impossible de glisser-déposer cette activité. Le calendrier est verrouillé ou vous n'avez pas les permissions.",
          "info"
        );
        return;
      }

      // Re-vérifier le statut de l'activité elle-même (doit être brouillon ou rejeté pour être déplaçable)
      if (!["draft", "rejected"].includes(activity.status)) {
        e.preventDefault();
        localShowMessage(
          `Activité verrouillée : statut '${activity.status}'. Déplacement impossible.`,
          "info"
        );
        return;
      }

      setDraggedActivity(activity);
      setIsDraggingActivity(true);
      e.dataTransfer.setData("activityId", activity.id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.dropEffect = "move";
      console.log("Glisser-déposer démarré pour l'activité:", activity.id);
    },
    [
      readOnly, // Utilise la prop globale readOnly
      userId,
      localShowMessage,
      setIsDraggingMultiSelect,
      multiSelectType,
      setTempSelectedDays,
      paidLeaveTypeId,
      isCraEditable,
      isPaidLeaveEditable,
      isSingleDaySelectionLocked, // Ajouté comme dépendance
    ]
  );

  /**
   * Gère le survol d'une cellule de jour pendant un glisser-déposer d'activité.
   * Cette fonction est TOUJOURS active.
   * @param {Event} e - L'événement de glisser-déposer.
   * @param {Date} day - La date du jour survolé.
   */
  const handleDragOverDay = useCallback(
    (e, day) => {
      // NOUVEAU: Bloquer si le mode de sélection de jour unique est verrouillé
      if (isSingleDaySelectionLocked) {
        e.preventDefault();
        return;
      }

      // Ce gestionnaire ne doit être actif que pour le glisser-déposer d'activité individuelle
      if (multiSelectType !== "activity" && multiSelectType !== "paid_leave") {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      if (draggedActivity) {
        const isTargetNonWorkingDay = isNonWorkingDay(day);
        const isDraggedActivityPaidLeave =
          String(draggedActivity.type_activite) === String(paidLeaveTypeId);

        let isDropAllowed = false;

        // Vérifier l'éditabilité du rapport pour le type d'activité glissée
        const isCRAActivityType =
          String(draggedActivity.type_activite) !== String(paidLeaveTypeId);

        if (
          readOnly || // Si la prop globale readOnly est vraie
          (isCRAActivityType && !isCraEditable) || // Ou si c'est une activité CRA et le CRA n'est pas éditable
          (isPaidLeaveActivityType && !isPaidLeaveEditable) // Ou si c'est une activité Congé Payé et le Congé Payé n'est pas éditable
        ) {
          setIsValidDropTarget(false);
          e.dataTransfer.dropEffect = "none";
          return;
        }

        if (isTargetNonWorkingDay) {
          isDropAllowed =
            isDraggedActivityPaidLeave &&
            draggedActivity.override_non_working_day;
        } else {
          isDropAllowed = true;
        }

        if (!isSameMonth(day, currentMonth)) {
          isDropAllowed = false;
        }

        setIsValidDropTarget(isDropAllowed);
        e.dataTransfer.dropEffect = isDropAllowed ? "move" : "none";
      }
    },
    [
      draggedActivity,
      isNonWorkingDay,
      paidLeaveTypeId,
      currentMonth,
      multiSelectType,
      readOnly, // Utilise la prop globale readOnly
      isCraEditable,
      isPaidLeaveEditable,
      isSingleDaySelectionLocked, // Ajouté comme dépendance
    ]
  );

  /**
   * Gère le dépôt d'une activité sur une cellule de jour.
   * Cette fonction est TOUJOURS active.
   * @param {Event} e - L'événement de dépôt.
   * @param {Date} targetDay - La date du jour cible.
   */
  const handleDropActivity = useCallback(
    async (e, targetDay) => {
      // NOUVEAU: Bloquer si le mode de sélection de jour unique est verrouillé
      if (isSingleDaySelectionLocked) {
        e.preventDefault();
        return;
      }

      // Ce gestionnaire ne doit être actif que pour le glisser-déposer d'activité individuelle
      if (multiSelectType !== "activity" && multiSelectType !== "paid_leave") {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      setIsDraggingActivity(false);
      setDraggedActivity(null);
      setIsValidDropTarget(false);

      const activityId = e.dataTransfer.getData("activityId");
      if (!activityId) return;

      const activityToMove = activities.find(
        (a) => String(a.id) === String(activityId)
      );

      if (!activityToMove) {
        localShowMessage(
          "Activité à déplacer non trouvée. Veuillez réessayer.",
          "error"
        );
        return;
      }

      const isCRAActivityType =
        String(activityToMove.type_activite) !== String(paidLeaveTypeId);
      const isPaidLeaveActivityType =
        String(activityToMove.type_activite) === String(paidLeaveTypeId);

      if (
        readOnly || // Si la prop globale readOnly est vraie
        (isCRAActivityType && !isCraEditable) || // Ou si c'est une activité CRA et le CRA n'est pas éditable
        (isPaidLeaveActivityType && !isPaidLeaveEditable) // Ou si c'est une activité Congé Payé et le Congé Payé n'est pas éditable
      ) {
        localShowMessage(
          "Impossible de déplacer cette activité. Le calendrier est verrouillé ou vous n'avez pas les permissions.",
          "info"
        );
        return;
      }

      const isTargetNonWorkingDay = isNonWorkingDay(targetDay);

      let newOverrideNonWorkingDay = activityToMove.override_non_working_day;

      let isDropAllowed = false;
      if (isTargetNonWorkingDay) {
        isDropAllowed =
          isPaidLeaveActivityType && activityToMove.override_non_working_day;
      } else {
        isDropAllowed = true;
        if (
          isPaidLeaveActivityType &&
          activityToMove.override_non_working_day
        ) {
          newOverrideNonWorkingDay = false;
        }
      }

      if (!isSameMonth(targetDay, currentMonth)) {
        localShowMessage(
          "Impossible de déplacer l'activité ici car le mois est incorrect. Veuillez la déposer dans le mois affiché.",
          "warning"
        );
        return;
      }

      // Re-vérifier le statut de l'activité elle-même (doit être brouillon ou rejeté pour être déplaçable)
      if (!["draft", "rejected"].includes(activityToMove.status)) {
        localShowMessage(
          "Impossible de déplacer cette activité. Son statut ne le permet pas (doit être 'brouillon' ou 'rejeté').",
          "info"
        );
        return;
      }

      if (isSameDay(new Date(activityToMove.date_activite), targetDay)) {
        localShowMessage(
          "L'activité est déjà à cette date. Aucun déplacement nécessaire.",
          "info"
        );
        return;
      }

      // Vérification de la limite de 1 jour lors du DROP
      const targetDateKey = format(targetDay, "yyyy-MM-dd");
      const activitiesOnTargetDay = activitiesByDay.get(targetDateKey) || [];
      const totalTimeExcludingMoved = activitiesOnTargetDay
        .filter((a) => String(a.id) !== String(activityToMove.id)) // Exclure l'activité déplacée de son ancienne position
        .reduce((sum, act) => sum + (parseFloat(act.temps_passe) || 0), 0);
      const newTotalTimeForDay =
        totalTimeExcludingMoved + (parseFloat(activityToMove.temps_passe) || 0);

      if (newTotalTimeForDay > 1) {
        localShowMessage(
          `Le déplacement de cette activité au ${format(
            targetDay,
            "dd/MM/yyyy"
          )} dépasserait la limite de 1 jour. Total actuel : ${totalTimeExcludingMoved.toFixed(
            1
          )}j.`,
          "error"
        );
        return;
      }

      if (isDropAllowed) {
        const newDate = startOfDay(targetDay);
        const updatedActivityData = {
          ...activityToMove,
          date_activite: newDate,
          override_non_working_day: newOverrideNonWorkingDay,
        };
        await onUpdateActivity(activityToMove.id, updatedActivityData);
        localShowMessage("Activité déplacée avec succès !", "success");
        if (!readOnly && fetchActivitiesForMonth) {
          fetchActivitiesForMonth(currentMonth);
        }
      } else {
        if (isTargetNonWorkingDay) {
          if (
            isPaidLeaveActivityType &&
            !activityToMove.override_non_working_day
          ) {
            localShowMessage(
              "Ce congé ne peut pas être déplacé vers un week-end ou un jour férié sans dérogation. Veuillez activer la dérogation.",
              "warning"
            );
          } else if (!isCRAActivityType) {
            localShowMessage(
              "Impossible de déplacer une activité normale vers un week-end ou un jour férié.",
              "warning"
            );
          }
        }
      }
    },
    [
      activities,
      isNonWorkingDay,
      currentMonth,
      onUpdateActivity,
      localShowMessage,
      paidLeaveTypeId,
      isCraEditable,
      isPaidLeaveEditable,
      multiSelectType,
      activitiesByDay,
      readOnly, // Utilise la prop globale readOnly
      isSingleDaySelectionLocked, // Ajouté comme dépendance
    ]
  );

  /**
   * Gère le début d'un clic de souris pour la sélection multi-jours.
   * Cette fonction est TOUJOURS active si multiSelectType est 'activity' ou 'paid_leave'.
   * @param {Event} e - L'événement de souris.
   * @param {Date} day - La date du jour cliqué.
   */
  const handleMouseDownMultiSelect = useCallback(
    (e, day) => {
      // NOUVEAU: Bloquer si le mode de sélection de jour unique est verrouillé
      if (isSingleDaySelectionLocked) {
        localShowMessage(
          "Impossible de démarrer une sélection multiple. Le calendrier est en mode de sélection de jour unique. Fermez la modale pour déverrouiller.",
          "info"
        );
        return;
      }

      // Bloquer si la prop globale readOnly est vraie, ou si un glisser-déposer/suppression est en cours
      if (readOnly || isDraggingActivity || isDeletingActivityFlag) {
        localShowMessage(
          "Sélection multiple désactivée. Le calendrier est en lecture seule ou une opération est en cours.",
          "info"
        );
        return;
      }

      // Vérifier l'éditabilité spécifique basée sur le mode de sélection multiple actuel
      if (multiSelectType === "activity" && !isCraEditable) {
        localShowMessage(
          "Impossible de démarrer une sélection multiple d'activité. Le rapport CRA est verrouillé.",
          "info"
        );
        return;
      }
      if (multiSelectType === "paid_leave" && !isPaidLeaveEditable) {
        localShowMessage(
          "Impossible de démarrer une sélection multiple de congés payés. Le rapport de congés payés est verrouillé.",
          "info"
        );
        return;
      }

      // Autoriser le démarrage de la sélection multiple UNIQUEMENT si le jour est un jour ouvré (sauf si c'est le mode congé payé)
      if (multiSelectType === "activity" && isNonWorkingDay(day)) {
        localShowMessage(
          "Impossible de démarrer une sélection multiple d'activité sur un week-end ou jour férié. Changez de mode ou choisissez un jour ouvré.",
          "info"
        );
        console.log(
          "[CraBoard - handleMouseDownMultiSelect] Bloqué par un jour non ouvré pour la multi-sélection d'activité."
        );
        return;
      }

      // Vérifier la limite de 1 jour avant de démarrer la sélection multiple
      const dayKey = format(day, "yyyy-MM-dd");
      const existingActivitiesOnDay = activitiesByDay.get(dayKey) || [];
      const existingTimeOnDay = existingActivitiesOnDay.reduce(
        (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
        0
      );

      if (existingTimeOnDay >= 1) {
        localShowMessage(
          `Impossible de démarrer la sélection multi-jours le ${format(
            day,
            "dd/MM/yyyy"
          )}. Ce jour a déjà 1 jour d'activités.`,
          "warning"
        );
        return;
      }

      // Si le bouton gauche de la souris est enfoncé
      if (e.button === 0) {
        isMouseDownOnCalendarDayRef.current = true; // Marque que la souris est enfoncée sur un jour
        mouseDownCoordsRef.current = { x: e.clientX, y: e.clientY }; // Stocke les coordonnées
        setDragStartDayForSelection(day);
        setTempSelectedDays([day]); // Commence avec le jour cliqué
        // NE PAS définir setIsDraggingMultiSelect(true) ici immédiatement.
        // Cela sera fait par handleGlobalMouseMove si un drag est détecté.
        console.log(
          "[CraBoard - handleMouseDownMultiSelect] Potentielle sélection multi-jours démarrée."
        );
      }
    },
    [
      readOnly, // Utilise la prop globale readOnly
      isDraggingActivity,
      isDeletingActivityFlag,
      isCraEditable,
      isPaidLeaveEditable,
      isNonWorkingDay,
      localShowMessage,
      multiSelectType,
      setTempSelectedDays,
      activitiesByDay,
      isSingleDaySelectionLocked, // Ajouté comme dépendance
      setDragStartDayForSelection, // Ajouté comme dépendance
    ]
  );

  /**
   * Gère le survol d'une cellule pendant la sélection multi-jours.
   * Cette fonction est TOUJOURS active si multiSelectType est 'activity' ou 'paid_leave'.
   * @param {Date} day - La date du jour survolé.
   */
  const handleMouseEnterMultiSelect = useCallback(
    (day) => {
      // NOUVEAU: Bloquer si le mode de sélection de jour unique est verrouillé
      if (isSingleDaySelectionLocked) {
        return;
      }

      // Continuer la sélection multiple UNIQUEMENT si le bouton de la souris est enfoncé sur un jour
      // ET qu'un drag a officiellement commencé (isDraggingMultiSelect est true)
      // ET qu'un jour de début de sélection est défini.
      if (
        !isMouseDownOnCalendarDayRef.current ||
        !isDraggingMultiSelect ||
        !dragStartDayForSelection
      ) {
        return;
      }
      // Empêcher la sélection multiple si la prop globale readOnly est vraie, ou si un glisser-déposer/suppression est en cours
      if (readOnly || isDraggingActivity || isDeletingActivityFlag) {
        return;
      }

      const startIndex = daysInMonth.findIndex((d) =>
        isSameDay(d, dragStartDayForSelection)
      );
      const endIndex = daysInMonth.findIndex((d) => isSameDay(d, day));

      if (startIndex === -1 || endIndex === -1) {
        return;
      }

      const [start, end] =
        startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

      // Filtrer les jours en fonction du mode:
      // - Si le mode 'paid_leave', autoriser tous les jours (ouvrés/non-ouvrés)
      // - Si le mode 'activity', autoriser uniquement les jours ouvrés
      const newTempSelectedDays = daysInMonth
        .slice(start, end + 1)
        .filter((d) => {
          // Vérifier si le type de rapport spécifique est éditable pour ce mode
          const isCurrentModeEditable =
            multiSelectType === "paid_leave"
              ? isPaidLeaveEditable
              : isCraEditable;

          if (!isCurrentModeEditable) {
            return false; // Si le mode actuel n'est pas éditable, ne pas sélectionner
          }

          const dayKey = format(d, "yyyy-MM-dd");
          const existingActivitiesOnDay = activitiesByDay.get(dayKey) || [];
          const existingTimeOnDay = existingActivitiesOnDay.reduce(
            (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
            0
          );

          if (multiSelectType === "paid_leave") {
            return existingTimeOnDay < 1; // Permettre si < 1 jour
          } else {
            // 'activity' mode
            return !isNonWorkingDay(d) && existingTimeOnDay < 1; // Permettre si ouvré et < 1 jour
          }
        });

      setTempSelectedDays(newTempSelectedDays);
    },
    [
      isMouseDownOnCalendarDayRef, // Nouvelle dépendance
      isDraggingMultiSelect, // Nouvelle dépendance
      dragStartDayForSelection,
      daysInMonth,
      readOnly, // Utilise la prop globale readOnly
      isDraggingActivity,
      isDeletingActivityFlag,
      isNonWorkingDay,
      multiSelectType,
      setTempSelectedDays,
      activitiesByDay,
      isPaidLeaveEditable, // Ajouté pour la vérification d'éditabilité du mode
      isCraEditable, // Ajouté pour la vérification d'éditabilité du mode
      isSingleDaySelectionLocked, // Ajouté comme dépendance
    ]
  );

  /**
   * Gère la fin de la sélection multi-jours (relâchement de la souris).
   * Déclenche l'action appropriée en fonction de `multiSelectType`.
   * Cette fonction est appelée par handleGlobalMouseUp UNIQUEMENT si un drag a été confirmé.
   */
  const handleMouseUpMultiSelect = useCallback(async () => {
    // NOUVEAU: Si le mode de sélection de jour unique est verrouillé, ne rien faire ici
    if (isSingleDaySelectionLocked) {
      return;
    }

    // Bloquer si la prop globale readOnly est vraie (vérification redondante mais sécuritaire)
    if (readOnly) {
      localShowMessage(
        "Opération désactivée. Le calendrier est en lecture seule.",
        "info"
      );
      setTempSelectedDays([]); // Effacer la sélection temporaire
      return;
    }

    if (tempSelectedDays.length > 0) {
      if (multiSelectType === "paid_leave") {
        if (!isPaidLeaveEditable) {
          // Re-vérification finale
          localShowMessage(
            "Impossible d'ajouter des congés payés. Le rapport de congés est verrouillé.",
            "info"
          );
          setTempSelectedDays([]);
          return;
        }
        const paidLeaveActivityData = {
          name: "Congé Payé",
          temps_passe: 1, // Pour les congés en multi-sélection, on ajoute 1 jour
          description_activite: "Congé Payé automatique",
          type_activite: paidLeaveTypeId,
          client_id: "",
          override_non_working_day: false,
          status: "draft",
        };

        let successCount = 0;
        let errorCount = 0;
        for (const day of tempSelectedDays) {
          // Re-vérification de la limite de 1 jour par jour
          const dayKey = format(day, "yyyy-MM-dd");
          const existingActivitiesOnDay = activitiesByDay.get(dayKey) || [];
          const existingTimeOnDay = existingActivitiesOnDay.reduce(
            (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
            0
          );

          if (existingTimeOnDay + paidLeaveActivityData.temps_passe > 1) {
            localShowMessage(
              `Impossible d'ajouter un congé payé au ${format(
                day,
                "dd/MM/yyyy"
              )}. Ce jour a déjà 1 jour d'activités.`,
              "error"
            );
            errorCount++;
            continue;
          }

          try {
            await onAddActivity({
              ...paidLeaveActivityData,
              user_id: userId,
              date_activite: format(day, "yyyy-MM-dd"),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            successCount++;
          } catch (error) {
            console.error(
              `Erreur lors de l'ajout du congé payé pour le jour ${format(
                day,
                "yyyy-MM-dd"
              )}:`,
              error
            );
            errorCount++;
          }
        }
        if (successCount > 0) {
          localShowMessage(
            `Ajout de ${successCount} congés payés réussi ! ${
              errorCount > 0 ? `(${errorCount} échecs)` : ""
            }`,
            errorCount > 0 ? "warning" : "success"
          );
        } else if (errorCount > 0) {
          localShowMessage(
            "Échec de l'ajout des congés payés. Veuillez vérifier les jours sélectionnés.",
            "error"
          );
        }
        if (fetchActivitiesForMonth) {
          fetchActivitiesForMonth(currentMonth);
        }
        setTempSelectedDays([]); // <-- Garder ici pour le cas paid_leave
      } else if (multiSelectType === "activity") {
        if (!isCraEditable) {
          // Re-vérification finale
          localShowMessage(
            "Impossible d'ajouter des activités CRA. Le rapport CRA est verrouillé.",
            "info"
          );
          setTempSelectedDays([]);
          return;
        }
        // Pour les activités en multi-sélection, on ouvre la modale avec les jours pré-sélectionnés
        setEditingActivity(null);
        setSelectedDate(null); // La date sera gérée par les tempSelectedDays
        setIsModalOpen(true);
        // tempSelectedDays n'est PAS effacé ici, il est utilisé par la modale et sera effacé par handleCloseActivityModal
      }
    } else {
      console.log(
        "[CraBoard - handleMouseUpMultiSelect] Aucune sélection multi-jours à finaliser."
      );
    }
  }, [
    tempSelectedDays,
    multiSelectType,
    paidLeaveTypeId,
    onAddActivity,
    userId,
    localShowMessage,
    fetchActivitiesForMonth,
    currentMonth,
    setEditingActivity,
    setSelectedDate,
    setIsModalOpen,
    setTempSelectedDays, // Ajouté comme dépendance car il est appelé ici
    activitiesByDay,
    isPaidLeaveEditable,
    isCraEditable,
    readOnly, // Utilise la prop globale readOnly
    isSingleDaySelectionLocked, // Ajouté comme dépendance
  ]);

  // Définir confirmResetMonth EN PREMIER
  const confirmResetMonth = useCallback(async () => {
    if (readOnly) {
      // Vérifie la prop globale readOnly en premier
      localShowMessage(
        "Opération de réinitialisation désactivée en mode lecture seule. Vous ne pouvez pas réinitialiser le mois.",
        "info"
      );
      return;
    }
    const activitiesToReset = activitiesForCurrentMonth.filter(
      (activity) =>
        (activity.status === "draft" || activity.status === "rejected") &&
        ((String(activity.type_activite) !== String(paidLeaveTypeId) &&
          isCraEditable) ||
          (String(activity.type_activite) === String(paidLeaveTypeId) &&
            isPaidLeaveEditable))
    );

    if (activitiesToReset.length === 0) {
      localShowMessage(
        `Aucune activité brouillon ou rejetée à réinitialiser pour ${
          isValid(currentMonth)
            ? format(currentMonth, "MMMM yyyy", { locale: fr })
            : "ce mois"
        }.`,
        "info"
      );
      return;
    }
    let successCount = 0;
    let errorCount = 0;
    for (const activity of activitiesToReset) {
      try {
        setIsDeletingActivityFlag(true);
        if (deletionTimeoutRef.current) {
          clearTimeout(deletionTimeoutRef.current);
        }

        await onDeleteActivity(activity.id);
        successCount++;
      } catch (error) {
        console.error(
          `CraBoard: Erreur lors de la suppression de l'activité ${activity.id} pendant la réinitialisation:`,
          error
        );
        errorCount++;
      } finally {
        deletionTimeoutRef.current = setTimeout(() => {
          setIsDeletingActivityFlag(false);
        }, 500);
      }
    }
    fetchActivitiesForMonth(currentMonth);
    localShowMessage(
      `Réinitialisation terminée : ${successCount} activités supprimées, ${errorCount} erreurs.`,
      errorCount > 0 ? "error" : "success"
    );
  }, [
    activitiesForCurrentMonth,
    onDeleteActivity,
    localShowMessage,
    currentMonth,
    fetchActivitiesForMonth,
    readOnly, // Utilise la prop globale readOnly
    paidLeaveTypeId,
    isCraEditable,
    isPaidLeaveEditable,
    setIsDeletingActivityFlag,
  ]);

  // Définir requestResetMonth EN SECOND, après confirmResetMonth
  const requestResetMonth = useCallback(() => {
    if (readOnly) {
      // Vérifie la prop globale readOnly en premier
      localShowMessage(
        "Opération de réinitialisation désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    // Vérifier si au moins un des rapports est en statut non-éditable pour la réinitialisation
    if (
      !isCraEditable &&
      !isPaidLeaveEditable // Si AUCUN n'est éditable, alors on bloque
    ) {
      localShowMessage(
        "Impossible de réinitialiser le mois. Les rapports CRA et de congés payés sont déjà validés, en attente de révision ou finalisés. Seul un administrateur peut annuler ces statuts.",
        "info"
      );
      return;
    }
    // Appelle directement confirmResetMonth sans confirmation
    confirmResetMonth();
  }, [
    isCraEditable,
    isPaidLeaveEditable,
    localShowMessage,
    readOnly, // Utilise la prop globale readOnly
    confirmResetMonth,
  ]);

  const sendActivities = useCallback(
    async (activitiesToSubmit, reportType) => {
      if (readOnly) {
        // Vérifie la prop globale readOnly en premier
        localShowMessage(
          `L'opération de soumission pour les ${
            reportType === "cra" ? "CRAs" : "Congés"
          } est désactivée en mode lecture seule.`,
          "info"
        );
        return;
      }

      if (reportType === "cra" && !isCraEditable) {
        localShowMessage(
          "Impossible de soumettre le CRA. Le rapport est déjà en attente de révision, validé ou finalisé.",
          "info"
        );
        return;
      }
      if (reportType === "paid_leave" && !isPaidLeaveEditable) {
        localShowMessage(
          "Impossible de soumettre le rapport de congés payés. Il est déjà en attente de révision, validé ou finalisé.",
          "info"
        );
        return;
      }

      if (activitiesToSubmit.length === 0) {
        localShowMessage(
          `Aucune activité ${
            reportType === "cra" ? "CRA" : "de congés payés"
          } brouillon ou rejetée à soumettre.`,
          "info"
        );
        return;
      }

      const existingReport = monthlyReports.find(
        (r) =>
          String(r.user_id) === String(userId) &&
          r.month ===
            (isValid(currentMonth) ? currentMonth.getMonth() + 1 : -1) &&
          r.year ===
            (isValid(currentMonth) ? currentMonth.getFullYear() : -1) &&
          r.report_type === reportType
      );

      // Permettre la soumission si le rapport est 'draft' ou 'rejected'
      if (
        existingReport &&
        !["draft", "rejected"].includes(existingReport.status)
      ) {
        localShowMessage(
          `Un rapport "${reportType}" est déjà au statut "${existingReport.status}". Impossible de soumettre à nouveau.`,
          "warning"
        );
        return;
      }

      const activitiesSnapshotIds = activitiesToSubmit.map((act) => act.id);

      const totalDaysWorked = activitiesToSubmit.reduce(
        (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
        0
      );
      const totalBillableDays = activitiesToSubmit
        .filter((activity) => {
          const typeDef = activityTypeDefinitions.find(
            (def) => String(def.id) === String(activity.type_activite)
          );
          return typeDef?.is_billable;
        })
        .reduce(
          (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
          0
        );

      const reportData = {
        user_id: userId,
        userName: userFirstName,
        month: isValid(currentMonth) ? currentMonth.getMonth() + 1 : -1,
        year: isValid(currentMonth) ? currentMonth.getFullYear() : -1,
        total_days_worked: totalDaysWorked,
        total_billable_days: totalBillableDays,
        activities_snapshot: activitiesSnapshotIds,
        status: "pending_review",
        submittedAt: new Date(),
        report_type: reportType,
      };

      try {
        await onSendMonthlyReport(reportData);
        localShowMessage(
          `Rapport ${reportType} soumis avec succès !`,
          "success"
        );
        fetchActivitiesForMonth(currentMonth);
      } catch (error) {
        console.error(
          `CraBoard: Erreur lors de la soumission du rapport mensuel ${reportType}:`,
          error
        );
        localShowMessage(
          `Échec de la soumission du rapport ${reportType} : ${error.message}. Veuillez réessayer.`,
          "error"
        );
      }
    },
    [
      readOnly, // Utilise la prop globale readOnly
      localShowMessage,
      isCraEditable,
      isPaidLeaveEditable,
      monthlyReports,
      userId,
      currentMonth,
      userFirstName,
      activityTypeDefinitions,
      fetchActivitiesForMonth,
      onSendMonthlyReport,
    ]
  );

  // Appelle directement sendActivities
  const requestSendCRA = useCallback(() => {
    if (!isCraEditable) {
      localShowMessage(
        "Impossible de soumettre le CRA. Le rapport est déjà en attente de révision, validé ou finalisé.",
        "info"
      );
      return;
    }

    const craActivitiesToSend = activitiesForCurrentMonth.filter(
      (a) =>
        String(a.type_activite) !== String(paidLeaveTypeId) &&
        (a.status === "draft" || a.status === "rejected")
    );
    if (craActivitiesToSend.length === 0) {
      localShowMessage(
        "Aucune activité CRA brouillon ou rejetée à soumettre ce mois-ci.",
        "info"
      );
      return;
    }
    sendActivities(craActivitiesToSend, "cra");
  }, [
    isCraEditable,
    localShowMessage,
    activitiesForCurrentMonth,
    paidLeaveTypeId,
    sendActivities,
  ]);

  // Appelle directement sendActivities
  const requestSendPaidLeaves = useCallback(() => {
    if (!isPaidLeaveEditable) {
      localShowMessage(
        "Impossible de soumettre les congés. Le rapport de congés payés est déjà en attente de révision, validé ou finalisé.",
        "info"
      );
      return;
    }

    const paidLeaveActivitiesToSend = activitiesForCurrentMonth.filter(
      (a) =>
        String(a.type_activite) === String(paidLeaveTypeId) &&
        (a.status === "draft" || a.status === "rejected")
    );
    if (paidLeaveActivitiesToSend.length === 0) {
      localShowMessage(
        "Aucune activité de congés payés brouillon ou rejetée à soumettre ce mois-ci.",
        "info"
      );
      return;
    }
    sendActivities(paidLeaveActivitiesToSend, "paid_leave");
  }, [
    isPaidLeaveEditable,
    localShowMessage,
    activitiesForCurrentMonth,
    paidLeaveTypeId,
    sendActivities,
  ]);

  // Fonction pour basculer entre les modes de sélection multiple (uniquement 'activity' et 'paid_leave')
  const cycleMultiSelectMode = useCallback(() => {
    // Le bouton de changement de mode est désactivé si la prop globale readOnly est vraie.
    if (readOnly) {
      localShowMessage(
        "Le changement de mode de sélection est désactivé lorsque le calendrier est en lecture seule.",
        "info"
      );
      return;
    }
    // NOUVEAU: Si le mode de sélection de jour unique est verrouillé, ne pas changer de mode
    if (isSingleDaySelectionLocked) {
      localShowMessage(
        "Impossible de changer de mode de sélection. Le calendrier est en mode de sélection de jour unique. Fermez la modale pour déverrouiller.",
        "info"
      );
      return;
    }

    setMultiSelectType((prevType) => {
      const newType = prevType === "activity" ? "paid_leave" : "activity";
      localShowMessage(
        `Mode de sélection multiple: ${
          newType === "activity" ? "Activité" : "Congés Payés"
        } (cliquez pour basculer)`,
        "info"
      );
      console.log(
        "[CraBoard] cycleMultiSelectMode a été appelée. Nouveau mode:",
        newType
      );
      return newType;
    });
    setTempSelectedDays([]);
    setIsModalOpen(false);
    setEditingActivity(null);
    setSelectedDate(new Date());
    setIsDraggingMultiSelect(false);
    setDragStartDayForSelection(null);
  }, [
    readOnly, // Utilise la prop globale readOnly
    setTempSelectedDays,
    setIsModalOpen,
    setEditingActivity,
    setSelectedDate,
    setIsDraggingMultiSelect,
    setDragStartDayForSelection,
    localShowMessage,
    isSingleDaySelectionLocked, // Ajouté comme dépendance
  ]);

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prevMonth) => {
      const newMonth = subMonths(prevMonth, 1);
      if (onMonthChange) {
        onMonthChange(newMonth);
      }
      return newMonth;
    });
  }, [onMonthChange]);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prevMonth) => {
      const newMonth = addMonths(prevMonth, 1);
      if (onMonthChange) {
        onMonthChange(newMonth);
      }
      return newMonth;
    });
  }, [onMonthChange]);

  const handleToggleSummaryReport = useCallback(() => {
    setShowSummaryReport((prev) => {
      const newState = !prev;
      if (newState) {
        setSummaryReportMonth(currentMonth);
      } else {
        setSummaryReportMonth(null);
      }
      return newState;
    });
  }, [currentMonth]);

  const handleOpenMonthlyReportPreview = useCallback((reportData) => {
    setMonthlyReportPreviewData(reportData);
    setShowMonthlyReportPreview(true);
  }, []);

  const handleCloseMonthlyReportPreview = useCallback(() => {
    setMonthlyReportPreviewData(null);
    setShowMonthlyReportPreview(false);
  }, []);

  // --- Effets secondaires (useEffect) ---

  useEffect(() => {
    if (
      propCurrentMonth instanceof Date &&
      isValid(propCurrentMonth) &&
      !isSameMonth(currentMonth, propCurrentMonth)
    ) {
      setCurrentMonth(startOfMonth(propCurrentMonth));
    }
    if (isValid(currentMonth)) {
      fetchPublicHolidays(currentMonth.getFullYear());
    }
  }, [propCurrentMonth, currentMonth, fetchPublicHolidays]);

  useEffect(() => {
    const handleDragEnd = () => {
      setIsDraggingActivity(false);
      setDraggedActivity(null);
      setIsValidDropTarget(false);
    };

    const handleGlobalMouseMove = (e) => {
      // Si le mode de sélection de jour unique est verrouillé, ignorer les mouvements pour la multi-sélection
      if (isSingleDaySelectionLocked) {
        return;
      }

      // Si le bouton de la souris est enfoncé sur un jour et qu'on n'est pas déjà en mode drag
      if (
        isMouseDownOnCalendarDayRef.current &&
        dragStartDayForSelection &&
        !isDraggingMultiSelect
      ) {
        const distance = Math.sqrt(
          Math.pow(e.clientX - mouseDownCoordsRef.current.x, 2) +
            Math.pow(e.clientY - mouseDownCoordsRef.current.y, 2)
        );

        // Si le mouvement dépasse le seuil, activer le mode drag
        if (distance > DRAG_THRESHOLD) {
          setIsDraggingMultiSelect(true);
          // CraCalendar's onMouseEnter will now react to isDraggingMultiSelect being true
          // and update tempSelectedDays as the mouse moves over day cells.
        }
      }
    };

    const handleGlobalMouseUp = (e) => {
      // Réinitialiser le ref isMouseDownOnCalendarDayRef à la fin de tout événement mouseup global
      isMouseDownOnCalendarDayRef.current = false;
      // Toujours réinitialiser l'état de drag de la multi-sélection à la fin de mouseup
      setIsDraggingMultiSelect(false);
      setDragStartDayForSelection(null);

      // Si le mode de sélection de jour unique est verrouillé, ne pas traiter les événements de multi-sélection
      if (isSingleDaySelectionLocked) {
        // Nettoyer les états de sélection multiple au cas où (sécurité)
        // tempSelectedDays est déjà géré par handleCloseActivityModal
        return;
      }

      // Calculer la distance de déplacement pour différencier clic et drag
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownCoordsRef.current.x, 2) +
          Math.pow(e.clientY - mouseDownCoordsRef.current.y, 2)
      );

      // Déterminer si c'était un drag ou un clic
      // Si isDraggingMultiSelect était vrai avant ce mouseUp, ou si la distance dépasse le seuil
      if (distance > DRAG_THRESHOLD) {
        // C'était un drag confirmé (ou un clic qui a bougé au-delà du seuil)
        handleMouseUpMultiSelect(); // Traiter la multi-sélection
      } else if (dragStartDayForSelection) {
        // C'était un simple clic sur une cellule de jour (mouvement inférieur au seuil)
        // Appeler handleDayClick avec le jour initialement cliqué
        handleDayClick(dragStartDayForSelection, e);
      }

      // tempSelectedDays n'est PAS réinitialisé ici, il est géré par handleCloseActivityModal ou handleMouseUpMultiSelect
    };

    document.addEventListener("dragend", handleDragEnd);
    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mousemove", handleGlobalMouseMove); // Ajout du listener global de mouvement

    return () => {
      document.removeEventListener("dragend", handleDragEnd);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mousemove", handleGlobalMouseMove); // Nettoyage du listener
    };
  }, [
    handleMouseUpMultiSelect,
    handleDayClick, // Ajouté comme dépendance car il est appelé ici
    isDraggingMultiSelect, // isDraggingMultiSelect est une dépendance car nous la lisons ici.
    isMouseDownOnCalendarDayRef,
    mouseDownCoordsRef,
    dragStartDayForSelection,
    setIsDraggingMultiSelect, // Ajouté comme dépendance car nous la mettons à jour ici.
    setDragStartDayForSelection, // Ajouté comme dépendance car nous la mettons à jour ici.
    DRAG_THRESHOLD, // Ajouté comme dépendance
    isSingleDaySelectionLocked, // Ajouté comme dépendance
  ]); // Dépendances mises à jour

  useEffect(() => {
    if (
      !readOnly && // Utilise la prop globale readOnly ici
      fetchActivitiesForMonth &&
      typeof fetchActivitiesForMonth === "function"
    ) {
      console.log(
        "[CraBoard] useEffect: Appel de fetchActivitiesForMonth pour",
        isValid(currentMonth)
          ? format(currentMonth, "MMMM yyyy")
          : "Date invalide"
      );
      fetchActivitiesForMonth(currentMonth);
    }
  }, [currentMonth, fetchActivitiesForMonth, readOnly]); // Dépendance 'readOnly' ajoutée

  const totalWorkingDaysInMonth = useMemo(() => {
    if (!isValid(currentMonth)) return 0;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    // Assurez-vous que le résultat est toujours un nombre
    return (
      days.filter(
        (day) => !isWeekend(day, { weekStartsOn: 1 }) && !isPublicHoliday(day)
      ).length || 0
    ); // Ajout de || 0
  }, [currentMonth, isPublicHoliday]);

  const totalActivitiesTimeInMonth = useMemo(() => {
    // Assurez-vous que le résultat est toujours un nombre
    return (
      activitiesForCurrentMonth.reduce(
        (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
        0
      ) || 0
    ); // Ajout de || 0
  }, [activitiesForCurrentMonth]);

  const timeDifference = useMemo(() => {
    // Assurez-vous que les opérandes sont des nombres avant le calcul
    const diff =
      (totalActivitiesTimeInMonth || 0) - (totalWorkingDaysInMonth || 0);
    return diff.toFixed(2);
  }, [totalActivitiesTimeInMonth, totalWorkingDaysInMonth]);

  return (
    <div
      ref={craBoardRef}
      className="flex flex-col h-full bg-white rounded-lg shadow-md p-4"
      // Removed onMouseUp={handleDragEndActivity} and onMouseLeave={handleDragEndActivity}
      // as the global event listeners in useEffect handle this.
    >
      <style>
        {`
          body {
            font-family: 'Inter', sans-serif;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
        `}
      </style>
      <h2 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
        Votre Calendrier CRA -{" "}
        {format(currentMonth, "MMMM yyyy", { locale: fr })}
      </h2>

      {/* Bandeau de lecture seule */}
      {readOnly && (
        <div
          className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Mode Lecture Seule:</strong>
          <span className="block sm:inline ml-2">
            Vous visualisez un CRA en lecture seule. Aucune modification n'est
            possible.
          </span>
        </div>
      )}

      {overallReportStatus === "refused" && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Rapport Refusé:</strong>
          <span className="block sm:inline ml-2">
            Le rapport de ce mois a été refusé. Raison: "
            {overallRejectionReason || "Non spécifiée"}". Veuillez corriger et
            soumettre à nouveau.
          </span>
        </div>
      )}

      {/* En-tête du calendrier */}
      <CraControls
        currentMonth={currentMonth}
        userFirstName={userFirstName}
        craReportStatus={craReportStatus}
        paidLeaveReportStatus={paidLeaveReportStatus}
        isCraEditable={isCraEditable} // Pass specific CRA editability
        isPaidLeaveEditable={isPaidLeaveEditable} // Pass specific Paid Leave editability
        goToPreviousMonth={goToPreviousMonth}
        goToNextMonth={goToNextMonth}
        handleToggleSummaryReport={handleToggleSummaryReport}
        showSummaryReport={showSummaryReport}
        requestSendCRA={requestSendCRA} // Appelle directement requestSendCRA
        requestSendPaidLeaves={requestSendPaidLeaves} // Appelle directement requestSendPaidLeaves
        requestResetMonth={requestResetMonth}
        craDraftsCount={
          activitiesForCurrentMonth.filter(
            (a) =>
              String(a.type_activite) !== String(paidLeaveTypeId) &&
              (a.status === "draft" || a.status === "rejected")
          ).length
        }
        paidLeaveDraftsCount={
          activitiesForCurrentMonth.filter(
            (a) =>
              String(a.type_activite) === String(paidLeaveTypeId) &&
              (a.status === "draft" || a.status === "rejected")
          ).length
        }
        multiSelectType={multiSelectType}
        onCycleMultiSelectMode={cycleMultiSelectMode}
        isAnyReportEditable={isAnyReportEditable} // Passer le flag global d'éditabilité
        readOnly={readOnly} // Pass the global readOnly status for month navigation buttons and multi-select toggle
      />

      {/* Affichage des statuts de rapport pour le mois actuel */}
      {/* Le CraSummary doit être affiché même en lecture seule pour voir les totaux */}
      <CraSummary
        craReport={craReport}
        paidLeaveReport={paidLeaveReport}
        isCraEditable={isCraEditable}
        isPaidLeaveEditable={isPaidLeaveEditable}
        onSendMonthlyReport={sendActivities} // Passe directement sendActivities
        rejectionReason={overallRejectionReason} // Utiliser la raison de rejet globale
        totalWorkingDaysInMonth={totalWorkingDaysInMonth}
        totalActivitiesTimeInMonth={totalActivitiesTimeInMonth}
        timeDifference={timeDifference}
      />

      {/* Section pour afficher les statuts des rapports CRA et Congés Payés */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Statut des Rapports Mensuels
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Statut du rapport CRA */}
          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <p className="font-medium text-gray-700">Rapport CRA :</p>
            {craReportStatus === "validated" && (
              <p className="text-green-600 font-semibold">Validé ✅</p>
            )}
            {craReportStatus === "pending_review" && (
              <p className="text-yellow-600 font-semibold">
                En attente de révision ⏳
              </p>
            )}
            {craReportStatus === "rejected" && (
              <div className="text-red-600 font-semibold">
                <p>
                  Refusé ❌
                  {craReport?.rejection_reason && ( // Utilise craReport.rejection_reason
                    <span className="text-sm font-normal text-red-700 ml-2">
                      (Raison : {craReport.rejection_reason})
                    </span>
                  )}
                </p>
              </div>
            )}
            {craReportStatus === "finalized" && (
              <p className="text-purple-600 font-semibold">Finalisé ✔️</p>
            )}
            {craReportStatus === "empty" && (
              <p className="text-gray-500 italic">
                Aucun rapport CRA pour ce mois.
              </p>
            )}
            {craReportStatus === "draft" && (
              <p className="text-blue-500 italic">Rapport CRA en brouillon.</p>
            )}
          </div>

          {/* Statut du rapport Congés Payés */}
          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <p className="font-medium text-gray-700">Rapport Congés Payés :</p>
            {paidLeaveReportStatus === "validated" && (
              <p className="text-green-600 font-semibold">Validé ✅</p>
            )}
            {paidLeaveReportStatus === "pending_review" && (
              <p className="text-yellow-600 font-semibold">
                En attente de révision ⏳
              </p>
            )}
            {paidLeaveReportStatus === "rejected" && (
              <div className="text-red-600 font-semibold">
                <p>
                  Refusé ❌
                  {paidLeaveReport?.rejection_reason && ( // Utilise paidLeaveReport.rejection_reason
                    <span className="text-sm font-normal text-red-700 ml-2">
                      (Raison : {paidLeaveReport.rejection_reason})
                    </span>
                  )}
                </p>
              </div>
            )}
            {paidLeaveReportStatus === "finalized" && (
              <p className="text-purple-600 font-semibold">Finalisé ✔️</p>
            )}
            {paidLeaveReportStatus === "empty" && (
              <p className="text-gray-500 italic">
                Aucun rapport de congés payés pour ce mois.
              </p>
            )}
            {paidLeaveReportStatus === "draft" && (
              <p className="text-blue-500 italic">
                Rapport congés payés en brouillon.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modale d'activité (rendue conditionnellement) */}
      {isModalOpen && (
        <ActivityModal
          onClose={handleCloseActivityModal}
          onSave={handleSaveActivity}
          onDelete={confirmDeleteActivity} // confirmDeleteActivity est maintenant appelée directement
          activity={editingActivity}
          initialDate={selectedDate}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          showMessage={localShowMessage}
          readOnly={readOnly || (!isCraEditable && !isPaidLeaveEditable)} // Utilise la prop globale readOnly ou si aucun rapport n'est éditable
          paidLeaveTypeId={paidLeaveTypeId}
          selectedDaysForMultiAdd={tempSelectedDays}
          isNonWorkingDay={isNonWorkingDay}
          activitiesByDay={activitiesByDay}
        />
      )}

      {/* Grille du calendrier */}
      <CraCalendar
        currentMonth={currentMonth}
        activitiesByDay={activitiesByDay}
        activityTypeDefinitions={activityTypeDefinitions}
        clientDefinitions={clientDefinitions}
        isPublicHoliday={isPublicHoliday}
        onDayClick={handleDayClick} // Passé pour les clics simples (appelé par handleGlobalMouseUp)
        onActivityClick={handleActivityClick}
        tempSelectedDays={tempSelectedDays}
        onMouseDown={handleMouseDownMultiSelect} // Commencer la détection de drag
        onMouseEnter={handleMouseEnterMultiSelect} // Étendre la sélection si en mode drag
        // onMouseUp est géré globalement
        readOnly={readOnly} // Passe la prop globale readOnly
        isCraEditable={isCraEditable}
        isPaidLeaveEditable={isPaidLeaveEditable}
        requestDeleteFromCalendar={requestDeleteFromCalendar} // Appelle directement la suppression
        showMessage={localShowMessage}
        userId={userId}
        userFirstName={userFirstName}
        paidLeaveTypeId={paidLeaveTypeId}
        onDragStartActivity={handleDragStartActivity}
        onDragOverDay={handleDragOverDay}
        onDropActivity={handleDropActivity}
        isDraggingActivity={isDraggingActivity}
        isDropTargetValid={isValidDropTarget}
        multiSelectType={multiSelectType}
        isDragging={isDraggingMultiSelect}
        paidLeaveTypeId={paidLeaveTypeId}
        isSingleDaySelectionLocked={isSingleDaySelectionLocked} // NOUVEAU: Passer l'état au calendrier
      />

      {/* Modale de prévisualisation du rapport mensuel */}
      {showMonthlyReportPreview && monthlyReportPreviewData && (
        <MonthlyReportPreviewModal
          isOpen={showMonthlyReportPreview}
          onClose={handleCloseMonthlyReportPreview}
          reportData={monthlyReportPreviewData.reportData}
          year={monthlyReportPreviewData.year}
          month={monthlyReportPreviewData.month}
          userName={monthlyReportPreviewData.userName}
          userId={monthlyReportPreviewData.userId}
        />
      )}

      {/* Modale du rapport de synthèse */}
      {showSummaryReport && summaryReportMonth && (
        <SummaryReport
          isOpen={showSummaryReport}
          onClose={handleToggleSummaryReport}
          month={summaryReportMonth}
          userId={userId}
          activities={activitiesForCurrentMonth}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          showMessage={localShowMessage}
          onOpenMonthlyReportPreview={handleOpenMonthlyReportPreview}
          readOnly={readOnly} // Utilise la prop globale readOnly ici
          isPublicHoliday={isPublicHoliday}
        />
      )}
    </div>
  );
}
