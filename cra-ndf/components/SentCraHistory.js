// components/SentCraHistory.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, parseISO, isValid, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function SentCraHistory({
  craActivities,
  clientDefinitions,
  activityTypeDefinitions,
  onAddCraActivity, // Probablement pas utilisé ici mais gardé pour consistance
  currentUserId,
  currentUserName,
  showMessage,
  onUpdateCraStatus,
}) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const activitiesByMonth = craActivities.reduce((acc, activity) => {
    // S'assurer que activity.date_activite est un objet Date valide
    // Si ce n'est pas déjà un objet Date, tenter de le parser.
    const activityDate =
      activity.date_activite instanceof Date && isValid(activity.date_activite)
        ? activity.date_activite
        : parseISO(activity.date_activite);

    if (!isValid(activityDate)) {
      console.warn(
        "Activité avec date invalide ignorée dans SentCraHistory:",
        activity
      );
      return acc;
    }

    // Correction ici : utiliser activityDate et date_activite
    const monthYear = format(activityDate, "MMMM yyyy", { locale: fr });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(activity);
    return acc;
  }, {});

  const sortedMonths = Object.keys(activitiesByMonth).sort((a, b) => {
    // Tri par mois, du plus récent au plus ancien
    const [monthA, yearA] = a.split(" ");
    const [monthB, yearB] = b.split(" ");
    const dateA = new Date(
      yearA,
      fr.localize.month(monthA, { width: "wide" }),
      1
    );
    const dateB = new Date(
      yearB,
      fr.localize.month(monthB, { width: "wide" }),
      1
    );
    return dateB.getTime() - dateA.getTime();
  });

  const getClientName = (clientId) => {
    const client = clientDefinitions.find((c) => c.id === clientId);
    return client ? client.name : "N/A";
  };

  const getActivityTypeName = (activityType) => {
    const type = activityTypeDefinitions.find((t) => t.name === activityType);
    return type ? type.name : activityType; // Retourne le nom brut si non trouvé
  };

  const filteredActivities = Object.entries(activitiesByMonth)
    .filter(([month]) => selectedMonth === "" || month === selectedMonth)
    .flatMap(([, activities]) => activities)
    .filter((activity) => {
      const matchesSearch =
        searchTerm === "" ||
        activity.description_activite
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        getClientName(activity.client_id)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        getActivityTypeName(activity.type_activite)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "finalized" && activity.status === "finalized") ||
        (statusFilter === "pending" && activity.status !== "finalized"); // Exemple: 'pending' pour tout ce qui n'est pas finalisé

      return matchesSearch && matchesStatus;
    });

  // Pour le regroupement par mois dans le select, nous voulons toutes les options disponibles
  const monthOptions = Object.keys(activitiesByMonth).sort((a, b) => {
    const dateA = parseISO(
      format(
        new Date(
          a.split(" ")[1],
          fr.localize.month(a.split(" ")[0], { width: "wide" }),
          1
        ),
        "yyyy-MM-dd"
      )
    );
    const dateB = parseISO(
      format(
        new Date(
          b.split(" ")[1],
          fr.localize.month(b.split(" ")[0], { width: "wide" }),
          1
        ),
        "yyyy-MM-dd"
      )
    );
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Historique des CRAs envoyés
      </h2>

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="monthFilter"
            className="block text-sm font-medium text-gray-700"
          >
            Filtrer par mois:
          </label>
          <select
            id="monthFilter"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          >
            <option value="">Tous les mois</option>
            {sortedMonths.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="statusFilter"
            className="block text-sm font-medium text-gray-700"
          >
            Filtrer par statut:
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="finalized">Finalisé</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="search"
            className="block text-sm font-medium text-gray-700"
          >
            Rechercher:
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par description, client, type..."
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          />
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <p className="text-gray-600 text-center py-8">
          Aucune activité trouvée pour les critères sélectionnés.
        </p>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((monthYear) => {
            const activitiesInMonth = activitiesByMonth[monthYear].filter(
              (activity) => {
                const matchesSearch =
                  searchTerm === "" ||
                  activity.description_activite
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  getClientName(activity.client_id)
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  getActivityTypeName(activity.type_activite)
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());

                const matchesStatus =
                  statusFilter === "all" ||
                  (statusFilter === "finalized" &&
                    activity.status === "finalized") ||
                  (statusFilter === "pending" &&
                    activity.status !== "finalized");

                return matchesSearch && matchesStatus;
              }
            );

            if (activitiesInMonth.length === 0) {
              return null; // Ne pas afficher le mois s'il n'y a pas d'activités filtrées
            }

            return (
              <div
                key={monthYear}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {monthYear}
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Temps Passé (j)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activitiesInMonth.map((activity) => (
                        <tr key={activity.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isValid(activity.date_activite)
                              ? format(activity.date_activite, "dd/MM/yyyy")
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getClientName(activity.client_id) ||
                              activity.client_name ||
                              "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getActivityTypeName(activity.type_activite)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {activity.temps_passe}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {activity.description_activite}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                activity.status === "finalized"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {activity.status || "En attente"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {activity.status !== "finalized" && (
                              <button
                                onClick={() =>
                                  onUpdateCraStatus(activity.id, "finalized")
                                }
                                className="text-indigo-600 hover:text-indigo-900 mr-2"
                              >
                                Finaliser
                              </button>
                            )}
                            <button
                              onClick={() =>
                                showMessage(
                                  "Fonctionnalité d'édition à implémenter",
                                  "info"
                                )
                              }
                              className="text-blue-600 hover:text-blue-900 mr-2"
                            >
                              Éditer
                            </button>
                            <button
                              onClick={() =>
                                showMessage(
                                  "Fonctionnalité de suppression à implémenter",
                                  "info"
                                )
                              }
                              className="text-red-600 hover:text-red-900"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
