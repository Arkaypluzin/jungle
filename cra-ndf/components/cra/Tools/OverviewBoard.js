"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isValid,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  parseISO,
  addWeeks, // Corrected: Added addWeeks import
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";

export default function OverviewBoard({
  activityTypeDefinitions, // Cette prop est cruciale pour identifier les congés !
  clientDefinitions,
  showMessage,
  userRole,
}) {
  // LOG IMMÉDIAT : Vérifier la prop activityTypeDefinitions dès le début
  console.log("--- activityTypeDefinitions (LOG IMMÉDIAT) ---");
  console.log(JSON.stringify(activityTypeDefinitions, null, 2));
  console.log("--- Fin activityTypeDefinitions (LOG IMMÉDIAT) ---");

  // Tous les appels useState au tout début
  const [loading, setLoading] = useState(true);
  const [allActivities, setAllActivities] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentViewStart, setCurrentViewStart] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month', 'week', 'day', 'commonLeaves'
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [allMonthlyReports, setAllMonthlyReports] = useState([]);

  // État pour le filtre utilisateur global (tableau d'IDs pour multi-sélection)
  const [selectedUserIdsFilter, setSelectedUserIdsFilter] = useState([]);

  // État pour le filtre de statut des congés
  const [commonLeaveStatusFilter, setCommonLeaveStatusFilter] = useState('all');

  // Déclencheur de rafraîchissement manuel
  const [refreshActivitiesTrigger, setRefreshActivitiesTrigger] = useState(0);

  // Filtrer les utilisateurs à afficher dans le calendrier
  const filteredUsersForCalendar = useMemo(() => {
    if (selectedUserIdsFilter.length === 0) { // Si aucun ID n'est sélectionné, afficher tous les utilisateurs
      return allUsers;
    }
    return allUsers.filter(user => selectedUserIdsFilter.includes(user.id));
  }, [allUsers, selectedUserIdsFilter]);

  const leaveActivityTypeIds = useMemo(() => {
    // Liste plus complète et robuste de mots-clés pour les congés et absences
    const leaveKeywords = [
      "congé", "absence", "maladie", "formation", "vacances",
      "rtt", "arrêt", "maternité", "paternité", "familial",
      "exceptionnel", "ferié", "férié", "repos", "indisponibilité"
    ];
    const ids = new Set();

    if (!activityTypeDefinitions || activityTypeDefinitions.length === 0) {
      console.warn("leaveActivityTypeIds: activityTypeDefinitions est vide ou non défini. Impossible d'identifier les types de congés.");
      return ids;
    }

    activityTypeDefinitions.forEach(type => {
      // Vérifier si le nom existe et si l'un des mots-clés est inclus (insensible à la casse)
      if (type.name && leaveKeywords.some(keyword => type.name.toLowerCase().includes(keyword.toLowerCase()))) {
        ids.add(type.id);
      }
    });
    console.log("leaveActivityTypeIds: IDs de types d'activités de congé/absence identifiés:", Array.from(ids));
    return ids;
  }, [activityTypeDefinitions]);


  const fetchAndParse = useCallback(async (url, resourceName, options = {}) => {
    const res = await fetch(url, options);
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
            100
          )}..."`;
        }
      } catch (textError) {}
      throw new Error(`Échec du chargement des ${resourceName}: ${errorInfo}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      if (res.status >= 200 && res.status < 300) {
        return {}; // Retourne un objet vide pour les succès sans contenu JSON
      }
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

  const fetchAllUsers = useCallback(async () => {
    try {
      const usersData = await fetchAndParse("/api/cras_users", "utilisateurs");
      const formattedUsers = usersData.map((user) => ({
        id: user.azureAdUserId,
        name: user.fullName,
      }));
      console.log("--- fetchAllUsers: Utilisateurs formatés chargés ---");
      formattedUsers.forEach(user => console.log(`  User ID: ${user.id}, Name: ${user.name}`));
      console.log("--- Fin fetchAllUsers ---");
      return formattedUsers;
    } catch (err) {
      console.error("OverviewBoard: Erreur lors du chargement des utilisateurs:", err);
      showMessage(`Erreur de chargement des utilisateurs: ${err.message}`, "error");
      return [];
    }
  }, [fetchAndParse, showMessage]);

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
              // Assurez-vous que temps_passe est toujours un nombre
              temps_passe: parseFloat(activity.temps_passe || activity.duree_jours || 0), // Fallback pour duree_jours si temps_passe n'existe pas
            };
          })
          .filter((activity) => activity.date_activite !== null);
        console.log("--- fetchActivitiesForRange: Activités traitées chargées ---");
        processedActivities.forEach(activity => console.log(`  Activity ID: ${activity.id}, User ID: ${activity.userAzureAdId || activity.user_id}, Date: ${activity.date_activite ? format(activity.date_activite, 'yyyy-MM-dd') : 'N/A'}, Type: ${activity.type_activite}, Status: ${activity.status}`));
        console.log("--- Fin fetchActivitiesForRange ---");
        return processedActivities;
      } catch (err) {
        console.error("OverviewBoard: Erreur lors du chargement des activités globales:", err);
        showMessage(`Erreur de chargement des activités globales: ${err.message}`, "error");
        return [];
      }
    },
    [fetchAndParse, showMessage]
  );

  const fetchAllMonthlyReports = useCallback(async (year) => {
    try {
      const response = await fetch(`/api/monthly_cra_reports?year=${year}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de la récupération de tous les rapports mensuels.");
      }
      const data = await response.json();
      if (data && Array.isArray(data.data)) {
        setAllMonthlyReports(data.data);
      } else {
        console.warn("OverviewBoard: La réponse API des rapports mensuels ne contient pas un tableau valide dans 'data.data'. Réponse:", data);
        setAllMonthlyReports([]);
      }
    } catch (err) {
      console.error("OverviewBoard: Erreur lors de la récupération de tous les rapports mensuels:", err);
      showMessage(`Erreur de chargement des rapports mensuels: ${err.message}`, "error");
      setAllMonthlyReports([]);
    }
  }, [showMessage]);


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
        console.error("OverviewBoard: Erreur lors de la récupération des jours fériés:", error);
        showMessage(`Impossible de charger les jours fériés: ${error.message}`, "error");
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


  // Effect pour charger les activités quand la vue, le filtre utilisateur ou le déclencheur de rafraîchissement change
  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      try {
        const activitiesData = await fetchActivitiesForRange(
          daysInView[0],
          daysInView[daysInView.length - 1]
        );
        setAllActivities(activitiesData);
        console.log("useEffect [view/filter/refresh]: Activités rechargées:", activitiesData.length);
      } catch (error) {
        console.error("OverviewBoard: Erreur lors du rechargement des activités:", error);
        showMessage(`Erreur de rechargement des activités: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    };
    loadActivities();
  }, [
    currentViewStart, // Déclenche le rechargement si le mois/semaine/jour change
    viewMode,         // Déclenche le rechargement si le mode de vue change
    selectedUserIdsFilter, // Déclenche le rechargement si le filtre utilisateur change
    refreshActivitiesTrigger, // NOUVEVEAU: Déclenche le rechargement si le bouton de rafraîchissement est cliqué
    fetchActivitiesForRange,
    daysInView,
  ]);


  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        console.log("useEffect: Début du chargement des données initiales...");
        const usersData = await fetchAllUsers();
        setAllUsers(usersData);
        console.log("useEffect: Utilisateurs chargés:", usersData.length);

        // Charger les activités pour la période initiale
        const activitiesData = await fetchActivitiesForRange(
          daysInView[0],
          daysInView[daysInView.length - 1]
        );
        setAllActivities(activitiesData);
        console.log("useEffect: Activités initiales chargées:", activitiesData.length);

        await fetchPublicHolidays(currentViewStart.getFullYear());
        console.log("useEffect: Jours fériés chargés.");

        await fetchAllMonthlyReports(currentViewStart.getFullYear());
        console.log("useEffect: Rapports mensuels chargés.");

      } catch (error) {
        console.error("OverviewBoard: Erreur de chargement des données initiales dans useEffect:", error);
        showMessage(`Erreur de chargement des données initiales: ${error.message}`, "error");
      } finally {
        setLoading(false);
        console.log("useEffect: Chargement des données initiales terminé, setLoading(false).");
      }
    };
    loadInitialData();
  }, [
    fetchAllUsers,
    fetchActivitiesForRange,
    fetchPublicHolidays,
    fetchAllMonthlyReports,
    // activityTypeDefinitions // Garder cette dépendance pour que le useMemo leaveActivityTypeIds se recalcule si activityTypeDefinitions change
  ]);

  // NOUVEL EFFET : Pour s'assurer que activityTypeDefinitions est loggé quand il est disponible
  useEffect(() => {
    if (activityTypeDefinitions && activityTypeDefinitions.length > 0) {
      console.log("--- activityTypeDefinitions (useEffect) ---");
      console.log(JSON.stringify(activityTypeDefinitions, null, 2));
      console.log("--- Fin activityTypeDefinitions (useEffect) ---");
    } else {
      console.log("--- activityTypeDefinitions (useEffect) --- : Pas encore disponible ou vide.");
    }
  }, [activityTypeDefinitions]);


  const activitiesByDayAndUser = useMemo(() => {
    const data = new Map();

    allUsers.forEach((user) => {
      data.set(user.id, new Map());
    });

    allActivities.forEach((activity) => {
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

    data.forEach(userMap => {
      userMap.forEach(activitiesArray => {
        activitiesArray.sort((a, b) => {
          const dateA = a.date_activite.getTime();
          const dateB = b.date_activite.getTime();
          return dateA - dateB;
        });
      });
    });

    return data;
  }, [allActivities, allUsers]);


  const multiPersonLeaveDaysSummary = useMemo(() => {
    console.log("--- Début du calcul multiPersonLeaveDaysSummary ---");
    console.log("  Filtre de statut sélectionné (commonLeaveStatusFilter):", commonLeaveStatusFilter);
    console.log("  Nombre total d'activités (allActivities.length):", allActivities.length);
    console.log("  IDs des types de congé/absence (leaveActivityTypeIds):", Array.from(leaveActivityTypeIds));
    console.log("  Utilisateurs chargés (allUsers.length):", allUsers.length);
    console.log("  selectedUserIdsFilter (pour congés individuels):", selectedUserIdsFilter);


    const leaveDaysByDate = new Map(); // Map<dateKey (YYYY-MM-DD), Set<userId>>

    if (leaveActivityTypeIds.size === 0) {
      console.warn("multiPersonLeaveDaysSummary: Aucun type d'activité de congé/absence identifié. Le résumé des congés sera vide.");
      return [];
    }

    // Déterminer les statuts à inclure dans le filtre
    const statusesToInclude = [];
    if (commonLeaveStatusFilter === 'all') {
      statusesToInclude.push("pending_review", "validated", "draft", "rejected");
    } else {
      statusesToInclude.push(commonLeaveStatusFilter);
    }
    console.log(`  Statuts inclus pour le filtre: [${statusesToInclude.join(', ')}]`);

    allActivities.forEach(activity => {
      const isLeaveActivity = leaveActivityTypeIds.has(String(activity.type_activite));
      const isValidDate = isValid(activity.date_activite);
      const userId = activity.userAzureAdId || activity.user_id;
      const hasUserId = !!userId;
      const statusMatches = statusesToInclude.includes(activity.status);
      const dateKey = activity.date_activite ? format(activity.date_activite, "yyyy-MM-dd") : 'Invalid Date';

      if (isLeaveActivity && isValidDate && hasUserId && statusMatches) {
        const userExistsInAllUsers = allUsers.some(u => String(u.id) === String(userId));
        if (userExistsInAllUsers) {
          if (!leaveDaysByDate.has(dateKey)) {
            leaveDaysByDate.set(dateKey, new Set());
          }
          leaveDaysByDate.get(dateKey).add(userId);
        } else {
          console.warn(`    WARNING: Activité de congé (${activity.id}) pour utilisateur INCONNU (${userId}) à la date ${dateKey}. Cette activité sera ignorée pour le résumé des congés.`);
        }
      }
    });

    const summary = [];
    // Logique pour les congés communs ou individuels en fonction du filtre utilisateur
    daysInView.forEach(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      const userIdsSet = leaveDaysByDate.get(dateKey);

      if (userIdsSet) {
        const allUsersIds = allUsers.map(u => u.id);
        const usersInFilter = selectedUserIdsFilter.length > 0 ? selectedUserIdsFilter : allUsersIds;
        const leaveUsersInFilter = Array.from(userIdsSet).filter(id => usersInFilter.includes(id));
        
        if (viewMode === 'commonLeaves' && leaveUsersInFilter.length > 1) { // Congés communs
          summary.push({
            date: day,
            userIds: leaveUsersInFilter,
          });
        } else if (viewMode === 'commonLeaves' && leaveUsersInFilter.length === 1) { // Congés individuels
          summary.push({
            date: day,
            userIds: leaveUsersInFilter,
          });
        }
      }
    });

    summary.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log("--- Fin du calcul multiPersonLeaveDaysSummary ---");
    console.log("multiPersonLeaveDaysSummary (résultat final):", summary);
    return summary;
  }, [allActivities, daysInView, leaveActivityTypeIds, allUsers, commonLeaveStatusFilter, selectedUserIdsFilter, viewMode]);


  // NOUVEAU USEMEMO: Calcul des résumés d'activités par utilisateur pour la période affichée
  const userActivitySummaries = useMemo(() => {
    console.log("userActivitySummaries useMemo: Début du calcul.");
    const summaries = new Map();

    // Calculer le nombre total de jours ouvrés dans la période de vue actuelle
    const workingDaysCount = daysInView.filter(day =>
      !isWeekend(day, { weekStartsOn: 1 }) && !isPublicHoliday(day)
    ).length;
    console.log(`  Calculated total working days in view: ${workingDaysCount}`);

    allUsers.forEach(user => {
        summaries.set(user.id, {
            userId: user.id,
            userName: user.name,
            totalLeaveDaysValidated: 0,
            totalLeaveDaysPending: 0,
            totalLeaveDaysDraft: 0,
            totalLeaveDaysRejected: 0,
            totalNonLeaveActivitiesTime: 0, // Somme du temps pour toutes les activités NON-CONGÉS
            totalNonLeavePendingReviewActivities: 0, // Somme du temps pour les activités NON-CONGÉS en attente
            totalNonLeaveDraftActivities: 0, // Somme du temps pour les activités NON-CONGÉS brouillons
            totalNonLeaveValidatedActivities: 0, // Somme du temps pour les activités NON-CONGÉS validées
            totalBillableDays: 0,
            totalOvertimeDays: 0,
            totalWorkingDaysInView: workingDaysCount, // Jours ouvrés théoriques dans la période
        });
    });

    daysInView.forEach(day => {
        const dateKey = format(day, "yyyy-MM-dd");
        allUsers.forEach(user => {
            const activitiesForUserDay = activitiesByDayAndUser.get(user.id)?.get(dateKey) || [];
            const userSummary = summaries.get(user.id);

            if (userSummary) {
                activitiesForUserDay.forEach(activity => {
                    const activityTypeObj = activityTypeDefinitions.find(
                      (type) => String(type.id) === String(activity.type_activite)
                    );
                    const tempsPasse = parseFloat(activity.temps_passe) || 0;
                    const isLeaveActivity = leaveActivityTypeIds.has(String(activity.type_activite));

                    if (isLeaveActivity) {
                        // Accumuler les congés par statut
                        if (activity.status === "validated") {
                            userSummary.totalLeaveDaysValidated += tempsPasse;
                        } else if (activity.status === "pending_review") {
                            userSummary.totalLeaveDaysPending += tempsPasse;
                        } else if (activity.status === "draft") {
                            userSummary.totalLeaveDaysDraft += tempsPasse;
                        } else if (activity.status === "rejected") {
                            userSummary.totalLeaveDaysRejected += tempsPasse;
                        }
                    } else {
                        // Accumuler le temps pour les activités NON-CONGÉS
                        userSummary.totalNonLeaveActivitiesTime += tempsPasse;

                        // Accumuler les activités NON-CONGÉS par statut
                        if (activity.status === "pending_review") {
                            userSummary.totalNonLeavePendingReviewActivities += tempsPasse;
                        } else if (activity.status === "validated") {
                            userSummary.totalNonLeaveValidatedActivities += tempsPasse;
                        } else if (activity.status === "draft") {
                            userSummary.totalNonLeaveDraftActivities += tempsPasse;
                        }

                        // Accumuler les heures supp et jours facturables (qui sont des non-congés)
                        if (activityTypeObj?.is_overtime) {
                            userSummary.totalOvertimeDays += tempsPasse;
                        }
                        if (activityTypeObj?.is_billable) {
                            userSummary.totalBillableDays += tempsPasse;
                        }
                    }
                });
            }
        });
    });

    const result = Array.from(summaries.values());
    console.log("userActivitySummaries (résultat final):", result);
    return result;
  }, [allUsers, activitiesByDayAndUser, daysInView, leaveActivityTypeIds, activityTypeDefinitions, isPublicHoliday]);


  const navigateView = useCallback(
    (direction) => {
      setCurrentViewStart((prev) => {
        if (!isValid(prev)) return new Date();
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
    setCurrentViewStart(new Date());
  }, []);

  const handleLeaveViewModeChange = useCallback(() => {
    setViewMode('commonLeaves');
  }, []);

  // Handler pour la sélection des utilisateurs pour le filtre global (multi-sélection)
  const toggleUserSelection = useCallback((userId) => {
    setSelectedUserIdsFilter(prevSelected => {
      if (prevSelected.includes(userId)) {
        // Si déjà sélectionné, le désélectionner
        return prevSelected.filter(id => id !== userId);
      } else {
        // Sinon, le sélectionner
        return [...prevSelected, userId];
      }
    });
  }, []);

  // Handler pour réinitialiser le filtre utilisateur
  const handleResetUserFilter = useCallback(() => {
    setSelectedUserIdsFilter([]);
  }, []);


  const months = useMemo(() => {
    const monthNames = Array.from({ length: 12 }, (_, i) =>
      format(new Date(2000, i, 1), "MMMM", { locale: fr })
    );
    return monthNames.map((name, index) => ({ value: index.toString(), label: name }));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-600">
        Chargement du planning...
      </div>
    );
  }

  // Ajustement des titres et messages en fonction du mode de congés
  const commonLeavesTitle = "Jours avec Congés Communs (période actuelle)";
  const noLeavesMessage = "Aucun jour avec des congés communs pour la période sélectionnée et le statut choisi.";


  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8 font-inter">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Planning Global des Activités et Congés
      </h2>

      <div className="flex justify-center items-center mb-6 space-x-4 flex-wrap gap-2">
        <div className="flex rounded-lg shadow-sm">
          <button
            onClick={() => handleViewModeChange("day")}
            className={`px-4 py-2 rounded-l-lg font-semibold transition-colors duration-200 ${
              viewMode === "day"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Vue Jour
          </button>
          <button
            onClick={() => handleViewModeChange("week")}
            className={`px-4 py-2 font-semibold transition-colors duration-200 ${
              viewMode === "week"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Vue Semaine
          </button>
          <button
            onClick={() => handleViewModeChange("month")}
            className={`px-4 py-2 font-semibold transition-colors duration-200 ${
              viewMode === "month"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Vue Mois
          </button>
          <button
            onClick={() => handleViewModeChange("commonLeaves")}
            className={`px-4 py-2 rounded-r-lg font-semibold transition-colors duration-200 ${
              viewMode === "commonLeaves"
                ? "bg-orange-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Vue Congés
          </button>
        </div>
      </div>

      {/* Section de filtre utilisateur (remplace le select multiple) */}
      <div className="p-4 bg-gray-50 rounded-lg shadow-inner border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Filtrer par utilisateur(s) :</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {allUsers.map(user => (
            <button
              key={user.id}
              onClick={() => toggleUserSelection(user.id)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors duration-200 ease-in-out
                ${selectedUserIdsFilter.includes(user.id)
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
            >
              {user.name}
            </button>
          ))}
        </div>
        {selectedUserIdsFilter.length > 0 && (
          <button
            onClick={handleResetUserFilter}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-200 text-sm"
          >
            Réinitialiser le filtre utilisateur
          </button>
        )}
      </div>

      {/* Rendu conditionnel des vues */}
      {viewMode === 'commonLeaves' ? (
        // NOUVELLE VUE: Jours avec Congés Communs
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 shadow-inner">
          <h3 className="text-xl font-semibold text-orange-800 mb-3 text-center">
            Jours avec Congés (période actuelle)
          </h3>
          {/* Filtre de statut pour les congés */}
          <div className="flex justify-center items-center gap-4 mb-4">
            <span className="text-gray-700 font-semibold">Afficher les congés :</span>
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setCommonLeaveStatusFilter('all')}
                className={`px-3 py-1 text-sm font-semibold rounded-l-md transition-colors duration-200
                  ${commonLeaveStatusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Tous
              </button>
              <button
                onClick={() => setCommonLeaveStatusFilter('pending_review')}
                className={`px-3 py-1 text-sm font-semibold transition-colors duration-200
                  ${commonLeaveStatusFilter === 'pending_review' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                En attente
              </button>
              <button
                onClick={() => setCommonLeaveStatusFilter('validated')}
                className={`px-3 py-1 text-sm font-semibold transition-colors duration-200
                  ${commonLeaveStatusFilter === 'validated' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Validés
              </button>
              <button
                onClick={() => setCommonLeaveStatusFilter('rejected')}
                className={`px-3 py-1 text-sm font-semibold transition-colors duration-200
                  ${commonLeaveStatusFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Refusés
              </button>
              <button
                onClick={() => setCommonLeaveStatusFilter('draft')}
                className={`px-3 py-1 text-sm font-semibold rounded-r-md transition-colors duration-200
                  ${commonLeaveStatusFilter === 'draft' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Brouillons
              </button>
            </div>
          </div>
          {multiPersonLeaveDaysSummary.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                {/* Header row for days in common leave calendar */}
                <div className="grid grid-flow-col auto-cols-[150px] gap-1 mb-2">
                  <div className=" flex-shrink-0 font-semibold text-gray-700 text-left pl-2">
                    Jour
                  </div>
                  {multiPersonLeaveDaysSummary.map((item) => {
                    const day = item.date;
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
                        <div className="font-semibold">{format(day, "d")}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Users row for common leave calendar */}
                <div className="grid grid-flow-col auto-cols-[150px] gap-1 mb-1">
                  <div className="flex-shrink-0 bg-blue-50 text-blue-800 font-semibold py-2 px-2 rounded-md flex items-center justify-start overflow-hidden text-ellipsis whitespace-nowrap">
                    Utilisateurs
                  </div>
                  {multiPersonLeaveDaysSummary.map((item) => (
                    <div
                      key={format(item.date, "yyyy-MM-dd") + "-users"}
                      className="h-auto p-1 flex flex-col items-center justify-center rounded-md border border-gray-200 bg-white"
                    >
                      {item.userIds.map(userId => {
                        const user = allUsers.find(u => u.id === userId);
                        return user ? (
                          <span key={userId} className="text-xs text-gray-700 bg-gray-100 px-1 py-0.5 rounded-sm mb-0.5 last:mb-0">
                            {user.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-center text-sm">Aucun jour avec des congés pour la période sélectionnée et le statut choisi.</p>
          )}
        </div>
      ) : (
        // SECTION: VUE CALENDRIER PRINCIPAL (JOUR/SEMAINE/MOIS)
        <>
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
              <div className="grid grid-flow-col auto-cols-[150px] gap-1 mb-2">
                {" "}
                {/* Fixed width for day columns */}
                <div className="flex-shrink-0 font-semibold text-gray-700 text-left pl-2">
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
                      <div className="font-semibold">{format(day, "d")}</div>
                    </div>
                  );
                })}
              </div>

              {/* Rows for each user */}
              {filteredUsersForCalendar.map((user) => {
                const userSummary = userActivitySummaries.find(s => s.userId === user.id);
                return (
                  <div key={user.id} className="mb-4">
                    <div
                      className="grid grid-flow-col auto-cols-[150px] gap-1 mb-1"
                    >
                      <div className= "flex-shrink-0 bg-blue-50 text-blue-800 font-semibold py-2 px-2 rounded-md flex items-center justify-start overflow-hidden text-ellipsis whitespace-nowrap">
                        {user.name}
                      </div>
                      {daysInView.map((day) => {
                        const dateKey = format(day, "yyyy-MM-dd");
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

                                  let activityColorClass = "bg-blue-200 text-blue-800"; // Default color for non-leave activities
                                  let activityStatusIcon = "";
                                  let activityTitle = "";

                                  // MODIFICATION ICI: Utiliser leaveActivityTypeIds pour la coloration et les icônes
                                  if (leaveActivityTypeIds.has(String(activity.type_activite))) {
                                    if (activity.status === "pending_review") {
                                      activityColorClass = "bg-yellow-200 text-yellow-800";
                                      activityStatusIcon = "⏳";
                                      activityTitle = "Congé en attente de révision";
                                    } else if (activity.status === "validated") {
                                      activityColorClass = "bg-green-200 text-green-800";
                                      activityStatusIcon = "✅";
                                      activityTitle = "Congé validé";
                                    } else if (activity.status === "rejected") {
                                      activityColorClass = "bg-red-200 text-red-800";
                                      activityStatusIcon = "❌";
                                      activityTitle = "Congé refusé";
                                    } else if (activity.status === "draft") {
                                      activityColorClass = "bg-gray-200 text-gray-800"; // Brouillon
                                      activityStatusIcon = "";
                                      activityTitle = "Congé brouillon";
                                    } else {
                                      activityColorClass = "bg-lime-200 text-lime-800";
                                      activityTitle = "Congé"; // Généralisé
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
                                      }j) - Client: ${clientLabel} - Status: ${
                                        activity.status
                                      } ${activityTitle ? `(${activityTitle})` : ""}`}
                                    >
                                      {activityStatusIcon} {activityTypeLabel} (
                                      {activity.temps_passe}j) - {clientLabel}
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
                    {/* Résumés sous la ligne de l'utilisateur - Styles améliorés */}
                    {userSummary && (
                      <div className="flex flex-col gap-2 mt-2 pl-2"> {/* Utiliser flex-col pour empiler les résumés */}
                        <div className="flex flex-wrap justify-start gap-2 text-base font-semibold">
                          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg shadow-md w-auto text-center min-w-[100px]">
                            Jours Travaillés: {userSummary.totalNonLeaveActivitiesTime.toFixed(1)}j
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-start gap-2 text-base font-semibold">
                          {/* Congés Validés */}
                          <div className="bg-green-200 text-green-800 px-2 py-1 rounded-lg shadow-md w-auto text-center min-w-[100px]">
                            Congés Validés: {userSummary.totalLeaveDaysValidated.toFixed(1)}j
                          </div>
                          {/* Congés en Attente */}
                          {/* Congés Brouillons */}
                          <div className="bg-gray-200 text-gray-800 px-2 py-1 rounded-lg shadow-md w-auto text-center min-w-[100px]">
                            Congés Brouillons: {userSummary.totalLeaveDaysDraft.toFixed(1)}j
                          </div>
                          {/* Heures Supp */}
                          <div className="bg-purple-200 text-purple-800 px-2 py-1 rounded-lg shadow-md w-auto text-center min-w-[100px]">
                            Heures Supp: {userSummary.totalOvertimeDays.toFixed(1)}j
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
