// components/OverviewBoard.js
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isValid,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  // isBefore, // Plus nécessaire si le filtre par date est retiré
} from "date-fns";
import { fr } from "date-fns/locale";

export default function OverviewBoard({
  activityTypeDefinitions,
  clientDefinitions,
  showMessage,
  userRole,
}) {
  const [loading, setLoading] = useState(true);
  const [allActivities, setAllActivities] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Utilisateurs pour la vue d'ensemble
  const [currentViewStart, setCurrentViewStart] = useState(new Date()); // Début du mois/semaine/jour courant
  const [viewMode, setViewMode] = useState("month"); // 'month', 'week', 'day'
  const [publicHolidays, setPublicHolidays] = useState([]);

  // ÉTATS POUR LE FILTRE PAR DATE DE CONGÉS - SUPPRIMÉS
  // const [leaveFilterStartDate, setLeaveFilterStartDate] = useState("");
  // const [leaveFilterEndDate, setLeaveFilterEndDate] = useState("");

  // ÉTAT POUR LE TRI DES CONGÉS - CONSERVÉ
  const [leaveSortOrder, setLeaveSortOrder] = useState("asc"); // 'asc' pour ancien au nouveau, 'desc' pour nouveau à l'ancien

  const paidLeaveTypeId = useMemo(() => {
    const type = activityTypeDefinitions.find(
      (t) => t.name && t.name.toLowerCase().includes("congé payé")
    );
    return type ? type.id : null;
  }, [activityTypeDefinitions]);

  // Utility function for fetching and parsing JSON (similar to CRAPage)
  const fetchAndParse = useCallback(async (url, resourceName) => {
    const res = await fetch(url);
    if (!res.ok) {
      let errorInfo = `Erreur HTTP ${res.status}: ${res.statusText}`;
      let rawText = "Non disponible (erreur réseau ou réponse vide)";
      try {
        rawText = await res.text();
        try {
          const errorData = JSON.parse(rawText);
          errorInfo += ` - Message API: ${
            errorData.message || JSON.stringify(errorData)
          }`;
        } catch (jsonParseError) {
          errorInfo += ` - Réponse non-JSON ou invalide (début): "${rawText.substring(
            0,
            200
          )}..."`;
        }
      } catch (textError) {}
      throw new Error(`Échec du chargement des ${resourceName}: ${errorInfo}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const rawText = await res.text();
      throw new Error(
        `Réponse inattendue pour ${resourceName}: Le contenu n'est pas du JSON. Début de la réponse: "${rawText.substring(
          0,
          100
        )}..."`
      );
    }
    const jsonData = await res.json();
    return jsonData;
  }, []);

  // Utilisation de /api/cras_users
  const fetchAllUsers = useCallback(async () => {
    try {
      const usersData = await fetchAndParse("/api/cras_users", "utilisateurs");
      // Mappage des champs de /api/cras_users (azureAdUserId, fullName) vers (id, name)
      // Ceci est nécessaire car OverviewBoard utilise user.id et user.name
      const formattedUsers = usersData.map((user) => ({
        id: user.azureAdUserId,
        name: user.fullName,
      }));
      return formattedUsers;
    } catch (err) {
      console.error(
        "OverviewBoard: Erreur lors du chargement des utilisateurs:",
        err
      );
      showMessage(
        `Erreur de chargement des utilisateurs: ${err.message}`,
        "error"
      );
      return [];
    }
  }, [fetchAndParse, showMessage]);

  // Fetch all activities for a given date range
  const fetchActivitiesForRange = useCallback(
    async (startDate, endDate) => {
      try {
        const activitiesData = await fetchAndParse(
          `/api/cra_activities?startDate=${format(
            startDate,
            "yyyy-MM-dd"
          )}&endDate=${format(endDate, "yyyy-MM-dd")}`,
          "activités globales"
        );
        const processedActivities = activitiesData
          .map((activity) => {
            let dateObj = null;
            if (typeof activity.date_activite === "string") {
              dateObj = parseISO(activity.date_activite);
            } else if (activity.date_activite) {
              dateObj = new Date(activity.date_activite);
            }
            return {
              ...activity,
              date_activite: isValid(dateObj) ? dateObj : null,
            };
          })
          .filter((activity) => activity.date_activite !== null);
        return processedActivities;
      } catch (err) {
        console.error(
          "OverviewBoard: Erreur lors du chargement des activités globales:",
          err
        );
        showMessage(
          `Erreur de chargement des activités globales: ${err.message}`,
          "error"
        );
        return [];
      }
    },
    [fetchAndParse, showMessage]
  );

  const fetchPublicHolidays = useCallback(
    async (year) => {
      try {
        const response = await fetch(`/api/public_holidays?year=${year}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Échec de la récupération des jours fériés."
          );
        }
        const data = await response.json();
        const formattedHolidays = data.map((holiday) =>
          format(new Date(holiday.date), "yyyy-MM-dd")
        );
        setPublicHolidays(formattedHolidays);
      } catch (error) {
        console.error(
          "OverviewBoard: Erreur lors de la récupération des jours fériés:",
          error
        );
        showMessage(
          `Impossible de charger les jours fériés: ${error.message}`,
          "error"
        );
        setPublicHolidays([]);
      }
    },
    [showMessage]
  );

  const isPublicHoliday = useCallback(
    (date) => {
      if (!isValid(date)) return false;
      const formattedDate = format(date, "yyyy-MM-dd");
      return publicHolidays.includes(formattedDate);
    },
    [publicHolidays]
  );

  // Calculate days to display based on viewMode
  const daysInView = useMemo(() => {
    let start, end;
    switch (viewMode) {
      case "week":
        start = startOfWeek(currentViewStart, { weekStartsOn: 1 });
        end = endOfWeek(currentViewStart, { weekStartsOn: 1 });
        break;
      case "day":
        start = currentViewStart;
        end = currentViewStart;
        break;
      case "month":
      default:
        start = startOfMonth(currentViewStart);
        end = endOfMonth(currentViewStart);
        break;
    }
    return eachDayOfInterval({ start, end });
  }, [currentViewStart, viewMode]);

  // Fetch data on viewMode or currentViewStart change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const usersData = await fetchAllUsers();
        setAllUsers(usersData);

        const firstDayOfView = daysInView[0];
        const lastDayOfView = daysInView[daysInView.length - 1];
        if (isValid(firstDayOfView) && isValid(lastDayOfView)) {
          const activitiesData = await fetchActivitiesForRange(
            firstDayOfView,
            lastDayOfView
          );
          setAllActivities(activitiesData);
        } else {
          setAllActivities([]);
        }

        await fetchPublicHolidays(currentViewStart.getFullYear());
      } catch (error) {
        console.error(
          "OverviewBoard: Erreur de chargement des données:",
          error
        );
        showMessage(
          `Erreur de chargement des données: ${error.message}`,
          "error"
        );
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [
    currentViewStart,
    viewMode,
    fetchAllUsers,
    fetchActivitiesForRange,
    fetchPublicHolidays,
    showMessage,
    daysInView,
  ]);

  const activitiesByDayAndUser = useMemo(() => {
    const data = new Map(); // Map<userId, Map<dateKey, Array<activity>>>

    allUsers.forEach((user) => {
      data.set(user.id, new Map()); // Initialize map for each user, where user.id is azureAdUserId
    });

    // Toutes les activités sont traitées, sans filtre de date ici
    const processedActivities = allActivities;

    processedActivities.forEach((activity) => {
      const userIdToMap = activity.userAzureAdId || activity.user_id;
      if (isValid(activity.date_activite) && userIdToMap) {
        const dateKey = format(activity.date_activite, "yyyy-MM-dd");
        if (!data.has(userIdToMap)) {
          console.warn(
            `OverviewBoard: Activité pour ID utilisateur non listé dans /api/cras_users: ${userIdToMap}`
          );
        }
        const userActivities = data.get(userIdToMap);
        if (userActivities) {
          if (!userActivities.has(dateKey)) {
            userActivities.set(dateKey, []);
          }
          userActivities.get(dateKey).push(activity);
        }
      }
    });

    // Appliquer le tri aux activités DANS CHAQUE JOUR, si c'est un congé payé
    data.forEach(userMap => {
      userMap.forEach(activitiesArray => {
        activitiesArray.sort((a, b) => {
          const isAPaidLeave = String(a.type_activite) === String(paidLeaveTypeId);
          const isBPaidLeave = String(b.type_activite) === String(paidLeaveTypeId);

          // Si les deux sont des congés payés, trier par date
          if (isAPaidLeave && isBPaidLeave) {
            const dateA = a.date_activite.getTime();
            const dateB = b.date_activite.getTime();
            return leaveSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          }
          // Si l'un est un congé payé et l'autre non, ou si aucun n'est un congé, ne pas changer l'ordre relatif.
          return 0;
        });
      });
    });

    return data;
  }, [allActivities, allUsers, paidLeaveTypeId, leaveSortOrder]); // leaveFilterStartDate et leaveFilterEndDate retirés des dépendances

  const navigateView = useCallback(
    (direction) => {
      setCurrentViewStart((prev) => {
        if (!isValid(prev)) return new Date(); // Fallback if prev is invalid
        switch (viewMode) {
          case "month":
            return direction === "prev"
              ? subMonths(prev, 1)
              : addMonths(prev, 1);
          case "week":
            return direction === "prev" ? subWeeks(prev, 1) : addWeeks(prev, 1);
          case "day":
            return direction === "prev" ? subDays(prev, 1) : addDays(prev, 1);
          default:
            return prev;
        }
      });
    },
    [viewMode]
  );

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    setCurrentViewStart(new Date()); // Reset to current day/week/month when changing mode
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-600">
        Chargement du planning d'ensemble...
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8 font-inter">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Planning Global des Activités et Congés
      </h2>

      <div className="flex justify-center items-center mb-6 space-x-4">
        <div className="flex rounded-lg shadow-sm">
          <button
            onClick={() => handleViewModeChange("day")}
            className={`px-4 py-2 rounded-l-lg font-semibold transition-colors duration-200 ${
              viewMode === "day"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Jour
          </button>
          <button
            onClick={() => handleViewModeChange("week")}
            className={`px-4 py-2 font-semibold transition-colors duration-200 ${
              viewMode === "week"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => handleViewModeChange("month")}
            className={`px-4 py-2 rounded-r-lg font-semibold transition-colors duration-200 ${
              viewMode === "month"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Mois
          </button>
        </div>
      </div>

      {/* SECTION DE TRI POUR LES CONGÉS */}
      <div className="flex flex-col sm:flex-row justify-center items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4 p-4 bg-lime-50 rounded-lg shadow-inner border border-lime-200">
        <span className="font-semibold text-lime-800 text-lg">Trier les demandes de congés :</span>
        <select
          id="leaveSortOrder"
          value={leaveSortOrder}
          onChange={(e) => setLeaveSortOrder(e.target.value)}
          className="p-2 border border-gray-300 rounded-md focus:ring-lime-500 focus:border-lime-500"
        >
          <option value="asc">Plus ancien au plus nouveau</option>
          <option value="desc">Plus nouveau au plus ancien</option>
        </select>
      </div>

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigateView("prev")}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200"
        >
          {viewMode === "day"
            ? "Jour précédent"
            : viewMode === "week"
            ? "Semaine précédente"
            : "Mois précédent"}
        </button>
        <h3 className="text-xl font-semibold text-gray-800">
          {viewMode === "day" && isValid(currentViewStart)
            ? format(currentViewStart, "EEEE dd MMMM yyyy", { locale: fr })
            : ""}
          {viewMode === "week" &&
          isValid(daysInView[0]) &&
          isValid(daysInView[daysInView.length - 1])
            ? `${format(daysInView[0], "dd MMM", { locale: fr })} - ${format(
                daysInView[daysInView.length - 1],
                "dd MMM yyyy",
                { locale: fr }
              )}`
            : ""}
          {viewMode === "month" && isValid(currentViewStart)
            ? format(currentViewStart, "MMMM yyyy", { locale: fr })
            : ""}
        </h3>
        <button
          onClick={() => navigateView("next")}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200"
        >
          {viewMode === "day"
            ? "Jour suivant"
            : viewMode === "week"
            ? "Semaine suivante"
            : "Mois suivant"}
        </button>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="inline-block min-w-full align-middle">
          {/* Header row for days */}
          <div className="grid grid-flow-col auto-cols-[100px] gap-1 mb-2">
            {" "}
            {/* Fixed width for day columns */}
            <div className="w-32 flex-shrink-0 font-semibold text-gray-700 text-left pl-2">
              Utilisateur
            </div>
            {daysInView.map((day) => {
              const isWeekendDay = isWeekend(day, { weekStartsOn: 1 });
              const isHoliday = isPublicHoliday(day);
              const isNonWorkingDay = isWeekendDay || isHoliday;
              const dayClass = isNonWorkingDay
                ? "bg-gray-200 text-gray-500"
                : "bg-gray-100 text-gray-700";
              const todayClass = isSameDay(day, new Date())
                ? "border-2 border-blue-500 bg-blue-50"
                : "";

              return (
                <div
                  key={format(day, "yyyy-MM-dd")}
                  className={`text-center py-2 text-sm rounded-md ${dayClass} ${todayClass}`}
                  title={
                    isNonWorkingDay
                      ? isWeekendDay && isHoliday
                        ? "Week-end & Férié"
                        : isWeekendDay
                        ? "Week-end"
                        : "Jour Férié"
                      : ""
                  }
                >
                  <div className="font-semibold">
                    {format(day, "EEE", { locale: fr })}
                  </div>
                  <div className="font-bold">{format(day, "d")}</div>
                </div>
              );
            })}
          </div>

          {/* Rows for each user */}
          {allUsers.map((user) => (
            <div
              key={user.id}
              className="grid grid-flow-col auto-cols-[100px] gap-1 mb-1"
            >
              {" "}
              {/* Fixed width for day columns */}
              <div className="w-32 flex-shrink-0 bg-blue-50 text-blue-800 font-semibold py-2 px-2 rounded-md flex items-center justify-start overflow-hidden text-ellipsis whitespace-nowrap">
                {user.name} {/* Affiche le nom de l'utilisateur (fullName) */}
              </div>
              {daysInView.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                // Utilise user.id (qui est azureAdUserId) pour récupérer les activités
                const activities =
                  activitiesByDayAndUser.get(user.id)?.get(dateKey) || [];
                const isWeekendDay = isWeekend(day, { weekStartsOn: 1 });
                const isHoliday = isPublicHoliday(day);
                const isNonWorkingDay = isWeekendDay || isHoliday;
                const cellBgClass = isNonWorkingDay
                  ? "bg-gray-100"
                  : "bg-white";
                const todayClass = isSameDay(day, new Date())
                  ? "border-2 border-blue-400"
                  : "border border-gray-200";

                return (
                  <div
                    key={`${user.id}-${dateKey}`}
                    className={`h-16 p-1 flex items-center justify-center rounded-md ${cellBgClass} ${todayClass}`}
                    title={
                      isNonWorkingDay
                        ? isWeekendDay && isHoliday
                          ? "Week-end & Férié"
                          : isWeekendDay
                          ? "Week-end"
                          : "Jour Férié"
                        : ""
                    }
                  >
                    {activities.length > 0 ? (
                      <div className="flex flex-col w-full h-full justify-center items-center">
                        {activities.map((activity) => {
                          const activityTypeObj = activityTypeDefinitions.find(
                            (type) =>
                              String(type.id) === String(activity.type_activite)
                          );
                          const activityTypeLabel = activityTypeObj
                            ? activityTypeObj.name
                            : "Inconnu";
                          const client = clientDefinitions.find(
                            (c) => String(c.id) === String(activity.client_id)
                          );
                          const clientLabel = client
                            ? client.nom_client
                            : "N/A";

                          let activityColorClass = "bg-blue-200 text-blue-800"; // Couleur par défaut pour les activités non-congés
                          let activityStatusIcon = "";
                          let activityTitle = "";

                          if (
                            String(activity.type_activite) ===
                            String(paidLeaveTypeId)
                          ) {
                            // Logique de couleur spécifique pour les congés payés selon le statut
                            if (activity.status === "pending_review") {
                              activityColorClass = "bg-yellow-200 text-yellow-800"; // Jaune pour en attente
                              activityStatusIcon = "⏳";
                              activityTitle = "Congé en attente";
                            } else if (activity.status === "validated") {
                              activityColorClass = "bg-green-200 text-green-800"; // Vert pour validé
                              activityStatusIcon = "✅";
                              activityTitle = "Congé validé";
                            } else if (activity.status === "rejected") {
                              activityColorClass = "bg-red-200 text-red-800"; // Rouge pour refusé
                              activityStatusIcon = "❌";
                              activityTitle = "Congé refusé";
                            } else {
                              activityColorClass = "bg-lime-200 text-lime-800"; // Vert clair par défaut pour congé payé (draft, etc.)
                              activityTitle = "Congé Payé";
                            }
                          } else if (
                            activityTypeLabel.toLowerCase().includes("absence")
                          ) {
                            activityColorClass = "bg-red-200 text-red-800";
                          } else if (activityTypeObj?.is_overtime) {
                            activityColorClass =
                              "bg-purple-200 text-purple-800";
                          }

                          return (
                            <div
                              key={activity.id}
                              className={`w-full text-xs px-1 py-0.5 rounded-sm whitespace-nowrap overflow-hidden text-ellipsis mb-0.5 ${activityColorClass}`}
                              title={`${activityTypeLabel} (${
                                activity.temps_passe
                              }j) - Client: ${clientLabel} - Statut: ${
                                activity.status
                              } ${activityTitle ? `(${activityTitle})` : ""}`}
                            >
                              {activityStatusIcon} {activityTypeLabel} (
                              {activity.temps_passe}j)
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs"></span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
