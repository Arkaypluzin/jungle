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
  readOnly = false,
  monthlyReports = [],
  rejectionReason = null,
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
  console.log("[CraBoard] Rapports mensuels reçus:", monthlyReports);

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

  const craBoardRef = useRef(null);

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
          `Impossible de charger les jours fériés : ${err.message}`,
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
    setTempSelectedDays([]);
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
    if (readOnly && monthlyReports.length === 1) {
      const singleReport = monthlyReports[0];
      if (singleReport.report_type === "cra") {
        return { craReport: singleReport, paidLeaveReport: null };
      } else if (singleReport.report_type === "paid_leave") {
        return { craReport: null, paidLeaveReport: singleReport };
      }
    }

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

    return {
      craReport: currentMonthCraReport,
      paidLeaveReport: currentMonthPaidLeaveReport,
    };
  }, [monthlyReports, userId, currentMonth, readOnly]);

  const craReportStatus = craReport ? craReport.status : "empty";
  const paidLeaveReportStatus = paidLeaveReport
    ? paidLeaveReport.status
    : "empty";

  const isCraEditable = useMemo(() => {
    return ["empty", "draft", "rejected"].includes(craReportStatus);
  }, [craReportStatus]);

  const isPaidLeaveEditable = useMemo(() => {
    return ["empty", "draft", "rejected"].includes(paidLeaveReportStatus);
  }, [paidLeaveReportStatus]);

  const isAnyReportEditable = useMemo(() => {
    return isCraEditable || isPaidLeaveEditable;
  }, [isCraEditable, isPaidLeaveEditable]);

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
        localShowMessage(
          "Opération de sauvegarde désactivée en mode lecture seule.",
          "info"
        );
        return;
      }

      const isCRAActivity =
        String(activityData.type_activite) !== String(paidLeaveTypeId);
      const isPaidLeaveActivity =
        String(activityData.type_activite) === String(paidLeaveTypeId);

      if (isCRAActivity && !isCraEditable) {
        localShowMessage(
          "Impossible de sauvegarder cette activité. Le rapport CRA est déjà en attente de révision, validé ou finalisé.",
          "info"
        );
        return;
      }
      if (isPaidLeaveActivity && !isPaidLeaveEditable) {
        localShowMessage(
          "Impossible de sauvegarder cette activité. Le rapport de congés payés est déjà en attente de révision, validé ou finalisé.",
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
              "Activité originale non trouvée pour la mise à jour.",
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
              "Aucun jour sélectionné pour la création d'activité.",
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
                `Tentative d'ajout d'activité normale un jour non ouvré (multi-sélection): ${format(
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
              "Échec de l'ajout de toutes les activités sélectionnées.",
              "error"
            );
          }
        }
      } catch (error) {
        console.error(
          "CraBoard: Erreur lors de la sauvegarde de l'activité:",
          error
        );
        localShowMessage(`Échec de la sauvegarde : ${error.message}`, "error");
      } finally {
        handleCloseActivityModal();
        if (!readOnly && fetchActivitiesForMonth) {
          fetchActivitiesForMonth(currentMonth);
        }
      }
    },
    [
      onAddActivity,
      onUpdateActivity,
      localShowMessage,
      userId,
      readOnly,
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
        localShowMessage(
          "Opération de suppression désactivée en mode lecture seule.",
          "info"
        );
        return;
      }

      if (!activity) {
        console.error("Aucune activité à supprimer fournie.");
        localShowMessage(
          "Aucune activité sélectionnée pour la suppression.",
          "error"
        );
        return;
      }

      const isActivityStatusEditable = ["draft", "rejected"].includes(
        activity.status
      );

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

      if (!isActivityStatusEditable) {
        localShowMessage(
          `Activité verrouillée : statut '${activity.status}'. Suppression impossible.`,
          "info"
        );
        return;
      }
      if (String(activity.user_id) !== String(userId)) {
        localShowMessage(
          "Vous ne pouvez pas supprimer les activités d'autres utilisateurs.",
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
          fetchActivitiesForMonth(currentMonth);
        }
      } catch (error) {
        console.error(
          "CraBoard: Erreur lors de la suppression de l'activité:",
          error
        );
        localShowMessage(`Échec de la suppression : ${error.message}`, "error");
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
      readOnly,
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
        localShowMessage(
          "Opération de suppression d'activité désactivée en mode lecture seule.",
          "info"
        );
        return;
      }

      const activity = activities.find(
        (act) => String(act.id) === String(activityId)
      );
      if (!activity) {
        console.error("Activité non trouvée pour la suppression:", activityId);
        localShowMessage("Activité non trouvée pour la suppression.", "error");
        return;
      }

      const isActivityStatusEditable = ["draft", "rejected"].includes(
        activity.status
      );

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

      if (!isActivityStatusEditable) {
        localShowMessage(
          `Activité verrouillée : statut '${activity.status}'. Suppression impossible.`,
          "info"
        );
        return;
      }
      if (String(activity.user_id) !== String(userId)) {
        localShowMessage(
          "Vous ne pouvez pas supprimer les activités d'autres utilisateurs.",
          "error"
        );
        return;
      }

      // Appelle directement la fonction de suppression
      confirmDeleteActivity(activity);
    },
    [
      readOnly,
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
        isDraggingMultiSelect
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
        localShowMessage(
          "La modification d'activité est désactivée en mode lecture seule.",
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
        const isActivityStatusEditable = ["draft", "rejected"].includes(
          activity.status
        );

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

        if (!isActivityStatusEditable) {
          localShowMessage(
            `Activité verrouillée : statut '${activity.status}'. Modification impossible.`,
            "info"
          );
          return;
        }
        if (String(activity.user_id) !== String(userId)) {
          localShowMessage(
            "Vous ne pouvez pas modifier les activités d'autres utilisateurs.",
            "error"
          );
          return;
        }

        setSelectedDate(dayDate);
        setEditingActivity(activity);
        setTempSelectedDays([]);
        setIsModalOpen(true);
        console.log(
          `[CraBoard - DEBUG] handleDayClick: Formulaire ouvert pour le jour: ${format(
            dayDate,
            "yyyy-MM-dd"
          )} (édition)`
        );
      } else {
        // Vérifier la limite de 1 jour avant d'ouvrir la modale pour un NOUVEL ajout
        if (totalTimeForDay >= 1) {
          localShowMessage(
            "Vous avez déjà atteint la limite maximale de 1 jour pour cette date. Veuillez modifier une activité existante ou en supprimer une pour en ajouter une nouvelle.",
            "warning"
          );
          return;
        }
        if (!isCraEditable && !isPaidLeaveEditable) {
          localShowMessage(
            "Impossible d'ajouter des activités. Les rapports CRA et de congés payés sont déjà en attente de révision, validés ou finalisés.",
            "info"
          );
          return;
        }
        setSelectedDate(dayDate);
        setEditingActivity(null);
        setTempSelectedDays([]);
        setIsModalOpen(true);
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
      readOnly,
      paidLeaveTypeId,
      isCraEditable,
      isPaidLeaveEditable,
      craReportStatus,
      paidLeaveReportStatus,
      isDeletingActivityFlag,
      isDraggingActivity,
      isDraggingMultiSelect,
      userId,
      setSelectedDate,
      setEditingActivity,
      setTempSelectedDays,
      setIsModalOpen,
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
        isDraggingMultiSelect
      ) {
        console.log(
          "[CraBoard - DEBUG] handleActivityClick: Ignoré en raison d'un glisser-déposer/suppression en cours."
        );
        return;
      }
      console.log(
        `[CraBoard - DEBUG] handleActivityClick appelée pour l'ID d'activité: ${activity.id}`
      );

      if (readOnly) {
        localShowMessage(
          "La modification d'activité est désactivée en mode lecture seule.",
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
          "L'activité n'existe plus ou a été supprimée.",
          "error"
        );
        setEditingActivity(null);
        return;
      }

      if (String(currentActivity.user_id) !== String(userId)) {
        localShowMessage(
          "Vous ne pouvez pas modifier ou supprimer les activités d'autres utilisateurs.",
          "error"
        );
        return;
      }
      const isActivityStatusEditable = ["draft", "rejected"].includes(
        currentActivity.status
      );

      const isCRAActivityType =
        String(currentActivity.type_activite) !== String(paidLeaveTypeId);
      const isPaidLeaveActivityType =
        String(currentActivity.type_activite) === String(paidLeaveTypeId);

      if (isCRAActivityType && !isCraEditable) {
        localShowMessage(
          `Activité CRA verrouillée : le rapport est au statut '${craReportStatus}'. Modification ou suppression impossible.`,
          "info"
        );
        return;
      }
      if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
        localShowMessage(
          `Activité de congés payés verrouillée : le rapport est au statut '${paidLeaveReportStatus}'. Modification ou suppression impossible.`,
          "info"
        );
        return;
      }

      if (!isActivityStatusEditable) {
        localShowMessage(
          `Activité verrouillée : statut '${currentActivity.status}'. Modification ou suppression impossible.`,
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
          "Erreur : Date d'activité existante invalide. Impossible de modifier.",
          "error"
        );
        return;
      }
      setSelectedDate(new Date(currentActivity.date_activite));
      setEditingActivity(currentActivity);
      setTempSelectedDays([]);
      setIsModalOpen(true);
      console.log(
        `[CraBoard - DEBUG] handleActivityClick: Formulaire ouvert pour l'activité ID: ${currentActivity.id}`
      );
    },
    [
      localShowMessage,
      userId,
      readOnly,
      paidLeaveTypeId,
      isCraEditable,
      isPaidLeaveEditable,
      craReportStatus,
      paidLeaveReportStatus,
      activities,
      isDeletingActivityFlag,
      isDraggingActivity,
      isDraggingMultiSelect,
      setSelectedDate,
      setEditingActivity,
      setTempSelectedDays,
      setIsModalOpen,
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
      // Si le mode multi-sélection est actif, empêcher le glisser-déposer individuel
      if (multiSelectType !== "activity" && multiSelectType !== "paid_leave") {
        localShowMessage(
          "Le glisser-déposer d'activité est désactivé en mode de sélection multiple.",
          "info"
        );
        e.preventDefault();
        return;
      }
      // S'assurer que la sélection multi-jours n'est pas active lors du démarrage d'un glisser-déposer d'activité individuelle
      setIsDraggingMultiSelect(false);
      setTempSelectedDays([]);
      setDragStartDayForSelection(null);

      if (
        !readOnly &&
        ["draft", "rejected"].includes(activity.status) &&
        String(activity.user_id) === String(userId)
      ) {
        setDraggedActivity(activity);
        setIsDraggingActivity(true);
        e.dataTransfer.setData("activityId", activity.id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.dropEffect = "move";
        console.log("Glisser-déposer démarré pour l'activité:", activity.id);
      } else {
        e.preventDefault();
        localShowMessage(
          "Impossible de glisser-déposer cette activité.",
          "info"
        );
      }
    },
    [
      readOnly,
      userId,
      localShowMessage,
      setIsDraggingMultiSelect,
      multiSelectType,
      setTempSelectedDays,
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
        localShowMessage("Activité à déplacer non trouvée.", "error");
        return;
      }

      const isTargetNonWorkingDay = isNonWorkingDay(targetDay);
      const isDraggedActivityPaidLeave =
        String(activityToMove.type_activite) === String(paidLeaveTypeId);

      let newOverrideNonWorkingDay = activityToMove.override_non_working_day;

      let isDropAllowed = false;
      if (isTargetNonWorkingDay) {
        isDropAllowed =
          isDraggedActivityPaidLeave && activityToMove.override_non_working_day;
      } else {
        isDropAllowed = true;
        if (
          isDraggedActivityPaidLeave &&
          activityToMove.override_non_working_day
        ) {
          newOverrideNonWorkingDay = false;
        }
      }

      if (!isSameMonth(targetDay, currentMonth)) {
        localShowMessage(
          "Impossible de déplacer l'activité ici (mois incorrect).",
          "warning"
        );
        return;
      }

      const isCRAActivityType = !isDraggedActivityPaidLeave;
      if (isCRAActivityType && !isCraEditable) {
        localShowMessage(
          "Impossible de déplacer cette activité CRA. Le rapport est verrouillé.",
          "info"
        );
        return;
      }
      if (isDraggedActivityPaidLeave && !isPaidLeaveEditable) {
        localShowMessage(
          "Impossible de déplacer ce congé. Le rapport de congés est verrouillé.",
          "info"
        );
        return;
      }
      if (!["draft", "rejected"].includes(activityToMove.status)) {
        localShowMessage(
          "Impossible de déplacer cette activité. Son statut ne le permet pas.",
          "info"
        );
        return;
      }

      if (isSameDay(new Date(activityToMove.date_activite), targetDay)) {
        localShowMessage("L'activité est déjà à cette date.", "info");
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
      } else {
        if (isTargetNonWorkingDay) {
          if (
            isDraggedActivityPaidLeave &&
            !activityToMove.override_non_working_day
          ) {
            localShowMessage(
              "Ce congé ne peut pas être déplacé vers un week-end ou un jour férié sans dérogation.",
              "warning"
            );
          } else if (!isDraggedActivityPaidLeave) {
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
      // Le mode multi-sélection est toujours actif ('activity' ou 'paid_leave')
      // Empêcher la sélection multiple si le mode lecture seule est actif, ou si un glisser-déposer/suppression est en cours
      if (readOnly || isDraggingActivity || isDeletingActivityFlag) {
        console.log(
          "[CraBoard - handleMouseDownMultiSelect] Bloqué par le mode lecture seule, glisser-déposer ou suppression en cours."
        );
        return;
      }
      // Empêcher la sélection multiple si aucun des rapports n'est modifiable
      if (!isCraEditable && !isPaidLeaveEditable) {
        localShowMessage(
          "Impossible de sélectionner des jours, les rapports sont verrouillés.",
          "info"
        );
        console.log(
          "[CraBoard - handleMouseDownMultiSelect] Bloqué par des rapports non éditables."
        );
        return;
      }

      // Autoriser le démarrage de la sélection multiple UNIQUEMENT si le jour est un jour ouvré (sauf si c'est le mode congé payé)
      if (multiSelectType === "activity" && isNonWorkingDay(day)) {
        localShowMessage(
          "Impossible de démarrer une sélection multiple d'activité sur un week-end ou jour férié.",
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
        setIsDraggingMultiSelect(true);
        setDragStartDayForSelection(day);
        setTempSelectedDays([day]);
        console.log(
          "[CraBoard - handleMouseDownMultiSelect] Sélection multi-jours démarrée."
        );
      }
    },
    [
      readOnly,
      isDraggingActivity,
      isDeletingActivityFlag,
      isCraEditable,
      isPaidLeaveEditable,
      isNonWorkingDay,
      localShowMessage,
      setIsDraggingMultiSelect,
      multiSelectType,
      setTempSelectedDays,
      activitiesByDay,
    ]
  );

  /**
   * Gère le survol d'une cellule pendant la sélection multi-jours.
   * Cette fonction est TOUJOURS active si multiSelectType est 'activity' ou 'paid_leave'.
   * @param {Date} day - La date du jour survolé.
   */
  const handleMouseEnterMultiSelect = useCallback(
    (day) => {
      // Continuer la sélection multiple uniquement si en mode glisser-déposer et qu'un jour de début est défini
      if (!isDraggingMultiSelect || !dragStartDayForSelection) {
        return;
      }
      // Empêcher la sélection multiple si le mode lecture seule est actif, ou si un glisser-déposer/suppression est en cours
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
          const isDaySelectable = isAnyReportEditable;
          if (multiSelectType === "paid_leave") {
            // Pour les congés payés, nous permettons la sélection sur n'importe quel jour,
            // mais nous vérifions si le jour est déjà plein.
            const dayKey = format(d, "yyyy-MM-dd");
            const existingActivitiesOnDay = activitiesByDay.get(dayKey) || [];
            const existingTimeOnDay = existingActivitiesOnDay.reduce(
              (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
              0
            );
            return isDaySelectable && existingTimeOnDay < 1; // Permettre si < 1 jour
          } else {
            // 'activity' mode
            // Pour les activités, nous vérifions si le jour est ouvré ET s'il n'est pas plein.
            const dayKey = format(d, "yyyy-MM-dd");
            const existingActivitiesOnDay = activitiesByDay.get(dayKey) || [];
            const existingTimeOnDay = existingActivitiesOnDay.reduce(
              (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
              0
            );
            return (
              !isNonWorkingDay(d) && isDaySelectable && existingTimeOnDay < 1
            ); // Permettre si < 1 jour
          }
        });

      setTempSelectedDays(newTempSelectedDays);
    },
    [
      isDraggingMultiSelect,
      dragStartDayForSelection,
      daysInMonth,
      readOnly,
      isDraggingActivity,
      isDeletingActivityFlag,
      isNonWorkingDay,
      isAnyReportEditable,
      multiSelectType,
      setTempSelectedDays,
      activitiesByDay,
    ]
  );

  /**
   * Gère la fin de la sélection multi-jours (relâchement de la souris).
   * Déclenche l'action appropriée en fonction de `multiSelectType`.
   * Cette fonction est TOUJOURS active si multiSelectType est 'activity' ou 'paid_leave'.
   */
  const handleMouseUpMultiSelect = useCallback(async () => {
    if (isDraggingMultiSelect) {
      setIsDraggingMultiSelect(false);
      setDragStartDayForSelection(null);

      if (tempSelectedDays.length > 0) {
        if (multiSelectType === "paid_leave") {
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
            localShowMessage("Échec de l'ajout des congés payés.", "error");
          }
          if (fetchActivitiesForMonth) {
            fetchActivitiesForMonth(currentMonth);
          }
          setTempSelectedDays([]);
        } else if (multiSelectType === "activity") {
          // Pour les activités en multi-sélection, on ouvre la modale avec les jours pré-sélectionnés
          setEditingActivity(null);
          setSelectedDate(null);
          setIsModalOpen(true);
          // tempSelectedDays est effacé par handleCloseActivityModal après la soumission/annulation
        }
      } else {
        console.log(
          "[CraBoard - handleMouseUpMultiSelect] Aucune sélection multi-jours à finaliser."
        );
      }
    }
  }, [
    isDraggingMultiSelect,
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
    setTempSelectedDays,
    activitiesByDay,
  ]);

  // Définir confirmResetMonth EN PREMIER
  const confirmResetMonth = useCallback(async () => {
    if (readOnly) {
      localShowMessage(
        "Opération de réinitialisation désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    const activitiesToReset = activitiesForCurrentMonth.filter(
      (activity) =>
        activity.status === "draft" || activity.status === "rejected"
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
    readOnly,
    setIsDeletingActivityFlag,
  ]);

  // Définir requestResetMonth EN SECOND, après confirmResetMonth
  const requestResetMonth = useCallback(() => {
    if (readOnly) {
      localShowMessage(
        "Opération de réinitialisation désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    if (
      ["validated", "pending_review", "finalized"].includes(craReportStatus) ||
      ["validated", "pending_review", "finalized"].includes(
        paidLeaveReportStatus
      )
    ) {
      localShowMessage(
        "Impossible de réinitialiser le mois. Un rapport (CRA ou Congé) est déjà validé, en attente de révision ou finalisé. Seul un administrateur peut annuler ces statuts.",
        "info"
      );
      return;
    }
    // Appelle directement confirmResetMonth sans confirmation
    confirmResetMonth();
  }, [
    craReportStatus,
    paidLeaveReportStatus,
    localShowMessage,
    readOnly,
    confirmResetMonth,
  ]);

  const sendActivities = useCallback(
    async (activitiesToSubmit, reportType) => {
      if (readOnly) {
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

      if (existingReport && existingReport.status !== "rejected") {
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
          `Échec de la soumission du rapport ${reportType} : ${error.message}`,
          "error"
        );
      }
    },
    [
      readOnly,
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
    if (readOnly) return;
    setMultiSelectType((prevType) => {
      const newType = prevType === "activity" ? "paid_leave" : "activity";
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
    readOnly,
    setTempSelectedDays,
    setIsModalOpen,
    setEditingActivity,
    setSelectedDate,
    setIsDraggingMultiSelect,
    setDragStartDayForSelection,
  ]);

  // --- 5. Effets secondaires (useEffect) ---

  useEffect(() => {
    if (
      propCurrentMonth instanceof Date &&
      isValid(propCurrentMonth) &&
      !isSameMonth(currentMonth, propCurrentMonth)
    ) {
      setCurrentMonth(propCurrentMonth);
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

    const handleMouseUpGlobal = (e) => {
      if (isDraggingMultiSelect) {
        handleMouseUpMultiSelect();
      }
    };

    document.addEventListener("dragend", handleDragEnd);
    document.addEventListener("mouseup", handleMouseUpGlobal);
    return () => {
      document.removeEventListener("dragend", handleDragEnd);
      document.removeEventListener("mouseup", handleMouseUpGlobal);
    };
  }, [handleMouseUpMultiSelect, isDraggingMultiSelect]);

  useEffect(() => {
    if (
      !readOnly &&
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
  }, [currentMonth, fetchActivitiesForMonth, readOnly]);

  const totalWorkingDaysInMonth = useMemo(() => {
    if (!isValid(currentMonth)) return 0;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return days.filter(
      (day) => !isWeekend(day, { weekStartsOn: 1 }) && !isPublicHoliday(day)
    ).length;
  }, [currentMonth, isPublicHoliday]);

  const totalActivitiesTimeInMonth = useMemo(() => {
    return activitiesForCurrentMonth.reduce(
      (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
      0
    );
  }, [activitiesForCurrentMonth]);

  const timeDifference = useMemo(() => {
    return (totalActivitiesTimeInMonth - totalWorkingDaysInMonth).toFixed(2);
  }, [totalActivitiesTimeInMonth, totalWorkingDaysInMonth]);

  const hasRejectedReport = useMemo(() => {
    return monthlyReports?.some(
      (r) =>
        String(r.user_id) === String(userId) &&
        r.month === currentMonth.getMonth() + 1 &&
        r.year === currentMonth.getFullYear() &&
        r.status === "rejected"
    );
  }, [monthlyReports, userId, currentMonth]);

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

  // --- Rendu du composant ---
  if (!isValid(currentMonth)) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600">
        Erreur : Date de mois invalide.
      </div>
    );
  }

  console.log(
    "[CraBoard - RENDER] Type de cycleMultiSelectMode:",
    typeof cycleMultiSelectMode
  );

  return (
    <div
      className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8"
      ref={craBoardRef}
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

      {readOnly && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 mb-6 rounded-md">
          <p className="font-semibold">Mode Lecture Seule :</p>
          <p>
            Ce calendrier est en mode lecture seule. Vous ne pouvez pas créer,
            modifier ou supprimer des activités.
          </p>
          {hasRejectedReport && rejectionReason && (
            <p className="mt-2 font-medium text-red-700">
              Raison du rejet : {rejectionReason}
            </p>
          )}
        </div>
      )}

      {/* Contrôles de navigation du calendrier */}
      <CraControls
        currentMonth={currentMonth}
        userFirstName={userFirstName}
        craReportStatus={craReportStatus}
        paidLeaveReportStatus={paidLeaveReportStatus}
        readOnly={readOnly}
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
      />

      {/* Affichage des statuts de rapport pour le mois actuel */}
      {!readOnly && (
        <CraSummary
          craReport={craReport}
          paidLeaveReport={paidLeaveReport}
          isCraEditable={isCraEditable}
          isPaidLeaveEditable={isPaidLeaveEditable}
          onSendMonthlyReport={sendActivities} // Passe directement sendActivities
          rejectionReason={rejectionReason}
          totalWorkingDaysInMonth={totalWorkingDaysInMonth}
          totalActivitiesTimeInMonth={totalActivitiesTimeInMonth}
          timeDifference={timeDifference}
        />
      )}

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
          readOnly={readOnly || (!isCraEditable && !isPaidLeaveEditable)}
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
        onDayClick={handleDayClick}
        onActivityClick={handleActivityClick}
        tempSelectedDays={tempSelectedDays}
        onMouseDown={handleMouseDownMultiSelect}
        onMouseEnter={handleMouseEnterMultiSelect}
        onMouseUp={handleMouseUpMultiSelect}
        readOnly={readOnly}
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
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
