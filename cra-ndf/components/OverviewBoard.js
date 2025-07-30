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
  startOfYear,
  endOfYear,
} from "date-fns";
import { fr } from "date-fns/locale";

export default function OverviewBoard({
  activityTypeDefinitions,
  clientDefinitions,
  showMessage,
  userRole,
}) {
  // Tous les appels useState au tout début
  const [loading, setLoading] = useState(true);
  const [allActivities, setAllActivities] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentViewStart, setCurrentViewStart] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month', 'week', 'day'
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [allMonthlyReports, setAllMonthlyReports] = useState([]);

  const [detailedLeaveSortOrder, setDetailedLeaveSortOrder] = useState("asc");
  const [showLeaveRequestsList, setShowLeaveRequestsList] = useState(false);
  
  // NOUVEAUX ÉTATS POUR LA VUE PERSONNALISÉE
  const [showCustomBoard, setShowCustomBoard] = useState(false);
  const [selectedUserIdsForCustomBoard, setSelectedUserIdsForCustomBoard] = useState([]);


  const [leaveFilterMonth, setLeaveFilterMonth] = useState("");

  // DÉPLACÉ ICI: Filtrer les utilisateurs à afficher dans la vue personnalisée
  // Ce useMemo est maintenant déclaré juste après ses dépendances directes (states)
  const displayedUsersForCustomBoard = useMemo(() => {
    if (selectedUserIdsForCustomBoard.length === 0) {
      return [];
    }
    return allUsers.filter(user => selectedUserIdsForCustomBoard.includes(user.id));
  }, [allUsers, selectedUserIdsForCustomBoard]);


  const paidLeaveTypeId = useMemo(() => {
    const type = activityTypeDefinitions.find(
      (t) => t.name && t.name.toLowerCase().includes("congé payé")
    );
    return type ? type.id : null;
  }, [activityTypeDefinitions]);

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
            100
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

  const fetchAllUsers = useCallback(async () => {
    try {
      const usersData = await fetchAndParse("/api/cras_users", "utilisateurs");
      const formattedUsers = usersData.map((user) => ({
        id: user.azureAdUserId,
        name: user.fullName,
      }));
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
            };
          })
          .filter((activity) => activity.date_activite !== null);
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log("useEffect: Début du chargement des données...");
        const usersData = await fetchAllUsers();
        setAllUsers(usersData);
        console.log("useEffect: Utilisateurs chargés:", usersData.length);

        let activitiesStartDate, activitiesEndDate;
        // Charger les activités pour toute l'année si la liste des congés ou le custom board est affiché
        // Sinon, charger pour la vue actuelle (mois, semaine, jour)
        if (showLeaveRequestsList || showCustomBoard) {
          activitiesStartDate = startOfYear(currentViewStart);
          activitiesEndDate = endOfYear(currentViewStart);
          console.log(`useEffect: Chargement des activités pour toute l'année (${format(activitiesStartDate, 'yyyy-MM-dd')} à ${format(activitiesEndDate, 'yyyy-MM-dd')})`);
        } else {
          activitiesStartDate = daysInView[0];
          activitiesEndDate = daysInView[daysInView.length - 1];
          console.log(`useEffect: Chargement des activités pour la vue actuelle (${format(activitiesStartDate, 'yyyy-MM-dd')} à ${format(activitiesEndDate, 'yyyy-MM-dd')})`);
        }
        
        if (isValid(activitiesStartDate) && isValid(activitiesEndDate)) {
          const activitiesData = await fetchActivitiesForRange(
            activitiesStartDate,
            activitiesEndDate
          );
          setAllActivities(activitiesData);
          console.log("useEffect: Activités chargées:", activitiesData.length);
        } else {
          setAllActivities([]);
          console.log("useEffect: Plage de dates d'activités invalide, 0 activités chargées.");
        }

        await fetchPublicHolidays(currentViewStart.getFullYear());
        console.log("useEffect: Jours fériés chargés.");

        await fetchAllMonthlyReports(currentViewStart.getFullYear());
        console.log("useEffect: Rapports mensuels chargés.");

      } catch (error) {
        console.error("OverviewBoard: Erreur de chargement des données dans useEffect:", error);
        showMessage(`Erreur de chargement des données: ${error.message}`, "error");
      } finally {
        setLoading(false);
        console.log("useEffect: Chargement des données terminé, setLoading(false).");
      }
    };
    loadData();
  }, [
    currentViewStart,
    viewMode,
    fetchAllUsers,
    fetchActivitiesForRange,
    fetchPublicHolidays,
    fetchAllMonthlyReports,
    showMessage,
    daysInView,
    showLeaveRequestsList,
    showCustomBoard, // AJOUTÉ: Dépendance pour recharger les activités si le mode de vue change
  ]);

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


  // USEMEMO POUR LA LISTE DÉTAILLÉE DES DEMANDES DE CONGÉS
  const detailedLeaveRequestsList = useMemo(() => {
    console.log("detailedLeaveRequestsList useMemo: Début du calcul.");
    console.log("  allActivities.length:", allActivities.length);
    console.log("  allMonthlyReports.length:", allMonthlyReports.length);
    console.log("  allUsers.length:", allUsers.length);
    console.log("  paidLeaveTypeId:", paidLeaveTypeId);
    console.log("  detailedLeaveSortOrder:", detailedLeaveSortOrder);
    console.log("  leaveFilterMonth:", leaveFilterMonth);


    const allLeaveRequests = []; 

    const reportsMap = new Map(); 
    allMonthlyReports.forEach(report => {
      const key = `${report.user_id}-${report.month}-${report.year}-${report.report_type}`;
      reportsMap.set(key, report);
    });
    console.log("  reportsMap size:", reportsMap.size);

    // Étape 1: Collecter toutes les demandes de congés avec leur date d'envoi
    allActivities.forEach(activity => {
      if (String(activity.type_activite) === String(paidLeaveTypeId) && isValid(activity.date_activite)) {
        const userIdToMap = activity.userAzureAdId || activity.user_id;
        const user = allUsers.find(u => String(u.id) === String(userIdToMap));
        const userName = user ? user.name : `Utilisateur Inconnu (${userIdToMap})`;

        const monthOfActivity = activity.date_activite.getMonth(); // 0-11
        const yearOfActivity = activity.date_activite.getFullYear();
        const reportType = 'paid_leave';

        const reportKey = `${userIdToMap}-${monthOfActivity + 1}-${yearOfActivity}-${reportType}`;
        const correspondingReport = reportsMap.get(reportKey);

        const submittedAtDate = correspondingReport?.submittedAt ? parseISO(correspondingReport.submittedAt) : null;
        
        allLeaveRequests.push({
          id: activity.id,
          userId: userIdToMap,
          userName: userName,
          date_activite: activity.date_activite, // Date du congé
          temps_passe: parseFloat(activity.temps_passe) || 0,
          status: activity.status,
          submittedAt: submittedAtDate, // Date d'envoi du rapport (peut être null)
        });
      }
    });
    console.log("  allLeaveRequests (initial collection) length:", allLeaveRequests.length);


    // Étape 2: Regrouper les demandes par utilisateur et déterminer la première/dernière date d'envoi pour chaque utilisateur
    const userGroupsMap = new Map(); 

    allLeaveRequests.forEach(req => {
      if (!userGroupsMap.has(req.userId)) {
        userGroupsMap.set(req.userId, {
          userName: req.userName,
          requests: [],
          allSubmittedDates: [], 
        });
      }
      const userGroup = userGroupsMap.get(req.userId);
      userGroup.requests.push(req);
      if (req.submittedAt) {
        userGroup.allSubmittedDates.push(req.submittedAt.getTime());
      }
    });
    console.log("  userGroupsMap size (before overall date calculation):", userGroupsMap.size);


    // Calculer firstSubmittedAt et lastSubmittedAt après que toutes les requêtes soient regroupées
    const userGroupsWithOverallDates = Array.from(userGroupsMap.values()).map(group => {
        const sortedSubmittedDates = group.allSubmittedDates.sort((a, b) => a - b);
        const firstSubmitted = sortedSubmittedDates.length > 0 ? new Date(sortedSubmittedDates[0]) : null;
        const lastSubmitted = sortedSubmittedDates.length > 0 ? new Date(sortedSubmittedDates[sortedSubmittedDates.length - 1]) : null;
        
        console.log(`    User: ${group.userName}, First Overall Submitted: ${firstSubmitted?.toISOString() || 'N/A'}, Last Overall Submitted: ${lastSubmitted?.toISOString() || 'N/A'}`);

        return {
            ...group,
            firstSubmittedAt: firstSubmitted,
            lastSubmittedAt: lastSubmitted,
            allSubmittedDates: undefined 
        };
    });
    console.log("  userGroupsWithOverallDates length:", userGroupsWithOverallDates.length);


    // Étape 3: Filtrer les demandes de chaque utilisateur par le mois du congé
    // Et trier les demandes individuelles de chaque utilisateur par date d'envoi
    const filteredAndSortedUserGroups = userGroupsWithOverallDates.map(userGroup => {
      const filteredRequests = userGroup.requests.filter(req => {
        const monthOfActivity = req.date_activite.getMonth();
        return leaveFilterMonth === "" || (monthOfActivity === parseInt(leaveFilterMonth, 10));
      });

      // Tri des requêtes individuelles au sein du groupe par date d'envoi
      filteredRequests.sort((a, b) => {
        const dateA = a.submittedAt ? a.submittedAt.getTime() : 0;
        const dateB = b.submittedAt ? b.submittedAt.getTime() : 0;
        return detailedLeaveSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });

      return {
        ...userGroup,
        requests: filteredRequests,
      };
    });
    console.log("  filteredAndSortedUserGroups length (after filtering individual requests):", filteredAndSortedUserGroups.length);


    // Étape 4: Trier les groupes d'utilisateurs eux-mêmes
    const finalSortedUsers = filteredAndSortedUserGroups.sort((a, b) => {
      const dateA_val = detailedLeaveSortOrder === 'asc' 
        ? (a.firstSubmittedAt ? a.firstSubmittedAt.getTime() : Infinity) 
        : (a.lastSubmittedAt ? a.lastSubmittedAt.getTime() : -Infinity);
      
      const dateB_val = detailedLeaveSortOrder === 'asc' 
        ? (b.firstSubmittedAt ? b.firstSubmittedAt.getTime() : Infinity) 
        : (b.lastSubmittedAt ? b.lastSubmittedAt.getTime() : -Infinity);
      
      console.log(`--- Débogage Tri Utilisateurs ---`);
      console.log(`Ordre de tri demandé: ${detailedLeaveSortOrder}`);
      console.log(`Utilisateur A: ${a.userName}, FirstSubmittedAt: ${a.firstSubmittedAt?.toISOString() || 'N/A'}, LastSubmittedAt: ${a.lastSubmittedAt?.toISOString() || 'N/A'}`);
      console.log(`Utilisateur B: ${b.userName}, FirstSubmittedAt: ${b.firstSubmittedAt?.toISOString() || 'N/A'}, LastSubmittedAt: ${b.lastSubmittedAt?.toISOString() || 'N/A'}`);
      console.log(`Valeur de comparaison A: ${dateA_val}, Valeur de comparaison B: ${dateB_val}`);
      
      let comparisonResult;
      if (detailedLeaveSortOrder === 'asc') {
        comparisonResult = dateA_val - dateB_val;
      } else { // 'desc'
        comparisonResult = dateB_val - dateA_val; 
      }
      console.log(`Résultat de la comparaison (A - B): ${comparisonResult}`);
      return comparisonResult;
    });
    console.log("  finalSortedUsers length (after user group sort):", finalSortedUsers.length);

    // Retourner uniquement les groupes qui ont des requêtes après filtrage
    const finalResult = finalSortedUsers.filter(userGroup => userGroup.requests.length > 0);
    console.log("detailedLeaveRequestsList useMemo: Fin du calcul. Résultat final length:", finalResult.length);
    return finalResult;

  }, [allActivities, paidLeaveTypeId, allUsers, allMonthlyReports, detailedLeaveSortOrder, leaveFilterMonth]);


  // NOUVEAU USEMEMO: Résumé des jours de congés pris par plusieurs personnes pour la période affichée
  const multiPersonLeaveDaysSummary = useMemo(() => {
    console.log("multiPersonLeaveDaysSummary useMemo: Début du calcul pour la vue actuelle.");
    const leaveDaysByDate = new Map(); // Map<dateKey (YYYY-MM-DD), Set<userId>>

    if (!paidLeaveTypeId) {
      console.warn("multiPersonLeaveDaysSummary: paidLeaveTypeId non défini.");
      return [];
    }

    // Parcourir les jours de la vue actuelle (mois, semaine, jour)
    daysInView.forEach(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      // Récupérer les activités pour ce jour et tous les utilisateurs
      // On utilise activitiesByDayAndUser qui contient déjà les activités par jour et par utilisateur
      allUsers.forEach(user => {
        const activitiesForUserDay = activitiesByDayAndUser.get(user.id)?.get(dateKey) || [];
        
        activitiesForUserDay.forEach(activity => {
          // Vérifier si c'est une activité de congé payé et si la date est valide et le statut est validé
          if (
            String(activity.type_activite) === String(paidLeaveTypeId) &&
            isValid(activity.date_activite) &&
            (activity.userAzureAdId || activity.user_id) &&
            activity.status === "validated" // On ne compte que les congés validés
          ) {
            const userId = activity.userAzureAdId || activity.user_id;

            if (!leaveDaysByDate.has(dateKey)) {
              leaveDaysByDate.set(dateKey, new Set());
            }
            leaveDaysByDate.get(dateKey).add(userId);
          }
        });
      });
    });

    const summary = [];
    leaveDaysByDate.forEach((userIdsSet, dateKey) => {
      if (userIdsSet.size > 1) { // Si plus d'une personne a pris congé ce jour-là
        summary.push({
          date: parseISO(dateKey),
          userCount: userIdsSet.size,
        });
      }
    });

    // Trier le résumé par date (du plus ancien au plus nouveau)
    summary.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log("multiPersonLeaveDaysSummary (résultat final):", summary);
    return summary;
  }, [activitiesByDayAndUser, daysInView, paidLeaveTypeId, allUsers]);


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
    setShowLeaveRequestsList(false); // S'assurer que la liste des congés est masquée
    setShowCustomBoard(false); // S'assurer que le custom board est masqué
  }, []);

  // Handler pour la sélection des utilisateurs pour le Custom Board
  const handleUserSelectionForCustomBoard = useCallback((event) => {
    const { options } = event.target;
    const selectedValues = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    setSelectedUserIdsForCustomBoard(selectedValues);
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
        Chargement du planning d'ensemble...
      </div>
    );
  }

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
              viewMode === "day" && !showLeaveRequestsList && !showCustomBoard
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Vue Jour
          </button>
          <button
            onClick={() => handleViewModeChange("week")}
            className={`px-4 py-2 font-semibold transition-colors duration-200 ${
              viewMode === "week" && !showLeaveRequestsList && !showCustomBoard
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Vue Semaine
          </button>
          <button
            onClick={() => handleViewModeChange("month")}
            className={`px-4 py-2 font-semibold transition-colors duration-200 ${
              viewMode === "month" && !showLeaveRequestsList && !showCustomBoard
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Vue Mois
          </button>
          <button
            onClick={() => { setShowLeaveRequestsList(!showLeaveRequestsList); setShowCustomBoard(false); }}
            className={`px-4 py-2 font-semibold transition-colors duration-200 ${
              showLeaveRequestsList
                ? "bg-lime-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {showLeaveRequestsList ? "Masquer Demandes Congés" : "Voir Demandes Congés"}
          </button>
          <button
            onClick={() => { setShowCustomBoard(!showCustomBoard); setShowLeaveRequestsList(false); }}
            className={`px-4 py-2 rounded-r-lg font-semibold transition-colors duration-200 ${
              showCustomBoard
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {showCustomBoard ? "Masquer Vue Personnalisée" : "Vue Personnalisée"}
          </button>
        </div>
      </div>

      {/* NOUVELLE SECTION: Résumé des jours de congés multi-personnes (pour la période affichée) */}
      {!showLeaveRequestsList && !showCustomBoard && multiPersonLeaveDaysSummary.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 shadow-inner">
          <h3 className="text-xl font-bold text-orange-800 mb-3 text-center">
            Jours de Congés Multi-personnes (période actuelle)
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {multiPersonLeaveDaysSummary.map((item, index) => (
              <div
                key={index}
                className="bg-orange-100 text-orange-900 px-4 py-2 rounded-full text-sm font-semibold shadow-md flex items-center space-x-2"
              >
                <span>{format(item.date, "dd MMMM", { locale: fr })}</span>
                <span className="bg-orange-300 text-orange-900 rounded-full w-6 h-6 flex items-center justify-center font-bold">
                  {item.userCount}
                </span>
                <span className="text-orange-700">personnes</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLeaveRequestsList ? (
        // SECTION: LISTE DÉTAILLÉE DES DEMANDES DE CONGÉS
        <div className="p-4 bg-lime-50 rounded-lg shadow-inner border border-lime-200 mb-6">
          <h3 className="text-xl font-bold text-lime-800 mb-4 text-center">
            Demandes de Congés Détaillées (par mois du congé)
          </h3>
          
          <div className="flex flex-col sm:flex-row justify-end items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center">
              <label htmlFor="leaveFilterMonth" className="font-semibold text-gray-700 mr-2">Filtrer par mois du congé :</label>
              <select
                id="leaveFilterMonth"
                value={leaveFilterMonth}
                onChange={(e) => setLeaveFilterMonth(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:ring-lime-500 focus:border-lime-500"
              >
                <option value="">Tous les mois</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <label htmlFor="detailedLeaveSortOrder" className="font-semibold text-gray-700 mr-2">Trier les utilisateurs par date d'envoi :</label>
              <select
                id="detailedLeaveSortOrder"
                value={detailedLeaveSortOrder}
                onChange={(e) => setDetailedLeaveSortOrder(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:ring-lime-500 focus:border-lime-500"
              >
                <option value="asc">Plus ancien au plus nouveau</option>
                <option value="desc">Plus nouveau au plus ancien</option>
              </select>
            </div>
          </div>

          {detailedLeaveRequestsList.length > 0 ? (
            <div className="overflow-x-auto">
              {detailedLeaveRequestsList.map(userGroup => (
                <div key={userGroup.userName} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
                  <h4 className="text-lg font-semibold text-blue-700 mb-3 border-b pb-2">
                    {userGroup.userName}
                  </h4>
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="py-2 px-3 text-left text-sm font-semibold text-gray-600 uppercase">
                          Date d'envoi
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-semibold text-gray-600 uppercase">
                          Date du Congé
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-semibold text-gray-600 uppercase">
                          Jours
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-semibold text-gray-600 uppercase">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {userGroup.requests.map(request => {
                        let statusColorClass = 'text-gray-700';
                        let statusText = request.status;
                        if (request.status === "pending_review") {
                          statusColorClass = "text-blue-800 bg-blue-100";
                          statusText = "En attente";
                        } else if (request.status === "validated") {
                          statusColorClass = "text-green-800 bg-green-100";
                          statusText = "Validé";
                        } else if (request.status === "rejected") {
                          statusColorClass = "text-red-800 bg-red-100";
                          statusText = "Rejeté";
                        } else if (request.status === "draft") { 
                          statusColorClass = "text-gray-800 bg-gray-100";
                          statusText = "Brouillon";
                        } else { 
                          statusColorClass = "text-gray-800 bg-gray-100";
                          statusText = request.status; 
                        }
                        statusColorClass += " px-2 py-1 rounded-full text-xs font-semibold";

                        return (
                          <tr key={request.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                            <td className="py-2 px-3 text-sm text-gray-800">
                              {request.submittedAt
                                ? format(request.submittedAt, "dd/MM/yyyy HH:mm:ss", { locale: fr })
                                : "N/A (non soumis)"}
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-800">
                              {format(request.date_activite, "dd/MM/yyyy", { locale: fr })}
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-800">{request.temps_passe}</td>
                            <td className={`py-2 px-3 text-sm ${statusColorClass}`}>
                              {statusText}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">Aucune demande de congé trouvée pour le mois de congé sélectionné.</p>
          )}
        </div>
      ) : showCustomBoard ? (
        // NOUVELLE SECTION: VUE PERSONNALISÉE
        <div className="p-4 bg-purple-50 rounded-lg shadow-inner border border-purple-200 mb-6">
          <h3 className="text-xl font-bold text-purple-800 mb-4 text-center">
            Vue Personnalisée des Activités
          </h3>
          
          <div className="mb-6">
            <label htmlFor="user-select-custom-board" className="block text-gray-700 text-sm font-bold mb-2">
              Sélectionnez les utilisateurs :
            </label>
            <select
              id="user-select-custom-board"
              multiple
              value={selectedUserIdsForCustomBoard}
              onChange={handleUserSelectionForCustomBoard}
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm h-48 overflow-y-auto"
            >
              {allUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <p className="text-gray-500 text-xs mt-1">Maintenez Ctrl (ou Cmd sur Mac) pour sélectionner plusieurs utilisateurs.</p>
          </div>

          {displayedUsersForCustomBoard.length === 0 ? (
            <p className="text-gray-600 text-center py-8 text-lg">
              Sélectionnez un ou plusieurs utilisateurs ci-dessus pour afficher leurs activités.
            </p>
          ) : (
            // Réutilisation de la structure du calendrier existante pour les utilisateurs sélectionnés
            <div className="overflow-x-auto pb-4">
              <div className="inline-block min-w-full align-middle">
                {/* Header row for days */}
                <div className="grid grid-flow-col auto-cols-[100px] gap-1 mb-2">
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
                      ? "border-2 border-purple-400" // Couleur de bordure différente pour la vue personnalisée
                      : "border border-gray-200";

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

                {/* Rows for each selected user */}
                {displayedUsersForCustomBoard.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-flow-col auto-cols-[100px] gap-1 mb-1"
                  >
                    <div className="w-32 flex-shrink-0 bg-purple-100 text-purple-800 font-semibold py-2 px-2 rounded-md flex items-center justify-start overflow-hidden text-ellipsis whitespace-nowrap">
                      {user.name} {/* Affiche le nom de l'utilisateur (fullName) */}
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
                        ? "border-2 border-purple-400" 
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

                                if (
                                  String(activity.type_activite) ===
                                  String(paidLeaveTypeId)
                                ) {
                                  if (activity.status === "pending_review") {
                                    activityColorClass = "bg-yellow-200 text-yellow-800";
                                    activityStatusIcon = "⏳";
                                    activityTitle = "Pending Leave";
                                  } else if (activity.status === "validated") {
                                    activityColorClass = "bg-green-200 text-green-800";
                                    activityStatusIcon = "✅";
                                    activityTitle = "Validated Leave";
                                  } else if (activity.status === "rejected") {
                                    activityColorClass = "bg-red-200 text-red-800";
                                    activityStatusIcon = "❌";
                                    activityTitle = "Rejected Leave";
                                  } else {
                                    activityColorClass = "bg-lime-200 text-lime-800";
                                    activityTitle = "Paid Leave";
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
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // SECTION: VUE CALENDRIER (EXISTANTE)
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

                              let activityColorClass = "bg-blue-200 text-blue-800"; // Default color for non-leave activities
                              let activityStatusIcon = "";
                              let activityTitle = "";

                              if (
                                String(activity.type_activite) ===
                                String(paidLeaveTypeId)
                              ) {
                                if (activity.status === "pending_review") {
                                  activityColorClass = "bg-yellow-200 text-yellow-800";
                                  activityStatusIcon = "⏳";
                                  activityTitle = "Pending Leave";
                                } else if (activity.status === "validated") {
                                  activityColorClass = "bg-green-200 text-green-800";
                                  activityStatusIcon = "✅";
                                  activityTitle = "Validated Leave";
                                } else if (activity.status === "rejected") {
                                  activityColorClass = "bg-red-200 text-red-800";
                                  activityStatusIcon = "❌";
                                  activityTitle = "Rejected Leave";
                                } else {
                                  activityColorClass = "bg-lime-200 text-lime-800";
                                  activityTitle = "Paid Leave";
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
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
