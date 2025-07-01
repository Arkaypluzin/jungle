// components/SentCraHistory.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, isValid, parseISO, getMonth, getYear } from "date-fns";
import { fr } from "date-fns/locale";
import { sumBy } from "lodash";

const SentCraHistory = ({
  craActivities,
  clientDefinitions,
  activityTypeDefinitions,
  currentUserId,
  currentUserName,
  showMessage,
  onUpdateCraStatus,
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Mois 1-indexé

  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonthsForSelectedYear, setAvailableMonthsForSelectedYear] =
    useState([]);

  const [isInvalidateModalOpen, setIsInvalidateModalOpen] = useState(false);
  const [invalidationMessage, setInvalidationMessage] = useState("");
  const [craToValidateOrInvalidate, setCraToValidateOrInvalidate] =
    useState(null);

  // Déterminer les années disponibles à partir des activités
  useEffect(() => {
    const yearsSet = new Set();
    craActivities.forEach((activity) => {
      const date = activity.date_activite
        ? parseISO(activity.date_activite)
        : null;
      if (isValid(date)) {
        yearsSet.add(date.getFullYear());
      }
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a); // Année la plus récente en premier
    setAvailableYears(sortedYears);

    // Si l'année sélectionnée n'a pas d'activités, ou si aucune année n'est sélectionnée,
    // sélectionner l'année la plus récente par défaut.
    if (sortedYears.length > 0) {
      if (!selectedYear || !yearsSet.has(selectedYear)) {
        setSelectedYear(sortedYears[0]);
      }
    } else {
      // Fallback to current year if no activities exist
      setSelectedYear(new Date().getFullYear());
    }
  }, [craActivities, selectedYear]);

  // Mettre à jour les mois disponibles quand l'année sélectionnée change
  useEffect(() => {
    const monthsSet = new Set();
    craActivities.forEach((activity) => {
      const date = activity.date_activite
        ? parseISO(activity.date_activite)
        : null;
      if (isValid(date) && date.getFullYear() === selectedYear) {
        monthsSet.add(date.getMonth() + 1); // Mois 1-indexé
      }
    });
    const sortedMonths = Array.from(monthsSet).sort((a, b) => b - a); // Mois le plus récent en premier
    setAvailableMonthsForSelectedYear(sortedMonths);

    // Si le mois sélectionné n'est pas dans les mois disponibles pour l'année courante,
    // ou si aucun mois n'est sélectionné, choisir le mois le plus récent par défaut
    if (sortedMonths.length > 0) {
      if (!selectedMonth || !monthsSet.has(selectedMonth)) {
        setSelectedMonth(sortedMonths[0]);
      }
    } else {
      // Fallback to current month if no activities for selected year
      setSelectedMonth(new Date().getMonth() + 1);
    }
  }, [craActivities, selectedYear, selectedMonth]);

  const getClientName = useCallback(
    (clientId) => {
      if (clientId === null) {
        return "Non Spécifié";
      }
      const client = clientDefinitions.find((c) => c.id === clientId);
      return client ? client.nom_client : "Client Inconnu";
    },
    [clientDefinitions]
  );

  // Filtrer les activités par l'utilisateur courant, l'année et le mois sélectionné
  const filteredActivities = useMemo(() => {
    return craActivities.filter(
      (activity) =>
        activity.user_id === currentUserId &&
        activity.date_activite &&
        isValid(parseISO(activity.date_activite)) &&
        parseISO(activity.date_activite).getFullYear() === selectedYear &&
        parseISO(activity.date_activite).getMonth() + 1 === selectedMonth
    );
  }, [craActivities, currentUserId, selectedYear, selectedMonth]);

  const calculateMonthlySummary = useCallback((activities) => {
    // S'assurer que activities est bien un tableau
    const safeActivities = Array.isArray(activities) ? activities : [];

    const totalDays = sumBy(
      safeActivities,
      (a) => parseFloat(a.temps_passe) || 0
    );

    const draftCount = safeActivities.filter(
      (a) => a.status === "draft"
    ).length;
    const finalizedCount = safeActivities.filter(
      (a) => a.status === "finalized"
    ).length;
    const validatedCount = safeActivities.filter(
      (a) => a.status === "validated"
    ).length;
    const totalCount = safeActivities.length;

    let monthStatus = "draft";
    if (totalCount === 0) {
      monthStatus = "empty";
    } else if (validatedCount === totalCount) {
      monthStatus = "validated";
    } else if (finalizedCount === totalCount) {
      monthStatus = "finalized";
    } else if (draftCount > 0 && (finalizedCount > 0 || validatedCount > 0)) {
      monthStatus = "mixed";
    } else if (finalizedCount > 0 && validatedCount > 0 && draftCount === 0) {
      monthStatus = "mixed";
    }

    return {
      totalDays: totalDays.toFixed(1),
      status: monthStatus,
    };
  }, []);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-200 text-gray-800";
      case "finalized":
        return "bg-yellow-200 text-yellow-800";
      case "validated":
        return "bg-green-200 text-green-800";
      case "mixed":
        return "bg-purple-200 text-purple-800";
      case "empty":
        return "bg-gray-100 text-gray-500";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const handleValidateClick = useCallback((monthKey) => {
    const [year, month] = monthKey.split("-").map(Number);
    setCraToValidateOrInvalidate({ type: "validate", year, month, monthKey });
    setIsInvalidateModalOpen(true);
    setInvalidationMessage("");
  }, []);

  const handleInvalidateClick = useCallback((monthKey) => {
    const [year, month] = monthKey.split("-").map(Number);
    setCraToValidateOrInvalidate({ type: "invalidate", year, month, monthKey });
    setIsInvalidateModalOpen(true);
    setInvalidationMessage("");
  }, []);

  const handleModalSubmit = useCallback(async () => {
    if (!craToValidateOrInvalidate) return;

    const { type, year, month } = craToValidateOrInvalidate;
    const newStatus = type === "validate" ? "validated" : "invalidated";

    await onUpdateCraStatus(
      currentUserId,
      year,
      month,
      newStatus,
      invalidationMessage
    );
    setIsInvalidateModalOpen(false);
    setInvalidationMessage("");
    setCraToValidateOrInvalidate(null);
  }, [
    craToValidateOrInvalidate,
    currentUserId,
    invalidationMessage,
    onUpdateCraStatus,
  ]);

  const currentMonthSummary = useMemo(() => {
    // Calculer le résumé directement à partir de filteredActivities
    return calculateMonthlySummary(filteredActivities);
  }, [filteredActivities, calculateMonthlySummary]);

  // Format the selected month and year for display in the title
  const displayFormattedMonthYear = useMemo(() => {
    if (selectedYear && selectedMonth) {
      const date = new Date(selectedYear, selectedMonth - 1);
      if (isValid(date)) {
        return format(date, "MMMM", { locale: fr });
      }
    }
    return "Mois Inconnu";
  }, [selectedYear, selectedMonth]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">
        Historique des CRAs envoyés
      </h2>

      {/* Sélecteurs d'année et de mois séparés */}
      <div className="mb-6 flex flex-col sm:flex-row justify-center items-center gap-4">
        {/* Sélecteur d'Année */}
        <div className="flex items-center">
          <label
            htmlFor="year-select"
            className="mr-3 font-medium text-gray-700"
          >
            Année :
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-32"
          >
            {availableYears.length > 0 ? (
              availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))
            ) : (
              <option value={new Date().getFullYear()}>
                {new Date().getFullYear()} (Aucune activité)
              </option>
            )}
          </select>
        </div>

        {/* Sélecteur de Mois */}
        <div className="flex items-center">
          <label
            htmlFor="month-select"
            className="mr-3 font-medium text-gray-700"
          >
            Mois :
          </label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-48"
          >
            {availableMonthsForSelectedYear.length > 0 ? (
              availableMonthsForSelectedYear.map((month) => (
                <option key={month} value={month}>
                  {format(new Date(selectedYear, month - 1), "MMMM", {
                    locale: fr,
                  })}
                </option>
              ))
            ) : (
              <option value={new Date().getMonth() + 1}>
                {format(new Date(), "MMMM", { locale: fr })} (Aucune activité)
              </option>
            )}
          </select>
        </div>
      </div>

      {filteredActivities.length > 0 ? (
        <div className="border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-blue-700">
              CRA de {displayFormattedMonthYear}
            </h3>
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeClass(
                  currentMonthSummary.status
                )}`}
              >
                Statut :{" "}
                {currentMonthSummary.status === "finalized"
                  ? "FINALISÉ"
                  : currentMonthSummary.status === "validated"
                  ? "VALIDÉ"
                  : currentMonthSummary.status === "mixed"
                  ? "MIXTE"
                  : currentMonthSummary.status === "empty"
                  ? "VIDE"
                  : "BROUILLON"}
              </span>
              {currentMonthSummary.status === "finalized" && (
                <button
                  onClick={() =>
                    handleValidateClick(
                      format(
                        new Date(selectedYear, selectedMonth - 1),
                        "yyyy-MM"
                      )
                    )
                  }
                  className="px-4 py-2 bg-green-500 text-white rounded-md shadow-md hover:bg-green-600 transition duration-300"
                >
                  Valider
                </button>
              )}
              {(currentMonthSummary.status === "finalized" ||
                currentMonthSummary.status === "validated" ||
                currentMonthSummary.status === "mixed") && (
                <button
                  onClick={() =>
                    handleInvalidateClick(
                      format(
                        new Date(selectedYear, selectedMonth - 1),
                        "yyyy-MM"
                      )
                    )
                  }
                  className="px-4 py-2 bg-red-500 text-white rounded-md shadow-md hover:bg-red-600 transition duration-300"
                >
                  Invalider
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type d'activité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temps passé (jours)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facturable
                  </th>{" "}
                  {/* Nouvelle colonne */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredActivities.map((activity) => {
                  const activityDate = parseISO(activity.date_activite);
                  const formattedActivityDate = isValid(activityDate)
                    ? format(activityDate, "dd/MM/yyyy")
                    : "Date Inconnue";
                  return (
                    <tr key={activity.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formattedActivityDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getClientName(activity.client_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.type_activite}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.description_activite || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.temps_passe}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                            activity.status
                          )}`}
                        >
                          {activity.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.is_billable === 1 ? "Oui" : "Non"}
                      </td>{" "}
                      {/* Affichage du statut facturable */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right text-lg font-semibold text-gray-800">
            Total jours pour le mois : {currentMonthSummary.totalDays}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-600 py-8">
          Aucun CRA trouvé pour {displayFormattedMonthYear}.
        </p>
      )}

      {/* Modal de validation/invalidation */}
      {isInvalidateModalOpen && craToValidateOrInvalidate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full m-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              {craToValidateOrInvalidate.type === "validate"
                ? "Valider le CRA"
                : "Invalider le CRA"}{" "}
              de{" "}
              {format(
                new Date(
                  craToValidateOrInvalidate.year,
                  craToValidateOrInvalidate.month - 1
                ),
                "MMMM",
                { locale: fr }
              )}
            </h3>
            <div className="mb-4">
              <label
                htmlFor="invalidationMessage"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Message (optionnel) :
              </label>
              <textarea
                id="invalidationMessage"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="4"
                value={invalidationMessage}
                onChange={(e) => setInvalidationMessage(e.target.value)}
                placeholder={
                  craToValidateOrInvalidate.type === "validate"
                    ? "Ajouter un message de validation..."
                    : "Pourquoi invalidez-vous ce CRA ?"
                }
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setIsInvalidateModalOpen(false);
                  setInvalidationMessage("");
                  setCraToValidateOrInvalidate(null);
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Annuler
              </button>
              <button
                onClick={handleModalSubmit}
                className={`${
                  craToValidateOrInvalidate.type === "validate"
                    ? "bg-green-500 hover:bg-green-700"
                    : "bg-red-500 hover:bg-red-700"
                } text-white font-bold py-2 px-4 rounded`}
              >
                {craToValidateOrInvalidate.type === "validate"
                  ? "Valider"
                  : "Invalider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SentCraHistory;
