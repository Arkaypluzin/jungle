// components/ReceivedCras.js
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format, parseISO, isValid as isValidDateFns } from "date-fns";
import { fr } from "date-fns/locale";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// PAS D'IMPORTS DIRECTS DE jspdf OU jspdf-autotable ICI.
// Ils seront importés dynamiquement dans handleDownloadTableViewPdf.

import MonthlyReportPreviewModal from "./MonthlyReportPreviewModal";
import ConfirmationModal from "./ConfirmationModal";
import CraBoard from "./CraBoard";

// Composant MultiSelectDropdown intégré directement
function MultiSelectDropdown({
  label,
  options, // Array of { value: string, name: string }
  selectedValues, // Array of string values
  onSelectionChange, // Function (newSelectedValues: string[]) => void
  placeholder = "Sélectionner...",
  className = "", // For external styling
  allSelectedLabel = "", // Nouveau prop pour le libellé "Tous les..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    // CORRECTION: Utiliser handleClickOutside au lieu de handleClick
    document.removeEventListener('touchstart', handleClickOutside, { passive: false }); // Passive false for preventDefault
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside, { passive: false });
    };
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleOptionClick = useCallback((value) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newSelectedValues);
  }, [selectedValues, onSelectionChange]);

  const displaySelected = useMemo(() => {
    // MODIFIÉ: Si selectedValues est vide, cela signifie "tous"
    if (selectedValues.length === 0) {
      return allSelectedLabel || `Tous les ${label.toLowerCase().replace(':', '')}`;
    }
    // NOUVEAU: Si toutes les options sont sélectionnées, affiche le libellé "Tous les..."
    if (selectedValues.length === options.length && options.length > 0) {
      return allSelectedLabel || `Tous les ${label.toLowerCase().replace(':', '')}`;
    }
    const selectedNames = options
      .filter(option => selectedValues.includes(option.value))
      .map(option => option.name);
    return selectedNames.join(', ');
  }, [selectedValues, options, placeholder, label, allSelectedLabel]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="text-sm font-medium text-gray-700 mb-1 block">
        {label}
      </label>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 flex justify-between items-center"
      >
        <span className="truncate">{displaySelected}</span>
        <svg
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-4 py-2 text-gray-500">Aucune option disponible.</div>
          ) : (
            options.map(option => (
              <label
                key={option.value}
                className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={selectedValues.includes(option.value)}
                  onChange={() => handleOptionClick(option.value)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
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


export default function ReceivedCras({
  userId,
  userFirstName,
  userRole,
  showMessage,
  clientDefinitions,
  activityTypeDefinitions,
  monthlyReports: propMonthlyReports, // Renommé la prop pour éviter la confusion avec l'état local
  onDeleteMonthlyReport,
}) {
  const [reports, setReports] = useState(propMonthlyReports); // Utilise la prop pour l'initialisation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allUsersForFilter, setAllUsersForFilter] = useState([]);

  // MODIFIÉ: filterUserIds et filterStatuses initialisés à vide.
  // Un tableau vide signifie "tous" pour ces filtres.
  const [filterUserIds, setFilterUserIds] = useState([]);
  const [filterMonths, setFilterMonths] = useState([]);
  const [filterYears, setFilterYears] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);

  const [selectedReportForPreview, setSelectedReportForPreview] =
    useState(null);
  const [showMonthlyReportPreview, setShowMonthlyReportPreview] =
    useState(false);

  const [reportToUpdate, setReportToUpdate] = useState(null); // Utilisé pour les actions Valider/Rejeter ET pour le PDF
  const [showValidationConfirmModal, setShowValidationConfirmModal] =
    useState(false);
  const [showRejectionConfirmModal, setShowRejectionConfirmModal] =
    useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showCraBoardModal, setShowCraBoardModal] = useState(false);
  const [craBoardReportData, setCraBoardReportData] = useState(null);

  const isAdmin = useMemo(() => userRole === "admin", [userRole]);

  const fetchUsersForFilter = useCallback(async () => {
    try {
      const response = await fetch("/api/cras_users");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            "Échec de la récupération des utilisateurs pour le filtre."
        );
      }
      const data = await response.json();
      setAllUsersForFilter(data);
      // NOUVEAU: Ne pas initialiser filterUserIds ici. Il reste vide par défaut pour signifier "tous".
    } catch (err) {
      console.error(
        "ReceivedCras: Erreur lors de la récupération des utilisateurs pour le filtre:",
        err
      );
      showMessage(
        `Erreur lors du chargement des utilisateurs pour le filtre: ${err.message}`,
        "error"
      );
    }
  }, [showMessage]);

  const fetchMonthlyReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = new URLSearchParams();
      // MODIFIÉ: Si filterUserIds est vide, inclure TOUS les IDs d'utilisateurs disponibles.
      // Sinon, inclure seulement les IDs sélectionnés.
      const usersToFilter = filterUserIds.length > 0
        ? filterUserIds
        : allUsersForFilter.map(user => user.azureAdUserId);
      
      if (usersToFilter.length > 0) { // S'assure qu'il y a des utilisateurs à envoyer
        queryParams.append("userId", usersToFilter.join(','));
      }

      if (filterMonths.length > 0) queryParams.append("month", filterMonths.join(','));
      if (filterYears.length > 0) queryParams.append("year", filterYears.join(','));
      
      // MODIFIÉ: Si filterStatuses est vide, inclure TOUS les statuts disponibles.
      // Sinon, inclure seulement les statuts sélectionnés.
      const statusesToFilter = filterStatuses.length > 0
        ? filterStatuses
        : ["pending_review", "validated", "rejected", "draft"]; // Tous les statuts possibles
      
      if (statusesToFilter.length > 0) { // S'assure qu'il y a des statuts à envoyer
        queryParams.append("status", statusesToFilter.join(','));
      }

      console.log(
        "[ReceivedCras] fetchMonthlyReports: Envoi de la requête avec queryParams:",
        queryParams.toString()
      );

      const response = await fetch(
        `/api/monthly_cra_reports?${queryParams.toString()}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Échec de la récupération des rapports mensuels."
        );
      }
      const data = await response.json();
      console.log(
        "ReceivedCras: Réponse API brute monthly_cra_reports (liste):",
        data
      );

      if (data && Array.isArray(data.data)) {
        const processedReports = data.data.map((report) => {
          if (
            report.status === "rejected" &&
            report.rejectionReason &&
            !report.rejection_reason
          ) {
            return {
              ...report,
              rejection_reason: report.rejectionReason,
            };
          }
          return report;
        });
        setReports(processedReports);
      } else {
        console.warn(
          "ReceivedCras: La réponse API pour la liste ne contient pas un tableau valide dans 'data.data'. Réponse:",
          data
        );
        setReports([]);
      }
    } catch (err) {
      console.error(
        "ReceivedCras: Erreur lors de la récupération des rapports mensuels (liste):",
        err
      );
      setError(err.message);
      showMessage(
        `Erreur lors du chargement des rapports: ${err.message}`,
        "error"
      );
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [
    showMessage,
    filterUserIds, // Mise à jour des dépendances
    filterMonths,
    filterYears,
    filterStatuses,
    allUsersForFilter // Ajouté pour que la logique "tous les utilisateurs" fonctionne
  ]);

  useEffect(() => {
    setReports(propMonthlyReports);
    setLoading(false);
  }, [propMonthlyReports]);

  useEffect(() => {
    fetchUsersForFilter();
  }, [fetchUsersForFilter]);

  useEffect(() => {
    fetchMonthlyReports();
  }, [
    filterUserIds,
    filterMonths,
    filterYears,
    filterStatuses,
    fetchMonthlyReports,
  ]);

  useEffect(() => {
    if (
      !loading &&
      !error &&
      reports.length > 0 &&
      filterStatuses.includes("pending_review") // Vérifier si 'pending_review' est sélectionné dans le tableau
    ) {
      const pendingReportsCount = reports.filter(
        (report) => report.status === "pending_review"
      ).length;
      if (pendingReportsCount > 0) {
        showMessage(
          `Vous avez ${pendingReportsCount} rapport(s) en attente de révision.`,
          "info"
        );
      }
    }
  }, [reports, loading, error, filterStatuses, showMessage]);

  const handleOpenMonthlyReportPreview = useCallback((report) => {
    setSelectedReportForPreview(report);
    setShowMonthlyReportPreview(true);
  }, []);

  const handleCloseMonthlyReportPreview = useCallback(() => {
    setSelectedReportForPreview(null);
    setShowMonthlyReportPreview(false);
  }, []);

  const handleUpdateReportStatus = useCallback(
    async (reportId, newStatus) => {
      setReportToUpdate(null);
      setShowValidationConfirmModal(false);
      setShowRejectionConfirmModal(false);

      try {
        console.log(
          `ReceivedCras: Tentative de mise à jour du statut du rapport ID: ${reportId} à '${newStatus}'`
        );
        const response = await fetch(
          `/api/monthly_cra_reports/${reportId}/status`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: newStatus,
              reviewerId: userId,
              rejectionReason:
                newStatus === "rejected" ? rejectionReason : null,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "ReceivedCras: Erreur API lors de la mise à jour du statut:",
            errorData
          );
          throw new Error(
            errorData.message || "Échec de la mise à jour du statut du rapport."
          );
        }

        showMessage(
          `Statut du rapport mis à jour à '${newStatus}' avec succès !`,
          "success"
        );
        fetchMonthlyReports();
        setRejectionReason("");
      } catch (err) {
        console.error(
          "ReceivedCras: Erreur lors de la mise à jour du statut:",
          err
        );
        showMessage(
          `Erreur lors de la mise à jour du statut: ${err.message}`,
          "error"
        );
      }
    },
    [userId, rejectionReason, showMessage, fetchMonthlyReports]
  );

  const requestValidation = useCallback((report) => {
    setReportToUpdate(report);
    setShowValidationConfirmModal(true);
  }, []);

  const confirmValidation = useCallback(() => {
    if (reportToUpdate) {
      handleUpdateReportStatus(reportToUpdate.id, "validated");
    }
  }, [reportToUpdate, handleUpdateReportStatus]);

  const cancelValidation = useCallback(() => {
    setShowValidationConfirmModal(false);
    setReportToUpdate(null);
  }, []);

  const requestRejection = useCallback((report) => {
    setReportToUpdate(report);
    setRejectionReason(report.rejectionReason || report.rejection_reason || "");
    setShowRejectionConfirmModal(true);
  }, []);

  const confirmRejection = useCallback(() => {
    if (reportToUpdate && rejectionReason.trim()) {
      handleUpdateReportStatus(reportToUpdate.id, "rejected");
    } else {
      showMessage("Le motif de rejet ne peut pas être vide.", "warning");
    }
  }, [reportToUpdate, rejectionReason, handleUpdateReportStatus, showMessage]);

  const cancelRejection = useCallback(() => {
    setShowRejectionConfirmModal(false);
    setReportToUpdate(null);
    setRejectionReason("");
  }, []);

  // NOUVEAU: Mettre à jour reportToUpdate lors de l'affichage des détails du CRA
  const handleViewCra = useCallback(
    async (report) => {
      setReportToUpdate(report); // Définit le rapport actuel pour le PDF et autres actions
      console.log(
        "[ReceivedCras] handleViewCra appelé avec le rapport (initial):",
        report
      );
      try {
        const response = await fetch(`/api/monthly_cra_reports/${report.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Échec de la récupération du CRA détaillé."
          );
        }
        let detailedReport = await response.json();

        console.log("--- DIAGNOSTIC API BRUTE (handleViewCra) ---");
        console.log(
          "[ReceivedCras] detailedReport reçu de l'API (BRUT):",
          detailedReport
        );
        console.log(
          "[ReceivedCras] detailedReport.status (BRUT):",
          detailedReport.status
        );
        console.log(
          "[ReceivedCras] detailedReport.rejectionReason (BRUT camelCase):",
          detailedReport.rejectionReason
        );
        console.log(
          "[ReceivedCras] detailedReport.rejection_reason (BRUT snake_case):",
          detailedReport.rejection_reason
        );
        console.log("--- FIN DIAGNOSTIC API BRUTE ---");

        if (detailedReport.status === "rejected") {
          let reasonValue = detailedReport.rejectionReason || detailedReport.rejection_reason;
          if (reasonValue === "nul") {
            reasonValue = null;
          }
          detailedReport.rejection_reason = reasonValue;
          if (detailedReport.rejectionReason && detailedReport.rejectionReason !== reasonValue) {
              detailedReport.rejectionReason = reasonValue;
          }
        } else {
          detailedReport.rejection_reason = null;
          detailedReport.rejectionReason = null;
        }

        const computedRejectionReason = detailedReport.rejection_reason;

        console.log(
          "--- DIAGNOSTIC RAISON DE REJET (handleViewCra APRÈS NORMALISATION) ---"
        );
        console.log(
          "detailedReport (objet complet APRÈS NORMALISATION):",
          detailedReport
        );
        console.log(
          "detailedReport.rejection_reason (APRÈS NORMALISATION):",
          detailedReport.rejection_reason
        );
        console.log(
          "Computed rejectionReason pour prop (should be same as detailedReport.rejection_reason):",
          computedRejectionReason
        );
        console.log(
          "--- FIN DIAGNOSTIC (handleViewCra APRÈS NORMALISATION) ---"
        );

        if (!detailedReport) {
          console.error("[ReceivedCras] detailedReport est nul ou indéfini.");
          showMessage("Erreur: Rapport détaillé non trouvé.", "error");
          return;
        }

        const reportYear = parseInt(detailedReport.year);
        const reportMonth = parseInt(detailedReport.month);

        let craBoardCurrentMonth;
        if (
          !isNaN(reportYear) &&
          !isNaN(reportMonth) &&
          reportMonth >= 1 &&
          reportMonth <= 12
        ) {
          craBoardCurrentMonth = new Date(reportYear, reportMonth - 1, 1);
        } else {
          console.warn(
            `[ReceivedCras] Année (${detailedReport.year}) ou mois (${detailedReport.month}) invalide(s) trouvé(s) dans le rapport détaillé. Utilisation de la date actuelle par défaut.`
          );
          craBoardCurrentMonth = new Date();
        }

        const activitiesToPass =
          detailedReport.activities_snapshot &&
          Array.isArray(detailedReport.activities_snapshot)
            ? detailedReport.activities_snapshot
            : [];

        console.log(
          `[ReceivedCras] Nombre d'activités brutes dans activitiesToPass: ${activitiesToPass.length}`
        );

        const formattedActivities = activitiesToPass
          .map((activity, index) => {
            console.log(
              `[ReceivedCras]   Processing activity index ${index}, ID: ${
                activity.id || activity._id
              }, raw date_activite: ${activity.date_activite}`
            );
            let dateObj = null;
            if (typeof activity.date_activite === "string") {
              dateObj = parseISO(activity.date_activite);
              if (!isValidDateFns(dateObj)) {
                dateObj = new Date(activity.date_activite);
              }
            } else if (activity.date_activite instanceof Date) {
              dateObj = activity.date_activite;
            } else if (activity.date_activite) {
              dateObj = new Date(activity.date_activite);
            }
            console.log(
              `[ReceivedCras]   Parsed date_activite: ${dateObj}, isValid: ${isValidDateFns(
                dateObj
              )}`
            );

            const processedActivity = {
              ...activity,
              date_activite: isValidDateFns(dateObj) ? dateObj : null,
              client_id: activity.client_id ? String(activity.client_id) : null,
              type_activite: String(activity.type_activite),
              status: activity.status || "draft",
              id: activity.id || activity._id?.toString(),
            };
            console.log(
              `[ReceivedCras]   Processed activity (date, status, id): ${processedActivity.date_activite}, ${processedActivity.status}, ${processedActivity.id}`
            );
            return processedActivity;
          })
          .filter((activity) => {
            const isActivityValid =
              activity.date_activite !== null &&
              isValidDateFns(activity.date_activite);
            if (!isActivityValid) {
              console.warn(
                `[ReceivedCras]   Filtering out activity ID ${
                  activity.id || activity._id
                } due to invalid date.`
              );
            }
            return isActivityValid;
          });

        console.log(
          "[ReceivedCras] Activités formatées passées à CraBoard (après filtre):",
          formattedActivities.length,
          "activités. Premières activités:",
          formattedActivities.slice(0, 3).map((a) => ({
            id: a.id,
            type: a.type_activite,
            date: a.date_activite,
            status: a.status,
          }))
        );

        if (formattedActivities.length === 0) {
          console.warn(
            "[ReceivedCras] Aucune activité formatée trouvée pour le CRA détaillé. Vérifiez les logs du backend."
          );
        }

        const dataForCraBoard = {
          userId: detailedReport.user_id,
          userFirstName: detailedReport.userName,
          currentMonth: craBoardCurrentMonth,
          activities: formattedActivities,
          rejectionReason: computedRejectionReason,
          monthlyReports: [detailedReport],
        };

        console.log(
          "[ReceivedCras] Data prête à être passée à CraBoard (dataForCraBoard - before setState):",
          dataForCraBoard
        );

        setCraBoardReportData(dataForCraBoard);
      } catch (err) {
        console.error(
          "ReceivedCras: Erreur lors de la récupération du CRA détaillé:",
          err
        );
        showMessage(`Erreur: ${err.message}`, "error");
      }
    },
    [showMessage]
  );

  useEffect(() => {
    if (craBoardReportData) {
      console.log(
        "[ReceivedCras] useEffect: craBoardReportData est prêt. RejectionReason depuis l'état (avant ouverture modal):",
        craBoardReportData.rejectionReason
      );
      setShowCraBoardModal(true);
    }
  }, [craBoardReportData]);

  const handleCloseCraBoardModal = useCallback(() => {
    setShowCraBoardModal(false);
    setCraBoardReportData(null);
    setReportToUpdate(null); // Réinitialiser reportToUpdate à la fermeture de la modale CRA Board
  }, []);

  const handleDeleteClick = useCallback(
    (report) => {
      if (onDeleteMonthlyReport) {
        onDeleteMonthlyReport(report);
      }
    },
    [onDeleteMonthlyReport]
  );

  // Générer les années en fonction des rapports disponibles (reports)
  const yearOptions = useMemo(() => {
    const years = new Set();
    reports.forEach(report => {
      if (report.year) {
        years.add(report.year.toString());
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => parseInt(a) - parseInt(b));
    return sortedYears.map(year => ({ value: year, name: year }));
  }, [reports]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      format(new Date(2000, i, 1), "MMMM", { locale: fr })
    ).map((name, index) => ({ name, value: (index + 1).toString() }));
  }, []);

  const statusOptions = useMemo(
    () => [
      { name: "En attente", value: "pending_review" },
      { name: "Validé", value: "validated" },
      { name: "Rejeté", value: "rejected" },
      { name: "Brouillon", value: "draft" },
    ],
    []
  );
  const userOptions = useMemo(() => {
    return allUsersForFilter.map(user => ({
      value: user.azureAdUserId,
      name: user.fullName,
    }));
  }, [allUsersForFilter]);
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Filtre utilisateur (si filtre appliqué)
      if (
        filterUserIds.length > 0 &&
        !filterUserIds.includes(String(report.user_id))
        
      )
      
       {
        return false;
        console.log('filterUserIds:', filterUserIds);
console.log('report.user_id:', report.user_id, 'type:', typeof report.user_id);
console.log('includes:', filterUserIds.includes(String(report.user_id)));

      
      }
      // Filtre mois (si filtre appliqué)
      if (filterMonths.length > 0 && !filterMonths.includes((report.month || "").toString())) {
        return false;
      }
      return true;
    });
  }, [reports, filterUserIds, filterMonths]);
  
  // Fonction de réinitialisation des filtres
  const handleResetFilters = useCallback(() => {
    setFilterUserIds([]); // Vide la sélection des utilisateurs pour signifier "tous"
    setFilterMonths([]); // Vide la sélection des mois
    setFilterYears([]); // Vide la sélection des années
    setFilterStatuses([]); // Vide la sélection des statuts pour signifier "tous"
  }, []);

  // NOUVEAU: Fonction pour télécharger la vue actuelle du tableau en PDF
  const handleDownloadTableViewPdf = useCallback(async () => {
    console.log("handleDownloadTableViewPdf déclenché");

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
  
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Rapports Mensuels", 14, 20);
  
      const headers = [
        "Utilisateur",
        "Mois",
        "Année",
        "Jours travaillés",
        "Jours facturables",
        "Statut",
      ];
  
      const data = reports.map(report => [
        report.userName || "Utilisateur inconnu",
        isValidDateFns(new Date(report.year, report.month - 1))
          ? format(new Date(report.year, report.month - 1), "MMMM", { locale: fr })
          : "Date invalide",
        report.year,
        report.total_days_worked?.toFixed(2) || "0.00",
        report.total_billable_days?.toFixed(2) || "0.00",
        report.status === "pending_review"
          ? "En attente"
          : report.status === "validated"
          ? "Validé"
          : report.status === "rejected"
          ? `Rejeté (${report.rejection_reason || report.rejectionReason || 'N/A'})`
          : "Brouillon",
      ]);
  
      autoTable(doc, {
        startY: 30,
        head: [headers],
        body: data,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 15 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 40 },
        },
        didParseCell: (data) => {
          if (data.column.index === 5 && data.cell.section === "body") {
            const statusText = data.cell.text[0];
            if (statusText.startsWith("En attente")) {
              data.cell.styles.textColor = [202, 138, 4];
            } else if (statusText.startsWith("Validé")) {
              data.cell.styles.textColor = [22, 101, 52];
            } else if (statusText.startsWith("Rejeté")) {
              data.cell.styles.textColor = [185, 28, 28];
            } else if (statusText.startsWith("Brouillon")) {
              data.cell.styles.textColor = [75, 85, 99];
            }
          }
        },
      });
  
      doc.save("rapports_mensuels_filtres.pdf");
      showMessage("La vue du tableau a été téléchargée en PDF !", "success");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      showMessage("Erreur lors de la génération du PDF: " + error.message, "error");
    }
  }, [reports, showMessage]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-xl text-gray-700">
        Chargement des rapports...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-8 text-lg">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8">
      <h3 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Rapports Mensuels Reçus
      </h3>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-inner flex flex-wrap gap-4 justify-center items-center">
        {/* MultiSelect pour Utilisateur(s) */}
        <MultiSelectDropdown
          label="Utilisateur(s):"
          options={allUsersForFilter.map(user => ({ value: user.azureAdUserId, name: user.fullName }))}
          selectedValues={filterUserIds}
          onSelectionChange={setFilterUserIds}
          placeholder="Sélectionner des utilisateurs" // Placeholder quand rien n'est sélectionné
          allSelectedLabel="Tous les utilisateurs" // Libellé quand le tableau est vide (tous inclus)
          className="min-w-[200px]"
        />

        {/* MultiSelect pour Mois */}
        <MultiSelectDropdown
          label="Mois:"
          options={monthOptions}
          selectedValues={filterMonths}
          onSelectionChange={setFilterMonths}
          placeholder="Sélectionner des mois"
          allSelectedLabel="Tous les mois"
          className="min-w-[200px]"
        />

        {/* MultiSelect pour Année */}
        <MultiSelectDropdown
          label="Année:"
          options={yearOptions} // Utilise les années des rapports existants
          selectedValues={filterYears}
          onSelectionChange={setFilterYears}
          placeholder="Sélectionner des années"
          allSelectedLabel="Toutes les années"
          className="min-w-[200px]"
        />

        {/* MultiSelect pour Statut */}
        <MultiSelectDropdown
          label="Statut:"
          options={statusOptions}
          selectedValues={filterStatuses}
          onSelectionChange={setFilterStatuses}
          placeholder="Sélectionner des statuts"
          allSelectedLabel="Tous les statuts"
          className="min-w-[200px]"
        />

        {/* Bouton de réinitialisation */}
        <button
          onClick={handleResetFilters}
          className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 self-end mb-1"
        >
          Réinitialiser les filtres
        </button>

        {/* NOUVEAU: Bouton pour télécharger la vue PDF du tableau */}
        <button
          onClick={handleDownloadTableViewPdf}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 self-end mb-1"
          title={!reportToUpdate || reportToUpdate.status !== "validated" ? "Le rapport doit être validé pour être téléchargé en PDF" : "Télécharger la vue PDF"}
        >
          Télécharger la vue PDF
        </button>
      </div>

      {Array.isArray(reports) && reports.length === 0 ? (
        <div className="text-gray-600 text-center py-8 text-lg">
          Aucun rapport trouvé avec les filtres actuels.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Mois
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Année
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Jours travaillés
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Jours facturables
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Statut
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Supprimer
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {report.userName || "Utilisateur inconnu"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {isValidDateFns(new Date(report.year, report.month - 1))
                      ? format(
                          new Date(report.year, report.month - 1),
                          "MMMM",
                          { locale: fr }
                        )
                      : "Date invalide"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {report.year}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {report.total_days_worked?.toFixed(2) || "0.00"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {report.total_billable_days?.toFixed(2) || "0.00"}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        report.status === "pending_review"
                          ? "bg-yellow-100 text-yellow-800"
                          : report.status === "validated"
                          ? "bg-green-100 text-green-800"
                          : report.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {report.status === "pending_review"
                        ? "En attente"
                        : report.status === "validated"
                        ? "Validé"
                        : report.status === "rejected"
                        ? "Rejeté"
                        : "Brouillon"}{" "}
                    </span>
                    {report.status === "rejected" &&
                      (report.rejection_reason || report.rejectionReason) && (
                        <p className="text-xs text-red-700 mt-1">
                          (Raison :{" "}
                          {report.rejection_reason || report.rejectionReason})
                        </p>
                      )}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleViewCra(report)}
                        className="px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition duration-200 text-xs"
                      >
                        Voir les détails
                      </button>
                      {report.status === "pending_review" && (
                        <>
                          <button
                            onClick={() => requestValidation(report)}
                            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-200 text-xs"
                          >
                            Valider
                          </button>
                          <button
                            onClick={() => requestRejection(report)}
                            className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200 text-xs"
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-center text-sm font-medium">
                    <button
                      onClick={() => handleDeleteClick(report)}
                      className="text-red-500 hover:text-red-700 focus:outline-none p-1 rounded-full hover:bg-red-100 transition-colors"
                      title="Supprimer le rapport et ses activités"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm-2 4a1 1 0 011-1h4a1 1 0 110 2H6a1 1 0 01-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      <ConfirmationModal
        isOpen={showValidationConfirmModal}
        onClose={cancelValidation}
        onConfirm={confirmValidation}
        message={
          reportToUpdate
            ? `Confirmer la validation de ce rapport mensuel pour ${
                reportToUpdate.userName || "cet utilisateur"
              } pour ${format(
                new Date(reportToUpdate.year, reportToUpdate.month - 1),
                "MMMM yyyy",
                { locale: fr }
              )}?`
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
              <p className="mb-4">
                Confirmer le rejet de ce rapport mensuel pour{" "}
                {reportToUpdate.userName || "cet utilisateur"} pour{" "}
                {format(
                  new Date(reportToUpdate.year, reportToUpdate.month - 1),
                  "MMMM yyyy",
                  { locale: fr }
                )}
                ?
              </p>
              <textarea
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Veuillez indiquer le motif du rejet..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="3"
              ></textarea>
            </div>
          ) : (
            <div>
              <p className="mb-4">Confirmer le rejet du rapport ?</p>
              <textarea
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Veuillez indiquer le motif du rejet..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="3"
              ></textarea>
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

      {showCraBoardModal && craBoardReportData && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">
                Détails du rapport pour {craBoardReportData.userFirstName} -{" "}
                {format(craBoardReportData.currentMonth, "MMMM yyyy", {
                  locale: fr,
                })}
              </h3>
              <button
                onClick={handleCloseCraBoardModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
              <CraBoard
                userId={craBoardReportData.userId}
                userFirstName={craBoardReportData.userFirstName}
                activities={craBoardReportData.activities}
                activityTypeDefinitions={activityTypeDefinitions}
                clientDefinitions={clientDefinitions}
                currentMonth={craBoardReportData.currentMonth}
                showMessage={showMessage}
                readOnly={true}
                monthlyReports={craBoardReportData.monthlyReports}
                rejectionReason={craBoardReportData.rejectionReason}
                isReviewMode={true} // Indique que c'est en mode révision
                onUpdateReportStatus={handleUpdateReportStatus}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
