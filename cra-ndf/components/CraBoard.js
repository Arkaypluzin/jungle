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
  getDaysInMonth,
  startOfWeek,
  endOfWeek,
  addDays,
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
import SummaryReport from "./SummaryReport"; // Keep if used elsewhere or for summary modal

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
  monthlyReports = [], // NEW: Receive monthly reports (can be one or many)
  rejectionReason = null, // NEW: Receive rejection reason
}) {
  console.log("[CraBoard] --- Rendu du CraBoard ---");
  console.log(
    "[CraBoard] Props reçues: activities.length:",
    activities.length,
    "userId:",
    userId,
    "currentMonth:",
    format(propCurrentMonth, "yyyy-MM-dd"),
    "readOnly:",
    readOnly
  );
  console.log("[CraBoard] monthlyReports reçus:", monthlyReports);

  const [currentMonth, setCurrentMonth] = useState(propCurrentMonth);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [publicHolidays, setPublicHolidays] = useState([]);

  // States for confirmation modals
  const [showConfirmModal, setShowConfirmModal] = useState(false); // For activity deletion
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [showResetMonthConfirmModal, setShowResetMonthConfirmModal] =
    useState(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false); // Used for direct sending
  const [confirmingActionType, setConfirmingActionType] = useState(null); // 'sendCRA', 'sendPaidLeaves'

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
    // Ensure currentMonth is a valid Date object before setting it
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
      setCurrentMonth(new Date()); // Fallback to current date if prop is invalid
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
      format(currentMonth, "yyyy-MM-dd")
    );

    const filtered = activities.filter((activity) => {
      const isUserMatch = String(activity.user_id) === String(userId);
      const isDateValid =
        activity.date_activite && isValid(activity.date_activite);
      const isMonthMatch =
        isDateValid && isSameMonth(activity.date_activite, currentMonth);

      // Log each activity's filter status
      if (!isUserMatch) {
        console.log(
          `  - Activité ID ${activity.id || "N/A"}: Utilisateur (${
            activity.user_id
          }) ne correspond pas à ${userId}`
        );
      }
      if (!isDateValid) {
        console.log(
          `  - Activité ID ${activity.id || "N/A"}: Date invalide (${
            activity.date_activite
          })`
        );
      }
      if (isDateValid && !isMonthMatch) {
        console.log(
          `  - Activité ID ${activity.id || "N/A"}: Mois (${format(
            activity.date_activite,
            "yyyy-MM"
          )}) ne correspond pas à ${format(currentMonth, "yyyy-MM")}`
        );
      }

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
      if (activity.date_activite && isValid(activity.date_activite)) {
        // Ensure date is valid before formatting
        const dateKey = format(activity.date_activite, "yyyy-MM-dd");
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

  // Specific statuses for CRA and Paid Leave reports for the current month
  const { craReport, paidLeaveReport } = useMemo(() => {
    // When readOnly is true (from ReceivedCras), monthlyReports will contain only the single report being viewed.
    // In this case, we want to use that specific report's status.
    if (readOnly && monthlyReports.length === 1) {
      const singleReport = monthlyReports[0];
      if (singleReport.report_type === "cra") {
        return { craReport: singleReport, paidLeaveReport: null };
      } else if (singleReport.report_type === "paid_leave") {
        return { craReport: null, paidLeaveReport: singleReport };
      }
    }

    // Otherwise, for the user's own CRA management, find reports for the current month.
    const currentMonthCraReport = monthlyReports.find(
      (report) =>
        String(report.user_id) === String(userId) &&
        report.month === currentMonth.getMonth() + 1 &&
        report.year === currentMonth.getFullYear() &&
        report.report_type === "cra"
    );
    const currentMonthPaidLeaveReport = monthlyReports.find(
      (report) =>
        String(report.user_id) === String(userId) &&
        report.month === currentMonth.getMonth() + 1 &&
        report.year === currentMonth.getFullYear() &&
        report.report_type === "paid_leave"
    );

    return {
      craReport: currentMonthCraReport,
      paidLeaveReport: currentMonthPaidLeaveReport,
    };
  }, [monthlyReports, userId, currentMonth, readOnly]); // Added readOnly to dependencies

  const craReportStatus = craReport ? craReport.status : "empty";
  const paidLeaveReportStatus = paidLeaveReport
    ? paidLeaveReport.status
    : "empty";

  console.log("[CraBoard] craReportStatus:", craReportStatus);
  console.log("[CraBoard] paidLeaveReportStatus:", paidLeaveReportStatus);

  const calculateCurrentMonthOverallStatus = useCallback(() => {
    // This is an overall status for display, not for add permissions
    if (activitiesForCurrentMonth.length === 0) return "empty";
    const statuses = new Set(activitiesForCurrentMonth.map((a) => a.status));
    if (statuses.has("validated")) return "validated";
    if (statuses.has("rejected")) return "rejected";
    if (statuses.has("pending_review")) return "pending_review";
    if (statuses.has("finalized")) return "finalized"; // Keep for old reports
    if (statuses.size === 1 && statuses.has("draft")) return "draft";
    return "mixed";
  }, [activitiesForCurrentMonth]);

  const currentMonthOverallStatus = useMemo(
    () => calculateCurrentMonthOverallStatus(),
    [calculateCurrentMonthOverallStatus]
  );

  // NEW: Effect for one-time rejection/validation notification
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
          message = `Votre rapport de ${type} pour ${format(
            currentMonth,
            "MMMM yyyy",
            { locale: fr }
          )} a été REJETÉ. Motif: ${report.rejectionReason}`;
          messageType = "error";
        } else if (report.status === "validated") {
          message = `Votre rapport de ${type} pour ${format(
            currentMonth,
            "MMMM yyyy",
            { locale: fr }
          )} a été VALIDÉ avec succès.`;
          messageType = "success";
        }

        if (message) {
          showMessage(message, messageType, 8000); // Display longer for important notifications
          localStorage.setItem(notificationKey, "true");
        }
      }
    };

    // Only notify if not in readOnly mode (i.e., when managing own CRA)
    if (!readOnly) {
      notifyReportStatus(craReport, "CRA"); // Use craReport from useMemo
      notifyReportStatus(paidLeaveReport, "congés payés"); // Use paidLeaveReport from useMemo
    }
  }, [craReport, paidLeaveReport, currentMonth, showMessage, readOnly]); // Dependencies updated

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
        date_activite: activity.date_activite, // Already a Date object
        activity_type_name_full: activityType
          ? activityType.name
          : "Type Inconnu",
        client_name_full: client ? client.nom_client : "Client Inconnu",
      };
    });
    setMonthlyReportPreviewData({
      reportData: formattedReportData,
      year: currentMonth.getFullYear(),
      month: currentMonth.getMonth() + 1,
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

  // Determine if adding activities is allowed for CRA or Paid Leave based on report status
  const canAddCRA = useMemo(() => {
    // Allow adding if not readOnly AND report is NOT pending_review, validated, or finalized.
    // If rejected, adding new CRA activities is allowed to correct the report.
    return (
      !readOnly &&
      !["pending_review", "validated", "finalized"].includes(craReportStatus)
    );
  }, [readOnly, craReportStatus]);

  const canAddPaidLeave = useMemo(() => {
    // Allow adding if not readOnly AND report is NOT pending_review, validated, or finalized.
    // If rejected, adding new paid leaves is allowed to correct the report.
    return (
      !readOnly &&
      !["pending_review", "validated", "finalized"].includes(
        paidLeaveReportStatus
      )
    );
  }, [readOnly, paidLeaveReportStatus]);

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
        const formattedDate = format(dateForLeave, "yyyy-MM-dd");
        const existingActivitiesForDay = activitiesByDay.get(formattedDate);
        const isWeekendDay = isWeekend(dateForLeave, { weekStartsOn: 1 });
        const isPublicHolidayDay = isPublicHoliday(dateForLeave);
        const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;
        const shouldOverrideNonWorkingDay = isNonWorkingDay;

        if (
          (existingActivitiesForDay && existingActivitiesForDay.length > 0) ||
          !isSameMonth(dateForLeave, currentMonth)
        ) {
          skipCount++;
          continue;
        }

        const newLeaveActivity = {
          date_activite: formattedDate, // Send as string to API
          temps_passe: 1,
          description_activite: "Congé Payé",
          type_activite: paidLeaveTypeId,
          client_id: null,
          override_non_working_day: shouldOverrideNonWorkingDay,
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
      isWeekend,
      isPublicHoliday,
      paidLeaveTypeId,
    ]
  );

  const handleDayClick = useCallback(
    (dayDate) => {
      const dateKey = format(dayDate, "yyyy-MM-dd");
      const existingActivitiesForDay = activitiesByDay.get(dateKey);

      if (existingActivitiesForDay && existingActivitiesForDay.length > 0) {
        // If activity exists, allow modification only if not readOnly AND activity status allows
        if (readOnly) {
          showMessage(
            "La modification d'activité est désactivée en mode lecture seule.",
            "info"
          );
          return;
        }
        const activity = existingActivitiesForDay[0];
        // An activity can be modified/deleted if it's a draft OR if it's rejected.
        // It CANNOT be modified/deleted if finalized, validated, or pending_review.
        if (
          activity.status === "finalized" ||
          activity.status === "validated" ||
          activity.status === "pending_review"
        ) {
          showMessage(
            "Activité verrouillée: statut finalisé, validé ou en attente. Modification impossible.",
            "info"
          );
          return;
        }
        setSelectedDate(dayDate);
        setEditingActivity(activity);
        setIsModalOpen(true);
      } else {
        // If no activity, allow adding only if canAddCRA
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
      }
    },
    [showMessage, activitiesByDay, canAddCRA, readOnly]
  );

  const handleMouseDown = useCallback(
    (e, dayDate) => {
      e.preventDefault();
      e.stopPropagation();
      if (readOnly || !isSameMonth(dayDate, currentMonth)) {
        return;
      }
      // Removed the canAddPaidLeave check here to prevent premature messages.
      // The check will happen in handleAddPaidLeave when the drag is confirmed.

      setIsMouseDownForDrag(true);
      setDragStartDay(dayDate);
      setTempSelectedDays([dayDate]);
      lastMouseDownDay.current = dayDate;
    },
    [readOnly, currentMonth]
  ); // Removed canAddPaidLeave, showMessage from dependencies

  const handleMouseEnter = useCallback(
    (dayDate) => {
      if (isMouseDownForDrag && dragStartDay) {
        if (!isDragging) {
          setIsDragging(true);
        }
        const start = dragStartDay < dayDate ? dragStartDay : dayDate;
        const end = dragStartDay < dayDate ? dayDate : dragStartDay;
        const days = eachDayOfInterval({ start, end });
        const filteredDays = days.filter((d) => isSameMonth(d, currentMonth));
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
        // This is where the actual attempt to add paid leave happens
        await handleAddPaidLeave(tempSelectedDays);
      }
    } else {
      // This is a simple click, delegate to handleDayClick
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
  ]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp]);

  const handleActivityClick = useCallback(
    (activity) => {
      if (readOnly) {
        showMessage(
          "La modification d'activité est désactivée en mode lecture seule.",
          "info"
        );
        return;
      }
      if (String(activity.user_id) !== String(userId)) {
        showMessage(
          "Vous ne pouvez pas modifier ou supprimer les activités des autres utilisateurs.",
          "error"
        );
        return;
      }
      // An activity can be modified/deleted if it's a draft OR if it's rejected.
      // It CANNOT be modified/deleted if finalized, validated, or pending_review.
      if (
        activity.status === "finalized" ||
        activity.status === "validated" ||
        activity.status === "pending_review"
      ) {
        showMessage(
          "Activité verrouillée: statut finalisé, validé ou en attente. Modification ou suppression impossible.",
          "info"
        );
        return;
      }
      if (!activity.date_activite || !isValid(activity.date_activite)) {
        console.error(
          "CraBoard: Date d'activité invalide depuis la base de données",
          activity.date_activite
        );
        showMessage(
          "Erreur: Date d'activité existante invalide. Impossible de modifier.",
          "error"
        );
        return;
      }
      setSelectedDate(activity.date_activite);
      setEditingActivity(activity);
      setIsModalOpen(true);
    },
    [showMessage, userId, readOnly]
  );

  const handleCloseActivityModal = useCallback(() => {
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

      if (isCRAActivity && !canAddCRA) {
        showMessage(
          "Impossible de sauvegarder cette activité. Le rapport CRA est déjà en attente de révision, validé ou finalisé.",
          "info"
        );
        return;
      }
      if (isPaidLeaveActivity && !canAddPaidLeave) {
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
        };
        if (editingActivity) {
          await onUpdateActivity(editingActivity.id, payload);
          showMessage("Activité modifiée avec succès !", "success");
        } else {
          await onAddActivity(payload);
          showMessage("Activité ajoutée avec succès !", "success");
        }
        handleCloseActivityModal();
        // Only fetch activities if not in readOnly mode (i.e., not viewing a received report)
        if (!readOnly && fetchActivitiesForMonth) {
          fetchActivitiesForMonth(currentMonth);
        }
      } catch (error) {
        console.error(
          "CraBoard: Erreur lors de la sauvegarde de l'activité:",
          error
        );
        showMessage(`Échec de la sauvegarde: ${error.message}`, "error");
      }
    },
    [
      editingActivity,
      onAddActivity,
      onUpdateActivity,
      showMessage,
      handleCloseActivityModal,
      fetchActivitiesForMonth,
      currentMonth,
      userId,
      readOnly,
      canAddCRA,
      canAddPaidLeave,
      paidLeaveTypeId,
    ]
  );

  const requestDeleteFromCalendar = useCallback(
    (activityId, event) => {
      event.stopPropagation();
      if (readOnly) {
        showMessage(
          "La suppression d'activité est désactivée en mode lecture seule.",
          "info"
        );
        return;
      }
      const activity = activities.find((act) => act.id === activityId);
      if (
        activity.status === "finalized" ||
        activity.status === "validated" ||
        activity.status === "pending_review"
      ) {
        showMessage(
          "Activité verrouillée: statut finalisé, validé ou en attente. Suppression impossible.",
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
      setActivityToDelete(activityId);
      setShowConfirmModal(true);
    },
    [activities, showMessage, userId, readOnly]
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
        await onDeleteActivity(activityToDelete);
        showMessage("Activité supprimée avec succès !", "success");
        // Only fetch activities if not in readOnly mode
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
      }
    }
  }, [
    activityToDelete,
    onDeleteActivity,
    showMessage,
    fetchActivitiesForMonth,
    currentMonth,
    readOnly,
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
    // Month reset should only be possible if NO report (CRA or Leave) is
    // validated, rejected, or pending_review.
    if (
      ["validated", "pending_review"].includes(craReportStatus) ||
      ["validated", "pending_review"].includes(paidLeaveReportStatus)
    ) {
      showMessage(
        "Impossible de réinitialiser le mois. Un rapport (CRA ou Congés) est déjà validé ou en attente de révision. Seul un administrateur peut annuler ces statuts.",
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
      (activity) => activity.status === "draft"
    );
    if (activitiesToReset.length === 0) {
      showMessage(
        `Aucune activité brouillon à réinitialiser pour ${format(
          currentMonth,
          "MMMM ",
          { locale: fr }
        )}.`,
        "info"
      );
      return;
    }
    let successCount = 0;
    let errorCount = 0;
    for (const activity of activitiesToReset) {
      try {
        await onDeleteActivity(activity.id);
        successCount++;
      } catch (error) {
        console.error(
          `CraBoard: Erreur lors de la suppression de l'activité ${activity.id} pendant la réinitialisation:`,
          error
        );
        errorCount++;
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
  ]);

  const cancelResetMonth = useCallback(() => {
    setShowResetMonthConfirmModal(false);
  }, []);

  // Single send function (replaces finalization + send)
  const sendActivities = useCallback(
    async (activitiesToSend, reportType) => {
      if (readOnly) {
        showMessage(
          `L'opération d'envoi pour ${
            reportType === "cra" ? "CRA" : "Congés"
          } est désactivée en mode lecture seule.`,
          "info"
        );
        return;
      }
      if (activitiesToSend.length === 0) {
        showMessage(
          `Aucune activité brouillon de ${
            reportType === "cra" ? "CRA" : "Congés Payés"
          } à envoyer.`,
          "info"
        );
        return;
      }

      // Check if a report of the same type is already in "pending_review", "validated" or "rejected"
      const existingReportForType = monthlyReports.find(
        (report) =>
          String(report.user_id) === String(userId) &&
          report.month === currentMonth.getMonth() + 1 &&
          report.year === currentMonth.getFullYear() &&
          report.report_type === reportType
      );

      if (
        existingReportForType &&
        ["pending_review", "validated", "rejected"].includes(
          existingReportForType.status
        )
      ) {
        showMessage(
          `Un rapport '${
            reportType === "cra" ? "CRA" : "Congés Payés"
          }' pour ce mois est déjà au statut '${
            existingReportForType.status
          }'. Vous ne pouvez pas en envoyer un nouveau.`,
          "warning"
        );
        return;
      }

      // Update individual activity status from "draft" to "pending_review"
      for (const activity of activitiesToSend) {
        try {
          const payload = {
            ...activity,
            status: "pending_review",
            date_activite: activity.date_activite
              ? format(activity.date_activite, "yyyy-MM-dd")
              : null,
          };
          await onUpdateActivity(activity.id, payload, true);
        } catch (error) {
          console.error(
            `CraBoard: Erreur lors de la mise à jour du statut de l'activité pour ${
              reportType === "cra" ? "CRA" : "Congés Payés"
            } ${activity.id}:`,
            error
          );
          showMessage(
            `Erreur de mise à jour de l'activité ${activity.id}: ${error.message}`,
            "error"
          );
          return;
        }
      }

      const totalBillableDays = activitiesToSend.reduce((sum, activity) => {
        const activityType = activityTypeDefinitions.find(
          (def) => String(def.id) === String(activity.type_activite)
        );
        if (activityType?.is_billable) {
          return sum + (parseFloat(activity.temps_passe) || 0);
        }
        return sum;
      }, 0);

      const totalDaysWorked = activitiesToSend.reduce(
        (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
        0
      );

      const monthlyReportData = {
        user_id: userId,
        userName: userFirstName,
        month: currentMonth.getMonth() + 1,
        year: currentMonth.getFullYear(),
        total_days_worked: totalDaysWorked,
        total_billable_days: totalBillableDays,
        activities_snapshot: activitiesToSend.map((act) => act.id),
        status: "pending_review", // Ensure status is set correctly on creation/update
        report_type: reportType, // 'cra' or 'paid_leave'
      };

      console.log(
        `[CraBoard] sendActivities: Données du rapport mensuel pour ${
          reportType === "cra" ? "CRA" : "Congés Payés"
        } envoyées:`,
        JSON.stringify(monthlyReportData, null, 2)
      );

      try {
        const response = await fetch("/api/monthly_cra_reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(monthlyReportData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              `Échec de l'envoi du rapport mensuel ${
                reportType === "cra" ? "CRA" : "Congés Payés"
              }.`
          );
        }

        showMessage(
          `La demande de ${
            reportType === "cra" ? "CRA" : "Congés Payés"
          } pour ${format(currentMonth, "MMMM", {
            locale: fr,
          })} a été envoyée et le récapitulatif mensuel créé !`,
          "success"
        );
      } catch (reportError) {
        console.error(
          `CraBoard: Erreur lors de l'envoi du rapport mensuel ${
            reportType === "cra" ? "CRA" : "Congés Payés"
          }:`,
          reportError
        );
        showMessage(
          `Erreur lors de l'envoi du rapport mensuel ${
            reportType === "cra" ? "CRA" : "Congés Payés"
          }: ${reportError.message}`,
          "error"
        );
      }
      // Only fetch activities if not in readOnly mode (i.e., not viewing a received report)
      if (!readOnly && fetchActivitiesForMonth) {
        fetchActivitiesForMonth(currentMonth);
      }
    },
    [
      readOnly,
      showMessage,
      onUpdateActivity,
      activityTypeDefinitions,
      userId,
      userFirstName,
      currentMonth,
      fetchActivitiesForMonth,
      monthlyReports,
    ]
  );

  // Request functions for send buttons (now direct)
  const requestSendCRA = useCallback(() => {
    if (readOnly) {
      showMessage(
        "L'opération d'envoi de CRA est désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    const craDrafts = craActivitiesForCurrentMonth.filter(
      (a) => a.status === "draft"
    ); // Check drafts
    if (craDrafts.length === 0) {
      showMessage(
        "Aucune activité CRA brouillon à envoyer ce mois-ci.",
        "info"
      );
      return;
    }

    if (["pending_review", "validated", "rejected"].includes(craReportStatus)) {
      showMessage(
        `Un rapport CRA pour ce mois est déjà au statut '${craReportStatus}'. Vous ne pouvez pas en envoyer un nouveau.`,
        "warning"
      );
      return;
    }

    setConfirmingActionType("sendCRA");
    setShowSendConfirmModal(true);
  }, [readOnly, showMessage, craActivitiesForCurrentMonth, craReportStatus]);

  const requestSendPaidLeaves = useCallback(() => {
    if (readOnly) {
      showMessage(
        "L'opération d'envoi de congés est désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    const paidLeaveDrafts = paidLeaveActivitiesForCurrentMonth.filter(
      (a) => a.status === "draft"
    ); // Check drafts
    if (paidLeaveDrafts.length === 0) {
      showMessage(
        "Aucune activité de congés payés brouillon à envoyer ce mois-ci.",
        "info"
      );
      return;
    }

    if (
      ["pending_review", "rejected", "validated"].includes(
        paidLeaveReportStatus
      )
    ) {
      // 'validated' is included here to prevent sending new leave if already validated
      showMessage(
        `Un rapport de Congés Payés pour ce mois est déjà au statut '${paidLeaveReportStatus}'. Vous ne pouvez pas en envoyer un nouveau.`,
        "warning"
      );
      return;
    }

    setConfirmingActionType("sendPaidLeaves");
    setShowSendConfirmModal(true);
  }, [
    readOnly,
    showMessage,
    paidLeaveActivitiesForCurrentMonth,
    paidLeaveReportStatus,
  ]);

  const handleConfirmSend = useCallback(() => {
    setShowSendConfirmModal(false);
    if (confirmingActionType === "sendCRA") {
      sendActivities(
        craActivitiesForCurrentMonth.filter((a) => a.status === "draft"),
        "cra"
      ); // Send CRA drafts
    } else if (confirmingActionType === "sendPaidLeaves") {
      sendActivities(
        paidLeaveActivitiesForCurrentMonth.filter((a) => a.status === "draft"),
        "paid_leave"
      ); // Send leave drafts
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
    if (!isValid(currentMonth)) return 0; // Defensive check
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

  // Only fetch activities if not in readOnly mode
  useEffect(() => {
    if (
      !readOnly &&
      fetchActivitiesForMonth &&
      typeof fetchActivitiesForMonth === "function"
    ) {
      console.log(
        "[CraBoard] useEffect: Appel de fetchActivitiesForMonth pour",
        format(currentMonth, "MMMM yyyy")
      );
      fetchActivitiesForMonth(currentMonth);
    }
  }, [currentMonth, fetchActivitiesForMonth, readOnly]); // Added readOnly to dependencies

  return (
    <div
      className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8"
      ref={craBoardRef}
    >
      <CraControls
        currentMonth={currentMonth}
        userFirstName={userFirstName}
        // Pass specific report statuses for more accurate badge display
        craReportStatus={craReportStatus}
        paidLeaveReportStatus={paidLeaveReportStatus}
        readOnly={readOnly}
        goToPreviousMonth={goToPreviousMonth}
        goToNextMonth={goToNextMonth}
        handleToggleSummaryReport={handleToggleSummaryReport}
        showSummaryReport={showSummaryReport}
        requestSendCRA={requestSendCRA}
        requestSendPaidLeaves={requestSendPaidLeaves}
        requestResetMonth={requestResetMonth}
        craDraftsCount={
          craActivitiesForCurrentMonth.filter((a) => a.status === "draft")
            .length
        }
        paidLeaveDraftsCount={
          paidLeaveActivitiesForCurrentMonth.filter((a) => a.status === "draft")
            .length
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
          month={summaryReportMonth}
          activities={activitiesForCurrentMonth}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          totalWorkingDays={totalWorkingDaysInMonth}
          totalActivitiesTime={totalActivitiesTimeInMonth}
          timeDifference={timeDifference}
          isPublicHoliday={isPublicHoliday}
          userFirstName={userFirstName}
          onClose={handleToggleSummaryReport}
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
        isDragging={isDragging}
        tempSelectedDays={tempSelectedDays}
        handleMouseDown={handleMouseDown}
        handleMouseEnter={handleMouseEnter}
        handleDayClick={handleDayClick}
        handleActivityClick={handleActivityClick}
        requestDeleteFromCalendar={requestDeleteFromCalendar}
        showMessage={showMessage}
        userId={userId}
        userFirstName={userFirstName}
      />

      {isModalOpen && (
        <ActivityModal
          isOpen={isModalOpen}
          onClose={handleCloseActivityModal}
          onSave={handleSaveActivity}
          onDelete={confirmDeleteActivity}
          activity={editingActivity}
          initialDate={selectedDate}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          showMessage={showMessage}
          readOnly={readOnly}
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
        message={`Confirmer la suppression de TOUTES les activités brouillon pour ${format(
          currentMonth,
          "MMMM ",
          { locale: fr }
        )}. Cette action est irréversible.`}
      />

      {/* Confirmation for direct sending */}
      <ConfirmationModal
        isOpen={showSendConfirmModal}
        onClose={handleCancelSend}
        onConfirm={handleConfirmSend}
        message={`Confirmer l'envoi des ${
          confirmingActionType === "sendCRA" ? "CRAs" : "Congés Payés"
        }? Une fois envoyés, vous ne pourrez plus les modifier.`}
      />
    </div>
  );
}
