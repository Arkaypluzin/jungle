// components/CraBoard.js
"use client";

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
} from "date-fns";
import { fr } from "date-fns/locale";

// Import new sub-components
import CraCalendar from "./cra/CraCalendar";
import CraControls from "./cra/CraControls";
import CraSummary from "./cra/CraSummary";
import ActivityModal from "./ActivityModal";
import MonthlyReportPreviewModal from "./MonthlyReportPreviewModal";
import ConfirmationModal from "./ConfirmationModal";
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
  onSendMonthlyReport, // NOUVEAU : Prop pour envoyer les rapports
}) {
  console.log("[CraBoard] --- Rendu du CraBoard ---");
  console.log(
    "[CraBoard] Props reçues: activities.length:",
    activities.length,
    "userId:",
    userId,
    "currentMonth:",
    isValid(propCurrentMonth)
      ? format(propCurrentMonth, "yyyy-MM-dd")
      : "Invalid Date",
    "readOnly (global):",
    readOnly
  );
  console.log("[CraBoard] monthlyReports reçus:", monthlyReports);

  const [currentMonth, setCurrentMonth] = useState(propCurrentMonth);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [publicHolidays, setPublicHolidays] = useState([]);

  const [isDeletingActivity, setIsDeletingActivity] = useState(false);
  const deletionTimeoutRef = useRef(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [showResetMonthConfirmModal, setShowResetMonthConfirmModal] =
    useState(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [confirmingActionType, setConfirmingActionType] = useState(null);

  const [showSummaryReport, setShowSummaryReport] = useState(false);
  const [summaryReportMonth, setSummaryReportMonth] = useState(null);
  const [showMonthlyReportPreview, setShowMonthlyReportPreview] =
    useState(false);
  const [monthlyReportPreviewData, setMonthlyReportPreviewData] =
    useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDownForDrag, setIsMouseDownForDrag] = useState(false);
  const [dragStartDay, setDragStartDay] = useState(null);
  const [tempSelectedDays, setTempSelectedDays] = useState([]);
  const craBoardRef = useRef(null);
  const lastMouseDownDay = useRef(null);

  const paidLeaveTypeId = useMemo(() => {
    const type = activityTypeDefinitions.find(
      (t) => t.name && t.name.toLowerCase().includes("congé payé")
    );
    return type ? type.id : null;
  }, [activityTypeDefinitions]);

  useEffect(() => {
    if (
      propCurrentMonth instanceof Date &&
      isValid(propCurrentMonth) &&
      !isSameMonth(currentMonth, propCurrentMonth)
    ) {
      setCurrentMonth(propCurrentMonth);
    } else if (
      !(propCurrentMonth instanceof Date) ||
      !isValid(propCurrentMonth)
    ) {
      console.warn(
        "CraBoard: propCurrentMonth is invalid or not a Date object. Using current date as fallback."
      );
      setCurrentMonth(new Date());
    }
  }, [propCurrentMonth, currentMonth]);

  const fetchPublicHolidays = useCallback(async () => {
    if (!isValid(currentMonth)) {
      console.warn(
        "CraBoard: currentMonth is invalid, skipping public holidays fetch."
      );
      return;
    }
    const year = currentMonth.getFullYear();
    try {
      const response = await fetch(`/api/public_holidays?year=${year}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Échec de la récupération des jours fériés."
        );
      }
      const data = await response.json();
      const formattedHolidays = data.map((holiday) =>
        format(new Date(holiday.date), "yyyy-MM-dd")
      );
      setPublicHolidays(formattedHolidays);
    } catch (error) {
      console.error(
        "CraBoard: Erreur lors de la récupération des jours fériés:",
        error
      );
      showMessage(
        `Impossible de charger les jours fériés: ${error.message}`,
        "error"
      );
      setPublicHolidays([]);
    }
  }, [currentMonth, showMessage]);

  useEffect(() => {
    fetchPublicHolidays();
  }, [fetchPublicHolidays]);

  const isPublicHoliday = useCallback(
    (date) => {
      if (!isValid(date)) return false;
      const formattedDate = format(date, "yyyy-MM-dd");
      return publicHolidays.includes(formattedDate);
    },
    [publicHolidays]
  );

  const activitiesForCurrentMonth = useMemo(() => {
    console.log("[CraBoard] activitiesForCurrentMonth - Début du calcul.");
    console.log(
      "[CraBoard] activitiesForCurrentMonth - Activités brutes reçues:",
      activities.length,
      activities
    );
    console.log(
      "[CraBoard] activitiesForCurrentMonth - userId pour le filtre:",
      userId
    );
    console.log(
      "[CraBoard] activitiesForCurrentMonth - currentMonth pour le filtre:",
      isValid(currentMonth)
        ? format(currentMonth, "yyyy-MM-dd")
        : "Invalid Date"
    );

    const filtered = activities.filter((activity) => {
      const isUserMatch = String(activity.user_id) === String(userId);
      const isDateValid =
        activity.date_activite && isValid(new Date(activity.date_activite));
      const isMonthMatch =
        isDateValid &&
        isValid(currentMonth) &&
        isSameMonth(new Date(activity.date_activite), currentMonth);

      return isUserMatch && isDateValid && isMonthMatch;
    });
    console.log(
      "[CraBoard] activitiesForCurrentMonth - Activités filtrées:",
      filtered.length,
      filtered
    );
    return filtered;
  }, [activities, currentMonth, userId]);

  const craActivitiesForCurrentMonth = useMemo(() => {
    return activitiesForCurrentMonth.filter(
      (activity) => String(activity.type_activite) !== String(paidLeaveTypeId)
    );
  }, [activitiesForCurrentMonth, paidLeaveTypeId]);

  const paidLeaveActivitiesForCurrentMonth = useMemo(() => {
    return activitiesForCurrentMonth.filter(
      (activity) => String(activity.type_activite) === String(paidLeaveTypeId)
    );
  }, [activitiesForCurrentMonth, paidLeaveTypeId]);

  const activitiesByDay = useMemo(() => {
    console.log("[CraBoard] activitiesByDay - Début du calcul.");
    console.log(
      "[CraBoard] activitiesByDay - Activités en entrée:",
      activitiesForCurrentMonth.length,
      activitiesForCurrentMonth
    );
    const activitiesMap = new Map();
    activitiesForCurrentMonth.forEach((activity) => {
      if (activity.date_activite && isValid(new Date(activity.date_activite))) {
        const dateKey = format(new Date(activity.date_activite), "yyyy-MM-dd");
        if (!activitiesMap.has(dateKey)) {
          activitiesMap.set(dateKey, []);
        }
        activitiesMap.get(dateKey).push(activity);
      } else {
        console.warn(
          "CraBoard: activitiesByDay - Skipping activity with invalid date_activite:",
          activity
        );
      }
    });
    console.log(
      "[CraBoard] activitiesByDay - Map générée. Nombre de jours avec activités:",
      activitiesMap.size,
      activitiesMap
    );
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

  console.log("[CraBoard] craReportStatus:", craReportStatus);
  console.log("[CraBoard] paidLeaveReportStatus:", paidLeaveReportStatus);

  const isCraEditable = useMemo(() => {
    return ["empty", "draft", "rejected"].includes(craReportStatus);
  }, [craReportStatus]);

  const isPaidLeaveEditable = useMemo(() => {
    return ["empty", "draft", "rejected"].includes(paidLeaveReportStatus);
  }, [paidLeaveReportStatus]);

  const calculateCurrentMonthOverallStatus = useCallback(() => {
    if (activitiesForCurrentMonth.length === 0) return "empty";
    const statuses = new Set(activitiesForCurrentMonth.map((a) => a.status));
    if (statuses.has("validated")) return "validated";
    if (statuses.has("rejected")) return "rejected";
    if (statuses.has("pending_review")) return "pending_review";
    if (statuses.has("finalized")) return "finalized";
    if (statuses.size === 1 && statuses.has("draft")) return "draft";
    return "mixed";
  }, [activitiesForCurrentMonth]);

  const currentMonthOverallStatus = useMemo(
    () => calculateCurrentMonthOverallStatus(),
    [calculateCurrentMonthOverallStatus]
  );

  useEffect(() => {
    const notifyReportStatus = (report, type) => {
      if (!report) return;

      const notificationKeyPrefix = `report_notified_${report.id}_${report.status}`;
      const notificationKey = `${notificationKeyPrefix}_${
        report.reviewedAt ? new Date(report.reviewedAt).toISOString() : "noDate"
      }`;

      if (
        typeof window !== "undefined" &&
        !localStorage.getItem(notificationKey)
      ) {
        let message = "";
        let messageType = "info";

        if (report.status === "rejected" && report.rejectionReason) {
          message = `Votre rapport de ${type} pour ${
            isValid(currentMonth)
              ? format(currentMonth, "MMMM yyyy", { locale: fr })
              : "ce mois"
          } a été REJETÉ. Motif: ${report.rejectionReason}`;
          messageType = "error";
        } else if (report.status === "validated") {
          message = `Votre rapport de ${type} pour ${
            isValid(currentMonth)
              ? format(currentMonth, "MMMM yyyy", { locale: fr })
              : "ce mois"
          } a été VALIDÉ avec succès.`;
          messageType = "success";
        }

        if (message) {
          showMessage(message, messageType, 8000);
          localStorage.setItem(notificationKey, "true");
        }
      }
    };

    if (!readOnly) {
      notifyReportStatus(craReport, "CRA");
      notifyReportStatus(paidLeaveReport, "congés payés");
    }
  }, [craReport, paidLeaveReport, currentMonth, showMessage, readOnly]);

  const goToPreviousMonth = useCallback(() => {
    if (readOnly) return;
    const newMonth = subMonths(currentMonth, 1);
    if (onMonthChange && typeof onMonthChange === "function") {
      onMonthChange(newMonth);
    } else {
      setCurrentMonth(newMonth);
    }
  }, [currentMonth, onMonthChange, readOnly]);

  const goToNextMonth = useCallback(() => {
    if (readOnly) return;
    const newMonth = addMonths(currentMonth, 1);
    if (onMonthChange && typeof onMonthChange === "function") {
      onMonthChange(newMonth);
    } else {
      setCurrentMonth(newMonth);
    }
  }, [currentMonth, onMonthChange, readOnly]);

  const goToToday = useCallback(() => {
    if (readOnly) return;
    const today = new Date();
    if (onMonthChange && typeof onMonthChange === "function") {
      onMonthChange(today);
    } else {
      setCurrentMonth(today);
      setSelectedDate(today);
    }
  }, [onMonthChange, readOnly]);

  const handleToggleSummaryReport = useCallback(() => {
    setShowSummaryReport((prev) => !prev);
    if (!showSummaryReport) {
      setSummaryReportMonth(currentMonth);
    } else {
      setSummaryReportMonth(null);
    }
  }, [showSummaryReport, currentMonth]);

  const handleOpenMonthlyReportPreview = useCallback(() => {
    setShowMonthlyReportPreview(true);
    const formattedReportData = activitiesForCurrentMonth.map((activity) => {
      const activityType = activityTypeDefinitions.find(
        (def) => String(def.id) === String(activity.type_activite)
      );
      const client = clientDefinitions.find(
        (def) => String(def.id) === String(activity.client_id)
      );
      return {
        ...activity,
        date_activite: activity.date_activite,
        activity_type_name_full: activityType
          ? activityType.name
          : "Type Inconnu",
        client_name_full: client ? client.nom_client : "Client Inconnu",
      };
    });
    setMonthlyReportPreviewData({
      reportData: formattedReportData,
      year: isValid(currentMonth) ? currentMonth.getFullYear() : "N/A",
      month: isValid(currentMonth) ? currentMonth.getMonth() + 1 : "N/A",
      userName: userFirstName,
      userId: userId,
    });
  }, [
    activitiesForCurrentMonth,
    currentMonth,
    userFirstName,
    userId,
    activityTypeDefinitions,
    clientDefinitions,
  ]);

  const handleCloseMonthlyReportPreview = useCallback(() => {
    setShowMonthlyReportPreview(false);
    setMonthlyReportPreviewData(null);
  }, []);

  const canAddCRA = useMemo(() => isCraEditable, [isCraEditable]);
  const canAddPaidLeave = useMemo(
    () => isPaidLeaveEditable,
    [isPaidLeaveEditable]
  );

  const handleAddPaidLeave = useCallback(
    async (daysToProcess) => {
      if (!canAddPaidLeave) {
        showMessage(
          "Impossible d'ajouter des congés. Le rapport de congés payés est déjà en attente de révision, validé ou finalisé.",
          "info"
        );
        return;
      }

      if (!paidLeaveTypeId) {
        showMessage(
          "Le type d'activité 'Congé Payé' est introuvable. Veuillez le créer via la section 'Gestion' ou contacter l'administrateur.",
          "error"
        );
        return;
      }

      let addedCount = 0;
      let skipCount = 0;
      let errorOccurred = false;

      for (const dateForLeave of daysToProcess) {
        const formattedDate = isValid(dateForLeave)
          ? format(dateForLeave, "yyyy-MM-dd")
          : null;
        if (!formattedDate) {
          console.warn("Skipping invalid date for leave:", dateForLeave);
          skipCount++;
          continue;
        }

        const existingActivitiesForDay = activitiesByDay.get(formattedDate);
        const isWeekendDay =
          isValid(dateForLeave) && isWeekend(dateForLeave, { weekStartsOn: 1 });
        const isPublicHolidayDay =
          isValid(dateForLeave) && isPublicHoliday(dateForLeave);
        const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;
        const overrideNonWorkingDay = isNonWorkingDay;

        if (
          (existingActivitiesForDay && existingActivitiesForDay.length > 0) ||
          (isValid(dateForLeave) &&
            isValid(currentMonth) &&
            !isSameMonth(dateForLeave, currentMonth))
        ) {
          skipCount++;
          continue;
        }

        const newLeaveActivity = {
          date_activite: formattedDate,
          temps_passe: 1,
          description_activite: "Congé Payé",
          type_activite: paidLeaveTypeId,
          client_id: null,
          override_non_working_day: overrideNonWorkingDay,
          status: "draft",
        };

        try {
          await onAddActivity(newLeaveActivity);
          addedCount++;
        } catch (error) {
          console.error(
            "CraBoard: Erreur lors de l'ajout du congé payé pour " +
              formattedDate +
              ":",
            error
          );
          errorOccurred = true;
        }
      }

      if (addedCount > 0) {
        showMessage(`Congé(s) payé(s) ajouté(s): ${addedCount}.`, "success");
      }
      if (skipCount > 0) {
        showMessage(
          `Certains jours ont été ignorés (déjà une activité ou hors du mois actuel): ${skipCount}.`,
          "warning"
        );
      }
      if (errorOccurred) {
        showMessage(
          "Des erreurs sont survenues lors de l'ajout de certains congés payés.",
          "error"
        );
      }
    },
    [
      canAddPaidLeave,
      showMessage,
      activitiesByDay,
      onAddActivity,
      currentMonth,
      isPublicHoliday,
      paidLeaveTypeId,
    ]
  );

  const handleDayClick = useCallback(
    (dayDate) => {
      if (isDeletingActivity) {
        console.log(
          "[CraBoard - DEBUG] handleDayClick: Ignoré car une suppression est en cours. isDeletingActivity:",
          isDeletingActivity
        );
        return;
      }
      console.log(
        `[CraBoard - DEBUG] handleDayClick appelé pour le jour: ${
          isValid(dayDate) ? format(dayDate, "yyyy-MM-dd") : "Invalid Date"
        }`
      );

      if (readOnly) {
        showMessage(
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
      const existingActivitiesForDay = activitiesByDay.get(dateKey);

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
          showMessage(
            `Activité CRA verrouillée: le rapport est au statut '${craReportStatus}'. Modification impossible.`,
            "info"
          );
          return;
        }
        if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
          showMessage(
            `Activité Congé Payé verrouillée: le rapport est au statut '${paidLeaveReportStatus}'. Modification impossible.`,
            "info"
          );
          return;
        }

        if (!isActivityStatusEditable) {
          showMessage(
            `Activité verrouillée: statut '${activity.status}'. Modification impossible.`,
            "info"
          );
          return;
        }

        setSelectedDate(dayDate);
        setEditingActivity(activity);
        setIsModalOpen(true);
        console.log(
          `[CraBoard - DEBUG] handleDayClick: Modal ouvert pour le jour: ${
            isValid(dayDate) ? format(dayDate, "yyyy-MM-dd") : "Invalid Date"
          } (édition)`
        );
      } else {
        if (!canAddCRA) {
          showMessage(
            "Impossible d'ajouter des activités. Le rapport CRA est déjà en attente de révision, validé ou finalisé.",
            "info"
          );
          return;
        }
        setSelectedDate(dayDate);
        setEditingActivity(null);
        setIsModalOpen(true);
        console.log(
          `[CraBoard - DEBUG] handleDayClick: Modal ouvert pour le jour: ${
            isValid(dayDate) ? format(dayDate, "yyyy-MM-dd") : "Invalid Date"
          } (nouvelle activité)`
        );
      }
    },
    [
      showMessage,
      activitiesByDay,
      canAddCRA,
      readOnly,
      isCraEditable,
      isPaidLeaveEditable,
      paidLeaveTypeId,
      craReportStatus,
      paidLeaveReportStatus,
      isDeletingActivity,
      setIsModalOpen,
      setEditingActivity,
      setSelectedDate,
    ]
  );

  const handleMouseDown = useCallback(
    (e, dayDate) => {
      e.preventDefault();
      e.stopPropagation();
      if (
        readOnly ||
        !isPaidLeaveEditable ||
        (isValid(dayDate) &&
          isValid(currentMonth) &&
          !isSameMonth(dayDate, currentMonth))
      ) {
        if (readOnly) {
          showMessage(
            "Le glisser-déposer est désactivé en mode lecture seule.",
            "info"
          );
        } else if (!isPaidLeaveEditable) {
          showMessage(
            "Impossible d'ajouter des congés. Le rapport de congés payés est déjà en attente de révision, validé ou finalisé.",
            "info"
          );
        }
        return;
      }

      setIsMouseDownForDrag(true);
      setDragStartDay(dayDate);
      setTempSelectedDays([dayDate]);
      lastMouseDownDay.current = dayDate;
    },
    [readOnly, currentMonth, isPaidLeaveEditable, showMessage]
  );

  const handleMouseEnter = useCallback(
    (dayDate) => {
      if (isMouseDownForDrag && dragStartDay) {
        if (!isDragging) {
          setIsDragging(true);
        }
        const start = isBefore(dragStartDay, dayDate) ? dragStartDay : dayDate;
        const end = isBefore(dragStartDay, dayDate) ? dayDate : dragStartDay;
        const days = eachDayOfInterval({ start, end });
        const filteredDays = days.filter(
          (d) =>
            isValid(d) && isValid(currentMonth) && isSameMonth(d, currentMonth)
        );
        setTempSelectedDays(filteredDays);
      }
    },
    [isMouseDownForDrag, isDragging, dragStartDay, currentMonth]
  );

  const handleMouseUp = useCallback(async () => {
    if (!isMouseDownForDrag) return;
    setIsMouseDownForDrag(false);
    if (isDragging) {
      if (tempSelectedDays.length > 0) {
        await handleAddPaidLeave(tempSelectedDays);
      }
    } else {
      if (isDeletingActivity) {
        console.log(
          "[CraBoard - DEBUG] handleMouseUp: Ignoré car une suppression est en cours. isDeletingActivity:",
          isDeletingActivity
        );
        return;
      }
      console.log("[CraBoard - DEBUG] handleMouseUp: Appel de handleDayClick.");
      if (lastMouseDownDay.current) {
        handleDayClick(lastMouseDownDay.current);
      }
    }
    setIsDragging(false);
    setDragStartDay(null);
    setTempSelectedDays([]);
    lastMouseDownDay.current = null;
  }, [
    isMouseDownForDrag,
    isDragging,
    tempSelectedDays,
    handleAddPaidLeave,
    handleDayClick,
    isDeletingActivity,
  ]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp]);

  const handleActivityClick = useCallback(
    (activity) => {
      if (isDeletingActivity) {
        console.log(
          "[CraBoard - DEBUG] handleActivityClick: Ignoré car une suppression est en cours. isDeletingActivity:",
          isDeletingActivity
        );
        return;
      }
      console.log(
        `[CraBoard - DEBUG] handleActivityClick appelé pour l'activité ID: ${activity.id}, Nom: ${activity.name}`
      );

      if (readOnly) {
        showMessage(
          "La modification d'activité est désactivée en mode lecture seule.",
          "info"
        );
        return;
      }

      const currentActivity = activities.find((a) => a.id === activity.id);
      if (!currentActivity) {
        console.warn(
          `[CraBoard - DEBUG] handleActivityClick: Activité ID ${activity.id} non trouvée dans l'état actuel, annulation de l'ouverture du modal.`
        );
        showMessage("L'activité n'existe plus ou a été supprimée.", "error");
        setIsModalOpen(false);
        setEditingActivity(null);
        return;
      }

      if (String(currentActivity.user_id) !== String(userId)) {
        showMessage(
          "Vous ne pouvez pas modifier ou supprimer les activités des autres utilisateurs.",
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
        showMessage(
          `Activité CRA verrouillée: le rapport est au statut '${craReportStatus}'. Modification ou suppression impossible.`,
          "info"
        );
        return;
      }
      if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
        showMessage(
          `Activité Congé Payé verrouillée: le rapport est au statut '${paidLeaveReportStatus}'. Modification ou suppression impossible.`,
          "info"
        );
        return;
      }

      if (!isActivityStatusEditable) {
        showMessage(
          `Activité verrouillée: statut '${currentActivity.status}'. Modification ou suppression impossible.`,
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
        showMessage(
          "Erreur: Date d'activité existante invalide. Impossible de modifier.",
          "error"
        );
        return;
      }
      setSelectedDate(new Date(currentActivity.date_activite));
      setEditingActivity(currentActivity);
      setIsModalOpen(true);
      console.log(
        `[CraBoard - DEBUG] handleActivityClick: Modal ouvert pour l'activité ID: ${currentActivity.id}`
      );
    },
    [
      showMessage,
      userId,
      readOnly,
      isCraEditable,
      isPaidLeaveEditable,
      paidLeaveTypeId,
      craReportStatus,
      paidLeaveReportStatus,
      activities,
      isDeletingActivity,
      setIsModalOpen,
      setEditingActivity,
      setSelectedDate,
    ]
  );

  const handleCloseActivityModal = useCallback(() => {
    console.log(
      "[CraBoard - DEBUG] handleCloseActivityModal: Fermeture du modal d'activité."
    );
    setIsModalOpen(false);
    setEditingActivity(null);
  }, []);

  const handleSaveActivity = useCallback(
    async (activityData) => {
      if (readOnly) {
        showMessage(
          "L'opération de sauvegarde est désactivée en mode lecture seule.",
          "info"
        );
        return;
      }

      const isCRAActivity =
        String(activityData.type_activite) !== String(paidLeaveTypeId);
      const isPaidLeaveActivity =
        String(activityData.type_activite) === String(paidLeaveTypeId);

      if (isCRAActivity && !isCraEditable) {
        showMessage(
          "Impossible de sauvegarder cette activité. Le rapport CRA est déjà en attente de révision, validé ou finalisé.",
          "info"
        );
        return;
      }
      if (isPaidLeaveActivity && !isPaidLeaveEditable) {
        showMessage(
          "Impossible de sauvegarder cette activité. Le rapport de congés payés est déjà en attente de révision, validé ou finalisé.",
          "info"
        );
        return;
      }

      try {
        const payload = {
          ...activityData,
          user_id: userId,
          date_activite: activityData.date_activite
            ? format(activityData.date_activite, "yyyy-MM-dd")
            : null,
          status: editingActivity ? activityData.status : "draft",
        };
        if (editingActivity) {
          await onUpdateActivity(editingActivity.id, payload);
          showMessage("Activité modifiée avec succès !", "success");
        } else {
          await onAddActivity(payload);
          showMessage("Activité ajoutée avec succès !", "success");
        }
        if (!readOnly && fetchActivitiesForMonth) {
          fetchActivitiesForMonth(currentMonth);
        }
      } catch (error) {
        console.error(
          "CraBoard: Erreur lors de la sauvegarde de l'activité:",
          error
        );
        showMessage(`Échec de la sauvegarde: ${error.message}`, "error");
      } finally {
        setIsModalOpen(false);
        setEditingActivity(null);
      }
    },
    [
      editingActivity,
      onAddActivity,
      onUpdateActivity,
      showMessage,
      fetchActivitiesForMonth,
      currentMonth,
      userId,
      readOnly,
      isCraEditable,
      isPaidLeaveEditable,
      paidLeaveTypeId,
    ]
  );

  const requestDeleteFromCalendar = useCallback(
    async (activityId, event) => {
      event.stopPropagation();
      console.log(
        `[CraBoard - DEBUG] requestDeleteFromCalendar appelé pour l'activité ID: ${activityId}`
      );

      if (readOnly) {
        showMessage(
          "La suppression d'activité est désactivée en mode lecture seule.",
          "info"
        );
        return;
      }

      const activity = activities.find((act) => act.id === activityId);
      if (!activity) {
        console.error("Activité non trouvée pour la suppression:", activityId);
        showMessage("Activité introuvable pour la suppression.", "error");
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
        showMessage(
          `Activité CRA verrouillée: le rapport est au statut '${craReportStatus}'. Suppression impossible.`,
          "info"
        );
        return;
      }
      if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
        showMessage(
          `Activité Congé Payé verrouillée: le rapport est au statut '${paidLeaveReportStatus}'. Suppression impossible.`,
          "info"
        );
        return;
      }

      if (!isActivityStatusEditable) {
        showMessage(
          `Activité verrouillée: statut '${activity.status}'. Suppression impossible.`,
          "info"
        );
        return;
      }
      if (String(activity.user_id) !== String(userId)) {
        showMessage(
          "Vous ne pouvez pas supprimer les activités des autres utilisateurs.",
          "error"
        );
        return;
      }

      try {
        setIsModalOpen(false);
        setEditingActivity(null);

        setIsDeletingActivity(true);
        if (deletionTimeoutRef.current) {
          clearTimeout(deletionTimeoutRef.current);
        }

        await onDeleteActivity(activityId);
        console.log(
          `[CraBoard - DEBUG] requestDeleteFromCalendar: Suppression de l'activité ID ${activityId} réussie.`
        );
        showMessage("Activité supprimée avec succès !", "success");
        if (!readOnly && fetchActivitiesForMonth) {
          fetchActivitiesForMonth(currentMonth);
        }
      } catch (error) {
        console.error(
          "CraBoard: Erreur lors de la suppression de l'activité (depuis calendrier):",
          error
        );
        showMessage(`Erreur de suppression: ${error.message}`, "error");
      } finally {
        setIsDeletingActivity(false);
        console.log(
          "[CraBoard - DEBUG] isDeletingActivity réinitialisé dans finally de requestDeleteFromCalendar."
        );
      }
    },
    [
      activities,
      showMessage,
      userId,
      readOnly,
      isCraEditable,
      isPaidLeaveEditable,
      paidLeaveTypeId,
      craReportStatus,
      paidLeaveReportStatus,
      onDeleteActivity,
      fetchActivitiesForMonth,
      currentMonth,
      setIsDeletingActivity,
      setIsModalOpen,
      setEditingActivity,
    ]
  );

  const confirmDeleteActivity = useCallback(async () => {
    setShowConfirmModal(false);
    if (readOnly) {
      showMessage(
        "L'opération de suppression est désactivée en mode lecture seule.",
        "info"
      );
      return;
    }

    if (activityToDelete) {
      try {
        setIsModalOpen(false);
        setEditingActivity(null);

        setIsDeletingActivity(true);
        if (deletionTimeoutRef.current) {
          clearTimeout(deletionTimeoutRef.current);
        }

        const activity = activities.find((act) => act.id === activityToDelete);
        const isActivityStatusEditable = ["draft", "rejected"].includes(
          activity.status
        );

        const isCRAActivityType =
          String(activity.type_activite) !== String(paidLeaveTypeId);
        const isPaidLeaveActivityType =
          String(activity.type_activite) === String(paidLeaveTypeId);

        if (isCRAActivityType && !isCraEditable) {
          showMessage(
            `Activité CRA verrouillée: le rapport est au statut '${craReportStatus}'. Suppression impossible.`,
            "info"
          );
          return;
        }
        if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
          showMessage(
            `Activité Congé Payé verrouillée: le rapport est au statut '${paidLeaveReportStatus}'. Suppression impossible.`,
            "info"
          );
          return;
        }

        if (!isActivityStatusEditable) {
          showMessage(
            `Activité verrouillée: statut '${activity.status}'. Suppression impossible.`,
            "info"
          );
          return;
        }

        await onDeleteActivity(activityToDelete);
        showMessage("Activité supprimée avec succès !", "success");
        if (!readOnly && fetchActivitiesForMonth) {
          fetchActivitiesForMonth(currentMonth);
        }
      } catch (error) {
        console.error(
          "CraBoard: Erreur lors de la suppression de l'activité:",
          error
        );
        showMessage(`Erreur de suppression: ${error.message}`, "error");
      } finally {
        setActivityToDelete(null);
        setIsDeletingActivity(false);
      }
    }
  }, [
    activityToDelete,
    onDeleteActivity,
    showMessage,
    fetchActivitiesForMonth,
    currentMonth,
    readOnly,
    activities,
    isCraEditable,
    isPaidLeaveEditable,
    paidLeaveTypeId,
    craReportStatus,
    paidLeaveReportStatus,
    setIsDeletingActivity,
    setIsModalOpen,
    setEditingActivity,
  ]);

  const cancelDeleteActivity = useCallback(() => {
    setShowConfirmModal(false);
    setActivityToDelete(null);
  }, []);

  const requestResetMonth = useCallback(() => {
    if (readOnly) {
      showMessage(
        "L'opération de réinitialisation est désactivée en mode lecture seule.",
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
      showMessage(
        "Impossible de réinitialiser le mois. Un rapport (CRA ou Congés) est déjà validé, en attente de révision ou finalisé. Seul un administrateur peut annuler ces statuts.",
        "info"
      );
      return;
    }
    setShowResetMonthConfirmModal(true);
  }, [craReportStatus, paidLeaveReportStatus, showMessage, readOnly]);

  const confirmResetMonth = useCallback(async () => {
    setShowResetMonthConfirmModal(false);
    if (readOnly) {
      showMessage(
        "L'opération de réinitialisation est désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    const activitiesToReset = activitiesForCurrentMonth.filter(
      (activity) =>
        activity.status === "draft" || activity.status === "rejected"
    );
    if (activitiesToReset.length === 0) {
      showMessage(
        `Aucune activité brouillon ou rejetée à réinitialiser pour ${
          isValid(currentMonth)
            ? format(currentMonth, "MMMM ", { locale: fr })
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
        setIsDeletingActivity(true);
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
        setIsDeletingActivity(false);
      }
    }
    fetchActivitiesForMonth(currentMonth);
  }, [
    activitiesForCurrentMonth,
    onDeleteActivity,
    showMessage,
    currentMonth,
    fetchActivitiesForMonth,
    readOnly,
    setIsDeletingActivity,
  ]);

  const cancelResetMonth = useCallback(() => {
    setShowResetMonthConfirmModal(false);
  }, []);

  const sendActivities = useCallback(
    async (activitiesToSubmit, reportType) => {
      if (readOnly) {
        showMessage(
          `L'opération d'envoi pour ${
            reportType === "cra" ? "CRA" : "Congés"
          } est désactivée en mode lecture seule.`,
          "info"
        );
        return;
      }

      if (reportType === "cra" && !isCraEditable) {
        showMessage(
          "Impossible d'envoyer le CRA. Le rapport est déjà en attente de révision, validé ou finalisé.",
          "info"
        );
        return;
      }
      if (reportType === "paid_leave" && !isPaidLeaveEditable) {
        showMessage(
          "Impossible d'envoyer le rapport de congés payés. Il est déjà en attente de révision, validé ou finalisé.",
          "info"
        );
        return;
      }

      if (activitiesToSubmit.length === 0) {
        showMessage(
          `Aucune activité brouillon ou rejetée de ${
            reportType === "cra" ? "CRA" : "Congés Payés"
          } à envoyer.`,
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
        showMessage(
          `Un rapport de type "${reportType}" est déjà en statut "${existingReport.status}". Impossible de l'envoyer à nouveau.`,
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
      } catch (error) {
        console.error(
          `CraBoard: Erreur lors de l'envoi du rapport mensuel ${reportType}:`,
          error
        );
      }
    },
    [
      readOnly,
      showMessage,
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

  const requestSendCRA = useCallback(() => {
    if (!isCraEditable) {
      showMessage(
        "Impossible d'envoyer le CRA. Le rapport est déjà en attente de révision, validé ou finalisé.",
        "info"
      );
      return;
    }

    const craActivitiesToSend = craActivitiesForCurrentMonth.filter(
      (a) => a.status === "draft" || a.status === "rejected"
    );
    if (craActivitiesToSend.length === 0) {
      showMessage(
        "Aucune activité CRA brouillon ou rejetée à envoyer ce mois-ci.",
        "info"
      );
      return;
    }

    setConfirmingActionType("cra");
    setShowSendConfirmModal(true);
  }, [isCraEditable, showMessage, craActivitiesForCurrentMonth]);

  const requestSendPaidLeaves = useCallback(() => {
    if (!isPaidLeaveEditable) {
      showMessage(
        "Impossible d'envoyer les congés. Le rapport de congés payés est déjà en attente de révision, validé ou finalisé.",
        "info"
      );
      return;
    }

    const paidLeaveActivitiesToSend = paidLeaveActivitiesForCurrentMonth.filter(
      (a) => a.status === "draft" || a.status === "rejected"
    );
    if (paidLeaveActivitiesToSend.length === 0) {
      showMessage(
        "Aucune activité de congés payés brouillon ou rejetée à envoyer ce mois-ci.",
        "info"
      );
      return;
    }

    setConfirmingActionType("paid_leave");
    setShowSendConfirmModal(true);
  }, [isPaidLeaveEditable, showMessage, paidLeaveActivitiesForCurrentMonth]);

  const handleConfirmSend = useCallback(() => {
    setShowSendConfirmModal(false);
    if (confirmingActionType === "cra") {
      const activitiesToSubmit = craActivitiesForCurrentMonth.filter(
        (a) => a.status === "draft" || a.status === "rejected"
      );
      sendActivities(activitiesToSubmit, "cra");
    } else if (confirmingActionType === "paid_leave") {
      const activitiesToSubmit = paidLeaveActivitiesForCurrentMonth.filter(
        (a) => a.status === "draft" || a.status === "rejected"
      );
      sendActivities(activitiesToSubmit, "paid_leave");
    }
    setConfirmingActionType(null);
  }, [
    confirmingActionType,
    sendActivities,
    craActivitiesForCurrentMonth,
    paidLeaveActivitiesForCurrentMonth,
  ]);

  const handleCancelSend = useCallback(() => {
    setShowSendConfirmModal(false);
    setConfirmingActionType(null);
  }, []);

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
          : "Invalid Date"
      );
      fetchActivitiesForMonth(currentMonth);
    }
  }, [currentMonth, fetchActivitiesForMonth, readOnly]);

  const getMessageClasses = (type) => {
    switch (type) {
      case "success":
        return "bg-green-100 border-green-400 text-green-700";
      case "error":
        return "bg-red-100 border-red-400 text-red-700";
      case "info":
        return "bg-blue-100 border-blue-400 text-blue-700";
      case "warning":
        return "bg-yellow-100 border-yellow-400 text-yellow-700";
      default:
        return "bg-gray-100 border-gray-400 text-gray-700";
    }
  };

  return (
    <div
      className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8"
      ref={craBoardRef}
    >
      {/* Tailwind CSS and Font Imports */}
      <script src="https://cdn.tailwindcss.com"></script>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>
        {`
          body {
            font-family: 'Inter', sans-serif;
          }
          /* Custom scrollbar for activity list in calendar days */
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

      <CraControls
        currentMonth={currentMonth}
        userFirstName={userFirstName}
        craReportStatus={craReportStatus}
        paidLeaveReportStatus={paidLeaveReportStatus}
        readOnly={readOnly}
        isCraEditable={isCraEditable}
        isPaidLeaveEditable={isPaidLeaveEditable}
        goToPreviousMonth={goToPreviousMonth}
        goToNextMonth={goToNextMonth}
        handleToggleSummaryReport={handleToggleSummaryReport}
        showSummaryReport={showSummaryReport}
        requestSendCRA={requestSendCRA}
        requestSendPaidLeaves={requestSendPaidLeaves}
        requestResetMonth={requestResetMonth}
        craDraftsCount={
          craActivitiesForCurrentMonth.filter(
            (a) => a.status === "draft" || a.status === "rejected"
          ).length
        }
        paidLeaveDraftsCount={
          paidLeaveActivitiesForCurrentMonth.filter(
            (a) => a.status === "draft" || a.status === "rejected"
          ).length
        }
      />

      <CraSummary
        totalWorkingDaysInMonth={totalWorkingDaysInMonth}
        totalActivitiesTimeInMonth={totalActivitiesTimeInMonth}
        timeDifference={timeDifference}
      />

      {/* Display messages for CRA Report Status */}
      {craReportStatus === "rejected" && craReport?.rejectionReason && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4">
          <strong className="font-bold">Rapport CRA Rejeté:</strong>
          <span className="block sm:inline ml-2">
            {craReport.rejectionReason}
          </span>
        </div>
      )}
      {craReportStatus === "validated" && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative mb-4">
          <strong className="font-bold">Rapport CRA Validé:</strong>
          <span className="block sm:inline ml-2">
            Votre rapport CRA a été validé avec succès.
          </span>
        </div>
      )}
      {craReportStatus === "pending_review" && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md relative mb-4">
          <strong className="font-bold">
            Rapport CRA en attente de révision:
          </strong>
          <span className="block sm:inline ml-2">
            Votre rapport CRA a été envoyé et est en attente de révision.
          </span>
        </div>
      )}

      {/* Display messages for Paid Leave Report Status */}
      {paidLeaveReportStatus === "rejected" &&
        paidLeaveReport?.rejectionReason && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4">
            <strong className="font-bold">
              Rapport de Congés Payés Rejeté:
            </strong>
            <span className="block sm:inline ml-2">
              {paidLeaveReport.rejectionReason}
            </span>
          </div>
        )}
      {paidLeaveReportStatus === "validated" && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative mb-4">
          <strong className="font-bold">Rapport de Congés Payés Validé:</strong>
          <span className="block sm:inline ml-2">
            Votre rapport de congés payés a été validé avec succès.
          </span>
        </div>
      )}
      {paidLeaveReportStatus === "pending_review" && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md relative mb-4">
          <strong className="font-bold">
            Rapport de Congés Payés en attente de révision:
          </strong>
          <span className="block sm:inline ml-2">
            Votre rapport de congés payés a été envoyé et est en attente de
            révision.
          </span>
        </div>
      )}

      {showSummaryReport && summaryReportMonth && (
        <SummaryReport
          isOpen={showSummaryReport}
          onClose={handleToggleSummaryReport}
          activities={activitiesForCurrentMonth}
          currentMonth={summaryReportMonth}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          totalWorkingDays={totalWorkingDaysInMonth}
          totalActivitiesTime={totalActivitiesTimeInMonth}
          timeDifference={timeDifference}
          isPublicHoliday={isPublicHoliday}
          userFirstName={userFirstName}
          onOpenMonthlyReportPreview={handleOpenMonthlyReportPreview}
        />
      )}

      <CraCalendar
        currentMonth={currentMonth}
        activitiesByDay={activitiesByDay}
        activityTypeDefinitions={activityTypeDefinitions}
        clientDefinitions={clientDefinitions}
        isPublicHoliday={isPublicHoliday}
        readOnly={readOnly}
        isCraEditable={isCraEditable}
        isPaidLeaveEditable={isPaidLeaveEditable}
        isDragging={isDragging}
        tempSelectedDays={tempSelectedDays}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onDayClick={handleDayClick}
        onActivityClick={handleActivityClick}
        requestDeleteFromCalendar={requestDeleteFromCalendar}
        showMessage={showMessage}
        userId={userId}
        userFirstName={userFirstName}
        paidLeaveTypeId={paidLeaveTypeId}
      />

      {isModalOpen && (
        <ActivityModal
          key={
            editingActivity
              ? editingActivity.id
              : `new-${
                  isValid(selectedDate) ? selectedDate.toISOString() : "invalid"
                }`
          }
          isOpen={isModalOpen}
          onClose={handleCloseActivityModal}
          onSave={handleSaveActivity}
          onDelete={onDeleteActivity}
          activity={editingActivity}
          initialDate={selectedDate}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          showMessage={showMessage}
          readOnly={readOnly || (!isCraEditable && !isPaidLeaveEditable)}
        />
      )}

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
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={cancelDeleteActivity}
        onConfirm={confirmDeleteActivity}
        message="Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible."
      />
      <ConfirmationModal
        isOpen={showResetMonthConfirmModal}
        onClose={cancelResetMonth}
        onConfirm={confirmResetMonth}
        message={`Confirmer la suppression de TOUTES les activités brouillon et rejetées pour ${
          isValid(currentMonth)
            ? format(currentMonth, "MMMM yyyy", { locale: fr })
            : "ce mois"
        }. Cette action est irréversible.`}
      />

      <ConfirmationModal
        isOpen={showSendConfirmModal}
        onClose={handleCancelSend}
        onConfirm={handleConfirmSend}
        message={`Confirmer l'envoi des ${
          confirmingActionType === "cra" ? "CRAs" : "Congés Payés"
        }? Une fois envoyés, vous ne pourrez plus les modifier.`}
      />
    </div>
  );
}
