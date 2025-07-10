// components/ReceivedCras.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

import MonthlyReportPreviewModal from "./MonthlyReportPreviewModal";
import ConfirmationModal from "./ConfirmationModal";

export default function ReceivedCras({
  userId,
  userFirstName,
  userRole,
  showMessage,
  clientDefinitions = [],
  activityTypeDefinitions = [],
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showMonthlyReportPreview, setShowMonthlyReportPreview] =
    useState(false);
  const [monthlyReportPreviewData, setMonthlyReportPreviewData] =
    useState(null);

  const [showValidationConfirmModal, setShowValidationConfirmModal] =
    useState(false);
  const [showRejectionConfirmModal, setShowRejectionConfirmModal] =
    useState(false);
  const [reportToActOn, setReportToActOn] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const isAdminOrManager = userRole === "admin" || userRole === "manager";

  const fetchPendingReviewReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // MODIFICATION ICI : Incluez les statuts 'pending_review' et 'validated'
      const response = await fetch(
        `/api/monthly_cra_reports?status=pending_review,validated`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            "Échec de la récupération des rapports en attente de révision."
        );
      }
      const data = await response.json();
      setReports(data);
    } catch (err) {
      console.error(
        "ReceivedCras: Erreur lors du chargement des CRAs en attente de révision:",
        err
      );
      setError(err.message);
      showMessage(
        `Erreur lors du chargement des CRAs: ${err.message}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    if (isAdminOrManager) {
      fetchPendingReviewReports();
    } else {
      setLoading(false);
      setError(
        "Accès non autorisé. Cette section est réservée aux administrateurs et managers."
      );
    }
  }, [fetchPendingReviewReports, isAdminOrManager]);

  const handleOpenMonthlyReportPreview = useCallback(
    async (reportId) => {
      try {
        const response = await fetch(`/api/monthly_cra_reports/${reportId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Échec de la récupération du rapport détaillé."
          );
        }
        const detailedReport = await response.json();

        const formattedActivities = detailedReport.activities_snapshot.map(
          (activity) => ({
            ...activity,
            date_activite: activity.date_activite
              ? parseISO(activity.date_activite)
              : null,
          })
        );

        setMonthlyReportPreviewData({
          reportData: formattedActivities,
          year: detailedReport.year,
          month: detailedReport.month,
          userName: detailedReport.userName,
          userId: detailedReport.user_id,
          reportId: detailedReport.id,
          status: detailedReport.status,
          rejectionReason: detailedReport.rejection_reason || null,
        });
        setShowMonthlyReportPreview(true);
      } catch (error) {
        console.error(
          "ReceivedCras: Erreur lors de l'ouverture de la prévisualisation:",
          error
        );
        showMessage(
          `Erreur lors de l'affichage du CRA: ${error.message}`,
          "error"
        );
      }
    },
    [showMessage]
  );

  const handleCloseMonthlyReportPreview = useCallback(() => {
    setShowMonthlyReportPreview(false);
    setMonthlyReportPreviewData(null);
    fetchPendingReviewReports();
  }, [fetchPendingReviewReports]);

  const handleUpdateReportStatus = useCallback(
    async (reportId, newStatus, reason = null) => {
      try {
        const response = await fetch(`/api/monthly_cra_reports/${reportId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: newStatus,
            reviewerId: userId,
            rejectionReason: reason,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              `Échec de la mise à jour du statut du CRA à ${newStatus}.`
          );
        }

        showMessage(
          `CRA ${
            newStatus === "validated" ? "validé" : "rejeté"
          } avec succès !`,
          "success"
        );
        handleCloseMonthlyReportPreview();
        fetchPendingReviewReports();
      } catch (error) {
        console.error(
          `ReceivedCras: Erreur lors de la mise à jour du statut du CRA à ${newStatus}:`,
          error
        );
        showMessage(`Erreur: ${error.message}`, "error");
      }
    },
    [
      showMessage,
      userId,
      handleCloseMonthlyReportPreview,
      fetchPendingReviewReports,
    ]
  );

  const requestValidateCra = useCallback((report) => {
    setReportToActOn(report);
    setShowValidationConfirmModal(true);
  }, []);

  const confirmValidateCra = useCallback(() => {
    if (reportToActOn) {
      handleUpdateReportStatus(reportToActOn.id, "validated");
      setShowValidationConfirmModal(false);
      setReportToActOn(null);
    }
  }, [reportToActOn, handleUpdateReportStatus]);

  const cancelValidateCra = useCallback(() => {
    setShowValidationConfirmModal(false);
    setReportToActOn(null);
  }, []);

  const requestRejectCra = useCallback((report) => {
    setReportToActOn(report);
    setRejectionReason("");
    setShowRejectionConfirmModal(true);
  }, []);

  const confirmRejectCra = useCallback(() => {
    if (reportToActOn && rejectionReason.trim()) {
      handleUpdateReportStatus(
        reportToActOn.id,
        "rejected",
        rejectionReason.trim()
      );
      setShowRejectionConfirmModal(false);
      setReportToActOn(null);
      setRejectionReason("");
    } else {
      showMessage("Veuillez fournir un motif de rejet.", "warning");
    }
  }, [reportToActOn, rejectionReason, handleUpdateReportStatus, showMessage]);

  const cancelRejectCra = useCallback(() => {
    setShowRejectionConfirmModal(false);
    setReportToActOn(null);
    setRejectionReason("");
  }, []);

  if (!isAdminOrManager) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8 text-center text-red-600 font-semibold">
        <p>
          Accès refusé. Cette section est réservée aux administrateurs et
          managers.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8 text-center">
        Chargement des CRAs en attente de révision...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8 text-center text-red-600">
        Erreur: {error}
      </div>
    );
  }

  const getReportMonthYear = (report) => {
    if (report?.year && report?.month) {
      return format(new Date(report.year, report.month - 1), "MMMM yyyy", {
        locale: fr,
      });
    }
    return "le mois sélectionné";
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        CRAs Reçus (En attente de révision et validés)
      </h2>

      {reports.length === 0 ? (
        <p className="text-center text-gray-600">
          Aucun CRA en attente de révision ou validé pour le moment.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mois
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jours Travaillés
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jours Facturables
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {format(
                      new Date(report.year, report.month - 1),
                      "MMMM yyyy",
                      { locale: fr }
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {report.userName || "N/A"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {report.total_days_worked?.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {report.total_billable_days?.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {report.status === "pending_review" && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        En attente de révision
                      </span>
                    )}
                    {report.status === "validated" && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Validé
                      </span>
                    )}
                    {report.status === "rejected" && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Rejeté
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 flex space-x-2">
                    <button
                      onClick={() => handleOpenMonthlyReportPreview(report.id)}
                      className="text-indigo-600 hover:text-indigo-900 px-3 py-1 border border-indigo-600 rounded-md text-xs"
                    >
                      Voir le CRA
                    </button>
                    {/* Les boutons Valider/Rejeter n'apparaissent que pour les CRAs en attente de révision */}
                    {isAdminOrManager && report.status === "pending_review" && (
                      <>
                        <button
                          onClick={() => requestValidateCra(report)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-xs"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => requestRejectCra(report)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs"
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          reportId={monthlyReportPreviewData.reportId}
          reportStatus={monthlyReportPreviewData.status}
          rejectionReason={monthlyReportPreviewData.rejectionReason}
          clientDefinitions={clientDefinitions}
          activityTypeDefinitions={activityTypeDefinitions}
          // On passe les fonctions requestValidateCra et requestRejectCra pour qu'elles puissent être appelées depuis la modale
          onValidateCra={requestValidateCra}
          onRejectCra={requestRejectCra}
          isAdminOrManager={isAdminOrManager}
        />
      )}

      <ConfirmationModal
        isOpen={showValidationConfirmModal}
        onClose={cancelValidateCra}
        onConfirm={confirmValidateCra}
        message={`Confirmez-vous la validation du CRA de ${
          reportToActOn?.userName || "cet utilisateur"
        } pour ${getReportMonthYear(reportToActOn)} ?`}
      />

      <ConfirmationModal
        isOpen={showRejectionConfirmModal}
        onClose={cancelRejectCra}
        onConfirm={confirmRejectCra}
        message={`Confirmez-vous le rejet du CRA de ${
          reportToActOn?.userName || "cet utilisateur"
        } pour ${getReportMonthYear(reportToActOn)} ?`}
      >
        <div className="mt-4">
          <label
            htmlFor="rejectionReason"
            className="block text-sm font-medium text-gray-700"
          >
            Motif du rejet (obligatoire) :
          </label>
          <textarea
            id="rejectionReason"
            rows="3"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
          ></textarea>
        </div>
      </ConfirmationModal>
    </div>
  );
}
