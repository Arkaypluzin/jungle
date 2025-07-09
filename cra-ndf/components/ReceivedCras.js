// components/ReceivedCras.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ReceivedCras({
  userId, // ID de l'utilisateur connecté (pour la vérification des permissions si nécessaire)
  userFirstName,
  userRole, // Rôle de l'utilisateur (admin, manager, user)
  showMessage,
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdminOrManager = userRole === "admin" || userRole === "manager";

  const fetchPendingReviewReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Requête API pour récupérer les rapports en statut "pending_review"
      // Le paramètre 'status' est crucial ici.
      const response = await fetch(
        `/api/monthly_cra_reports?status=pending_review`
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
        "Erreur lors du chargement des CRAs en attente de révision:",
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
      // Seuls les admins/managers peuvent voir cette section
      fetchPendingReviewReports();
    } else {
      setLoading(false);
      setError(
        "Accès non autorisé. Cette section est réservée aux administrateurs et managers."
      );
    }
  }, [fetchPendingReviewReports, isAdminOrManager]);

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

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        CRAs Reçus (En attente de révision)
      </h2>

      {reports.length === 0 ? (
        <p className="text-center text-gray-600">
          Aucun CRA en attente de révision pour le moment.
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
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      En attente de révision
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
