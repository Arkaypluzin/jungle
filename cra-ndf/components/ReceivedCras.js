// components/ReceivedCras.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO, isValid as isValidDateFns } from "date-fns";
import { fr } from "date-fns/locale";
import MonthlyReportPreviewModal from "./MonthlyReportPreviewModal";
import ConfirmationModal from "./ConfirmationModal";
import CraBoard from "./CraBoard";

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

  const [filterUserId, setFilterUserId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState(
    "pending_review,validated,rejected"
  );
  const [filterReportType, setFilterReportType] = useState("");

  const [selectedReportForPreview, setSelectedReportForPreview] =
    useState(null);
  const [showMonthlyReportPreview, setShowMonthlyReportPreview] =
    useState(false);

  const [reportToUpdate, setReportToUpdate] = useState(null);
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
      if (filterUserId) queryParams.append("userId", filterUserId);
      if (filterMonth) queryParams.append("month", filterMonth);
      if (filterYear) queryParams.append("year", filterYear);
      if (filterStatus) queryParams.append("status", filterStatus);
      if (filterReportType) queryParams.append("reportType", filterReportType);

      console.log(
        "[ReceivedCras] fetchMonthlyReports: Envoi de la requête avec filterReportType:",
        filterReportType,
        "et queryParams:",
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
        setReports(data.data);
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
    filterUserId,
    filterMonth,
    filterYear,
    filterStatus,
    filterReportType,
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
    filterUserId,
    filterMonth,
    filterYear,
    filterStatus,
    filterReportType,
    fetchMonthlyReports,
  ]);

  useEffect(() => {
    if (
      !loading &&
      !error &&
      reports.length > 0 &&
      filterStatus.includes("pending_review")
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
  }, [reports, loading, error, filterStatus, showMessage]);

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

  const handleViewCra = useCallback(
    async (report) => {
      console.log(
        "[ReceivedCras] handleViewCra appelé avec le rapport:",
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
        const detailedReport = await response.json();

        console.log(
          "[ReceivedCras] CRA détaillé reçu pour CraBoard (avant formatage):",
          detailedReport
        );
        console.log(
          "[ReceivedCras] detailedReport.activities_snapshot (raw):",
          detailedReport.activities_snapshot
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

        setCraBoardReportData({
          userId: detailedReport.user_id,
          userFirstName: detailedReport.userName,
          currentMonth: craBoardCurrentMonth,
          activities: formattedActivities,
          rejectionReason:
            detailedReport.status === "rejected"
              ? detailedReport.rejectionReason
              : null,
          monthlyReports: [detailedReport],
        });
        setShowCraBoardModal(true);
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

  const handleCloseCraBoardModal = useCallback(() => {
    setShowCraBoardModal(false);
    setCraBoardReportData(null);
  }, []);

  const handleDeleteClick = useCallback(
    (report) => {
      if (onDeleteMonthlyReport) {
        onDeleteMonthlyReport(report);
      }
    },
    [onDeleteMonthlyReport]
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i.toString());
    }
    return years;
  }, []);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      format(new Date(2000, i, 1), "MMMM", { locale: fr })
    ).map((name, index) => ({ name, value: (index + 1).toString() }));
  }, []);

  const statusOptions = useMemo(
    () => [
      { name: "Tous les statuts", value: "pending_review,validated,rejected" },
      { name: "En attente", value: "pending_review" },
      { name: "Validé", value: "validated" },
      { name: "Rejeté", value: "rejected" },
    ],
    []
  );

  const reportTypeOptions = useMemo(
    () => [
      { name: "Tous les types", value: "" },
      { name: "CRA", value: "cra" },
      { name: "Congés Payés", value: "paid_leave" },
    ],
    []
  );

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
        CRAM Reçus (En attente de révision, validés et refusés)
      </h3>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-inner flex flex-wrap gap-4 justify-center items-center">
        <div className="flex flex-col">
          <label
            htmlFor="filterUser"
            className="text-sm font-medium text-gray-700 mb-1"
          >
            Utilisateur:
          </label>
          <select
            id="filterUser"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les utilisateurs</option>
            {allUsersForFilter.map((user) => (
              <option key={user.azureAdUserId} value={user.azureAdUserId}>
                {user.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="filterMonth"
            className="text-sm font-medium text-gray-700 mb-1"
          >
            Mois:
          </label>
          <select
            id="filterMonth"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les mois</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="filterYear"
            className="text-sm font-medium text-gray-700 mb-1"
          >
            Année:
          </label>
          <select
            id="filterYear"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Toutes les années</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="filterStatus"
            className="text-sm font-medium text-gray-700 mb-1"
          >
            Statut:
          </label>
          <select
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="filterReportType"
            className="text-sm font-medium text-gray-700 mb-1"
          >
            Type de rapport:
          </label>
          <select
            id="filterReportType"
            value={filterReportType}
            onChange={(e) => setFilterReportType(e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {reportTypeOptions.map((type) => (
              <option key={type.value} value={type.value}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
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
                  Type
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Utilisateur
                </th>{" "}
                {/* DÉPLACÉ : Colonne Utilisateur */}
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
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-sm text-gray-800">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        report.report_type === "paid_leave"
                          ? "bg-teal-100 text-teal-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {report.report_type === "paid_leave"
                        ? "Congés Payés"
                        : "CRA"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {report.userName || "Utilisateur inconnu"}
                  </td>{" "}
                  {/* DÉPLACÉ : Cellule Utilisateur */}
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
                        : "Rejeté"}
                    </span>
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
            ? `Confirmer la validation du rapport de ${
                reportToUpdate.report_type === "paid_leave"
                  ? "Congés Payés"
                  : "CRA"
              } pour ${
                reportToUpdate.userName || "cet utilisateur"
              } pour ${format(
                new Date(reportToUpdate.year, reportToUpdate.month - 1),
                "MMMM yyyy",
                { locale: fr }
              )}?`
            : `Confirmer la validation du rapport ?`
        }
      />

      <ConfirmationModal
        isOpen={showRejectionConfirmModal}
        onClose={cancelRejection}
        onConfirm={confirmRejection}
        message={
          reportToUpdate ? (
            <div>
              <p className="mb-4">
                Confirmer le rejet du rapport de{" "}
                {reportToUpdate.report_type === "paid_leave"
                  ? "Congés Payés"
                  : "CRA"}{" "}
                pour {reportToUpdate.userName || "cet utilisateur"} pour{" "}
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
