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
  onSendMonthlyReport,
}) {
  console.log("[CraBoard] --- Rendering CraBoard (Top of component) ---");
  console.log(
    "[CraBoard] Props received: activities.length:",
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
  console.log("[CraBoard] monthlyReports received:", monthlyReports);

  // --- 1. State and reference declarations (useState, useRef) ---
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

  const [draggedActivity, setDraggedActivity] = useState(null);
  const [isDraggingActivity, setIsDraggingActivity] = useState(false);
  const [isValidDropTarget, setIsValidDropTarget] = useState(false);

  const [isDraggingMultiSelect, setIsDraggingMultiSelect] = useState(false);
  const [dragStartDayForSelection, setDragStartDayForSelection] =
    useState(null);

  // Initialise le mode de sélection multiple à 'activity' par défaut
  const [multiSelectType, setMultiSelectType] = useState("activity");

  const craBoardRef = useRef(null);

  const localShowMessage =
    showMessage ||
    ((msg, type) => console.log(`[Message ${type.toUpperCase()}]: ${msg}`));

  // --- 2. Basic useCallback functions (minimal dependencies) ---

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
            errorData.message || "Failed to fetch public holidays."
          );
        }
        const data = await response.json();
        setPublicHolidays(
          data.map((holiday) => startOfDay(new Date(holiday.date)))
        );
      } catch (err) {
        console.error("CraBoard: Error fetching public holidays:", err);
        localShowMessage(
          `Unable to load public holidays: ${err.message}`,
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
      "[CraBoard - DEBUG] handleCloseActivityModal: Resetting activity form."
    );
    setIsModalOpen(false);
    setEditingActivity(null);
    setSelectedDate(new Date());
    setTempSelectedDays([]); // <-- C'est ici que tempSelectedDays est effacé
  }, []);

  // --- Memoized values (useMemo) ---
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
   * Handles saving an activity (either adding a new one or updating an existing one).
   * This is called from the ActivityModal.
   * @param {Object} activityData - The data of the new activity.
   */
  const handleSaveActivity = useCallback(
    async (activityData) => {
      if (readOnly) {
        localShowMessage(
          "Save operation is disabled in read-only mode.",
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
          "Cannot save this activity. The CRA report is already pending review, validated, or finalized.",
          "info"
        );
        return;
      }
      if (isPaidLeaveActivity && !isPaidLeaveEditable) {
        localShowMessage(
          "Cannot save this activity. The paid leave report is already pending review, validated, or finalized.",
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
          // If activityData has an ID, it's an update
          const originalActivity = activities.find(
            (a) => String(a.id) === String(activityData.id)
          );
          if (!originalActivity) {
            localShowMessage(
              "Original activity not found for update.",
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
              `Updating this activity to ${
                payload.temps_passe
              }j would exceed the 1-day limit for ${format(
                targetDate,
                "dd/MM/yyyy"
              )}. Current total: ${totalTimeExcludingEdited.toFixed(1)}j.`,
              "error"
            );
            return;
          }

          await onUpdateActivity(activityData.id, payload);
          localShowMessage("Activité sauvegardée avec succès!", "success");
        } else {
          // It's a new activity
          const daysToProcess =
            tempSelectedDays.length > 0
              ? tempSelectedDays
              : selectedDate
              ? [selectedDate]
              : [];

          if (daysToProcess.length === 0) {
            console.error("No days selected for activity creation.");
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
                `Adding ${payload.temps_passe}j to ${format(
                  day,
                  "dd/MM/yyyy"
                )} would exceed the 1-day limit for this day. Current total: ${existingTimeOnDay.toFixed(
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
                `Attempted to add normal activity on a non-working day (multi-selection): ${format(
                  day,
                  "yyyy-MM-dd"
                )}. Ignored.`
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
                `Error adding activity for day ${format(day, "yyyy-MM-dd")}:`,
                error
              );
              errorCount++;
            }
          }
          if (successCount > 0) {
            localShowMessage(
              `Added ${successCount} activities successfully! ${
                errorCount > 0
                  ? `(${errorCount} failures on non-working days or others)`
                  : ""
              }`,
              errorCount > 0 ? "warning" : "success"
            );
          } else if (errorCount > 0) {
            localShowMessage("Failed to add all selected activities.", "error");
          }
        }
      } catch (error) {
        console.error("CraBoard: Error saving activity:", error);
        localShowMessage(`Save failed: ${error.message}`, "error");
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
      activities, // Added for originalActivity lookup
      activitiesByDay, // Added for existing activities lookup
    ]
  );

  /**
   * Handles the request to delete an activity (opens the confirmation modal).
   * @param {string} activityId - The ID of the activity to delete.
   * @param {Event} event - The click event.
   */
  const requestDeleteFromCalendar = useCallback(
    async (activityId, event) => {
      event.stopPropagation();
      console.log(
        `[CraBoard - DEBUG] requestDeleteFromCalendar called for activity ID: ${activityId}`
      );

      if (readOnly) {
        localShowMessage(
          "Activity deletion is disabled in read-only mode.",
          "info"
        );
        return;
      }

      const activity = activities.find(
        (act) => String(act.id) === String(activityId)
      );
      if (!activity) {
        console.error("Activity not found for deletion:", activityId);
        localShowMessage("Activity not found for deletion.", "error");
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
          `CRA activity locked: report status is '${craReportStatus}'. Deletion impossible.`,
          "info"
        );
        return;
      }
      if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
        localShowMessage(
          `Paid Leave activity locked: report status is '${paidLeaveReportStatus}'. Deletion impossible.`,
          "info"
        );
        return;
      }

      if (!isActivityStatusEditable) {
        localShowMessage(
          `Activity locked: status '${activity.status}'. Deletion impossible.`,
          "info"
        );
        return;
      }
      if (String(activity.user_id) !== String(userId)) {
        localShowMessage("You cannot delete other users' activities.", "error");
        return;
      }

      setActivityToDelete(activity);
      setShowConfirmModal(true);
      setConfirmingActionType("deleteActivity");
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
      setActivityToDelete,
      setShowConfirmModal,
      setConfirmingActionType,
    ]
  );

  /**
   * Confirms and executes activity deletion.
   */
  const confirmDeleteActivity = useCallback(async () => {
    setShowConfirmModal(false);
    setConfirmingActionType(null);

    if (readOnly) {
      localShowMessage(
        "Delete operation is disabled in read-only mode.",
        "info"
      );
      return;
    }

    if (!activityToDelete) {
      console.error("No activity to delete in state.");
      localShowMessage("No activity selected for deletion.", "error");
      return;
    }

    const isActivityStatusEditable = ["draft", "rejected"].includes(
      activityToDelete.status
    );

    const isCRAActivityType =
      String(activityToDelete.type_activite) !== String(paidLeaveTypeId);
    const isPaidLeaveActivityType =
      String(activityToDelete.type_activite) === String(paidLeaveTypeId);

    if (isCRAActivityType && !isCraEditable) {
      localShowMessage(
        `CRA activity locked: report status is '${craReportStatus}'. Deletion impossible.`,
        "info"
      );
      return;
    }
    if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
      localShowMessage(
        `Paid Leave activity locked: report status is '${paidLeaveReportStatus}'. Deletion impossible.`,
        "info"
      );
      return;
    }

    if (!isActivityStatusEditable) {
      localShowMessage(
        `Activity locked: status '${activityToDelete.status}'. Deletion impossible.`,
        "info"
      );
      return;
    }
    if (String(activityToDelete.user_id) !== String(userId)) {
      localShowMessage("You cannot delete other users' activities.", "error");
      return;
    }

    try {
      setEditingActivity(null);

      setIsDeletingActivityFlag(true);
      if (deletionTimeoutRef.current) {
        clearTimeout(deletionTimeoutRef.current);
      }

      await onDeleteActivity(activityToDelete.id);
      localShowMessage("Activity deleted successfully!", "success");
      if (!readOnly && fetchActivitiesForMonth) {
        fetchActivitiesForMonth(currentMonth);
      }
    } catch (error) {
      console.error("CraBoard: Error deleting activity:", error);
      localShowMessage(`Deletion failed: ${error.message}`, "error");
    } finally {
      setActivityToDelete(null);
      deletionTimeoutRef.current = setTimeout(() => {
        setIsDeletingActivityFlag(false);
      }, 500);
    }
  }, [
    activityToDelete,
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
  ]);

  /**
   * Handles clicking on a calendar day cell. Opens the ActivityModal form for creation or editing.
   * This function is ALWAYS active for single-day interaction.
   * @param {Date} dayDate - The date of the clicked day.
   * @param {Event} e - The mouse click event.
   */
  const handleDayClick = useCallback(
    (dayDate, e) => {
      // Ignore if a drag (individual activity or multi-select) is in progress
      if (
        isDraggingActivity ||
        isDeletingActivityFlag ||
        isDraggingMultiSelect
      ) {
        console.log(
          "[CraBoard - DEBUG] handleDayClick: Ignored due to ongoing drag/deletion."
        );
        return;
      }
      // Ignore if the click originates from an activity item (handled by handleActivityClick)
      if (e && e.target.closest(".cra-activity-item")) {
        console.log(
          "[CraBoard - DEBUG] handleDayClick: Ignored because click originates from an activity."
        );
        return;
      }

      console.log(
        `[CraBoard - DEBUG] handleDayClick (single-day mode) called for day: ${
          isValid(dayDate) ? format(dayDate, "yyyy-MM-dd") : "Invalid Date"
        }`
      );

      if (readOnly) {
        localShowMessage(
          "Activity modification is disabled in read-only mode.",
          "info"
        );
        return;
      }

      const dateKey = isValid(dayDate) ? format(dayDate, "yyyy-MM-dd") : null;
      if (!dateKey) {
        console.error("handleDayClick: Invalid date received.");
        return;
      }
      const existingActivitiesForDay = activitiesByDay.get(dateKey);
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
            `CRA activity locked: report status is '${craReportStatus}'. Modification impossible.`,
            "info"
          );
          return;
        }
        if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
          localShowMessage(
            `Paid Leave activity locked: report status is '${paidLeaveReportStatus}'. Modification impossible.`,
            "info"
          );
          return;
        }

        if (!isActivityStatusEditable) {
          localShowMessage(
            `Activity locked: status '${activity.status}'. Modification impossible.`,
            "info"
          );
          return;
        }
        if (String(activity.user_id) !== String(userId)) {
          localShowMessage(
            "You cannot modify other users' activities.",
            "error"
          );
          return;
        }

        setSelectedDate(dayDate);
        setEditingActivity(activity);
        setTempSelectedDays([]);
        setIsModalOpen(true);
        console.log(
          `[CraBoard - DEBUG] handleDayClick: Form opened for day: ${format(
            dayDate,
            "yyyy-MM-dd"
          )} (editing)`
        );
      } else {
        // MODIFIÉ: Vérifier la limite de 1 jour avant d'ouvrir la modale pour un NOUVEL ajout
        if (totalTimeForDay >= 1) {
          localShowMessage(
            "You have already reached the maximum of 1 day for this date. Please modify an existing activity or delete one to add a new one.",
            "warning"
          );
          return;
        }
        if (!isCraEditable && !isPaidLeaveEditable) {
          localShowMessage(
            "Cannot add activities. CRA and Paid Leave reports are already pending review, validated, or finalized.",
            "info"
          );
          return;
        }
        setSelectedDate(dayDate);
        setEditingActivity(null);
        setTempSelectedDays([]);
        setIsModalOpen(true);
        console.log(
          `[CraBoard - DEBUG] handleDayClick: Form opened for day: ${format(
            dayDate,
            "yyyy-MM-dd"
          )} (new activity)`
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
   * Handles clicking on an existing activity item (for editing/deletion).
   * This function is ALWAYS active.
   * @param {Object} activity - The clicked activity object.
   */
  const handleActivityClick = useCallback(
    (activity) => {
      // Ignore if a drag (individual activity or multi-select) is in progress
      if (
        isDeletingActivityFlag ||
        isDraggingActivity ||
        isDraggingMultiSelect
      ) {
        console.log(
          "[CraBoard - DEBUG] handleActivityClick: Ignored due to ongoing drag/deletion."
        );
        return;
      }
      console.log(
        `[CraBoard - DEBUG] handleActivityClick called for activity ID: ${activity.id}`
      );

      if (readOnly) {
        localShowMessage(
          "Activity modification is disabled in read-only mode.",
          "info"
        );
        return;
      }

      const currentActivity = activities.find(
        (a) => String(a.id) === String(activity.id)
      );
      if (!currentActivity) {
        console.warn(
          `[CraBoard - DEBUG] handleActivityClick: Activity ID ${activity.id} not found in current state, canceling form opening.`
        );
        localShowMessage(
          "Activity no longer exists or has been deleted.",
          "error"
        );
        setEditingActivity(null);
        return;
      }

      if (String(currentActivity.user_id) !== String(userId)) {
        localShowMessage(
          "You cannot modify or delete other users' activities.",
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
          `CRA activity locked: report status is '${craReportStatus}'. Modification or deletion impossible.`,
          "info"
        );
        return;
      }
      if (isPaidLeaveActivityType && !isPaidLeaveEditable) {
        localShowMessage(
          `Paid Leave activity locked: report status is '${paidLeaveReportStatus}'. Modification or deletion impossible.`,
          "info"
        );
        return;
      }

      if (!isActivityStatusEditable) {
        localShowMessage(
          `Activity locked: status '${currentActivity.status}'. Modification or deletion impossible.`,
          "info"
        );
        return;
      }

      if (
        !currentActivity.date_activite ||
        !isValid(new Date(currentActivity.date_activite))
      ) {
        console.error(
          "CraBoard: Invalid activity date from database",
          currentActivity.date_activite
        );
        localShowMessage(
          "Error: Invalid existing activity date. Cannot modify.",
          "error"
        );
        return;
      }
      setSelectedDate(new Date(currentActivity.date_activite));
      setEditingActivity(currentActivity);
      setTempSelectedDays([]);
      setIsModalOpen(true);
      console.log(
        `[CraBoard - DEBUG] handleActivityClick: Form opened for activity ID: ${currentActivity.id}`
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
   * Handles the start of dragging an individual activity.
   * This function is ALWAYS active.
   * @param {Event} e - The drag event.
   * @param {Object} activity - The activity being dragged.
   */
  const handleDragStartActivity = useCallback(
    (e, activity) => {
      // If multi-select mode is active, prevent individual D&D
      if (multiSelectType !== "activity" && multiSelectType !== "paid_leave") {
        localShowMessage(
          "Le glisser-déposer d'activité est désactivé en mode de sélection multiple.",
          "info"
        );
        e.preventDefault();
        return;
      }
      // Ensure multi-day selection is not active when starting an individual activity drag
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
        console.log("Drag started for activity:", activity.id);
      } else {
        e.preventDefault();
        localShowMessage("Cannot drag this activity.", "info");
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
   * Handles hovering over a day cell during an activity drag.
   * This function is ALWAYS active.
   * @param {Event} e - The drag event.
   * @param {Date} day - The date of the hovered day.
   */
  const handleDragOverDay = useCallback(
    (e, day) => {
      // This handler should only be active for individual activity D&D
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
   * Handles dropping an activity onto a day cell.
   * This function is ALWAYS active.
   * @param {Event} e - The drop event.
   * @param {Date} targetDay - The target day's date.
   */
  const handleDropActivity = useCallback(
    async (e, targetDay) => {
      // This handler should only be active for individual activity D&D
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
        localShowMessage("Activity to move not found.", "error");
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
          "Cannot move activity here (incorrect month).",
          "warning"
        );
        return;
      }

      const isCRAActivityType = !isDraggedActivityPaidLeave;
      if (isCRAActivityType && !isCraEditable) {
        localShowMessage(
          "Cannot move this CRA activity. The report is locked.",
          "info"
        );
        return;
      }
      if (isDraggedActivityPaidLeave && !isPaidLeaveEditable) {
        localShowMessage(
          "Cannot move this leave. The leave report is locked.",
          "info"
        );
        return;
      }
      if (!["draft", "rejected"].includes(activityToMove.status)) {
        localShowMessage(
          "Cannot move this activity. Its status does not allow it.",
          "info"
        );
        return;
      }

      if (isSameDay(new Date(activityToMove.date_activite), targetDay)) {
        localShowMessage("The activity is already on this date.", "info");
        return;
      }

      // NOUVEAU: Vérification de la limite de 1 jour lors du DROP
      const targetDateKey = format(targetDay, "yyyy-MM-dd");
      const activitiesOnTargetDay = activitiesByDay.get(targetDateKey) || [];
      const totalTimeExcludingMoved = activitiesOnTargetDay
        .filter((a) => String(a.id) !== String(activityToMove.id)) // Exclure l'activité déplacée de son ancienne position
        .reduce((sum, act) => sum + (parseFloat(act.temps_passe) || 0), 0);
      const newTotalTimeForDay =
        totalTimeExcludingMoved + (parseFloat(activityToMove.temps_passe) || 0);

      if (newTotalTimeForDay > 1) {
        localShowMessage(
          `Moving this activity to ${format(
            targetDay,
            "dd/MM/yyyy"
          )} would exceed the 1-day limit. Current total: ${totalTimeExcludingMoved.toFixed(
            1
          )}j.`,
          "error"
        );
        return;
      }
      // FIN NOUVEAU

      if (isDropAllowed) {
        const newDate = startOfDay(targetDay);
        const updatedActivityData = {
          ...activityToMove,
          date_activite: newDate,
          override_non_working_day: newOverrideNonWorkingDay,
        };
        await onUpdateActivity(activityToMove.id, updatedActivityData);
        localShowMessage("Activité déplacée avec succès!", "success");
      } else {
        if (isTargetNonWorkingDay) {
          if (
            isDraggedActivityPaidLeave &&
            !activityToMove.override_non_working_day
          ) {
            localShowMessage(
              "This leave cannot be moved to a weekend or public holiday without override.",
              "warning"
            );
          } else if (!isDraggedActivityPaidLeave) {
            localShowMessage(
              "Cannot move a normal activity to a weekend or public holiday.",
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
      activitiesByDay, // Added for new drop logic
    ]
  );

  /**
   * Handles the start of a mouse click for multi-day selection.
   * This function is ONLY active if multiSelectType is 'activity' or 'paid_leave'.
   * @param {Event} e - The mouse event.
   * @param {Date} day - The date of the clicked day.
   */
  const handleMouseDownMultiSelect = useCallback(
    (e, day) => {
      // Le mode multi-sélection est toujours actif ('activity' ou 'paid_leave')
      // Empêcher la sélection multiple si le mode lecture seule est actif, ou si un glisser-déposer/suppression est en cours
      if (readOnly || isDraggingActivity || isDeletingActivityFlag) {
        console.log(
          "[CraBoard - handleMouseDownMultiSelect] Blocked by readOnly, isDraggingActivity or isDeletingActivityFlag."
        );
        return;
      }
      // Empêcher la sélection multiple si aucun des rapports n'est modifiable
      if (!isCraEditable && !isPaidLeaveEditable) {
        localShowMessage("Cannot select days, reports are locked.", "info");
        console.log(
          "[CraBoard - handleMouseDownMultiSelect] Blocked by non-editable reports."
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
          "[CraBoard - handleMouseDownMultiSelect] Blocked by non-working day for activity multi-select."
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
          `Cannot start multi-day selection on ${format(
            day,
            "dd/MM/yyyy"
          )}. This day already has 1 day of activities.`,
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
          "[CraBoard - handleMouseDownMultiSelect] Multi-day selection started."
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
   * Handles hovering over a cell during multi-day selection.
   * This function is ONLY active if multiSelectType is 'activity' or 'paid_leave'.
   * @param {Date} day - The date of the hovered day.
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
   * Handles the end of multi-day selection (mouse release).
   * Triggers the appropriate action based on `multiSelectType`.
   * This function is ONLY active if multiSelectType is 'activity' or 'paid_leave'.
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
                `Cannot add paid leave to ${format(
                  day,
                  "dd/MM/yyyy"
                )}. This day already has 1 day of activities.`,
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
                `Error adding paid leave for day ${format(day, "yyyy-MM-dd")}:`,
                error
              );
              errorCount++;
            }
          }
          if (successCount > 0) {
            localShowMessage(
              `Added ${successCount} paid leaves successfully! ${
                errorCount > 0 ? `(${errorCount} failures)` : ""
              }`,
              errorCount > 0 ? "warning" : "success"
            );
          } else if (errorCount > 0) {
            localShowMessage("Failed to add paid leaves.", "error");
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
          "[CraBoard - handleMouseUpMultiSelect] No multi-day selection to finalize."
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

  const requestResetMonth = useCallback(() => {
    if (readOnly) {
      localShowMessage(
        "Reset operation is disabled in read-only mode.",
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
        "Cannot reset month. A report (CRA or Leave) is already validated, pending review, or finalized. Only an administrator can cancel these statuses.",
        "info"
      );
      return;
    }
    setShowResetMonthConfirmModal(true);
  }, [craReportStatus, paidLeaveReportStatus, localShowMessage, readOnly]);

  const confirmResetMonth = useCallback(async () => {
    setShowResetMonthConfirmModal(false);
    if (readOnly) {
      localShowMessage(
        "Reset operation is disabled in read-only mode.",
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
        `No draft or rejected activities to reset for ${
          isValid(currentMonth)
            ? format(currentMonth, "MMMM yyyy", { locale: fr })
            : "this month"
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
          `CraBoard: Error deleting activity ${activity.id} during reset:`,
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
      `Reset completed: ${successCount} activities deleted, ${errorCount} errors.`,
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

  const sendActivities = useCallback(
    async (activitiesToSubmit, reportType) => {
      if (readOnly) {
        localShowMessage(
          `Submission operation for ${
            reportType === "cra" ? "CRA" : "Leaves"
          } is disabled in read-only mode.`,
          "info"
        );
        return;
      }

      if (reportType === "cra" && !isCraEditable) {
        localShowMessage(
          "Cannot submit CRA. The report is already pending review, validated, or finalized.",
          "info"
        );
        return;
      }
      if (reportType === "paid_leave" && !isPaidLeaveEditable) {
        localShowMessage(
          "Cannot submit paid leave report. It is already pending review, validated, or finalized.",
          "info"
        );
        return;
      }

      if (activitiesToSubmit.length === 0) {
        localShowMessage(
          `No draft or rejected ${
            reportType === "cra" ? "CRA" : "Paid Leave"
          } activities to submit.`,
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
          `A "${reportType}" report is already in "${existingReport.status}" status. Cannot submit again.`,
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
          `Report ${reportType} submitted successfully!`,
          "success"
        );
        fetchActivitiesForMonth(currentMonth);
      } catch (error) {
        console.error(
          `CraBoard: Error submitting monthly report ${reportType}:`,
          error
        );
        localShowMessage(
          `Failed to submit report ${reportType}: ${error.message}`,
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

  const requestSendCRA = useCallback(() => {
    if (!isCraEditable) {
      localShowMessage(
        "Cannot submit CRA. The report is already pending review, validated, or finalized.",
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
        "No draft or rejected CRA activities to submit this month.",
        "info"
      );
      return;
    }

    setConfirmingActionType("cra");
    setShowSendConfirmModal(true);
  }, [
    isCraEditable,
    localShowMessage,
    activitiesForCurrentMonth,
    paidLeaveTypeId,
  ]);

  const requestSendPaidLeaves = useCallback(() => {
    if (!isPaidLeaveEditable) {
      localShowMessage(
        "Cannot submit leaves. The paid leave report is already pending review, validated, or finalized.",
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
        "No draft or rejected paid leave activities to submit this month.",
        "info"
      );
      return;
    }

    setConfirmingActionType("paid_leave");
    setShowSendConfirmModal(true);
  }, [
    isPaidLeaveEditable,
    localShowMessage,
    activitiesForCurrentMonth,
    paidLeaveTypeId,
  ]);

  const handleConfirmSend = useCallback(() => {
    setShowSendConfirmModal(false);
    if (confirmingActionType === "cra") {
      const activitiesToSubmit = activitiesForCurrentMonth.filter(
        (a) =>
          String(a.type_activite) !== String(paidLeaveTypeId) &&
          (a.status === "draft" || a.status === "rejected")
      );
      sendActivities(activitiesToSubmit, "cra");
    } else if (confirmingActionType === "paid_leave") {
      const activitiesToSubmit = activitiesForCurrentMonth.filter(
        (a) =>
          String(a.type_activite) === String(paidLeaveTypeId) &&
          (a.status === "draft" || a.status === "rejected")
      );
      sendActivities(activitiesToSubmit, "paid_leave");
    }
    setConfirmingActionType(null);
  }, [
    confirmingActionType,
    sendActivities,
    activitiesForCurrentMonth,
    paidLeaveTypeId,
  ]);

  // MODIFIÉ: Fonction pour basculer entre les modes de sélection multiple (uniquement 'activity' et 'paid_leave')
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

  // --- 5. Side effects (useEffect) ---

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
        "[CraBoard] useEffect: Calling fetchActivitiesForMonth for",
        isValid(currentMonth)
          ? format(currentMonth, "MMMM yyyy")
          : "Invalid Date"
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

  const cancelDeleteActivity = useCallback(() => {
    setShowConfirmModal(false);
    setActivityToDelete(null);
    setConfirmingActionType(null);
  }, []);

  const cancelResetMonth = useCallback(() => {
    setShowResetMonthConfirmModal(false);
  }, []);

  const handleCancelSend = useCallback(() => {
    setShowSendConfirmModal(false);
    setConfirmingActionType(null);
  }, []);

  const handleSendReportConfirmation = useCallback(
    (reportType) => {
      if (reportType === "cra") {
        requestSendCRA();
      } else if (reportType === "paid_leave") {
        requestSendPaidLeaves();
      }
    },
    [requestSendCRA, requestSendPaidLeaves]
  );

  // --- Component Render ---
  if (!isValid(currentMonth)) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600">
        Error: Invalid month date.
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
        Your CRA Calendar - {format(currentMonth, "MMMM yyyy", { locale: fr })}
      </h2>

      {readOnly && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 mb-6 rounded-md">
          <p className="font-semibold">Read-Only Mode :</p>
          <p>
            This calendar is in read-only mode. You cannot create, modify or
            delete activities.
          </p>
          {hasRejectedReport && rejectionReason && (
            <p className="mt-2 font-medium text-red-700">
              Rejection Reason : {rejectionReason}
            </p>
          )}
        </div>
      )}

      {/* Calendar navigation controls */}
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
        requestSendCRA={requestSendCRA}
        requestSendPaidLeaves={requestSendPaidLeaves}
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

      {/* Display of report statuses for the current month */}
      {!readOnly && (
        <CraSummary
          craReport={craReport}
          paidLeaveReport={paidLeaveReport}
          isCraEditable={isCraEditable}
          isPaidLeaveEditable={isPaidLeaveEditable}
          onSendMonthlyReport={handleSendReportConfirmation}
          rejectionReason={rejectionReason}
          totalWorkingDaysInMonth={totalWorkingDaysInMonth}
          totalActivitiesTimeInMonth={totalActivitiesTimeInMonth}
          timeDifference={timeDifference}
        />
      )}

      {/* Activity Modal (rendu conditionnellement) */}
      {isModalOpen && (
        <ActivityModal
          onClose={handleCloseActivityModal}
          onSave={handleSaveActivity}
          onDelete={confirmDeleteActivity}
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

      {/* Calendar grid */}
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
        requestDeleteFromCalendar={requestDeleteFromCalendar}
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
      />

      {/* Confirmation modal (for activity deletion) */}
      {showConfirmModal && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={cancelDeleteActivity}
          onConfirm={confirmDeleteActivity}
          message={`Are you sure you want to delete the activity of ${format(
            new Date(activityToDelete.date_activite),
            "dd/MM/yyyy",
            { locale: fr }
          )} - ${activityToDelete.description_activite} (${
            activityToDelete.temps_passe
          }j)?`}
        />
      )}

      {/* Month reset confirmation modal */}
      {showResetMonthConfirmModal && (
        <ConfirmationModal
          isOpen={showResetMonthConfirmModal}
          onClose={cancelResetMonth}
          onConfirm={confirmResetMonth}
          message={`Confirm deletion of ALL draft and rejected activities for ${
            isValid(currentMonth)
              ? format(currentMonth, "MMMM yyyy", { locale: fr })
              : "this month"
          }. This action is irreversible.`}
        />
      )}

      {/* Report submission confirmation modal */}
      {showSendConfirmModal && (
        <ConfirmationModal
          isOpen={showSendConfirmModal}
          onClose={handleCancelSend}
          onConfirm={handleConfirmSend}
          message={`Confirm submission of ${
            confirmingActionType === "cra" ? "CRAs" : "Paid Leaves"
          }? Once submitted, you will no longer be able to modify them.`}
        />
      )}

      {/* Monthly report preview modal */}
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

      {/* Summary report modal */}
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