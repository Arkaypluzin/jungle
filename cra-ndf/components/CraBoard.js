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
  readOnly = false, // This prop is the global read-only status from the parent component
  monthlyReports = [],
  rejectionReason = null, // This prop is now used directly for the RO banner
  onSendMonthlyReport,
}) {
  console.log("[CraBoard] --- Rendering CraBoard component (Start) ---");
  console.log(
    "[CraBoard] Props received: activities.length:",
    activities.length,
    "User ID:",
    userId,
    "Current Month:",
    isValid(propCurrentMonth)
      ? format(propCurrentMonth, "yyyy-MM-dd")
      : "Invalid Date",
    "Read-only (global):",
    readOnly
  );
  console.log(
    "[CraBoard] Monthly reports received (monthlyReports prop):",
    monthlyReports
  );
  console.log("[CraBoard] rejectionReason prop (direct):", rejectionReason);

  // --- 1. State and Ref Declarations (useState, useRef) ---
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
  

  // NEW: State to manage single day selection lock
  const [isSingleDaySelectionLocked, setIsSingleDaySelectionLocked] =
    useState(false);

  // NEW: State for initial activity type filter in the modal
  const [initialActivityTypeFilter, setInitialActivityTypeFilter] = useState(null); // 'activity' or 'absence'

  const craBoardRef = useRef(null);
  // NEW REF: To track if the mouse button is down on a calendar day
  const isMouseDownOnCalendarDayRef = useRef(false);
  // NEW REF: To store initial click coordinates for drag detection
  const mouseDownCoordsRef = useRef({ x: 0, y: 0 });
  // Threshold in pixels to detect a drag (vs a simple click)
  const DRAG_THRESHOLD = 5;

  // Uses the showMessage prop if provided, otherwise simply logs
  const localShowMessage =
    showMessage ||
    ((msg, type) => console.log(`[Message ${type.toUpperCase()}]: ${msg}`));

  // --- 2. Basic useCallback Functions (minimal dependencies) ---

  const paidLeaveTypeId = useMemo(() => {
    const type = activityTypeDefinitions.find(
      (t) => t.name && t.name.toLowerCase().includes("congé payé")
    );
    return type ? type.id : null;
  }, [activityTypeDefinitions]);

  // Set of all activity type IDs considered as absences
  const absenceActivityTypeIds = useMemo(() => {
    const ids = new Set();
    const absenceKeywords = [
      "congé", "absence", "maladie", "formation", "vacances",
      "rtt", "arrêt", "maternité", "paternité", "familial",
      "exceptionnel", "ferié", "férié", "repos", "indisponibilité"
    ];

    if (!activityTypeDefinitions || activityTypeDefinitions.length === 0) {
      console.warn("absenceActivityTypeIds: activityTypeDefinitions is empty or undefined. Cannot identify absence types.");
      return ids;
    }

    activityTypeDefinitions.forEach(type => {
      // Prioritize the `is_absence` property if it exists and is true
      const isAbsenceBasedOnProperty = type.is_absence === true;
      // Fallback to keywords if `is_absence` is not explicitly true
      const isAbsenceBasedOnKeyword = !isAbsenceBasedOnProperty && type.name && absenceKeywords.some(keyword => type.name.toLowerCase().includes(keyword.toLowerCase()));

      if (isAbsenceBasedOnProperty || isAbsenceBasedOnKeyword) {
        ids.add(type.id);
      }
    });
    console.log("absenceActivityTypeIds: Identified absence activity type IDs:", Array.from(ids));
    return ids;
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
        console.error(
          "CraBoard: Error fetching public holidays:",
          err
        );
        localShowMessage(
          `Could not load public holidays: ${err.message}. Please try again.`,
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
    setTempSelectedDays([]); // <-- This is where tempSelectedDays is reset after modal closes
    // NEW: Reset single day selection lock
    setIsSingleDaySelectionLocked(false);
    setInitialActivityTypeFilter(null); // Reset modal filter
  }, []);

  // --- Memoized Values (useMemo) ---
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

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const startDisplay = startOfWeek(start, { weekStartsOn: 1 });
    const endDisplay = endOfWeek(end, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDisplay, end: endDisplay });
  }, [currentMonth]);

  // Calculation of activity and absence summaries for the current month
  const monthlySummary = useMemo(() => {
    const summary = {
      totalActivitiesTime: 0, // Total time for activities (excluding absences)
      totalActivitiesPending: 0,
      totalActivitiesValidated: 0,
      totalActivitiesDraft: 0,
      totalActivitiesRejected: 0,
      totalAbsenceDaysValidated: 0,
      totalAbsenceDaysPending: 0,
      totalAbsenceDaysDraft: 0,
      totalAbsenceDaysRejected: 0,
      totalBillableDays: 0,
      totalOvertimeDays: 0,
      totalWorkingDaysInMonth: 0, // Theoretical working days of the month
    };

    // Calculate theoretical working days
    summary.totalWorkingDaysInMonth = daysInMonth.filter(day =>
      !isWeekend(day, { weekStartsOn: 1 }) && !isPublicHoliday(day)
    ).length;

    activities.forEach(activity => {
      const activityTypeObj = activityTypeDefinitions.find(
        (type) => String(type.id) === String(activity.type_activite)
      );
      const tempsPasse = parseFloat(activity.temps_passe) || 0;
      const isAbsence = absenceActivityTypeIds.has(String(activity.type_activite));

      if (isAbsence) {
        // Accumulate absences by status
        if (activity.status === "validated") {
          summary.totalAbsenceDaysValidated += tempsPasse;
        } else if (activity.status === "pending_review") {
          summary.totalAbsenceDaysPending += tempsPasse;
        } else if (activity.status === "draft") {
          summary.totalAbsenceDaysDraft += tempsPasse;
        } else if (activity.status === "rejected") {
          summary.totalAbsenceDaysRejected += tempsPasse;
        }
      } else {
        // Accumulate time for NON-ABSENCE activities
        summary.totalActivitiesTime += tempsPasse;

        // Accumulate NON-ABSENCE activities by status
        if (activity.status === "pending_review") {
          summary.totalActivitiesPending += tempsPasse;
        } else if (activity.status === "validated") {
          summary.totalActivitiesValidated += tempsPasse;
        } else if (activity.status === "draft") {
          summary.totalActivitiesDraft += tempsPasse;
        } else if (activity.status === "rejected") {
          summary.totalActivitiesRejected += tempsPasse;
        }

        // Accumulate overtime and billable days (which are non-absences)
        if (activityTypeObj?.is_overtime) {
          summary.totalOvertimeDays += tempsPasse;
        }
        if (activityTypeObj?.is_billable) {
          summary.totalBillableDays += tempsPasse;
        }
      }
    });

    return summary;
  }, [activities, daysInMonth, absenceActivityTypeIds, activityTypeDefinitions, isPublicHoliday]);


  const { craReport, paidLeaveReport } = useMemo(() => {
    console.log(
      "[CraBoard - useMemo] Calculating craReport/paidLeaveReport..."
    );
    console.log("[CraBoard - useMemo] monthlyReports:", monthlyReports);
    console.log("[CraBoard - useMemo] userId:", userId);
    console.log("[CraBoard - useMemo] currentMonth:", currentMonth);

    // If in read-only mode and only one report is provided (as in the ReceivedCras modal)
    // This is the case where CraBoard is used to view an existing report
    if (readOnly && monthlyReports.length === 1) {
      const singleReport = monthlyReports[0];
      console.log(
        "[CraBoard - useMemo] Read-only mode with a single report:",
        singleReport
      );

      // The report can be of type 'cra' or 'paid_leave'
      if (singleReport.report_type === "cra") {
        return { craReport: singleReport, paidLeaveReport: null };
      } else if (singleReport.report_type === "paid_leave") {
        return { craReport: null, paidLeaveReport: singleReport };
      }
    }

    // Standard logic for non-read-only mode or multiple reports
    // Here, we look for CRA and Paid Leave reports separately
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
      "[CraBoard - useMemo] craReport found (standard mode):",
      currentMonthCraReport
    );
    console.log(
      "[CraBoard - useMemo] paidLeaveReport found (standard mode):",
      currentMonthPaidLeaveReport
    );

    return {
      craReport: currentMonthCraReport,
      paidLeaveReport: currentMonthPaidLeaveReport,
    };
  }, [monthlyReports, userId, currentMonth, readOnly]); // Dependencies unchanged

  const craReportStatus = craReport ? craReport.status : "empty";
  const paidLeaveReportStatus = paidLeaveReport
    ? paidLeaveReport.status
    : "empty";

  // Determine global report status for banners
  const overallReportStatus = useMemo(() => {
    // If one of the reports is validated, the whole is considered validated
    if (
      craReportStatus === "validated" ||
      paidLeaveReportStatus === "validated"
    )
      return "validated";
    // If one of the reports is pending, the whole is considered pending
    if (
      craReportStatus === "pending_review" ||
      paidLeaveReportStatus === "pending_review"
    )
      return "pending";
    // If one of the reports is rejected, the whole is considered refused
    if (craReportStatus === "rejected" || paidLeaveReportStatus === "rejected")
      return "refused";
    // Otherwise, if both are empty or drafts, the whole is empty
    return "empty";
  }, [craReportStatus, paidLeaveReportStatus]);

  const overallRejectionReason = useMemo(() => {
    let reason = null;
    if (craReportStatus === "rejected" && craReport && craReport.rejection_reason) {
      reason = craReport.rejection_reason;
      console.log("[CraBoard - overallRejectionReason] CRA reason found:", reason);
    } else if (paidLeaveReportStatus === "rejected" && paidLeaveReport && paidLeaveReport.rejection_reason) {
      reason = paidLeaveReport.rejection_reason;
      console.log("[CraBoard - overallRejectionReason] Paid Leave reason found:", reason);
    }
    console.log("[CraBoard - overallRejectionReason] Final result:", reason);
    return reason;
  }, [craReportStatus, paidLeaveReportStatus, craReport, paidLeaveReport]);
  

  // Determine if CRA activities are editable
  const isCraEditable = useMemo(() => {
    // CRA is editable if:
    // 1. The global 'readOnly' prop is false
    // 2. The CRA report status is 'empty', 'draft', or 'rejected'
    return (
      !readOnly && ["empty", "draft", "rejected"].includes(craReportStatus)
    );
  }, [craReportStatus, readOnly]);

  // Determine if paid leave activities are editable
  const isPaidLeaveEditable = useMemo(() => {
    // Paid Leave is editable if:
    // 1. The global 'readOnly' prop is false
    // 2. The Paid Leave report status is 'empty', 'draft', or 'rejected'
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
  console.log("[DEBUG CraBoard] overallReportStatus:", overallReportStatus);
  console.log("[DEBUG CraBoard] overallRejectionReason:", overallRejectionReason);
  
  /**
   * Handles saving an activity (add or update).
   * Called from ActivityModal.
   * @param {Object} activityData - The new activity data.
   */
  const handleSaveActivity = useCallback(
    async (activityData) => {
      if (readOnly) {
        // Check global readOnly prop first
        localShowMessage(
          "Save operation disabled in read-only mode. Your changes will not be saved.",
          "info"
        );
        return;
      }

      // Use absenceActivityTypeIds to determine if it's an absence
      const isAbsenceActivity = absenceActivityTypeIds.has(String(activityData.type_activite));
      const isCRAActivity = !isAbsenceActivity;

      // Determine if the activity is editable based on its type
      if (isAbsenceActivity && !isPaidLeaveEditable) {
        localShowMessage(
          `Cannot save this absence. The leave/absence report is locked (status: '${paidLeaveReportStatus}').`,
          "info"
        );
        return;
      }
      if (isCRAActivity && !isCraEditable) {
        localShowMessage(
          `Cannot save this activity. The CRA report is locked (status: '${craReportStatus}').`,
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
              "Original activity not found for update. Please refresh the page.",
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
              } days would exceed the 1-day limit for ${format(
                targetDate,
                "dd/MM/yyyy"
              )}. Current total: ${totalTimeExcludingEdited.toFixed(1)} days.`,
              "error"
            );
            return;
          }

          await onUpdateActivity(activityData.id, payload);
          localShowMessage("Activity saved successfully!", "success");
        } else {
          // It's a new activity
          const daysToProcess =
            tempSelectedDays.length > 0
              ? tempSelectedDays
              : selectedDate
              ? [selectedDate]
              : [];

          if (daysToProcess.length === 0) {
            console.error(
              "No day selected for activity creation."
            );
            localShowMessage(
              "No day selected for activity creation. Please select at least one day.",
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
                `Adding ${payload.temps_passe} days to ${format(
                  day,
                  "dd/MM/yyyy"
                )} would exceed the 1-day limit for this date. Current total: ${existingTimeOnDay.toFixed(
                  1
                )} days.`,
                "error"
              );
              errorCount++;
              continue;
            }

            if (
              isNonWorkingDay(day) &&
              !isAbsenceActivity && // Check if it's NOT an absence activity
              !activityData.override_non_working_day
            ) {
              console.warn(
                `Attempt to add normal activity on a non-working day (multi-selection): ${format(
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
                `Error adding activity for day ${format(
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
              `Added ${successCount} activities successfully! ${
                errorCount > 0
                  ? `(${errorCount} failures on non-working days or others)`
                  : ""
              }`,
              errorCount > 0 ? "warning" : "success"
            );
          } else if (errorCount > 0) {
            localShowMessage(
              "Failed to add all selected activities. Please check non-working days or time limits.",
              "error"
            );
          }
        }
      } catch (error) {
        console.error(
          "CraBoard: Error saving activity:",
          error
        );
        localShowMessage(
          `Save failed: ${error.message}. Please try again.`,
          "error"
        );
      } finally {
        handleCloseActivityModal();
        if (!readOnly && fetchActivitiesForMonth) {
          // Use global readOnly prop here
          fetchActivitiesForMonth(currentMonth);
        }
      }
    },
    [
      onAddActivity,
      onUpdateActivity,
      localShowMessage,
      userId,
      readOnly, // Use global readOnly prop
      absenceActivityTypeIds, // Used for isAbsenceActivity
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
      craReportStatus, // Added for error messages
      paidLeaveReportStatus, // Added for error messages
    ]
  );

  /**
   * Confirms and executes activity deletion.
   * This function is now called directly from requestDeleteFromCalendar.
   * @param {Object} activityToDel - The activity object to delete.
   */
  const confirmDeleteActivity = useCallback(
    async (activityToDel) => {
      const activity = activityToDel; // Use the activity passed directly

      if (readOnly) {
        // Check global readOnly prop first
        localShowMessage(
          "Delete operation disabled in read-only mode. You cannot delete activities.",
          "info"
        );
        return;
      }

      if (!activity) {
        console.error("No activity to delete provided.");
        localShowMessage(
          "No activity selected for deletion. Please try again.",
          "error"
        );
        return;
      }

      const isAbsence = absenceActivityTypeIds.has(String(activity.type_activite));

      // Check editability specific to activity type
      if (!isAbsence && !isCraEditable) {
        localShowMessage(
          `CRA activity locked: report status is '${craReportStatus}'. Deletion impossible.`,
          "info"
        );
        return;
      }
      if (isAbsence && !isPaidLeaveEditable) {
        localShowMessage(
          `Paid leave activity locked: report status is '${paidLeaveReportStatus}'. Deletion impossible.`,
          "info"
        );
        return;
      }

      // Re-check activity status itself (must be draft or rejected to be deletable)
      if (!["draft", "rejected"].includes(activity.status)) {
        localShowMessage(
          `Activity locked: status '${activity.status}'. Deletion impossible.`,
          "info"
        );
        return;
      }

      if (String(activity.user_id) !== String(userId)) {
        localShowMessage(
          "You cannot delete other users' activities. Please contact an administrator.",
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
        localShowMessage("Activity deleted successfully!", "success");
        if (!readOnly && fetchActivitiesForMonth) {
          // Use global readOnly prop here
          fetchActivitiesForMonth(currentMonth);
        }
      } catch (error) {
        console.error(
          "CraBoard: Error deleting activity:",
          error
        );
        localShowMessage(
          `Deletion failed: ${error.message}. Please try again.`,
          "error"
        );
      } finally {
        setActivityToDelete(null); // Reset activity to delete
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
      readOnly, // Use global readOnly prop
      absenceActivityTypeIds, // Used for isAbsence
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
   * Handles activity deletion request. Calls confirmDeleteActivity directly.
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
        // Check global readOnly prop first
        localShowMessage(
          "Activity deletion disabled in read-only mode. You cannot delete activities.",
          "info"
        );
        return;
      }

      const activity = activities.find(
        (act) => String(act.id) === String(activityId)
      );
      if (!activity) {
        console.error("Activity not found for deletion:", activityId);
        localShowMessage(
          "Activity not found for deletion. It may have already been deleted.",
          "error"
        );
        return;
      }

      const isAbsence = absenceActivityTypeIds.has(String(activity.type_activite));

      if (!isAbsence && !isCraEditable) {
        localShowMessage(
          `CRA activity locked: report status is '${craReportStatus}'. Deletion impossible.`,
          "info"
        );
        return;
      }
      if (isAbsence && !isPaidLeaveEditable) {
        localShowMessage(
          `Paid leave activity locked: report status is '${paidLeaveReportStatus}'. Deletion impossible.`,
          "info"
        );
        return;
      }

      // Re-check activity status itself (must be draft or rejected to be deletable)
      if (!["draft", "rejected"].includes(activity.status)) {
        localShowMessage(
          `Activity locked: status '${activity.status}'. Deletion impossible.`,
          "info"
        );
        return;
      }

      if (String(activity.user_id) !== String(userId)) {
        localShowMessage(
          "You cannot delete other users' activities. Please contact an administrator.",
          "error"
        );
        return;
      }

      // Call the delete function directly
      confirmDeleteActivity(activity);
    },
    [
      readOnly, // Use global readOnly prop
      activities,
      localShowMessage,
      absenceActivityTypeIds, // Used for isAbsence
      userId,
      isCraEditable,
      isPaidLeaveEditable,
      craReportStatus,
      paidLeaveReportStatus,
      confirmDeleteActivity, // confirmDeleteActivity must be defined BEFORE requestDeleteFromCalendar
    ]
  );
  const handleCycleMultiSelectMode = useCallback(() => {
    setMultiSelectType((prevMode) => {
      if (prevMode === 'activity') {
        return 'paid_leave';
      } else if (prevMode === 'paid_leave') {
        return 'activity';
      }
    });
  }, []);

  const handleDayClick = useCallback(
    (dayDate, e) => {
      console.log(
        `[DEBUG - handleDayClick] Multi-selection mode: ${multiSelectType}, Is non-working day: ${isNonWorkingDay(dayDate)}`
      );
      
      // Ignore if a drag and drop (individual activity or multi-selection) is in progress
      if (
        isDraggingActivity ||
        isDeletingActivityFlag ||
        isDraggingMultiSelect // Added for control
      ) {
        console.log(
          "[CraBoard - DEBUG] handleDayClick: Ignored due to drag/delete in progress."
        );
        return;
      }
      // Ignore if the click comes from an activity element (handled by handleActivityClick)
      if (e && e.target.closest(".cra-activity-item")) {
        console.log(
          "[CraBoard - DEBUG] handleDayClick: Ignored because click comes from an activity."
        );
        return;
      }

      console.log(
        `[CraBoard - DEBUG] handleDayClick (single day mode) called for day: ${
          isValid(dayDate) ? format(dayDate, "yyyy-MM-dd") : "Invalid Date"
        }`
      );

      if (readOnly) {
        localShowMessage(
          "Activity modification disabled in read-only mode. You cannot add or modify activities.",
          "info"
        );
        return;
      }

      const dateKey = isValid(dayDate) ? format(dayDate, "yyyy-MM-dd") : null;
      if (!dateKey) {
        console.error("handleDayClick: Invalid date received.");
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
          const isAbsence = absenceActivityTypeIds.has(String(activity.type_activite));
  
          if (!isAbsence && !isCraEditable) {
            localShowMessage(
              `CRA activity locked: report status is '${craReportStatus}'. Modification impossible.`,
              "info"
            );
            return;
          }
          if (isAbsence && !isPaidLeaveEditable) {
            localShowMessage(
              `Paid leave activity locked: report status is '${paidLeaveReportStatus}'. Modification impossible.`,
              "info"
            );
            return;
          }
  
          if (!["draft", "rejected"].includes(activity.status)) {
            localShowMessage(
              `Activity locked: status '${activity.status}'. Modification impossible.`,
              "info"
            );
            return;
          }
  
          if (String(activity.user_id) !== String(userId)) {
            localShowMessage(
              "You cannot modify other users' activities. Please contact an administrator.",
              "error"
            );
            return;
          }
        setSelectedDate(dayDate);
        setEditingActivity(activity);
        setTempSelectedDays([]);
        setIsModalOpen(true);
        setIsSingleDaySelectionLocked(true);
        // La logique de filtre pour l'édition est correcte
        const initialFilter = multiSelectType === "paid_leave" ? 'absence' : (isAbsence ? 'absence' : 'activity');
        setInitialActivityTypeFilter(initialFilter);
        console.log(
          `[CraBoard - DEBUG] handleDayClick: Form opened for day: ${format(
            dayDate,
            "yyyy-MM-dd"
          )} (editing)`
        );
      } else {
        if (totalTimeForDay >= 1) {
          localShowMessage(
            "You have already reached the 1-day limit for this date. Please modify an existing activity or delete one to add a new one.",
            "warning"
          );
          return;
        }

        // --- DÉBUT DE LA LOGIQUE CORRIGÉE POUR LA CRÉATION (CLIC SIMPLE) ---

        // Logique de blocage en mode congé si le jour est non travaillé
        if (multiSelectType === "paid_leave" && isNonWorkingDay(dayDate)) {
          localShowMessage(
            "Cannot add paid leave on a weekend or public holiday in single-day selection mode.",
            "warning"
          );
          return;
        }

        // On vérifie que la création est possible pour le mode actuel
        if (multiSelectType === 'activity' && !isCraEditable) {
          localShowMessage(
            "Cannot add activities. The CRA report is locked.",
            "info"
          );
          return;
        }
        if (multiSelectType === 'paid_leave' && !isPaidLeaveEditable) {
          localShowMessage(
            "Impossible d'ajouter d'absence",
            "info"
          );
          return;
        }

        // Simplification du filtre initial, basé uniquement sur le multiSelectType
        const filterType = multiSelectType === 'paid_leave' ? 'absence' : 'activity';

        setSelectedDate(dayDate);
        setEditingActivity(null);
        setTempSelectedDays([]);
        setIsModalOpen(true);
        setIsSingleDaySelectionLocked(true);
        // Le filtre est appliqué ici
        setInitialActivityTypeFilter(filterType);
        
        console.log(
          `[CraBoard - DEBUG] handleDayClick: Form opened for day: ${format(
            dayDate,
            "yyyy-MM-dd"
          )} (new activity)`
        );
        // --- FIN DE LA LOGIQUE CORRIGÉE ---
      }
    },
      [
        localShowMessage,
        activitiesByDay,
        readOnly,
        absenceActivityTypeIds,
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
        setIsSingleDaySelectionLocked,
        setInitialActivityTypeFilter,
        isNonWorkingDay,
        multiSelectType
      ]
    );

    /**
     * Handles clicking an existing activity item (for editing/deleting).
     * This function is ALWAYS active.
     * @param {Object} activity - The clicked activity object.
     */
    const handleActivityClick = useCallback(
      (activity) => {
        // Ignore if a drag and drop (individual activity or multi-selection) is in progress
        if (
          isDeletingActivityFlag ||
          isDraggingActivity ||
          isDraggingMultiSelect ||
          isSingleDaySelectionLocked // NEW: Ignore if single day selection mode is locked
        ) {
          console.log(
            "[CraBoard - DEBUG] handleActivityClick: Ignored due to drag/delete/lock in progress."
          );
          return;
        }
        console.log(
          `[CraBoard - DEBUG] handleActivityClick called for activity ID: ${activity.id}`
        );

        if (readOnly) {
          // Check global readOnly prop first
          localShowMessage(
            "Activity modification is disabled in read-only mode. You cannot modify or delete activities.",
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
            "Activity no longer exists or has been deleted. Please refresh the page.",
            "error"
          );
          setEditingActivity(null);
          return;
        }

        if (String(currentActivity.user_id) !== String(userId)) {
          localShowMessage(
            "You cannot modify other users' activities. Please contact an administrator.",
            "error"
          );
          return;
        }
        // Check specific editability flags
        const isAbsence = absenceActivityTypeIds.has(String(currentActivity.type_activite));

        if (!isAbsence && !isCraEditable) {
          localShowMessage(
            `CRA activity locked: report status is '${craReportStatus}'. Modification impossible.`,
            "info"
          );
          return;
        }
        if (isAbsence && !isPaidLeaveEditable) {
          localShowMessage(
            `Paid leave activity locked: report status is '${paidLeaveReportStatus}'. Modification impossible.`,
            "info"
          );
          return;
        }

        // Re-check activity status itself
        if (!["draft", "rejected"].includes(currentActivity.status)) {
          localShowMessage(
            `Activity locked: status '${currentActivity.status}'. Modification impossible.`,
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
            "Error: Invalid existing activity date. Cannot modify. Please contact support.",
            "error"
          );
          return;
        }
        setSelectedDate(new Date(currentActivity.date_activite));
        setEditingActivity(currentActivity);
        setTempSelectedDays([]);
        setIsModalOpen(true);
        // NEW: Lock single day selection if editing an existing activity
        setIsSingleDaySelectionLocked(true);
        const initialFilter = multiSelectType === "paid_leave" ? 'absence' : (isAbsence ? 'absence' : 'activity');
setInitialActivityTypeFilter(initialFilter);
        console.log(
          `[CraBoard - DEBUG] handleActivityClick: Form opened for activity ID: ${currentActivity.id}`
        );
      },
      [
        localShowMessage,
        userId,
        readOnly, // Uses global readOnly prop
        absenceActivityTypeIds, // Used for isAbsence
        isCraEditable,
        isPaidLeaveEditable,
        craReportStatus,
        paidLeaveReportStatus,
        activities,
        isDeletingActivityFlag,
        isDraggingActivity,
        isDraggingMultiSelect,
        isSingleDaySelectionLocked, // Added as dependency
        setSelectedDate,
        setEditingActivity,
        setTempSelectedDays,
        setIsModalOpen,
        setIsSingleDaySelectionLocked, // Added as dependency
        setInitialActivityTypeFilter // Added as dependency
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
        // NEW: Block if single day selection mode is locked
        if (isSingleDaySelectionLocked) {
          e.preventDefault();
          localShowMessage(
            "Cannot drag and drop. The calendar is in single day selection mode. Close the modal to unlock.",
            "info"
          );
          return;
        }

        // If multi-selection mode is active, prevent individual drag and drop
        if (multiSelectType !== "activity" && multiSelectType !== "paid_leave") {
          localShowMessage(
            "Activity drag and drop is disabled in multi-selection mode. Please change mode.",
            "info"
          );
          e.preventDefault();
          return;
        }
        // Ensure multi-day selection is not active when starting an individual activity drag
        setIsDraggingMultiSelect(false);
        setTempSelectedDays([]);
        setDragStartDayForSelection(null);

        // Check editability before allowing drag
        const isAbsence = absenceActivityTypeIds.has(String(activity.type_activite));

        if (
          readOnly || // If global readOnly prop is true
          (!isAbsence && !isCraEditable) || // Or if it's a CRA activity and CRA is not editable
          (isAbsence && !isPaidLeaveEditable) || // Or if it's a Paid Leave activity and Paid Leave is not editable
          String(activity.user_id) !== String(userId) // Or if the activity does not belong to the user
        ) {
          e.preventDefault();
          localShowMessage(
            "Cannot drag and drop this activity. The calendar is locked or you do not have permissions.",
            "info"
          );
          return;
        }

        // Re-check the activity's own status (must be draft or rejected to be movable)
        if (!["draft", "rejected"].includes(activity.status)) {
          e.preventDefault();
          localShowMessage(
            `Activity locked: status '${activity.status}'. Movement impossible.`,
            "info"
          );
          return;
        }

        setDraggedActivity(activity);
        setIsDraggingActivity(true);
        e.dataTransfer.setData("activityId", activity.id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.dropEffect = "move";
        console.log("Drag started for activity:", activity.id);
      },
      [
        readOnly, // Uses global readOnly prop
        userId,
        localShowMessage,
        setIsDraggingMultiSelect,
        multiSelectType,
        setTempSelectedDays,
        absenceActivityTypeIds, // Used for isAbsence
        isCraEditable,
        isPaidLeaveEditable,
        isSingleDaySelectionLocked, // Added as dependency
      ]
    );

    /**
     * Handles hovering over a day cell during an activity drag and drop.
     * This function is ALWAYS active.
     * @param {Event} e - The drag event.
     * @param {Date} day - The date of the hovered day.
     */
    const handleDragOverDay = useCallback(
      (e, day) => {
        // NEW: Block if single day selection mode is locked
        if (isSingleDaySelectionLocked) {
          e.preventDefault();
          return;
        }

        // This handler should only be active for individual activity drag and drop
        if (multiSelectType !== "activity" && multiSelectType !== "paid_leave") {
          e.preventDefault();
          return;
        }

        e.preventDefault();
        if (draggedActivity) {
          const isTargetNonWorkingDay = isNonWorkingDay(day);
          const isDraggedActivityAbsence = absenceActivityTypeIds.has(String(draggedActivity.type_activite));

          let isDropAllowed = false;

          // Check report editability for the dragged activity type
          const isCRAActivityType = !isDraggedActivityAbsence;

          if (
            readOnly || // If global readOnly prop is true
            (isCRAActivityType && !isCraEditable) || // Or if it's a CRA activity and CRA is not editable
            (isDraggedActivityAbsence && !isPaidLeaveEditable) // Or if it's a Paid Leave activity and Paid Leave is not editable
          ) {
            setIsValidDropTarget(false);
            e.dataTransfer.dropEffect = "none";
            return;
          }

          if (isTargetNonWorkingDay) {
            isDropAllowed =
              isDraggedActivityAbsence &&
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
        absenceActivityTypeIds, // Used for isAbsence
        currentMonth,
        multiSelectType,
        readOnly, // Use global readOnly prop
        isCraEditable,
        isPaidLeaveEditable,
        isSingleDaySelectionLocked, // Added as dependency
      ]
    );

    /**
     * Handles dropping an activity onto a day cell.
     * This function is ALWAYS active.
     * @param {Event} e - The drop event.
     * @param {Date} targetDay - The date of the target day.
     */
    const handleDropActivity = useCallback(
      async (e, targetDay) => {
        // NEW: Block if single day selection mode is locked
        if (isSingleDaySelectionLocked) {
          e.preventDefault();
          return;
        }

        // This handler should only be active for individual activity drag and drop
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
            "Activity to move not found. Please try again.",
            "error"
          );
          return;
        }

        const isAbsence = absenceActivityTypeIds.has(String(activityToMove.type_activite));
        const isCRAActivityType = !isAbsence;

        if (
          readOnly || // If global readOnly prop is true
          (isCRAActivityType && !isCraEditable) || // Or if it's a CRA activity and CRA is not editable
          (isAbsence && !isPaidLeaveEditable) // Or if it's a Paid Leave activity and Paid Leave is not editable
        ) {
          localShowMessage(
            "Cannot move this activity. The calendar is locked or you do not have permissions.",
            "info"
          );
          return;
        }

        const isTargetNonWorkingDay = isNonWorkingDay(targetDay);

        let newOverrideNonWorkingDay = activityToMove.override_non_working_day;

        let isDropAllowed = false;
        if (isTargetNonWorkingDay) {
          isDropAllowed =
            isAbsence && activityToMove.override_non_working_day;
        } else {
          isDropAllowed = true;
          if (
            isAbsence &&
            activityToMove.override_non_working_day
          ) {
            newOverrideNonWorkingDay = false;
          }
        }

        if (!isSameMonth(targetDay, currentMonth)) {
          localShowMessage(
            "Cannot move activity here as the month is incorrect. Please drop it within the displayed month.",
            "warning"
          );
          return;
        }

        // Re-check the activity's own status (must be draft or rejected to be movable)
        if (!["draft", "rejected"].includes(activityToMove.status)) {
          localShowMessage(
            "Cannot move this activity. Its status does not allow it (must be 'draft' or 'rejected').",
            "info"
          );
          return;
        }

        if (isSameDay(new Date(activityToMove.date_activite), targetDay)) {
          localShowMessage(
            "The activity is already on this date. No movement needed.",
            "info"
          );
          return;
        }

        // 1-day limit check during DROP
        const targetDateKey = format(targetDay, "yyyy-MM-dd");
        const activitiesOnTargetDay = activitiesByDay.get(targetDateKey) || [];
        const totalTimeExcludingMoved = activitiesOnTargetDay
          .filter((a) => String(a.id) !== String(activityToMove.id)) // Exclude the moved activity from its old position
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
            )} days.`,
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
          localShowMessage("Activity moved successfully!", "success");
          if (!readOnly && fetchActivitiesForMonth) {
            fetchActivitiesForMonth(currentMonth);
          }
        } else {
          if (isTargetNonWorkingDay) {
            if (
              isAbsence &&
              !activityToMove.override_non_working_day
            ) {
              localShowMessage(
                "This leave cannot be moved to a weekend or public holiday without override. Please enable the override.",
                "warning"
              );
            } else if (!isCRAActivityType) {
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
        absenceActivityTypeIds, // Used for isAbsence
        isCraEditable,
        isPaidLeaveEditable,
        multiSelectType,
        activitiesByDay,
        readOnly, // Use global readOnly prop
        isSingleDaySelectionLocked, // Added as dependency
      ]
    );

    /**
     * Handles the start of a mouse click for multi-day selection.
     * This function is ALWAYS active if multiSelectType is 'activity' or 'paid_leave'.
     * @param {Event} e - The mouse event.
     * @param {Date} day - The date of the clicked day.
     */
    const handleMouseDownMultiSelect = useCallback(
      (e, day) => {
        // NEW: Block if single day selection mode is locked
        if (isSingleDaySelectionLocked) {
          localShowMessage(
            "Cannot start multi-selection. The calendar is in single day selection mode. Close the modal to unlock.",
            "info"
          );
          return;
        }
        if (multiSelectType === "paid_leave" && isNonWorkingDay(day)) {
          localShowMessage(
              "Cannot start multi-day selection for paid leave on a weekend or public holiday.",
              "warning"
              
          );
          e.preventDefault();
          return;
      }

        // Block if global readOnly prop is true, or if a drag/delete is in progress
        if (readOnly || isDraggingActivity || isDeletingActivityFlag) {
          localShowMessage(
            "Multi-selection disabled. The calendar is read-only or an operation is in progress.",
            "info"
          );
          return;
        }

        // Check specific editability based on current multi-selection mode
        if (multiSelectType === "activity" && !isCraEditable) {
          localShowMessage(
            "Cannot start multi-selection for activity. The CRA report is locked.",
            "info"
          );
          return;
        }
        if (multiSelectType === "paid_leave" && !isPaidLeaveEditable) {
          localShowMessage(
            "Impossible d'ajouter d'absence",
            "info"
          );
          return;
        }

        // Check 1-day limit before starting multi-selection
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

        // If left mouse button is pressed
        if (e.button === 0) {
          isMouseDownOnCalendarDayRef.current = true; // Mark that the mouse is down on a day
          mouseDownCoordsRef.current = { x: e.clientX, y: e.clientY }; // Store coordinates
          setDragStartDayForSelection(day);
          setTempSelectedDays([day]); // Start with the clicked day
          // DO NOT set setIsDraggingMultiSelect(true) here immediately.
          // This will be done by handleGlobalMouseMove if a drag is detected.
          console.log(
            "[CraBoard - handleMouseDownMultiSelect] Potential multi-day selection started."
          );
        }
      },
      [
        readOnly, // Use global readOnly prop
        isDraggingActivity,
        isDeletingActivityFlag,
        isCraEditable,
        isPaidLeaveEditable,
        isNonWorkingDay,
        localShowMessage,
        multiSelectType,
        setTempSelectedDays,
        activitiesByDay,
        isSingleDaySelectionLocked, // Added as dependency
        setDragStartDayForSelection, // Added as dependency
      ]
    );

    /**
     * Handles hovering over a cell during multi-day selection.
     * This function is ALWAYS active if multiSelectType is 'activity' or 'paid_leave'.
     * @param {Date} day - The date of the hovered day.
     */
    const handleMouseEnterMultiSelect = useCallback(
      (day) => {
        // NEW: Block if single day selection mode is locked
        if (isSingleDaySelectionLocked) {
          return;
        }
    
        // Continue multi-selection ONLY if mouse button is down on a day
        // AND drag has officially started (isDraggingMultiSelect is true)
        // AND a drag start day for selection is defined.
        if (
          !isMouseDownOnCalendarDayRef.current ||
          !isDraggingMultiSelect ||
          !dragStartDayForSelection
        ) {
          return;
        }
        // Prevent multi-selection if global readOnly prop is true, or if a drag/delete is in progress
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
    
        const newTempSelectedDays = daysInMonth
          .slice(start, end + 1)
          .filter((d) => {
            // Check if the specific report type is editable for this mode
            const isCurrentModeEditable =
              multiSelectType === "paid_leave"
                ? isPaidLeaveEditable
                : isCraEditable;
    
            // NEW BEHAVIOR: Unified logic to block non-working days for both modes
            const dayKey = format(d, "yyyy-MM-dd");
            const existingActivitiesOnDay = activitiesByDay.get(dayKey) || [];
            const existingTimeOnDay = existingActivitiesOnDay.reduce(
              (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
              0
            );
    
            // Allow selection only if the mode is editable, it's a working day, and there's less than 1 day of activity already.
            return isCurrentModeEditable && !isNonWorkingDay(d) && existingTimeOnDay < 1;
          });
    
        setTempSelectedDays(newTempSelectedDays);
      },
      [
        isMouseDownOnCalendarDayRef, // New dependency
        isDraggingMultiSelect, // New dependency
        dragStartDayForSelection,
        daysInMonth,
        readOnly, // Use global readOnly prop
        isDraggingActivity,
        isDeletingActivityFlag,
        isNonWorkingDay,
        multiSelectType,
        setTempSelectedDays,
        activitiesByDay,
        isPaidLeaveEditable, // Added for mode editability check
        isCraEditable, // Added for mode editability check
        isSingleDaySelectionLocked, // Added as dependency
      ]
    );
    /**
     * Handles the end of multi-day selection (mouse release).
     * Triggers the appropriate action based on `multiSelectType`.
     * This function is called by handleGlobalMouseUp ONLY if a drag has been confirmed.
     */
    const handleMouseUpMultiSelect = useCallback(async () => {
      // NEW: If single day selection mode is locked, do nothing here
      if (isSingleDaySelectionLocked) {
        return;
      }

      // Block if global readOnly prop is true (redundant but safe check)
      if (readOnly) {
        localShowMessage(
          "Operation disabled. The calendar is read-only.",
          "info"
        );
        setTempSelectedDays([]); // Clear temporary selection
        return;
      }

      if (tempSelectedDays.length > 0) {
        // Check editability before opening the modal
        if (multiSelectType === "paid_leave") {
          if (!isPaidLeaveEditable) {
            localShowMessage(
              "Cannot add paid leave. The leave report is locked.",
              "info"
            );
            setTempSelectedDays([]);
            return;
          }
          // If mode is "paid leave", set initial modal filter to 'absence'
          setInitialActivityTypeFilter('absence');
        } else if (multiSelectType === "activity") {
          if (!isCraEditable) {
            localShowMessage(
              "Cannot add CRA activities. The CRA report is locked.",
              "info"
            );
            setTempSelectedDays([]);
            return;
          }
          // If mode is "activity", set initial modal filter to 'activity'
          setInitialActivityTypeFilter('activity');
        }

        // Open the modal with pre-selected days and initial filter
        setEditingActivity(null);
        setSelectedDate(null); // Date will be handled by tempSelectedDays
        setIsModalOpen(true);
        // tempSelectedDays is NOT cleared here, it's used by the modal and will be cleared by handleCloseActivityModal
      } else {
        console.log(
          "[CraBoard - handleMouseUpMultiSelect] No multi-day selection to finalize."
        );
      }
    }, [
      tempSelectedDays,
      multiSelectType,
      localShowMessage,
      setEditingActivity,
      setSelectedDate,
      setIsModalOpen,
      setTempSelectedDays,
      isPaidLeaveEditable,
      isCraEditable,
      readOnly,
      isSingleDaySelectionLocked,
      setInitialActivityTypeFilter, // NEW DEPENDENCY
    ]);
    // Define confirmResetMonth FIRST
    const confirmResetMonth = useCallback(async () => {
      if (readOnly) {
        // Check global readOnly prop first
        localShowMessage(
          "Reset operation disabled in read-only mode. You cannot reset the month.",
          "info"
        );
        return;
      }
      const activitiesToReset = activitiesForCurrentMonth.filter(
        (activity) =>
          (activity.status === "draft" || activity.status === "rejected") &&
          ((!absenceActivityTypeIds.has(String(activity.type_activite)) && // If it's NOT an absence and CRA is editable
            isCraEditable) ||
            (absenceActivityTypeIds.has(String(activity.type_activite)) && // If it's an absence and PaidLeave is editable
              isPaidLeaveEditable))
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
        `Reset complete: ${successCount} activities deleted, ${errorCount} errors.`,
        errorCount > 0 ? "error" : "success"
      );
    }, [
      activitiesForCurrentMonth,
      onDeleteActivity,
      localShowMessage,
      currentMonth,
      fetchActivitiesForMonth,
      readOnly, // Use global readOnly prop
      absenceActivityTypeIds, // Used for filtering
      isCraEditable,
      isPaidLeaveEditable,
      setIsDeletingActivityFlag,
    ]);

    // Define requestResetMonth SECOND, after confirmResetMonth
    const requestResetMonth = useCallback(() => {
      if (readOnly) {
        // Check global readOnly prop first
        localShowMessage(
          "Reset operation disabled in read-only mode.",
          "info"
        );
        return;
      }
      // Check if at least one of the reports is in a non-editable status for reset
      if (
        !isCraEditable &&
        !isPaidLeaveEditable // If NONE are editable, then block
      ) {
        localShowMessage(
          "Cannot reset the month. CRA and paid leave reports are already validated, pending review, or finalized. Only an administrator can undo these statuses.",
          "info"
        );
        return;
      }
      // Call confirmResetMonth directly without confirmation
      confirmResetMonth();
    }, [
      isCraEditable,
      isPaidLeaveEditable,
      localShowMessage,
      readOnly, // Use global readOnly prop
      confirmResetMonth,
    ]);

    const sendActivities = useCallback(
      async (activitiesToSubmit, reportType) => {
        if (readOnly) {
          // Check global readOnly prop first
          localShowMessage(
            `Submission operation for ${
              reportType === "cra" ? "CRAs" : "Leaves"
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
              reportType === "cra" ? "CRA" : "paid leave"
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

        // Allow submission if report is 'draft' or 'rejected'
        if (
          existingReport &&
          !["draft", "rejected"].includes(existingReport.status)
        ) {
          localShowMessage(
            `A "${reportType}" report is already in status "${existingReport.status}". Cannot resubmit.`,
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
            `Failed to submit report ${reportType}: ${error.message}. Please try again.`,
            "error"
          );
        }
      },
      [
        readOnly, // Use global readOnly prop
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

    // Calls sendActivities directly
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
          !absenceActivityTypeIds.has(String(a.type_activite)) && // Filter non-absences
          (a.status === "draft" || a.status === "rejected")
      );
      if (craActivitiesToSend.length === 0) {
        localShowMessage(
          "No draft or rejected CRA activities to submit this month.",
          "info"
        );
        return;
      }
      sendActivities(craActivitiesToSend, "cra");
    }, [
      isCraEditable,
      localShowMessage,
      activitiesForCurrentMonth,
      absenceActivityTypeIds, // Used for filtering
      sendActivities,
    ]);

    // Calls sendActivities directly
    const requestSendPaidLeaves = useCallback(() => {
      if (!isPaidLeaveEditable) {
        localShowMessage(
          "Cannot submit leave. The paid leave report is already pending review, validated, or finalized.",
          "info"
        );
        return;
      }

      const paidLeaveActivitiesToSend = activitiesForCurrentMonth.filter(
        (a) =>
          absenceActivityTypeIds.has(String(a.type_activite)) && // Filter absences
          (a.status === "draft" || a.status === "rejected")
      );
      if (paidLeaveActivitiesToSend.length === 0) {
        localShowMessage(
          "No draft or rejected paid leave activities to submit this month.",
          "info"
        );
        return;
      }
      sendActivities(paidLeaveActivitiesToSend, "paid_leave");
    }, [
      isPaidLeaveEditable,
      localShowMessage,
      activitiesForCurrentMonth,
      absenceActivityTypeIds, // Used for filtering
      sendActivities,
    ]);

    // Function to cycle between multi-selection modes (only 'activity' and 'paid_leave')
    const cycleMultiSelectMode = useCallback(() => {
      // The mode change button is disabled if the global readOnly prop is true.
      if (readOnly) {
        localShowMessage(
          "Mode selection change is disabled when the calendar is read-only.",
          "info"
        );
        return;
      }
      // NEW: If single day selection mode is locked, do not change mode
      if (isSingleDaySelectionLocked) {
        localShowMessage(
          "Cannot change selection mode. The calendar is in single day selection mode. Close the modal to unlock.",
          "info"
        );
        return;
      }

      setMultiSelectType((prevType) => {
        const newType = prevType === "activity" ? "paid_leave" : "activity";
        localShowMessage(
          `Multi-selection mode: ${
            newType === "activity" ? "Activity" : "Paid Leave"
          } (click to toggle)`,
          "info"
        );
        console.log(
          "[CraBoard] cycleMultiSelectMode was called. New mode:",
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
      setInitialActivityTypeFilter(null); // Added here
    }, [
      readOnly, // Use global readOnly prop
      setTempSelectedDays,
      setIsModalOpen,
      setEditingActivity,
      setSelectedDate,
      setIsDraggingMultiSelect,
      setDragStartDayForSelection,
      localShowMessage,
      isSingleDaySelectionLocked, // Added as dependency
      setInitialActivityTypeFilter // Added as dependency
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

    // --- Side Effects (useEffect) ---

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
        // If single day selection mode is locked, ignore movements for multi-selection
        if (isSingleDaySelectionLocked) {
          return;
        }

        // If mouse button is down on a day and not already in drag mode
        if (
          isMouseDownOnCalendarDayRef.current &&
          dragStartDayForSelection &&
          !isDraggingMultiSelect
        ) {
          const distance = Math.sqrt(
            Math.pow(e.clientX - mouseDownCoordsRef.current.x, 2) +
              Math.pow(e.clientY - mouseDownCoordsRef.current.y, 2)
          );

          // If movement exceeds threshold, activate drag mode
          if (distance > DRAG_THRESHOLD) {
            setIsDraggingMultiSelect(true);
            // CraCalendar's onMouseEnter will now react to isDraggingMultiSelect being true
            // and update tempSelectedDays as the mouse moves over day cells.
          }
        }
      };

      const handleGlobalMouseUp = (e) => {
        // Reset isMouseDownOnCalendarDayRef at the end of any global mouseup event
        isMouseDownOnCalendarDayRef.current = false;
        // Always reset multi-selection drag state at the end of mouseup
        setIsDraggingMultiSelect(false);
        setDragStartDayForSelection(null);

        // If single day selection mode is locked, do not process multi-selection events
        if (isSingleDaySelectionLocked) {
          // Clean up multi-selection states just in case (safety)
          // tempSelectedDays is already handled by handleCloseActivityModal
          return;
        }

        // Calculate movement distance to differentiate click and drag
        const distance = Math.sqrt(
          Math.pow(e.clientX - mouseDownCoordsRef.current.x, 2) +
            Math.pow(e.clientY - mouseDownCoordsRef.current.y, 2)
        );

        // Determine if it was a drag or a click
        // If isDraggingMultiSelect was true before this mouseUp, or if distance exceeds threshold
        if (distance > DRAG_THRESHOLD) {
          // It was a confirmed drag (or a click that moved beyond threshold)
          handleMouseUpMultiSelect(); // Process multi-selection
        } else if (dragStartDayForSelection) {
          // It was a simple click on a day cell (movement below threshold)
          // Call handleDayClick with the initially clicked day
          handleDayClick(dragStartDayForSelection, e);
        }

        // tempSelectedDays is NOT reset here, it's handled by handleCloseActivityModal or handleMouseUpMultiSelect
      };

      document.addEventListener("dragend", handleDragEnd);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.addEventListener("mousemove", handleGlobalMouseMove); // Add global movement listener

      return () => {
        document.removeEventListener("dragend", handleDragEnd);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
        document.removeEventListener("mousemove", handleGlobalMouseMove); // Cleanup listener
      };
    }, [
      handleMouseUpMultiSelect,
      handleDayClick, // Added as dependency because it's called here
      isDraggingMultiSelect, // isDraggingMultiSelect is a dependency because we read it here.
      isMouseDownOnCalendarDayRef,
      mouseDownCoordsRef,
      dragStartDayForSelection,
      setIsDraggingMultiSelect, // Added as dependency because we update it here.
      setDragStartDayForSelection, // Added as dependency because we update it here.
      DRAG_THRESHOLD, // Added as dependency
      isSingleDaySelectionLocked, // Added as dependency
    ]); // Dependencies updated

    useEffect(() => {
      if (
        !readOnly && // Use global readOnly prop here
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
    }, [currentMonth, fetchActivitiesForMonth, readOnly]); // 'readOnly' dependency added

  const totalWorkingDaysInMonth = useMemo(() => {
    if (!isValid(currentMonth)) return 0;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    // Ensure the result is always a number
    return (
      days.filter(
        (day) => !isWeekend(day, { weekStartsOn: 1 }) && !isPublicHoliday(day)
      ).length || 0
    ); // Added || 0
  }, [currentMonth, isPublicHoliday]);

  const totalActivitiesTimeInMonth = useMemo(() => {
    // Ensure the result is always a number
    return (
      activitiesForCurrentMonth.reduce(
        (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
        0
      ) || 0
    ); // Added || 0
  }, [activitiesForCurrentMonth]);

  const timeDifference = useMemo(() => {
    // Ensure operands are numbers before calculation
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
        Your CRA Calendar -{" "}
        {format(currentMonth, "MMMM yyyy", { locale: fr })}
      </h2>

      {/* Read-only banner */}
      {readOnly && (
        <div
          className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Read-Only Mode:</strong>
          <span className="block sm:inline ml-2">
            You are viewing a CRA in read-only mode. No modifications are
            possible.
          </span>
        </div>
      )}


      {/* Calendar header */}
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
        requestSendCRA={requestSendCRA} // Calls requestSendCRA directly
        requestSendPaidLeaves={requestSendPaidLeaves} // Calls requestSendPaidLeaves directly
        requestResetMonth={requestResetMonth}
        craDraftsCount={
          activitiesForCurrentMonth.filter(
            (a) =>
              !absenceActivityTypeIds.has(String(a.type_activite)) && // Filter non-absences
              (a.status === "draft" || a.status === "rejected")
          ).length
        }
        paidLeaveDraftsCount={
          activitiesForCurrentMonth.filter(
            (a) =>
              absenceActivityTypeIds.has(String(a.type_activite)) && // Filter absences
              (a.status === "draft" || a.status === "rejected")
          ).length
        }
        multiSelectType={multiSelectType}
        onCycleMultiSelectMode={cycleMultiSelectMode}
        isAnyReportEditable={isAnyReportEditable} // Pass global editability flag
        readOnly={readOnly} // Pass the global readOnly status for month navigation buttons and multi-select toggle
      />

      {/* Display report statuses for the current month */}
      {/* CraSummary should be displayed even in read-only mode to see totals */}
      <CraSummary
        craReport={craReport}
        paidLeaveReport={paidLeaveReport}
        isCraEditable={isCraEditable}
        isPaidLeaveEditable={isPaidLeaveEditable}
        onSendMonthlyReport={sendActivities} // Pass sendActivities directly
        rejectionReason={overallRejectionReason} // Use global rejection reason
        totalWorkingDaysInMonth={totalWorkingDaysInMonth}
        totalActivitiesTimeInMonth={totalActivitiesTimeInMonth}
        timeDifference={timeDifference}
      />

      {/* Section to display CRA and Paid Leave report statuses */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Monthly Report Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CRA Report Status */}
          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <p className="font-medium text-gray-700">CRA Report :</p>
            {craReportStatus === "validated" && (
              <p className="text-green-600 font-semibold">Validated ✅</p>
            )}
            {craReportStatus === "pending_review" && (
              <p className="text-yellow-600 font-semibold">
                Pending Review ⏳
              </p>
            )}
            {craReportStatus === "rejected" && (
              <div className="text-red-600 font-semibold">
                <p>
                  Rejected ❌
                  {craReport?.rejection_reason && ( // Use craReport.rejection_reason
                    <span className="text-sm font-normal text-red-700 ml-2">
                      (Reason : {craReport.rejection_reason})
                    </span>
                  )}
                </p>
              </div>
            )}
            {craReportStatus === "finalized" && (
              <p className="text-purple-600 font-semibold">Finalized ✔️</p>
            )}
            {craReportStatus === "empty" && (
              <p className="text-gray-500 italic">
                No CRA report for this month.
              </p>
            )}
            {craReportStatus === "draft" && (
              <p className="text-blue-500 italic">CRA report in draft.</p>
            )}
          </div>

          {/* Paid Leave Report Status */}
          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <p className="font-medium text-gray-700">Paid Leave Report :</p>
            {paidLeaveReportStatus === "validated" && (
              <p className="text-green-600 font-semibold">Validated ✅</p>
            )}
            {paidLeaveReportStatus === "pending_review" && (
              <p className="text-yellow-600 font-semibold">
                Pending Review ⏳
              </p>
            )}
            {paidLeaveReportStatus === "rejected" && (
              <div className="text-red-600 font-semibold">
                <p>
                  Rejected ❌
                  {paidLeaveReport?.rejection_reason && ( // Use paidLeaveReport.rejection_reason
                    <span className="text-sm font-normal text-red-700 ml-2">
                      (Reason : {paidLeaveReport.rejection_reason})
                    </span>
                  )}
                </p>
              </div>
            )}
            {paidLeaveReportStatus === "finalized" && (
              <p className="text-purple-600 font-semibold">Finalized ✔️</p>
            )}
            {paidLeaveReportStatus === "empty" && (
              <p className="text-gray-500 italic">
                No paid leave report for this month.
              </p>
            )}
            {paidLeaveReportStatus === "draft" && (
              <p className="text-blue-500 italic">
                Paid leave report in draft.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Activity Modal (conditionally rendered) */}
      {isModalOpen && (
        <ActivityModal
          onClose={handleCloseActivityModal}
          onSave={handleSaveActivity}
          onDelete={confirmDeleteActivity} // confirmDeleteActivity is now called directly
          activity={editingActivity}
          initialDate={selectedDate}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          showMessage={localShowMessage}
          readOnly={readOnly || (!isCraEditable && !isPaidLeaveEditable)} // Use global readOnly prop or if no report is editable
          // paidLeaveTypeId={paidLeaveTypeId} // This prop is no longer strictly necessary if absenceActivityTypeIds is used
          selectedDaysForMultiAdd={tempSelectedDays}
          isNonWorkingDay={isNonWorkingDay}
          activitiesByDay={activitiesByDay}
          initialActivityTypeFilter={initialActivityTypeFilter} // PASSED FOR INITIAL FILTERING
          absenceActivityTypeIds={absenceActivityTypeIds} // PASSED FOR INITIAL FILTERING
        />
      )}

      {/* Calendar Grid */}
      <CraCalendar
        currentMonth={currentMonth}
        activitiesByDay={activitiesByDay}
        activityTypeDefinitions={activityTypeDefinitions}
        clientDefinitions={clientDefinitions}
        isPublicHoliday={isPublicHoliday}
        onDayClick={handleDayClick} // Passed for single clicks (called by handleGlobalMouseUp)
        onActivityClick={handleActivityClick}
        tempSelectedDays={tempSelectedDays}
        onMouseDown={handleMouseDownMultiSelect} // Start drag detection
        onMouseEnter={handleMouseEnterMultiSelect} // Extend selection if in drag mode
        // onMouseUp is handled globally
        readOnly={readOnly} // Pass global readOnly prop
        isCraEditable={isCraEditable}
        isPaidLeaveEditable={isPaidLeaveEditable}
        requestDeleteFromCalendar={requestDeleteFromCalendar} // Calls delete directly
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
        isSingleDaySelectionLocked={isSingleDaySelectionLocked} // NEW: Pass state to calendar
      />

      {/* Monthly Report Preview Modal */}
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

      {/* Summary Report Modal */}
      {showSummaryReport && summaryReportMonth && (
        <SummaryReport
          isOpen={showSummaryReport}
          onClose={handleToggleSummaryReport}
          month={summaryReportMonth}
          userId={userId} // Is userId used in SummaryReport? If not, maybe remove it.
          activities={activitiesForCurrentMonth}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          showMessage={localShowMessage}
          onOpenMonthlyReportPreview={handleOpenMonthlyReportPreview}
          readOnly={readOnly}
          // --- ADD/CHECK THESE PROPS ---
          publicHolidays={publicHolidays.map(d => format(d, 'yyyy-MM-dd'))} // <--- VERY IMPORTANT: Pass formatted public holidays
          craReportStatus={craReportStatus}
          paidLeaveReportStatus={paidLeaveReportStatus}
          craReport={craReport}
          paidLeaveReport={paidLeaveReport}
          userFirstName={userFirstName} 
          />
      )}
    </div>
  );
}