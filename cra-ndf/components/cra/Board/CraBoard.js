"use client";

/**
 * CraBoard
 * ----------
 * Calendrier interactif CRA + Congés Payés :
 * - Ajout/édition/suppression d'activités (avec validations : 1 jour max / jour, jours non travaillés, etc.)
 * - Sélection multi-jours (modes "activity" et "paid_leave")
 * - Drag & drop des activités
 * - Soumission de rapports mensuels (CRA / Congés)
 * - Aperçu rapport mensuel, résumé mensuel, jours fériés...
 *
 * ⚠️ Important:
 *  - En mode "readOnly" (ex: modal de l'historique), on RELÂCHE le filtre par user_id
 *    pour afficher correctement les activités fusionnées (CRA + CP) issues du backend.
 */

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
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";

// Sous-composants
import CraCalendar from "./CraCalendar";
import CraControls from "./CraControls";
import CraSummary from "./CraSummary";
import ActivityModal from "../Modals/ActivityModal";
import MonthlyReportPreviewModal from "../Reports/MonthlyReportPreviewModal";
import SummaryReport from "../Reports/SummaryReport";

// ————————————————————————————————————————————————————————————————————————
// Petites constantes / helpers
// ————————————————————————————————————————————————————————————————————————
const DRAG_THRESHOLD = 5; // px pour détecter un drag vs un click

// Utilise la fonction de message parent si fournie, sinon console.log
const makeLocalShowMessage =
  (showMessage) =>
    (msg, type = "info") =>
      showMessage
        ? showMessage(msg, type)
        : console.log(`[Message ${String(type).toUpperCase()}] ${msg}`);

// ————————————————————————————————————————————————————————————————————————
// Composant principal
// ————————————————————————————————————————————————————————————————————————
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
  readOnly = false, // Mode lecture seule (ex: modal historique)
  monthlyReports = [],
  rejectionReason = null,
  onSendMonthlyReport,
}) {
  const localShowMessage = useMemo(
    () => makeLocalShowMessage(showMessage),
    [showMessage]
  );

  // ——————————————————————————————————————————
  // States principaux & refs
  // ——————————————————————————————————————————
  const [currentMonth, setCurrentMonth] = useState(
    propCurrentMonth && isValid(propCurrentMonth)
      ? startOfMonth(propCurrentMonth)
      : startOfMonth(new Date())
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingActivity, setEditingActivity] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [tempSelectedDays, setTempSelectedDays] = useState([]); // selection multi-jours
  const [multiSelectType, setMultiSelectType] = useState("activity"); // "activity" | "paid_leave"

  const [publicHolidays, setPublicHolidays] = useState([]);

  const [isDeletingActivityFlag, setIsDeletingActivityFlag] = useState(false);
  const deletionTimeoutRef = useRef(null);

  const [draggedActivity, setDraggedActivity] = useState(null);
  const [isDraggingActivity, setIsDraggingActivity] = useState(false);
  const [isValidDropTarget, setIsValidDropTarget] = useState(false);

  const [isDraggingMultiSelect, setIsDraggingMultiSelect] = useState(false);
  const [dragStartDayForSelection, setDragStartDayForSelection] =
    useState(null);

  // Verrou "sélection 1 jour" (ouvert lors de l'édition/ajout via modal)
  const [isSingleDaySelectionLocked, setIsSingleDaySelectionLocked] =
    useState(false);

  // Filtre initial du modal (pré-filtrer activité vs absence)
  const [initialActivityTypeFilter, setInitialActivityTypeFilter] =
    useState(null); // 'activity' | 'absence'

  // Modales d'aperçu/rapport
  const [showSummaryReport, setShowSummaryReport] = useState(false);
  const [summaryReportMonth, setSummaryReportMonth] = useState(null);
  const [showMonthlyReportPreview, setShowMonthlyReportPreview] =
    useState(false);
  const [monthlyReportPreviewData, setMonthlyReportPreviewData] =
    useState(null);

  // Refs souris (multi-sélection)
  const isMouseDownOnCalendarDayRef = useRef(false);
  const mouseDownCoordsRef = useRef({ x: 0, y: 0 });

  // ——————————————————————————————————————————
  // Types d'absence
  // ——————————————————————————————————————————
  const paidLeaveTypeId = useMemo(() => {
    const t = activityTypeDefinitions.find(
      (t) => t.name && t.name.toLowerCase().includes("congé payé")
    );
    return t ? t.id : null;
  }, [activityTypeDefinitions]);

  const absenceActivityTypeIds = useMemo(() => {
    // Détermine les IDs de type "absence" à partir de is_absence ou mots-clés
    const ids = new Set();
    const keywords = [
      "congé",
      "absence",
      "maladie",
      "formation",
      "vacances",
      "rtt",
      "arrêt",
      "maternité",
      "paternité",
      "familial",
      "exceptionnel",
      "ferié",
      "férié",
      "repos",
      "indisponibilité",
    ];
    activityTypeDefinitions.forEach((type) => {
      const fromFlag = type.is_absence === true;
      const fromName =
        !fromFlag &&
        type.name &&
        keywords.some((k) => type.name.toLowerCase().includes(k));
      if (fromFlag || fromName) ids.add(type.id);
    });
    return ids;
  }, [activityTypeDefinitions]);

  // ——————————————————————————————————————————
  // Jours fériés & jours non travaillés
  // ——————————————————————————————————————————
  const fetchPublicHolidays = useCallback(
    async (year) => {
      try {
        const res = await fetch(`/api/public_holidays?year=${year}`);
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.message || "Failed to fetch public holidays.");
        }
        const data = await res.json();
        setPublicHolidays(
          data.map((h) => startOfDay(new Date(h.date))) // normalisation
        );
      } catch (err) {
        console.error("CraBoard: error fetching public holidays:", err);
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
      const key = format(date, "yyyy-MM-dd");
      return publicHolidays.some(
        (d) => format(d, "yyyy-MM-dd") === key
      );
    },
    [publicHolidays]
  );

  const isNonWorkingDay = useCallback(
    (date) => isWeekend(date, { weekStartsOn: 1 }) || isPublicHoliday(date),
    [isPublicHoliday]
  );

  // ——————————————————————————————————————————
  // Fermer la modal d'activité
  // ——————————————————————————————————————————
  const handleCloseActivityModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingActivity(null);
    setSelectedDate(new Date());
    setTempSelectedDays([]);
    setIsSingleDaySelectionLocked(false);
    setInitialActivityTypeFilter(null);
  }, []);

  // ——————————————————————————————————————————
  // Activités visibles (mois courant) — Correctif clé readOnly
  // ——————————————————————————————————————————
  const activitiesForCurrentMonth = useMemo(() => {
    return activities.filter((activity) => {
      const hasDate =
        activity.date_activite && isValid(new Date(activity.date_activite));
      const inMonth =
        hasDate &&
        isValid(currentMonth) &&
        isSameMonth(new Date(activity.date_activite), currentMonth);
      if (!inMonth) return false;

      // ✅ Correctif : en mode readOnly (modal historique),
      // on NE filtre PAS par user_id (les activités combinées n'en ont pas toujours).
      if (readOnly) return true;

      return String(activity.user_id) === String(userId);
    });
  }, [activities, currentMonth, userId, readOnly]);

  // Activités par jour (Map yyyy-MM-dd -> [])
  const activitiesByDay = useMemo(() => {
    const map = new Map();
    activitiesForCurrentMonth.forEach((a) => {
      if (!a.date_activite || !isValid(new Date(a.date_activite))) return;
      const k = format(new Date(a.date_activite), "yyyy-MM-dd");
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(a);
    });
    return map;
  }, [activitiesForCurrentMonth]);

  // Jours à afficher (mois + bordures semaine)
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({
      start: startOfWeek(start, { weekStartsOn: 1 }),
      end: endOfWeek(end, { weekStartsOn: 1 }),
    });
  }, [currentMonth]);

  // ——————————————————————————————————————————
  // Calculs récapitulatif (CRA/Absences)
  // ——————————————————————————————————————————
  const monthlySummary = useMemo(() => {
    const summary = {
      totalActivitiesTime: 0,
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
      totalWorkingDaysInMonth: 0,
    };

    // Jours ouvrés théoriques
    summary.totalWorkingDaysInMonth = daysInMonth.filter(
      (d) => !isWeekend(d, { weekStartsOn: 1 }) && !isPublicHoliday(d)
    ).length;

    activities.forEach((activity) => {
      const def = activityTypeDefinitions.find(
        (t) => String(t.id) === String(activity.type_activite)
      );
      const t = parseFloat(activity.temps_passe) || 0;
      const isAbs = absenceActivityTypeIds.has(String(activity.type_activite));

      if (isAbs) {
        if (activity.status === "validated")
          summary.totalAbsenceDaysValidated += t;
        else if (activity.status === "pending_review")
          summary.totalAbsenceDaysPending += t;
        else if (activity.status === "draft")
          summary.totalAbsenceDaysDraft += t;
        else if (activity.status === "rejected")
          summary.totalAbsenceDaysRejected += t;
      } else {
        summary.totalActivitiesTime += t;

        if (activity.status === "pending_review")
          summary.totalActivitiesPending += t;
        else if (activity.status === "validated")
          summary.totalActivitiesValidated += t;
        else if (activity.status === "draft")
          summary.totalActivitiesDraft += t;
        else if (activity.status === "rejected")
          summary.totalActivitiesRejected += t;

        if (def?.is_overtime) summary.totalOvertimeDays += t;
        if (def?.is_billable) summary.totalBillableDays += t;
      }
    });

    return summary;
  }, [
    activities,
    daysInMonth,
    absenceActivityTypeIds,
    activityTypeDefinitions,
    isPublicHoliday,
  ]);

  // ——————————————————————————————————————————
  // Repérage des rapports CRA / CP pour le mois
  // ——————————————————————————————————————————
  const { craReport, paidLeaveReport } = useMemo(() => {
    // Cas lecture seule avec un seul report (affichage d'un reçu par ex)
    if (readOnly && monthlyReports.length === 1) {
      const r = monthlyReports[0];
      return {
        craReport: r.report_type === "cra" ? r : null,
        paidLeaveReport: r.report_type === "paid_leave" ? r : null,
      };
    }
    const monthIdx = isValid(currentMonth) ? currentMonth.getMonth() + 1 : -1;
    const year = isValid(currentMonth) ? currentMonth.getFullYear() : -1;

    const cra = monthlyReports.find(
      (r) =>
        String(r.user_id) === String(userId) &&
        r.month === monthIdx &&
        r.year === year &&
        r.report_type === "cra"
    );
    const paid = monthlyReports.find(
      (r) =>
        String(r.user_id) === String(userId) &&
        r.month === monthIdx &&
        r.year === year &&
        r.report_type === "paid_leave"
    );
    return { craReport: cra || null, paidLeaveReport: paid || null };
  }, [monthlyReports, userId, currentMonth, readOnly]);

  const craReportStatus = craReport ? craReport.status : "empty";
  const paidLeaveReportStatus = paidLeaveReport
    ? paidLeaveReport.status
    : "empty";

  // Statut global (pour bannières/droits)
  const overallReportStatus = useMemo(() => {
    if (craReportStatus === "validated" || paidLeaveReportStatus === "validated")
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
    if (craReportStatus === "rejected" && craReport?.rejection_reason)
      return craReport.rejection_reason;
    if (
      paidLeaveReportStatus === "rejected" &&
      paidLeaveReport?.rejection_reason
    )
      return paidLeaveReport.rejection_reason;
    return null;
  }, [craReportStatus, paidLeaveReportStatus, craReport, paidLeaveReport]);

  // Droits d'édition (dépendent des statuts ET du readOnly global)
  const isCraEditable = useMemo(() => {
    return !readOnly && ["empty", "draft", "rejected"].includes(craReportStatus);
  }, [craReportStatus, readOnly]);

  const isPaidLeaveEditable = useMemo(() => {
    return (
      !readOnly && ["empty", "draft", "rejected"].includes(paidLeaveReportStatus)
    );
  }, [paidLeaveReportStatus, readOnly]);

  const isAnyReportEditable = useMemo(
    () => isCraEditable || isPaidLeaveEditable,
    [isCraEditable, isPaidLeaveEditable]
  );

  // ——————————————————————————————————————————
  // CRUD activité
  // ——————————————————————————————————————————
  const handleSaveActivity = useCallback(
    async (activityData) => {
      if (readOnly) {
        localShowMessage(
          "En lecture seule : impossible d’enregistrer.",
          "info"
        );
        return;
      }

      const isAbsence = absenceActivityTypeIds.has(
        String(activityData.type_activite)
      );
      const isCRA = !isAbsence;

      if (isAbsence && !isPaidLeaveEditable) {
        localShowMessage(
          "Impossible d’enregistrer : le rapport Congés est verrouillé.",
          "info"
        );
        return;
      }
      if (isCRA && !isCraEditable) {
        localShowMessage(
          "Impossible d’enregistrer : le rapport CRA est verrouillé.",
          "info"
        );
        return;
      }

      try {
        const payload = {
          ...activityData,
          user_id: userId,
          status: activityData.id ? activityData.status : "draft",
          temps_passe: parseFloat(activityData.temps_passe),
        };

        if (activityData.id) {
          // — Mise à jour
          const original = activities.find(
            (a) => String(a.id) === String(activityData.id)
          );
          if (!original) {
            localShowMessage(
              "Activité introuvable pour mise à jour.",
              "error"
            );
            return;
          }
          const targetDate = new Date(payload.date_activite);
          const targetKey = format(targetDate, "yyyy-MM-dd");
          const sameDay = (activitiesByDay.get(targetKey) || []).filter(
            (a) => String(a.id) !== String(original.id)
          );
          const totalSameDay =
            sameDay.reduce((s, a) => s + (parseFloat(a.temps_passe) || 0), 0) +
            payload.temps_passe;

          if (totalSameDay > 1) {
            localShowMessage(
              `La journée dépasse 1,00j (déjà ${(
                totalSameDay - payload.temps_passe
              ).toFixed(1)}j).`,
              "error"
            );
            return;
          }

          await onUpdateActivity(activityData.id, payload);
          localShowMessage("Activité enregistrée.", "success");
        } else {
          // — Création
          const daysToProcess =
            tempSelectedDays.length > 0
              ? tempSelectedDays
              : selectedDate
                ? [selectedDate]
                : [];

          if (daysToProcess.length === 0) {
            localShowMessage(
              "Aucun jour sélectionné pour la création.",
              "error"
            );
            return;
          }

          let ok = 0;
          let ko = 0;

          for (const day of daysToProcess) {
            const key = format(day, "yyyy-MM-dd");
            const existing = activitiesByDay.get(key) || [];
            const currentTotal = existing.reduce(
              (s, a) => s + (parseFloat(a.temps_passe) || 0),
              0
            );

            if (currentTotal + payload.temps_passe > 1) {
              localShowMessage(
                `Impossible d'ajouter sur ${format(
                  day,
                  "dd/MM/yyyy"
                )} : dépasse 1,00j.`,
                "error"
              );
              ko++;
              continue;
            }

            if (isNonWorkingDay(day) && !isAbsence && !activityData.override_non_working_day) {
              // jour non travaillé : seulement absences (ou override)
              ko++;
              continue;
            }

            try {
              await onAddActivity({
                ...payload,
                date_activite: format(day, "yyyy-MM-dd"),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              ok++;
            } catch (e) {
              console.error("Add activity error:", e);
              ko++;
            }
          }

          if (ok > 0) {
            localShowMessage(
              `Création : ${ok} ajout${ok > 1 ? "s" : ""}${ko ? `, ${ko} échec(s)` : ""
              }.`,
              ko ? "warning" : "success"
            );
          } else {
            localShowMessage(
              "Tous les ajouts ont échoué. Vérifie les jours non travaillés ou les limites.",
              "error"
            );
          }
        }
      } catch (err) {
        console.error("Save activity error:", err);
        localShowMessage(`Échec enregistrement : ${err.message}`, "error");
      } finally {
        handleCloseActivityModal();
        if (!readOnly && fetchActivitiesForMonth) {
          fetchActivitiesForMonth(currentMonth);
        }
      }
    },
    [
      activities,
      activitiesByDay,
      currentMonth,
      fetchActivitiesForMonth,
      handleCloseActivityModal,
      isCraEditable,
      isPaidLeaveEditable,
      isNonWorkingDay,
      localShowMessage,
      readOnly,
      selectedDate,
      tempSelectedDays,
      userId,
      absenceActivityTypeIds,
      onAddActivity,
      onUpdateActivity,
    ]
  );

  // Supprimer une activité (confirmation déjà gérée côté UI appelant)
  const confirmDeleteActivity = useCallback(
    async (activity) => {
      if (readOnly) {
        localShowMessage(
          "Lecture seule : suppression impossible.",
          "info"
        );
        return;
      }
      if (!activity) {
        localShowMessage("Aucune activité à supprimer.", "error");
        return;
      }

      const isAbs = absenceActivityTypeIds.has(String(activity.type_activite));
      if (!isAbs && !isCraEditable) {
        localShowMessage("CRA verrouillé : suppression impossible.", "info");
        return;
      }
      if (isAbs && !isPaidLeaveEditable) {
        localShowMessage(
          "Congés verrouillés : suppression impossible.",
          "info"
        );
        return;
      }
      if (!["draft", "rejected"].includes(activity.status)) {
        localShowMessage(
          `Statut '${activity.status}' : suppression impossible.`,
          "info"
        );
        return;
      }
      if (String(activity.user_id) !== String(userId)) {
        localShowMessage("Vous ne pouvez pas supprimer cette activité.", "error");
        return;
      }

      try {
        setEditingActivity(null);
        setIsDeletingActivityFlag(true);
        if (deletionTimeoutRef.current) clearTimeout(deletionTimeoutRef.current);

        await onDeleteActivity(activity.id);
        localShowMessage("Activité supprimée.", "success");

        if (!readOnly && fetchActivitiesForMonth) {
          fetchActivitiesForMonth(currentMonth);
        }
      } catch (err) {
        console.error("Delete error:", err);
        localShowMessage(`Échec suppression : ${err.message}`, "error");
      } finally {
        deletionTimeoutRef.current = setTimeout(
          () => setIsDeletingActivityFlag(false),
          500
        );
      }
    },
    [
      currentMonth,
      fetchActivitiesForMonth,
      isCraEditable,
      isPaidLeaveEditable,
      localShowMessage,
      onDeleteActivity,
      readOnly,
      userId,
      absenceActivityTypeIds,
    ]
  );

  // Demande de suppression depuis le calendrier (bouton poubelle)
  const requestDeleteFromCalendar = useCallback(
    async (activityId, e) => {
      e.stopPropagation();

      if (readOnly) {
        localShowMessage(
          "Lecture seule : suppression impossible.",
          "info"
        );
        return;
      }

      const activity = activities.find((a) => String(a.id) === String(activityId));
      if (!activity) {
        localShowMessage("Activité introuvable.", "error");
        return;
      }

      const isAbs = absenceActivityTypeIds.has(String(activity.type_activite));
      if (!isAbs && !isCraEditable) {
        localShowMessage("CRA verrouillé : suppression impossible.", "info");
        return;
      }
      if (isAbs && !isPaidLeaveEditable) {
        localShowMessage("Congés verrouillés : suppression impossible.", "info");
        return;
      }
      if (!["draft", "rejected"].includes(activity.status)) {
        localShowMessage(
          `Statut '${activity.status}' : suppression impossible.`,
          "info"
        );
        return;
      }
      if (String(activity.user_id) !== String(userId)) {
        localShowMessage("Vous ne pouvez pas supprimer cette activité.", "error");
        return;
      }

      confirmDeleteActivity(activity);
    },
    [
      activities,
      confirmDeleteActivity,
      isCraEditable,
      isPaidLeaveEditable,
      localShowMessage,
      readOnly,
      userId,
      absenceActivityTypeIds,
    ]
  );

  // ——————————————————————————————————————————
  // Clic sur un jour (création/édition)
  // ——————————————————————————————————————————
  const handleDayClick = useCallback(
    (dayDate, e) => {
      if (isDraggingActivity || isDeletingActivityFlag || isDraggingMultiSelect)
        return;

      if (e?.target?.closest(".cra-activity-item")) return;

      if (readOnly) {
        localShowMessage("Lecture seule : modification impossible.", "info");
        return;
      }

      const dateKey = isValid(dayDate) ? format(dayDate, "yyyy-MM-dd") : null;
      if (!dateKey) return;

      const activitiesOnDay = activitiesByDay.get(dateKey) || [];
      const totalTime = activitiesOnDay.reduce(
        (s, a) => s + (parseFloat(a.temps_passe) || 0),
        0
      );

      if (activitiesOnDay.length > 0) {
        // Édition de la 1ère activité du jour
        const activity = activitiesOnDay[0];
        const isAbs = absenceActivityTypeIds.has(String(activity.type_activite));

        if (!isAbs && !isCraEditable) {
          localShowMessage("CRA verrouillé : édition impossible.", "info");
          return;
        }
        if (isAbs && !isPaidLeaveEditable) {
          localShowMessage("Congés verrouillés : édition impossible.", "info");
          return;
        }
        if (!["draft", "rejected"].includes(activity.status)) {
          localShowMessage(
            `Statut '${activity.status}' : édition impossible.`,
            "info"
          );
          return;
        }
        if (String(activity.user_id) !== String(userId)) {
          localShowMessage("Vous ne pouvez pas modifier cette activité.", "error");
          return;
        }

        setSelectedDate(dayDate);
        setEditingActivity(activity);
        setTempSelectedDays([]);
        setIsModalOpen(true);
        setIsSingleDaySelectionLocked(true);
        setInitialActivityTypeFilter(
          isAbs ? "absence" : "activity"
        );
      } else {
        // Création
        if (totalTime >= 1) {
          localShowMessage(
            "Cette journée atteint déjà 1,00j.",
            "warning"
          );
          return;
        }

        // Bloque la création d'absence sur jour non travaillé en sélection simple (si besoin)
        if (multiSelectType === "paid_leave" && isNonWorkingDay(dayDate)) {
          localShowMessage(
            "Impossible d'ajouter un congé sur weekend/jour férié (sélection simple).",
            "warning"
          );
          return;
        }

        if (multiSelectType === "activity" && !isCraEditable) {
          localShowMessage("CRA verrouillé : ajout impossible.", "info");
          return;
        }
        if (multiSelectType === "paid_leave" && !isPaidLeaveEditable) {
          localShowMessage("Congés verrouillés : ajout impossible.", "info");
          return;
        }

        setSelectedDate(dayDate);
        setEditingActivity(null);
        setTempSelectedDays([]);
        setIsModalOpen(true);
        setIsSingleDaySelectionLocked(true);
        setInitialActivityTypeFilter(
          multiSelectType === "paid_leave" ? "absence" : "activity"
        );
      }
    },
    [
      activitiesByDay,
      isCraEditable,
      isPaidLeaveEditable,
      isDraggingActivity,
      isDraggingMultiSelect,
      isDeletingActivityFlag,
      isNonWorkingDay,
      localShowMessage,
      multiSelectType,
      readOnly,
      userId,
      absenceActivityTypeIds,
    ]
  );

  // ——————————————————————————————————————————
  // Clic sur une activité (édition)
  // ——————————————————————————————————————————
  const handleActivityClick = useCallback(
    (activity) => {
      if (
        isDeletingActivityFlag ||
        isDraggingActivity ||
        isDraggingMultiSelect ||
        isSingleDaySelectionLocked
      )
        return;

      if (readOnly) {
        localShowMessage("Lecture seule : édition impossible.", "info");
        return;
      }

      const current = activities.find((a) => String(a.id) === String(activity.id));
      if (!current) {
        localShowMessage("Activité introuvable (rafraîchir).", "error");
        setEditingActivity(null);
        return;
      }

      if (String(current.user_id) !== String(userId)) {
        localShowMessage("Vous ne pouvez pas modifier cette activité.", "error");
        return;
      }

      const isAbs = absenceActivityTypeIds.has(String(current.type_activite));
      if (!isAbs && !isCraEditable) {
        localShowMessage("CRA verrouillé : édition impossible.", "info");
        return;
      }
      if (isAbs && !isPaidLeaveEditable) {
        localShowMessage("Congés verrouillés : édition impossible.", "info");
        return;
      }
      if (!["draft", "rejected"].includes(current.status)) {
        localShowMessage(
          `Statut '${current.status}' : édition impossible.`,
          "info"
        );
        return;
      }
      if (!current.date_activite || !isValid(new Date(current.date_activite))) {
        localShowMessage("Date invalide : édition impossible.", "error");
        return;
      }

      setSelectedDate(new Date(current.date_activite));
      setEditingActivity(current);
      setTempSelectedDays([]);
      setIsModalOpen(true);
      setIsSingleDaySelectionLocked(true);
      setInitialActivityTypeFilter(isAbs ? "absence" : "activity");
    },
    [
      activities,
      isCraEditable,
      isPaidLeaveEditable,
      isDeletingActivityFlag,
      isDraggingActivity,
      isDraggingMultiSelect,
      isSingleDaySelectionLocked,
      localShowMessage,
      readOnly,
      userId,
      absenceActivityTypeIds,
    ]
  );

  // ——————————————————————————————————————————
  // Drag & Drop activités (individuelles)
  // ——————————————————————————————————————————
  const handleDragStartActivity = useCallback(
    (e, activity) => {
      if (isSingleDaySelectionLocked) {
        e.preventDefault();
        localShowMessage(
          "Déplacement désactivé : la modale est ouverte.",
          "info"
        );
        return;
      }

      // en mode multi-sélection on bloque le DnD individuel
      if (multiSelectType !== "activity" && multiSelectType !== "paid_leave") {
        e.preventDefault();
        return;
      }

      const isAbs = absenceActivityTypeIds.has(String(activity.type_activite));
      const isCRA = !isAbs;

      if (
        readOnly ||
        (isCRA && !isCraEditable) ||
        (isAbs && !isPaidLeaveEditable) ||
        String(activity.user_id) !== String(userId)
      ) {
        e.preventDefault();
        return;
      }

      if (!["draft", "rejected"].includes(activity.status)) {
        e.preventDefault();
        localShowMessage(
          `Statut '${activity.status}' : déplacement impossible.`,
          "info"
        );
        return;
      }

      setDraggedActivity(activity);
      setIsDraggingActivity(true);
      e.dataTransfer.setData("activityId", activity.id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.dropEffect = "move";
    },
    [
      isCraEditable,
      isPaidLeaveEditable,
      isSingleDaySelectionLocked,
      localShowMessage,
      multiSelectType,
      readOnly,
      userId,
      absenceActivityTypeIds,
    ]
  );

  const handleDragOverDay = useCallback(
    (e, day) => {
      if (isSingleDaySelectionLocked) {
        e.preventDefault();
        return;
      }
      if (multiSelectType !== "activity" && multiSelectType !== "paid_leave") {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      if (!draggedActivity) return;

      const isTargetNonWorking = isNonWorkingDay(day);
      const isDraggedAbs = absenceActivityTypeIds.has(
        String(draggedActivity.type_activite)
      );
      const isCRA = !isDraggedAbs;

      if (
        readOnly ||
        (isCRA && !isCraEditable) ||
        (isDraggedAbs && !isPaidLeaveEditable)
      ) {
        setIsValidDropTarget(false);
        e.dataTransfer.dropEffect = "none";
        return;
      }

      let allowed = true;
      if (isTargetNonWorking) {
        allowed = isDraggedAbs && draggedActivity.override_non_working_day;
      }
      if (!isSameMonth(day, currentMonth)) allowed = false;

      setIsValidDropTarget(allowed);
      e.dataTransfer.dropEffect = allowed ? "move" : "none";
    },
    [
      draggedActivity,
      currentMonth,
      isCraEditable,
      isPaidLeaveEditable,
      isNonWorkingDay,
      isSingleDaySelectionLocked,
      multiSelectType,
      readOnly,
      absenceActivityTypeIds,
    ]
  );

  const handleDropActivity = useCallback(
    async (e, targetDay) => {
      if (isSingleDaySelectionLocked) {
        e.preventDefault();
        return;
      }
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

      const act = activities.find((a) => String(a.id) === String(activityId));
      if (!act) {
        localShowMessage("Activité introuvable pour déplacement.", "error");
        return;
      }

      const isAbs = absenceActivityTypeIds.has(String(act.type_activite));
      const isCRA = !isAbs;

      if (
        readOnly ||
        (isCRA && !isCraEditable) ||
        (isAbs && !isPaidLeaveEditable)
      ) {
        localShowMessage(
          "Déplacement impossible (droits/verrou).",
          "info"
        );
        return;
      }

      const isTargetNonWorking = isNonWorkingDay(targetDay);
      let newOverride = act.override_non_working_day;

      let allowed = true;
      if (isTargetNonWorking) {
        allowed = isAbs && act.override_non_working_day;
      } else {
        if (isAbs && act.override_non_working_day) newOverride = false;
      }
      if (!isSameMonth(targetDay, currentMonth)) {
        localShowMessage(
          "Déplacer dans le même mois affiché.",
          "warning"
        );
        return;
      }
      if (!["draft", "rejected"].includes(act.status)) {
        localShowMessage(
          "Déplacement impossible (statut).",
          "info"
        );
        return;
      }
      if (isSameDay(new Date(act.date_activite), targetDay)) {
        localShowMessage("Déjà sur cette date.", "info");
        return;
      }

      // Vérif 1j max
      const key = format(targetDay, "yyyy-MM-dd");
      const sameDay = (activitiesByDay.get(key) || []).filter(
        (a) => String(a.id) !== String(act.id)
      );
      const newTotal =
        sameDay.reduce((s, a) => s + (parseFloat(a.temps_passe) || 0), 0) +
        (parseFloat(act.temps_passe) || 0);
      if (newTotal > 1) {
        localShowMessage(
          `Déplacement impossible : dépasserait 1,00j.`,
          "error"
        );
        return;
      }

      if (allowed) {
        await onUpdateActivity(act.id, {
          ...act,
          date_activite: startOfDay(targetDay),
          override_non_working_day: newOverride,
        });
        localShowMessage("Activité déplacée.", "success");
        if (!readOnly && fetchActivitiesForMonth) {
          fetchActivitiesForMonth(currentMonth);
        }
      } else {
        localShowMessage(
          "Déplacement non autorisé (jour non travaillé sans override).",
          "warning"
        );
      }
    },
    [
      activities,
      activitiesByDay,
      currentMonth,
      fetchActivitiesForMonth,
      isCraEditable,
      isPaidLeaveEditable,
      isNonWorkingDay,
      localShowMessage,
      multiSelectType,
      onUpdateActivity,
      readOnly,
      isSingleDaySelectionLocked,
      absenceActivityTypeIds,
    ]
  );

  // ——————————————————————————————————————————
  // Multi-sélection (drag) — démarrage
  // ——————————————————————————————————————————
  const handleMouseDownMultiSelect = useCallback(
    (e, day) => {
      if (isSingleDaySelectionLocked) {
        localShowMessage(
          "Multi-sélection verrouillée (modale ouverte).",
          "info"
        );
        return;
      }
      if (multiSelectType === "paid_leave" && isNonWorkingDay(day)) {
        localShowMessage(
          "Impossible de démarrer une sélection de congés sur weekend/férié.",
          "warning"
        );
        e.preventDefault();
        return;
      }
      if (readOnly || isDraggingActivity || isDeletingActivityFlag) {
        localShowMessage(
          "Multi-sélection désactivée (lecture seule ou action en cours).",
          "info"
        );
        return;
      }
      if (multiSelectType === "activity" && !isCraEditable) {
        localShowMessage("CRA verrouillé : sélection impossible.", "info");
        return;
      }
      if (multiSelectType === "paid_leave" && !isPaidLeaveEditable) {
        localShowMessage("Congés verrouillés : sélection impossible.", "info");
        return;
      }

      const key = format(day, "yyyy-MM-dd");
      const existing = activitiesByDay.get(key) || [];
      const currentTotal = existing.reduce(
        (s, a) => s + (parseFloat(a.temps_passe) || 0),
        0
      );
      if (currentTotal >= 1) {
        localShowMessage(
          `Impossible de démarrer : ${format(day, "dd/MM/yyyy")} est à 1,00j.`,
          "warning"
        );
        return;
      }

      if (e.button === 0) {
        isMouseDownOnCalendarDayRef.current = true;
        mouseDownCoordsRef.current = { x: e.clientX, y: e.clientY };
        setDragStartDayForSelection(day);
        setTempSelectedDays([day]);
        // On active isDraggingMultiSelect plus tard si mouvement > threshold
      }
    },
    [
      activitiesByDay,
      isCraEditable,
      isPaidLeaveEditable,
      isDeletingActivityFlag,
      isDraggingActivity,
      isNonWorkingDay,
      localShowMessage,
      multiSelectType,
      readOnly,
      isSingleDaySelectionLocked,
    ]
  );

  // Étendre la sélection pendant le drag
  const handleMouseEnterMultiSelect = useCallback(
    (day) => {
      if (
        isSingleDaySelectionLocked ||
        !isMouseDownOnCalendarDayRef.current ||
        !isDraggingMultiSelect ||
        !dragStartDayForSelection ||
        readOnly ||
        isDraggingActivity ||
        isDeletingActivityFlag
      )
        return;

      const iStart = daysInMonth.findIndex((d) =>
        isSameDay(d, dragStartDayForSelection)
      );
      const iEnd = daysInMonth.findIndex((d) => isSameDay(d, day));
      if (iStart === -1 || iEnd === -1) return;

      const [a, b] = iStart < iEnd ? [iStart, iEnd] : [iEnd, iStart];

      const editableMode =
        multiSelectType === "paid_leave" ? isPaidLeaveEditable : isCraEditable;

      const sel = daysInMonth.slice(a, b + 1).filter((d) => {
        const key = format(d, "yyyy-MM-dd");
        const t = (activitiesByDay.get(key) || []).reduce(
          (s, act) => s + (parseFloat(act.temps_passe) || 0),
          0
        );
        // on bloque les jours non travaillés et ceux déjà à 1,00j
        return editableMode && !isNonWorkingDay(d) && t < 1;
      });

      setTempSelectedDays(sel);
    },
    [
      activitiesByDay,
      daysInMonth,
      dragStartDayForSelection,
      isCraEditable,
      isDeletingActivityFlag,
      isDraggingActivity,
      isDraggingMultiSelect,
      isNonWorkingDay,
      isPaidLeaveEditable,
      isSingleDaySelectionLocked,
      multiSelectType,
      readOnly,
    ]
  );

  // Fin de la multi-sélection (ouvre la modale si besoin)
  const handleMouseUpMultiSelect = useCallback(() => {
    if (isSingleDaySelectionLocked) return;
    if (readOnly) {
      localShowMessage("Lecture seule.", "info");
      setTempSelectedDays([]);
      return;
    }

    if (tempSelectedDays.length > 0) {
      if (multiSelectType === "paid_leave" && !isPaidLeaveEditable) {
        localShowMessage("Congés verrouillés.", "info");
        setTempSelectedDays([]);
        return;
      }
      if (multiSelectType === "activity" && !isCraEditable) {
        localShowMessage("CRA verrouillé.", "info");
        setTempSelectedDays([]);
        return;
      }

      // Configure le filtre initial selon le mode
      setInitialActivityTypeFilter(
        multiSelectType === "paid_leave" ? "absence" : "activity"
      );
      setEditingActivity(null);
      setSelectedDate(null);
      setIsModalOpen(true);
      // tempSelectedDays sera reset à la fermeture de la modale
    }
  }, [
    isSingleDaySelectionLocked,
    readOnly,
    localShowMessage,
    tempSelectedDays,
    multiSelectType,
    isPaidLeaveEditable,
    isCraEditable,
  ]);

  // ——————————————————————————————————————————
  // Reset du mois (supprime les brouillons/rejetées éditables)
  // ——————————————————————————————————————————
  const confirmResetMonth = useCallback(async () => {
    if (readOnly) {
      localShowMessage("Lecture seule : reset impossible.", "info");
      return;
    }

    const toReset = activitiesForCurrentMonth.filter(
      (a) =>
        (a.status === "draft" || a.status === "rejected") &&
        ((!absenceActivityTypeIds.has(String(a.type_activite)) && isCraEditable) ||
          (absenceActivityTypeIds.has(String(a.type_activite)) &&
            isPaidLeaveEditable))
    );

    if (toReset.length === 0) {
      localShowMessage("Aucune activité brouillon/rejetée à supprimer.", "info");
      return;
    }

    let ok = 0;
    let ko = 0;

    for (const a of toReset) {
      try {
        setIsDeletingActivityFlag(true);
        if (deletionTimeoutRef.current) clearTimeout(deletionTimeoutRef.current);
        await onDeleteActivity(a.id);
        ok++;
      } catch (e) {
        ko++;
      } finally {
        deletionTimeoutRef.current = setTimeout(
          () => setIsDeletingActivityFlag(false),
          500
        );
      }
    }

    fetchActivitiesForMonth?.(currentMonth);
    localShowMessage(
      `Reset terminé : ${ok} supprimée(s), ${ko} échec(s).`,
      ko ? "warning" : "success"
    );
  }, [
    activitiesForCurrentMonth,
    currentMonth,
    fetchActivitiesForMonth,
    isCraEditable,
    isPaidLeaveEditable,
    localShowMessage,
    onDeleteActivity,
    readOnly,
    absenceActivityTypeIds,
  ]);

  const requestResetMonth = useCallback(() => {
    if (readOnly) {
      localShowMessage("Lecture seule : reset impossible.", "info");
      return;
    }
    if (!isCraEditable && !isPaidLeaveEditable) {
      localShowMessage(
        "Impossible de réinitialiser : rapports verrouillés.",
        "info"
      );
      return;
    }
    confirmResetMonth();
  }, [confirmResetMonth, isCraEditable, isPaidLeaveEditable, localShowMessage, readOnly]);

  // ——————————————————————————————————————————
  // Soumission des rapports (CRA / Congés)
  // ——————————————————————————————————————————
  const sendActivities = useCallback(
    async (activitiesToSubmit, reportType) => {
      if (readOnly) {
        localShowMessage("Lecture seule : envoi impossible.", "info");
        return;
      }
      if (reportType === "cra" && !isCraEditable) {
        localShowMessage("CRA verrouillé : envoi impossible.", "info");
        return;
      }
      if (reportType === "paid_leave" && !isPaidLeaveEditable) {
        localShowMessage("Congés verrouillés : envoi impossible.", "info");
        return;
      }
      if (activitiesToSubmit.length === 0) {
        localShowMessage(
          `Aucune ${reportType === "cra" ? "activité CRA" : "absence"} à envoyer.`,
          "info"
        );
        return;
      }

      const monthIdx = isValid(currentMonth) ? currentMonth.getMonth() + 1 : -1;
      const year = isValid(currentMonth) ? currentMonth.getFullYear() : -1;

      const existing = monthlyReports.find(
        (r) =>
          String(r.user_id) === String(userId) &&
          r.month === monthIdx &&
          r.year === year &&
          r.report_type === reportType
      );
      if (existing && !["draft", "rejected"].includes(existing.status)) {
        localShowMessage(
          `Un rapport "${reportType}" est déjà au statut "${existing.status}".`,
          "warning"
        );
        return;
      }

      const ids = activitiesToSubmit.map((a) => a.id);
      const totalDays = activitiesToSubmit.reduce(
        (s, a) => s + (parseFloat(a.temps_passe) || 0),
        0
      );
      const totalBillable = activitiesToSubmit
        .filter((a) => {
          const def = activityTypeDefinitions.find(
            (d) => String(d.id) === String(a.type_activite)
          );
          return def?.is_billable;
        })
        .reduce((s, a) => s + (parseFloat(a.temps_passe) || 0), 0);

      const reportData = {
        user_id: userId,
        userName: userFirstName,
        month: monthIdx,
        year,
        total_days_worked: totalDays,
        total_billable_days: totalBillable,
        activities_snapshot: ids,
        status: "pending_review",
        submittedAt: new Date(),
        report_type: reportType,
      };

      try {
        await onSendMonthlyReport(reportData);
        localShowMessage(`Rapport ${reportType} envoyé.`, "success");
        fetchActivitiesForMonth?.(currentMonth);
      } catch (err) {
        console.error("send report error:", err);
        localShowMessage(
          `Échec envoi rapport ${reportType} : ${err.message}`,
          "error"
        );
      }
    },
    [
      activityTypeDefinitions,
      currentMonth,
      fetchActivitiesForMonth,
      localShowMessage,
      monthlyReports,
      onSendMonthlyReport,
      readOnly,
      userFirstName,
      userId,
      isCraEditable,
      isPaidLeaveEditable,
    ]
  );

  const requestSendCRA = useCallback(() => {
    if (!isCraEditable) {
      localShowMessage("CRA verrouillé : envoi impossible.", "info");
      return;
    }
    const list = activitiesForCurrentMonth.filter(
      (a) =>
        !absenceActivityTypeIds.has(String(a.type_activite)) &&
        (a.status === "draft" || a.status === "rejected")
    );
    if (!list.length) {
      localShowMessage("Aucune activité CRA brouillon/rejetée ce mois.", "info");
      return;
    }
    sendActivities(list, "cra");
  }, [
    activitiesForCurrentMonth,
    isCraEditable,
    localShowMessage,
    sendActivities,
    absenceActivityTypeIds,
  ]);

  const requestSendPaidLeaves = useCallback(() => {
    if (!isPaidLeaveEditable) {
      localShowMessage("Congés verrouillés : envoi impossible.", "info");
      return;
    }
    const list = activitiesForCurrentMonth.filter(
      (a) =>
        absenceActivityTypeIds.has(String(a.type_activite)) &&
        (a.status === "draft" || a.status === "rejected")
    );
    if (!list.length) {
      localShowMessage("Aucun congé brouillon/rejeté ce mois.", "info");
      return;
    }
    sendActivities(list, "paid_leave");
  }, [
    activitiesForCurrentMonth,
    isPaidLeaveEditable,
    localShowMessage,
    sendActivities,
    absenceActivityTypeIds,
  ]);

  // ——————————————————————————————————————————
  // Changement de mois
  // ——————————————————————————————————————————
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const next = subMonths(prev, 1);
      onMonthChange?.(next);
      return next;
    });
  }, [onMonthChange]);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const next = addMonths(prev, 1);
      onMonthChange?.(next);
      return next;
    });
  }, [onMonthChange]);

  const handleToggleSummaryReport = useCallback(() => {
    setShowSummaryReport((prev) => {
      const next = !prev;
      setSummaryReportMonth(next ? currentMonth : null);
      return next;
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

  // ——————————————————————————————————————————
  // Effets
  // ——————————————————————————————————————————
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
      if (isSingleDaySelectionLocked) return;

      // Active la multi-sélection si mouvement > threshold
      if (
        isMouseDownOnCalendarDayRef.current &&
        dragStartDayForSelection &&
        !isDraggingMultiSelect
      ) {
        const dx = e.clientX - mouseDownCoordsRef.current.x;
        const dy = e.clientY - mouseDownCoordsRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > DRAG_THRESHOLD) {
          setIsDraggingMultiSelect(true);
        }
      }
    };

    const handleGlobalMouseUp = (e) => {
      isMouseDownOnCalendarDayRef.current = false;
      setIsDraggingMultiSelect(false);
      setDragStartDayForSelection(null);

      if (isSingleDaySelectionLocked) return;

      const dx = e.clientX - mouseDownCoordsRef.current.x;
      const dy = e.clientY - mouseDownCoordsRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > DRAG_THRESHOLD) {
        // drag confirmé
        handleMouseUpMultiSelect();
      } else if (dragStartDayForSelection) {
        // simple click
        handleDayClick(dragStartDayForSelection, e);
      }
    };

    document.addEventListener("dragend", handleDragEnd);
    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mousemove", handleGlobalMouseMove);

    return () => {
      document.removeEventListener("dragend", handleDragEnd);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [
    dragStartDayForSelection,
    handleDayClick,
    handleMouseUpMultiSelect,
    isDraggingMultiSelect,
    isSingleDaySelectionLocked,
  ]);

  useEffect(() => {
    if (!readOnly && typeof fetchActivitiesForMonth === "function") {
      fetchActivitiesForMonth(currentMonth);
    }
  }, [currentMonth, fetchActivitiesForMonth, readOnly]);

  // ——————————————————————————————————————————
  // Indicateurs récap
  // ——————————————————————————————————————————
  const totalWorkingDaysInMonth = useMemo(() => {
    if (!isValid(currentMonth)) return 0;
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    return days.filter(
      (d) => !isWeekend(d, { weekStartsOn: 1 }) && !isPublicHoliday(d)
    ).length;
  }, [currentMonth, isPublicHoliday]);

  const totalActivitiesTimeInMonth = useMemo(
    () =>
      activitiesForCurrentMonth.reduce(
        (s, a) => s + (parseFloat(a.temps_passe) || 0),
        0
      ),
    [activitiesForCurrentMonth]
  );

  const timeDifference = useMemo(
    () => (totalActivitiesTimeInMonth - totalWorkingDaysInMonth).toFixed(2),
    [totalActivitiesTimeInMonth, totalWorkingDaysInMonth]
  );

  // ——————————————————————————————————————————
  // Rendu
  // ——————————————————————————————————————————
  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-md p-4">
      {/* Styles scrollbar (léger) */}
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 2px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #bdbdbd; border-radius: 2px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9e9e9e; }
        `}
      </style>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4 sm:mb-6 text-center">
        Calendrier de {userFirstName} — {format(currentMonth, "MMMM yyyy", { locale: fr })}
      </h2>

      {/* Bandeau read-only */}
      {readOnly && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
          <strong className="font-semibold">Mode lecture seule :</strong>
          <span className="ml-2">
            vous consultez un CRA sans pouvoir le modifier.
          </span>
        </div>
      )}

      {/* Contrôles calendrier */}
      <CraControls
        currentMonth={currentMonth}
        userFirstName={userFirstName}
        craReportStatus={craReportStatus}
        paidLeaveReportStatus={paidLeaveReportStatus}
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
          activitiesForCurrentMonth.filter(
            (a) =>
              !absenceActivityTypeIds.has(String(a.type_activite)) &&
              (a.status === "draft" || a.status === "rejected")
          ).length
        }
        paidLeaveDraftsCount={
          activitiesForCurrentMonth.filter(
            (a) =>
              absenceActivityTypeIds.has(String(a.type_activite)) &&
              (a.status === "draft" || a.status === "rejected")
          ).length
        }
        multiSelectType={multiSelectType}
        onCycleMultiSelectMode={() =>
          readOnly
            ? localShowMessage(
              "Changement de mode désactivé en lecture seule.",
              "info"
            )
            : setMultiSelectType((t) => (t === "activity" ? "paid_leave" : "activity"))
        }
        isAnyReportEditable={isAnyReportEditable}
        readOnly={readOnly}
      />
      {/* Modal activité */}
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
          selectedDaysForMultiAdd={tempSelectedDays}
          isNonWorkingDay={isNonWorkingDay}
          activitiesByDay={activitiesByDay}
          initialActivityTypeFilter={initialActivityTypeFilter}
          absenceActivityTypeIds={absenceActivityTypeIds}
        />
      )}

      {/* Résumé mensuel + statut rapport */}
      <CraSummary
        craReport={craReport}
        paidLeaveReport={paidLeaveReport}
        isCraEditable={isCraEditable}
        isPaidLeaveEditable={isPaidLeaveEditable}
        onSendMonthlyReport={sendActivities}
        rejectionReason={overallRejectionReason}
        totalWorkingDaysInMonth={totalWorkingDaysInMonth}
        totalActivitiesTimeInMonth={totalActivitiesTimeInMonth}
        timeDifference={timeDifference}
      />

      {/* Grille calendrier */}
      <div className="mt-4">
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
          // onMouseUp est global
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
          isSingleDaySelectionLocked={isSingleDaySelectionLocked}
        />
      </div>

      {/* Modal aperçu rapport */}
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

      {/* Modal résumé global */}
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
          publicHolidays={publicHolidays.map((d) => format(d, "yyyy-MM-dd"))}
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