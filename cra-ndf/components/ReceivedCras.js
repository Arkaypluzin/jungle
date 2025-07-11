// components/ReceivedCras.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
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
}) {
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allUsersForFilter, setAllUsersForFilter] = useState([]);

  const [filterUserId, setFilterUserId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState(
    "pending_review,validated,rejected"
  );

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
        "ReceivedCras: Erreur de fetch des utilisateurs pour le filtre:",
        err
      );
      showMessage(
        `Erreur de chargement des utilisateurs pour le filtre : ${err.message}`,
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
        "ReceivedCras: Réponse brute de l'API monthly_cra_reports (liste):",
        data
      );

      if (data && Array.isArray(data.data)) {
        setMonthlyReports(data.data);
      } else {
        console.warn(
          "ReceivedCras: La réponse de l'API pour la liste ne contient pas un tableau valide dans 'data.data'. Réponse:",
          data
        );
        setMonthlyReports([]);
      }
    } catch (err) {
      console.error(
        "ReceivedCras: Erreur de fetch des rapports mensuels (liste):",
        err
      );
      setError(err.message);
      showMessage(
        `Erreur de chargement des rapports : ${err.message}`,
        "error"
      );
      setMonthlyReports([]);
    } finally {
      setLoading(false);
    }
  }, [showMessage, filterUserId, filterMonth, filterYear, filterStatus]);

  useEffect(() => {
    // Suppression de la vérification de rôle pour l'affichage initial
    // La vérification d'autorisation est gérée au niveau de l'API route (/api/cras_users et /api/monthly_cra_reports)
    fetchUsersForFilter();
    fetchMonthlyReports();
  }, [fetchMonthlyReports, fetchUsersForFilter]);

  useEffect(() => {
    // Cette useEffect est déclenchée par les changements de filtre
    fetchMonthlyReports();
  }, [
    filterUserId,
    filterMonth,
    filterYear,
    filterStatus,
    fetchMonthlyReports,
  ]);

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
          `ReceivedCras: Tentative de mise à jour du statut du rapport ID: ${reportId} vers '${newStatus}'`
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
          `Erreur de mise à jour du statut : ${err.message}`,
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
      console.log("[Frontend] handleViewCra appelé avec le rapport:", report);
      try {
        const response = await fetch(`/api/monthly_cra_reports/${report.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Échec de la récupération du CRA détaillé."
          );
        }
        const result = await response.json();
        const detailedReport = result.data;

        console.log(
          "[Frontend] CRA détaillé reçu pour CraBoard:",
          detailedReport
        );

        const activitiesToPass =
          detailedReport && Array.isArray(detailedReport.activities_snapshot)
            ? detailedReport.activities_snapshot
            : [];

        const formattedActivities = activitiesToPass.map((activity) => ({
          ...activity,
          date_activite: activity.date_activite
            ? format(parseISO(activity.date_activite), "yyyy-MM-dd")
            : null,
          client_id: String(activity.client_id),
          type_activite: String(activity.type_activite),
        }));

        if (formattedActivities.length === 0) {
          console.warn(
            "[Frontend] Aucune activité formatée trouvée pour le CRA détaillé. Vérifiez les logs backend."
          );
        }

        setCraBoardReportData({
          userId: detailedReport.user_id,
          userFirstName: detailedReport.userName,
          currentMonth: new Date(
            detailedReport.year,
            detailedReport.month - 1,
            1
          ),
          activities: formattedActivities,
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
      { name: "En attente de révision", value: "pending_review" },
      { name: "Validé", value: "validated" },
      { name: "Rejeté", value: "rejected" },
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
        Erreur : {error}
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        CRAs Reçus (En attente de révision et validés)
      </h2>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-inner flex flex-wrap gap-4 justify-center items-center">
        {/* Réintégration du filtre Utilisateur */}
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
      </div>

      {Array.isArray(monthlyReports) && monthlyReports.length === 0 ? (
        <div className="text-gray-600 text-center py-8 text-lg">
          Aucun CRA trouvé avec les filtres actuels.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Mois
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Année
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Jours Travaillés
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Jours Facturables
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Statut
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {format(new Date(report.year, report.month - 1), "MMMM", {
                      locale: fr,
                    })}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {report.year}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {report.userName || "Utilisateur inconnu"}
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
                          ? "bg-blue-100 text-blue-800"
                          : report.status === "validated"
                          ? "bg-green-100 text-green-800"
                          : report.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {report.status === "pending_review"
                        ? "En attente de révision"
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
                        Voir le CRA
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
            ? `Confirmez-vous la validation du CRA pour ${
                reportToUpdate.userName || "cet utilisateur"
              } pour ${format(
                new Date(reportToUpdate.year, reportToUpdate.month - 1),
                "MMMM yyyy",
                { locale: fr }
              )} ?`
            : `Confirmez-vous la validation du CRA ?`
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
                Confirmez-vous le rejet du CRA pour{" "}
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
              <p className="mb-4">Confirmez-vous le rejet du CRA ?</p>
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
                CRA Détaillé pour {craBoardReportData.userFirstName} -{" "}
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
