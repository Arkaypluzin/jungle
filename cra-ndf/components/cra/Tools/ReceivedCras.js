"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format, parseISO, isValid as isValidDateFns } from "date-fns";
import { fr } from "date-fns/locale";

import MonthlyReportPreviewModal from "../Reports/MonthlyReportPreviewModal";
import ConfirmationModal from "../Modals/ConfirmationModal";
import CraBoard from "../Board/CraBoard";

/* =========================================================================================
 * Helpers - dates & affichage
 * =======================================================================================*/

/** Normalise une valeur potentielle de date en instance Date valide, sinon null. */
function normalizeToDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isValidDateFns(v) ? v : null;
  if (typeof v === "number") {
    const d = new Date(v);
    return isValidDateFns(d) ? d : null;
  }
  if (typeof v === "string") {
    const p = parseISO(v);
    if (isValidDateFns(p)) return p;
    const d = new Date(v);
    return isValidDateFns(d) ? d : null;
  }
  return null;
}

/** Format court date/heure FR. */
function fmt(date) {
  return date ? format(date, "dd/MM/yyyy HH:mm", { locale: fr }) : "N/A";
}

/* =========================================================================================
 * MultiSelectDropdown — composant léger, sans dépendances
 * =======================================================================================*/
function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Sélectionner...",
  className = "",
  allSelectedLabel = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Ferme le menu si clic extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.removeEventListener("touchstart", handleClickOutside, { passive: false });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside, { passive: false });
    };
  }, []);

  const handleToggle = useCallback(() => setIsOpen((p) => !p), []);

  const handleOptionClick = useCallback(
    (value) => {
      const newSelectedValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      onSelectionChange(newSelectedValues);
    },
    [selectedValues, onSelectionChange]
  );

  const displaySelected = useMemo(() => {
    if (selectedValues.length === 0) {
      return allSelectedLabel || `Tous les ${label.toLowerCase().replace(":", "")}`;
    }
    if (selectedValues.length === options.length && options.length > 0) {
      return allSelectedLabel || `Tous les ${label.toLowerCase().replace(":", "")}`;
    }
    const selectedNames = options
      .filter((o) => selectedValues.includes(o.value))
      .map((o) => o.name);
    return selectedNames.join(", ");
  }, [selectedValues, options, label, allSelectedLabel]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 flex justify-between items-center hover:border-gray-400"
      >
        <span className="truncate text-sm">{displaySelected || placeholder}</span>
        <svg
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-4 py-2 text-gray-500 text-sm">Aucune option disponible.</div>
          ) : (
            options.map((option) => (
              <label key={option.value} className="flex items-center px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={selectedValues.includes(option.value)}
                  onChange={() => handleOptionClick(option.value)}
                  className="form-checkbox h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="ml-2 text-gray-800">{option.name}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================================
 * Page — ReceivedCras : Vue combinée CRA + Congés (1 ligne / user+mois+année)
 * =======================================================================================*/
export default function ReceivedCras({
  userId,
  userFirstName,
  userRole,
  showMessage,
  clientDefinitions,
  activityTypeDefinitions,
  monthlyReports: propMonthlyReports,
  onDeleteMonthlyReport, // toujours supporté en prop (non rendu suite à ta demande)
}) {
  // ----------- State principal -----------
  const [reports, setReports] = useState(propMonthlyReports);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allUsersForFilter, setAllUsersForFilter] = useState([]);

  // Filtres (tableau vide = "tous")
  const [filterUserIds, setFilterUserIds] = useState([]);
  const [filterMonths, setFilterMonths] = useState([]);
  const [filterYears, setFilterYears] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);

  // Aperçu “table”
  const [selectedReportForPreview, setSelectedReportForPreview] = useState(null);
  const [showMonthlyReportPreview, setShowMonthlyReportPreview] = useState(false);

  // Modals validation/rejet
  const [reportToUpdate, setReportToUpdate] = useState(null);
  const [showValidationConfirmModal, setShowValidationConfirmModal] = useState(false);
  const [showRejectionConfirmModal, setShowRejectionConfirmModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Modal CraBoard combiné
  const [showCraBoardModal, setShowCraBoardModal] = useState(false);
  const [craBoardReportData, setCraBoardReportData] = useState(null);
  const [modalMeta, setModalMeta] = useState(null); // { craDetail?, paidDetail? }

  const isAdmin = useMemo(() => userRole === "admin", [userRole]);

  /* -------------------------------------------------------------------------------------
   * Chargement des utilisateurs (pour le filtre)
   * -----------------------------------------------------------------------------------*/
  const fetchUsersForFilter = useCallback(async () => {
    try {
      const response = await fetch("/api/cras_users");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de la récupération des utilisateurs pour le filtre.");
      }
      const data = await response.json();
      setAllUsersForFilter(data);
    } catch (err) {
      console.error("ReceivedCras: Erreur fetch users:", err);
      showMessage?.(`Erreur lors du chargement des utilisateurs: ${err.message}`, "error");
    }
  }, [showMessage]);

  /* -------------------------------------------------------------------------------------
   * Chargement des rapports (selon filtres) — retourne CRA et Congés
   * -----------------------------------------------------------------------------------*/
  const fetchMonthlyReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();

      // Si aucun utilisateur sélectionné => tous
      const usersToFilter =
        filterUserIds.length > 0 ? filterUserIds : allUsersForFilter.map((u) => u.azureAdUserId);
      if (usersToFilter.length > 0) queryParams.append("userId", usersToFilter.join(","));
      if (filterMonths.length > 0) queryParams.append("month", filterMonths.join(","));
      if (filterYears.length > 0) queryParams.append("year", filterYears.join(","));

      // Si aucun statut sélectionné => tous
      const statusesToFilter =
        filterStatuses.length > 0 ? filterStatuses : ["pending_review", "validated", "rejected", "draft"];
      if (statusesToFilter.length > 0) queryParams.append("status", statusesToFilter.join(","));

      const response = await fetch(`/api/monthly_cra_reports?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de la récupération des rapports mensuels.");
      }
      const data = await response.json();

      if (data && Array.isArray(data.data)) {
        // Normalisation: on unifie rejection_reason
        const processed = data.data.map((report) => {
          if (report.status === "rejected" && report.rejectionReason && !report.rejection_reason) {
            return { ...report, rejection_reason: report.rejectionReason };
          }
          return report;
        });
        setReports(processed);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.error("ReceivedCras: fetch monthly reports error:", err);
      setError(err.message);
      showMessage?.(`Erreur lors du chargement des rapports: ${err.message}`, "error");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [showMessage, filterUserIds, filterMonths, filterYears, filterStatuses, allUsersForFilter]);

  // Sync props -> state (premier rendu)
  useEffect(() => {
    setReports(propMonthlyReports || []);
    setLoading(false);
  }, [propMonthlyReports]);

  useEffect(() => {
    fetchUsersForFilter();
  }, [fetchUsersForFilter]);

  useEffect(() => {
    fetchMonthlyReports();
  }, [filterUserIds, filterMonths, filterYears, filterStatuses, fetchMonthlyReports]);

  // Petit rappel si des rapports sont en attente quand on filtre par "pending_review"
  useEffect(() => {
    if (!loading && !error && reports?.length > 0 && filterStatuses.includes("pending_review")) {
      const pendingCount = reports.filter((r) => r.status === "pending_review").length;
      if (pendingCount > 0) {
        showMessage?.(`Vous avez ${pendingCount} rapport(s) en attente de révision.`, "info");
      }
    }
  }, [reports, loading, error, filterStatuses, showMessage]);

  /* -------------------------------------------------------------------------------------
   * Aperçu (tableau) existant
   * -----------------------------------------------------------------------------------*/
  const handleOpenMonthlyReportPreview = useCallback((report) => {
    setSelectedReportForPreview(report);
    setShowMonthlyReportPreview(true);
  }, []);
  const handleCloseMonthlyReportPreview = useCallback(() => {
    setSelectedReportForPreview(null);
    setShowMonthlyReportPreview(false);
  }, []);

  /* -------------------------------------------------------------------------------------
   * Mise à jour statut (Valider / Rejeter) — le rejet reste accessible via les actions de tableau
   * -----------------------------------------------------------------------------------*/
  const handleUpdateReportStatus = useCallback(
    async (reportId, newStatus) => {
      setReportToUpdate(null);
      setShowValidationConfirmModal(false);
      setShowRejectionConfirmModal(false);
      try {
        const response = await fetch(`/api/monthly_cra_reports/${reportId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: newStatus,
            reviewerId: userId,
            rejectionReason: newStatus === "rejected" ? rejectionReason : null,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Échec de la mise à jour du statut du rapport.");
        }
        showMessage?.(
          newStatus === "validated" ? "Rapport validé avec succès." : "Rapport rejeté avec succès.",
          "success"
        );
        setRejectionReason("");

        // Rafraîchir liste + éventuel état du modal
        fetchMonthlyReports();
        if (modalMeta?.craDetail || modalMeta?.paidDetail) {
          const updated =
            modalMeta?.craDetail && modalMeta.craDetail.id === reportId
              ? { ...modalMeta.craDetail, status: newStatus, reviewedAt: new Date() }
              : modalMeta?.paidDetail && modalMeta.paidDetail.id === reportId
                ? { ...modalMeta.paidDetail, status: newStatus, reviewedAt: new Date() }
                : null;

          if (updated) {
            const newMeta = { ...modalMeta };
            if (modalMeta.craDetail && modalMeta.craDetail.id === reportId) newMeta.craDetail = updated;
            if (modalMeta.paidDetail && modalMeta.paidDetail.id === reportId) newMeta.paidDetail = updated;
            setModalMeta(newMeta);
          }
        }
      } catch (err) {
        console.error("ReceivedCras: update status error:", err);
        showMessage?.(`Erreur de mise à jour: ${err.message}`, "error");
      }
    },
    [userId, rejectionReason, showMessage, fetchMonthlyReports, modalMeta]
  );

  /** Ouvre la confirm de validation */
  const requestValidation = useCallback((report) => {
    setReportToUpdate(report);
    setShowValidationConfirmModal(true);
  }, []);
  const confirmValidation = useCallback(() => {
    if (reportToUpdate) handleUpdateReportStatus(reportToUpdate.id, "validated");
  }, [reportToUpdate, handleUpdateReportStatus]);
  const cancelValidation = useCallback(() => {
    setShowValidationConfirmModal(false);
    setReportToUpdate(null);
  }, []);

  /** Ouvre la confirm de rejet (déclenchée depuis le tableau uniquement) */
  const requestRejection = useCallback((report) => {
    setReportToUpdate(report);
    setRejectionReason(report.rejectionReason || report.rejection_reason || "");
    setShowRejectionConfirmModal(true);
  }, []);
  const confirmRejection = useCallback(() => {
    if (reportToUpdate && rejectionReason.trim()) {
      handleUpdateReportStatus(reportToUpdate.id, "rejected");
    } else {
      showMessage?.("Le motif de rejet ne peut pas être vide.", "warning");
    }
  }, [reportToUpdate, rejectionReason, handleUpdateReportStatus, showMessage]);
  const cancelRejection = useCallback(() => {
    setShowRejectionConfirmModal(false);
    setReportToUpdate(null);
    setRejectionReason("");
  }, []);

  /* -------------------------------------------------------------------------------------
   * Ouverture modal combiné (récupère 2 rapports: CRA + Congés)
   * -----------------------------------------------------------------------------------*/
  const handleViewCombined = useCallback(
    async ({ user_id, userName, month, year }) => {
      try {
        // 1) On récupère les rapports liés (même utilisateur/mois/année)
        const listQuery = new URLSearchParams({
          userId: String(user_id),
          month: String(month),
          year: String(year),
        });
        const listRes = await fetch(`/api/monthly_cra_reports?${listQuery.toString()}`);
        if (!listRes.ok) {
          const e = await listRes.json();
          throw new Error(e.message || "Échec récupération des rapports liés (CRA + Congés).");
        }
        const listData = await listRes.json();
        const forMonth = Array.isArray(listData?.data) ? listData.data : [];

        const cra = forMonth.find((r) => r.report_type === "cra") || null;
        const paid = forMonth.find((r) => r.report_type === "paid_leave") || null;

        // 2) Détaille chaque rapport
        const fetchDetail = async (r) => {
          if (!r?.id) return null;
          const res = await fetch(`/api/monthly_cra_reports/${r.id}`);
          if (!res.ok) return null;
          const det = await res.json();
          // Normalise raison de rejet
          if (det.status === "rejected") {
            det.rejection_reason = det.rejectionReason || det.rejection_reason || null;
          } else {
            det.rejection_reason = null;
          }
          return det;
        };

        const [craDetail, paidDetail] = await Promise.all([fetchDetail(cra), fetchDetail(paid)]);

        // 3) Construit la liste d’activités combinée (CRA + CP) avec dates validées
        const craValidatedAt =
          craDetail && craDetail.status !== "pending_review"
            ? normalizeToDate(craDetail.reviewedAt) || normalizeToDate(craDetail.updatedAt)
            : null;
        const cpValidatedAt =
          paidDetail && paidDetail.status !== "pending_review"
            ? normalizeToDate(paidDetail.reviewedAt) || normalizeToDate(paidDetail.updatedAt)
            : null;

        const formatActivities = (items, tag) => {
          if (!Array.isArray(items)) return [];
          return items
            .map((activity) => {
              let dateObj = null;
              if (typeof activity.date_activite === "string") {
                const p = parseISO(activity.date_activite);
                dateObj = isValidDateFns(p) ? p : normalizeToDate(activity.date_activite);
              } else if (activity.date_activite) {
                dateObj = normalizeToDate(activity.date_activite);
              }
              const ownValidated =
                normalizeToDate(activity.validatedAt) || (tag === "CRA" ? craValidatedAt : cpValidatedAt);

              return {
                ...activity,
                __kind: tag, // "CRA" ou "CP"
                date_activite: isValidDateFns(dateObj) ? dateObj : null,
                client_id: activity.client_id ? String(activity.client_id) : null,
                type_activite: String(activity.type_activite || tag),
                status: activity.status || "draft",
                id: activity.id || activity._id?.toString(),
                validatedAt: ownValidated || null,
              };
            })
            .filter((a) => a.date_activite !== null && isValidDateFns(a.date_activite));
        };

        const craActs = craDetail ? formatActivities(craDetail.activities_snapshot, "CRA") : [];
        const cpActs = paidDetail ? formatActivities(paidDetail.activities_snapshot, "CP") : [];
        const combinedActivities = [...craActs, ...cpActs].sort((a, b) => a.date_activite - b.date_activite);

        // 4) Alimente la modale CraBoard
        const currentMonthDate = new Date(year, month - 1, 1);
        setModalMeta({ craDetail, paidDetail });

        const monthlyReportsForBoard = [];
        if (craDetail) monthlyReportsForBoard.push(craDetail);
        if (paidDetail) monthlyReportsForBoard.push(paidDetail);

        setCraBoardReportData({
          userId: user_id,
          userFirstName: userName,
          currentMonth: currentMonthDate,
          activities: combinedActivities,
          monthlyReports: monthlyReportsForBoard,
          // On affiche la raison de rejet globale si au moins un des rapports est rejeté
          rejectionReason: craDetail?.rejection_reason || paidDetail?.rejection_reason || null,
        });
      } catch (err) {
        console.error("[ReceivedCras] handleViewCombined error:", err);
        showMessage?.(`Erreur: ${err.message}`, "error");
      }
    },
    [showMessage]
  );

  // Ouvre le modal quand les données sont prêtes
  useEffect(() => {
    if (craBoardReportData) setShowCraBoardModal(true);
  }, [craBoardReportData]);

  const handleCloseCraBoardModal = useCallback(() => {
    setShowCraBoardModal(false);
    setCraBoardReportData(null);
    setModalMeta(null);
    setReportToUpdate(null);
  }, []);

  /* -------------------------------------------------------------------------------------
   * Groupage (vue combinée) : 1 ligne = {user, mois, année} avec 2 sous-rapports (CRA, Congés)
   * -----------------------------------------------------------------------------------*/
  const groupedRows = useMemo(() => {
    const map = new Map();
    (reports || []).forEach((r) => {
      const key = `${r.user_id}-${r.year}-${r.month}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          user_id: String(r.user_id),
          userName: r.userName,
          month: r.month,
          year: r.year,
          craReport: null,
          paidReport: null,
        });
      }
      const entry = map.get(key);
      if (!entry.userName && r.userName) entry.userName = r.userName;
      if (r.report_type === "cra") entry.craReport = r;
      if (r.report_type === "paid_leave") entry.paidReport = r;
    });
    return Array.from(map.values());
  }, [reports]);

  // Application des filtres sur le groupement
  const filteredGroupedRows = useMemo(() => {
    return groupedRows.filter((row) => {
      if (filterUserIds.length > 0 && !filterUserIds.includes(String(row.user_id))) return false;
      if (filterMonths.length > 0 && !filterMonths.includes(String(row.month))) return false;
      if (filterYears.length > 0 && !filterYears.includes(String(row.year))) return false;
      if (filterStatuses.length > 0) {
        const craOk = row.craReport && filterStatuses.includes(row.craReport.status);
        const paidOk = row.paidReport && filterStatuses.includes(row.paidReport.status);
        if (!craOk && !paidOk) return false;
      }
      return true;
    });
  }, [groupedRows, filterUserIds, filterMonths, filterYears, filterStatuses]);

  /* -------------------------------------------------------------------------------------
   * Export PDF de la vue combinée
   * -----------------------------------------------------------------------------------*/
  const handleDownloadTableViewPdf = useCallback(async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Rapports Mensuels (vue combinée)", 14, 20);

      const headers = ["Utilisateur", "Mois", "Année", "Jours travaillés", "Jours facturables", "Statuts"];
      const data = (filteredGroupedRows || []).map((row) => {
        const monthName = isValidDateFns(new Date(row.year, row.month - 1))
          ? format(new Date(row.year, row.month - 1), "MMMM", { locale: fr })
          : "Date invalide";
        const daysWorked = row.craReport?.total_days_worked?.toFixed(2) ?? "—";
        const daysBill = row.craReport?.total_billable_days?.toFixed(2) ?? "—";
        const craStatus = row.craReport
          ? row.craReport.status === "pending_review"
            ? "CRA: En attente"
            : row.craReport.status === "validated"
              ? "CRA: Validé"
              : row.craReport.status === "rejected"
                ? `CRA: Rejeté (${row.craReport.rejection_reason || row.craReport.rejectionReason || "N/A"})`
                : "CRA: Brouillon"
          : "CRA: —";
        const paidStatus = row.paidReport
          ? row.paidReport.status === "pending_review"
            ? "Congés: En attente"
            : row.paidReport.status === "validated"
              ? "Congés: Validé"
              : row.paidReport.status === "rejected"
                ? `Congés: Rejeté (${row.paidReport.rejection_reason || row.paidReport.rejectionReason || "N/A"})`
                : "Congés: Brouillon"
          : "Congés: —";

        return [row.userName || "Utilisateur inconnu", monthName, row.year, daysWorked, daysBill, `${craStatus} | ${paidStatus}`];
      });

      autoTable(doc, {
        startY: 30,
        head: [headers],
        body: data,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        didParseCell: (d) => {
          if (d.column.index === 5 && d.cell.section === "body") {
            const txt = (d.cell.text?.[0] || "").toLowerCase();
            if (txt.includes("en attente")) d.cell.styles.textColor = [202, 138, 4];
            if (txt.includes("validé")) d.cell.styles.textColor = [22, 101, 52];
            if (txt.includes("rejeté")) d.cell.styles.textColor = [185, 28, 28];
            if (txt.includes("brouillon")) d.cell.styles.textColor = [75, 85, 99];
          }
        },
      });

      doc.save("rapports_mensuels_combines.pdf");
      showMessage?.("La vue combinée a été téléchargée en PDF !", "success");
    } catch (error) {
      console.error("Erreur PDF:", error);
      showMessage?.("Erreur lors de la génération du PDF: " + error.message, "error");
    }
  }, [filteredGroupedRows, showMessage]);

  /* -------------------------------------------------------------------------------------
   * Options des filtres — (avant early returns pour respecter l’ordre des hooks)
   * -----------------------------------------------------------------------------------*/
  const yearOptions = useMemo(() => {
    const years = new Set();
    reports?.forEach((r) => r.year && years.add(String(r.year)));
    return Array.from(years)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((y) => ({ value: y, name: y }));
  }, [reports]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMMM", { locale: fr })).map((name, i) => ({
        name,
        value: String(i + 1),
      })),
    []
  );

  const statusOptions = useMemo(
    () => [
      { name: "En attente", value: "pending_review" },
      { name: "Validé", value: "validated" },
      { name: "Rejeté", value: "rejected" },
      { name: "Brouillon", value: "draft" },
    ],
    []
  );

  const userOptions = useMemo(
    () => allUsersForFilter.map((u) => ({ value: u.azureAdUserId, name: u.fullName })),
    [allUsersForFilter]
  );

  /* -------------------------------------------------------------------------------------
   * Early returns — aucun hook après ceci
   * -----------------------------------------------------------------------------------*/
  if (loading)
    return (
      <div className="flex justify-center items-center h-64 text-xl text-gray-700">
        Chargement des rapports...
      </div>
    );
  if (error) return <div className="text-red-500 text-center py-8 text-lg">Erreur: {error}</div>;

  /* =========================================================================================
   * Rendu
   * =======================================================================================*/
  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 w-full mt-8">
      <h3 className="text-3xl font-bold text-gray-900 mb-6 text-center">
        Rapports Mensuels Reçus
      </h3>

      {/* Barre de filtres */}
      <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-xl shadow-inner flex flex-wrap gap-4 justify-center items-end">
        <MultiSelectDropdown
          label="Utilisateur(s):"
          options={userOptions}
          selectedValues={filterUserIds}
          onSelectionChange={setFilterUserIds}
          placeholder="Sélectionner des utilisateurs"
          allSelectedLabel="Tous les utilisateurs"
          className="min-w-[220px]"
        />
        <MultiSelectDropdown
          label="Mois:"
          options={monthOptions}
          selectedValues={filterMonths}
          onSelectionChange={setFilterMonths}
          placeholder="Sélectionner des mois"
          allSelectedLabel="Tous les mois"
          className="min-w-[200px]"
        />
        <MultiSelectDropdown
          label="Année:"
          options={yearOptions}
          selectedValues={filterYears}
          onSelectionChange={setFilterYears}
          placeholder="Sélectionner des années"
          allSelectedLabel="Toutes les années"
          className="min-w-[180px]"
        />
        <MultiSelectDropdown
          label="Statut:"
          options={statusOptions}
          selectedValues={filterStatuses}
          onSelectionChange={setFilterStatuses}
          placeholder="Sélectionner des statuts"
          allSelectedLabel="Tous les statuts"
          className="min-w-[200px]"
        />

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => {
              setFilterUserIds([]);
              setFilterMonths([]);
              setFilterYears([]);
              setFilterStatuses([]);
            }}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 transition shadow-sm"
          >
            Réinitialiser
          </button>

          <button
            onClick={handleDownloadTableViewPdf}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition shadow-sm"
          >
            Télécharger la vue PDF
          </button>
        </div>
      </div>

      {/* Tableau — 1 ligne combinée par (user, mois, année) */}
      {Array.isArray(filteredGroupedRows) && filteredGroupedRows.length === 0 ? (
        <div className="text-gray-600 text-center py-10 text-lg">
          Aucun rapport trouvé avec les filtres actuels.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full bg-white rounded-xl">
            <thead className="bg-gray-50 sticky top-0 z-10 backdrop-blur">
              <tr className="text-gray-600">
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Utilisateur</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Mois</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Année</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Jours travaillés (CRA)</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Jours facturables (CRA)</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Statuts (CRA | Congés)</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                {/* Colonne "Supprimer" supprimée */}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredGroupedRows.map((row) => {
                const monthLabel = isValidDateFns(new Date(row.year, row.month - 1))
                  ? format(new Date(row.year, row.month - 1), "MMMM", { locale: fr })
                  : "Date invalide";
                const daysWorked = row.craReport?.total_days_worked?.toFixed(2) ?? "—";
                const daysBill = row.craReport?.total_billable_days?.toFixed(2) ?? "—";
                const craStatus = row.craReport?.status;
                const paidStatus = row.paidReport?.status;

                const Badge = ({ type, status, reason }) => {
                  if (!status) {
                    return (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                        {type}: —
                      </span>
                    );
                  }
                  const cls =
                    status === "pending_review"
                      ? "bg-yellow-100 text-yellow-800"
                      : status === "validated"
                        ? "bg-green-100 text-green-800"
                        : status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800";
                  const label =
                    status === "pending_review"
                      ? "En attente"
                      : status === "validated"
                        ? "Validé"
                        : status === "rejected"
                          ? `Rejeté${reason ? ` (${reason})` : ""}`
                          : "Brouillon";
                  return (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
                      {type}: {label}
                    </span>
                  );
                };

                return (
                  <tr key={row.key} className="hover:bg-indigo-50/40 transition">
                    <td className="py-3 px-4 text-sm text-gray-900">{row.userName || "Utilisateur inconnu"}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 capitalize">{monthLabel}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{row.year}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{daysWorked}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{daysBill}</td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge
                          type="CRA"
                          status={craStatus}
                          reason={row.craReport?.rejection_reason || row.craReport?.rejectionReason}
                        />
                        <Badge
                          type="Congés"
                          status={paidStatus}
                          reason={row.paidReport?.rejection_reason || row.paidReport?.rejectionReason}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            handleViewCombined({
                              user_id: row.user_id,
                              userName: row.userName,
                              month: row.month,
                              year: row.year,
                            })
                          }
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 active:scale-95 transition text-xs shadow-sm"
                        >
                          Voir les détails
                        </button>

                        {/* Actions rapides par sous-rapport : Valider / Rejeter (sur le tableau) */}
                        {row.craReport?.status === "pending_review" && (
                          <>
                            <button
                              onClick={() => requestValidation(row.craReport)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 active:scale-95 transition text-xs shadow-sm"
                            >
                              Valider CRA
                            </button>
                            <button
                              onClick={() => requestRejection(row.craReport)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 active:scale-95 transition text-xs shadow-sm"
                            >
                              Rejeter CRA
                            </button>
                          </>
                        )}
                        {row.paidReport?.status === "pending_review" && (
                          <>
                            <button
                              onClick={() => requestValidation(row.paidReport)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 active:scale-95 transition text-xs shadow-sm"
                            >
                              Valider Congés
                            </button>
                            <button
                              onClick={() => requestRejection(row.paidReport)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 active:scale-95 transition text-xs shadow-sm"
                            >
                              Rejeter Congés
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    {/* Colonne "Supprimer" retirée conformément à ta demande */}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Aperçu "tableau" (existant) */}
      {selectedReportForPreview && (
        <MonthlyReportPreviewModal
          isOpen={showMonthlyReportPreview}
          onClose={handleCloseMonthlyReportPreview}
          reportData={selectedReportForPreview.activities_snapshot}
          year={selectedReportForPreview.year}
          month={selectedReportForPreview.month}
          userName={selectedReportForPreview.userName}
          userId={selectedReportForPreview.user_id}
        />
      )}

      {/* Confirmations globales */}
      <ConfirmationModal
        isOpen={showValidationConfirmModal}
        onClose={cancelValidation}
        onConfirm={confirmValidation}
        message={
          reportToUpdate
            ? `Confirmer la validation de ce rapport mensuel pour ${reportToUpdate.userName || "cet utilisateur"
            } pour ${format(new Date(reportToUpdate.year, reportToUpdate.month - 1), "MMMM yyyy", { locale: fr })} ?`
            : `Confirmer la validation du rapport ?`
        }
        confirmButtonText="Valider"
        cancelButtonText="Annuler"
      />

      <ConfirmationModal
        isOpen={showRejectionConfirmModal}
        onClose={cancelRejection}
        onConfirm={confirmRejection}
        message={
          reportToUpdate ? (
            <div>
              <p className="mb-3">
                Confirmer le rejet de ce rapport mensuel pour{" "}
                <span className="font-medium">{reportToUpdate.userName || "cet utilisateur"}</span> pour{" "}
                <span className="font-medium">
                  {format(new Date(reportToUpdate.year, reportToUpdate.month - 1), "MMMM yyyy", { locale: fr })}
                </span>{" "}
                ?
              </p>
              <textarea
                className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Veuillez indiquer le motif du rejet..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="3"
              />
            </div>
          ) : (
            <div>
              <p className="mb-3">Confirmer le rejet du rapport ?</p>
              <textarea
                className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Veuillez indiquer le motif du rejet..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="3"
              />
            </div>
          )
        }
        confirmButtonText="Rejeter"
        cancelButtonText="Annuler"
        showInput={true}
        inputValue={rejectionReason}
        onInputChange={(e) => setRejectionReason(e.target.value)}
        inputPlaceholder="Motif du rejet (obligatoire)"
      />

      {/* MODAL CraBoard — COMBINÉ CRA + CONGÉS
          ⚠️ Boutons “Rejeter” retirés dans cette barre d’action, comme demandé. */}
      {showCraBoardModal && craBoardReportData && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
            {/* Entête modal + actions review */}
            <div className="flex flex-col gap-3 p-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold text-gray-900">
                  Détails du rapport — {craBoardReportData.userFirstName} •{" "}
                  {format(craBoardReportData.currentMonth, "MMMM yyyy", { locale: fr })}
                </h3>
                <button
                  onClick={handleCloseCraBoardModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                  aria-label="Fermer"
                >
                  &times;
                </button>
              </div>

              {/* Ligne d’actions validation (sans rejet) pour CRA et Congés */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Statuts actuels */}
                <div className="ml-auto text-xs text-gray-500">
                  {modalMeta?.craDetail && (
                    <span className="mr-3">
                      CRA:&nbsp;
                      {modalMeta.craDetail.status === "pending_review"
                        ? "En attente"
                        : modalMeta.craDetail.status === "validated"
                          ? "Validé"
                          : modalMeta.craDetail.status === "rejected"
                            ? "Rejeté"
                            : "Brouillon"}
                      {modalMeta.craDetail.reviewedAt && (
                        <> • {fmt(normalizeToDate(modalMeta.craDetail.reviewedAt) || normalizeToDate(modalMeta.craDetail.updatedAt))}</>
                      )}
                    </span>
                  )}
                  {modalMeta?.paidDetail && (
                    <span>
                      Congés:&nbsp;
                      {modalMeta.paidDetail.status === "pending_review"
                        ? "En attente"
                        : modalMeta.paidDetail.status === "validated"
                          ? "Validé"
                          : modalMeta.paidDetail.status === "rejected"
                            ? "Rejeté"
                            : "Brouillon"}
                      {modalMeta.paidDetail.reviewedAt && (
                        <> • {fmt(normalizeToDate(modalMeta.paidDetail.reviewedAt) || normalizeToDate(modalMeta.paidDetail.updatedAt))}</>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Corps modal : CraBoard lecture seule avec activités combinées (CRA + Congés) */}
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
              <CraBoard
                userId={craBoardReportData.userId}
                userFirstName={craBoardReportData.userFirstName}
                activities={craBoardReportData.activities}
                activityTypeDefinitions={activityTypeDefinitions}
                clientDefinitions={clientDefinitions}
                currentMonth={craBoardReportData.currentMonth}
                showMessage={showMessage}
                readOnly={true}                    // pas d’ajout/envoi/réinit
                monthlyReports={craBoardReportData.monthlyReports} // [craDetail?, paidDetail?]
                rejectionReason={craBoardReportData.rejectionReason}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}