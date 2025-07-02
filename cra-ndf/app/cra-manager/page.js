// app/cra-manager/page.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  format,
  parseISO,
  isValid,
  addDays,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { fr } from "date-fns/locale";

// Assurez-vous que ces chemins sont corrects pour votre projet
import CraBoard from "../../components/CraBoard";
import UnifiedManager from "../../components/UnifiedManager";
import ToastMessage from "../../components/ToastMessage";
import SentCraHistory from "../../components/SentCraHistory";
import SummaryReport from "../../components/SummaryReport";

export default function CRAPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("Chargement...");
  const [activeTab, setActiveTab] = useState("craManager");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      setCurrentUserId(session.user.id);
      setCurrentUserName(
        session.user.name || session.user.email || "Utilisateur"
      );
    } else if (status === "unauthenticated" || status === "loading") {
      // Générer un ID persistant pour les utilisateurs non authentifiés en mode démo
      let storedId = sessionStorage.getItem("unauthenticatedUserId");
      if (!storedId) {
        storedId = crypto.randomUUID();
        sessionStorage.setItem("unauthenticatedUserId", storedId);
      }
      setCurrentUserId(storedId);
      setCurrentUserName("Utilisateur par défaut (Démo)");
    }
    // Log l'ID utilisateur actuel pour le débogage
    console.log("Current User ID:", currentUserId);
  }, [session, status, currentUserId]); // Ajout de currentUserId aux dépendances pour log les changements

  const [craActivities, setCraActivities] = useState([]);
  const [clientDefinitions, setClientDefinitions] = useState([]);
  const [activityTypeDefinitions, setActivityTypeDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "info",
    isVisible: false,
  });

  const showMessage = useCallback((message, type = "success") => {
    setToastMessage({ message, type, isVisible: true });
  }, []);

  const hideMessage = useCallback(() => {
    setToastMessage((prev) => ({ ...prev, isVisible: false }));
  }, []);

<<<<<<< HEAD
  // Fonction principale de récupération des données (maintenant en mémoire)
  const fetchData = useCallback(async () => {
=======
  const fetchAndParse = useCallback(async (url, resourceName) => {
    const res = await fetch(url);
    if (!res.ok) {
      let errorInfo = `Erreur HTTP ${res.status}: ${res.statusText}`;
      let rawText = "Non disponible (erreur réseau ou réponse vide)";
      try {
        rawText = await res.text();
        try {
          const errorData = JSON.parse(rawText);
          errorInfo += ` - Message API: ${errorData.message || JSON.stringify(errorData)
            }`;
        } catch (jsonParseError) {
          errorInfo += ` - Réponse non-JSON ou invalide (début): "${rawText.substring(
            0,
            200
          )}..."`;
        }
      } catch (textError) { }
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

  const fetchData = useCallback(async () => {
    if (!currentUserId || currentUserId === "unauthenticated") {
      setLoading(false);
      return;
    }
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
    setLoading(true);
    setError(null);

    try {
      // Données de démonstration en mémoire
      const mockClients = [
        { id: 1, nom_client: "Dalbee" },
        { id: 2, nom_client: "Google" },
        { id: 3, nom_client: "OVH" },
        { id: 4, nom_client: "Microsoft" },
      ];
      setClientDefinitions(mockClients);

      const mockActivityTypes = [
        { id: 1, name: "Développement", name_full: "Développement Logiciel" },
        { id: 2, name: "Réunion", name_full: "Réunion Client" },
        { id: 3, name: "Support", name_full: "Support Technique" },
        { id: 4, name: "Formation", name_full: "Formation Utilisateur" },
        {
          id: 5,
          name: "Heure supplémentaire",
          name_full: "Heure supplémentaire",
        },
        { id: 6, name: "Absence (RTT)", name_full: "Absence (RTT)" },
        { id: 7, name: "Administratif", name_full: "Tâche Administrative" },
        { id: 8, name: "Autre", name_full: "Autre Activité" },
        { id: 9, name: "Prestation", name_full: "Prestation Client" },
      ];
      setActivityTypeDefinitions(mockActivityTypes);

      // Données CRA de démonstration pour l'utilisateur par défaut
      const today = new Date();
      const demoActivities = [
        {
          id: "cra1",
          user_id: "default-user-id", // Doit correspondre à l'ID généré
          date_activite: addDays(today, -3),
          type_activite: "Développement",
          description_activite:
            "Développement du module de gestion des utilisateurs.",
          temps_passe: 0.75,
          client_id: 1, // Dalbee
          is_billable: 1,
          status: "draft",
        },
        {
          id: "cra2",
          user_id: "default-user-id",
          date_activite: addDays(today, -3),
          type_activite: "Réunion",
          description_activite: "Réunion de planification avec Dalbee.",
          temps_passe: 0.25,
          client_id: 1, // Dalbee
          is_billable: 1,
          status: "draft",
        },
        {
          id: "cra3",
          user_id: "default-user-id",
          date_activite: addDays(today, -2),
          type_activite: "Support",
          description_activite:
            "Support technique pour un problème de connexion OVH.",
          temps_passe: 0.5,
          client_id: 3, // OVH
          is_billable: 1,
          status: "finalized",
        },
        {
          id: "cra4",
          user_id: "default-user-id",
          date_activite: addDays(today, -2),
          type_activite: "Heure supplémentaire",
          description_activite: "Heures supplémentaires sur le projet Google.",
          temps_passe: 0.5,
          client_id: 2, // Google
          is_billable: 1,
          status: "finalized",
        },
        {
          id: "cra5",
          user_id: "default-user-id",
          date_activite: addDays(today, -1),
          type_activite: "Formation",
          description_activite:
            "Formation des nouveaux employés sur l'outil CRA.",
          temps_passe: 1.0,
          client_id: null, // Pas de client spécifique
          is_billable: 0,
          status: "validated",
        },
        {
          id: "cra6",
          user_id: "default-user-id",
          date_activite: addDays(today, -1),
          type_activite: "Heure supplémentaire",
          description_activite: "Heure sup pour la formation.",
          temps_passe: 0.25,
          client_id: null, // Pas de client spécifique
          is_billable: 0,
          status: "validated",
        },
        {
          id: "cra7",
          user_id: "default-user-id",
          date_activite: today,
          type_activite: "Administratif",
          description_activite: "Rédaction de rapports mensuels.",
          temps_passe: 0.75,
          client_id: null,
          is_billable: 0,
          status: "draft",
        },
        {
          id: "cra8",
          user_id: "default-user-id",
          date_activite: today,
          type_activite: "Prestation",
          description_activite: "Prestation pour le client Microsoft.",
          temps_passe: 0.25,
          client_id: 4, // Microsoft
          is_billable: 1,
          status: "draft",
        },
        {
          id: "cra9",
          user_id: "default-user-id",
          date_activite: addDays(today, -5),
          type_activite: "Absence (RTT)",
          description_activite: "Jour de RTT.",
          temps_passe: 1.0,
          client_id: null,
          is_billable: 0,
          status: "validated",
        },
      ];

      // Filtrer les activités de démo pour qu'elles correspondent à l'ID utilisateur actuel
      // Si l'utilisateur est authentifié, les activités de démo ne s'afficheront pas
      const filteredDemoActivities = demoActivities.filter(
        (activity) => activity.user_id === currentUserId
      );
      setCraActivities(filteredDemoActivities);
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError(`Erreur de chargement: ${err.message}`);
      showMessage(`Erreur de chargement: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showMessage]); // Dépend de currentUserId pour recharger si l'ID change

<<<<<<< HEAD
  // Effet pour déclencher la récupération des données (initialisation en mémoire)
=======
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
  useEffect(() => {
    // Ne pas appeler fetchData si currentUserId n'est pas encore défini
    // ou si c'est l'état initial vide avant que l'ID de session/démo ne soit résolu.
    if (currentUserId && currentUserId !== "") {
      fetchData();
    }
  }, [fetchData, currentUserId]); // Dépend de currentUserId pour s'assurer qu'il est prêt

<<<<<<< HEAD
  // Fonctions de gestion des clients (maintenant en mémoire)
=======
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
  const handleAddClient = useCallback(
    async (clientData) => {
      try {
        const newId =
          clientDefinitions.length > 0
            ? Math.max(...clientDefinitions.map((c) => c.id)) + 1
            : 1;
        const newClient = { id: newId, ...clientData };
        setClientDefinitions((prevClients) => [...prevClients, newClient]);
        showMessage("Client ajouté avec succès !", "success");
      } catch (error) {
        console.error("Erreur lors de l'ajout du client:", error);
        showMessage(`Erreur d'ajout de client: ${error.message}`, "error");
      }
    },
    [showMessage, clientDefinitions]
  );

  const handleUpdateClient = useCallback(
    async (id, clientData) => {
      try {
        setClientDefinitions((prevClients) =>
          prevClients.map((client) =>
            client.id === id ? { ...client, ...clientData } : client
          )
        );
        showMessage("Client mis à jour avec succès !", "success");
      } catch (error) {
        console.error("Erreur lors de la mise à jour du client:", error);
        showMessage(`Erreur de mise à jour client: ${error.message}`, "error");
      }
    },
    [showMessage]
  );

  const handleDeleteClient = useCallback(
    async (id) => {
      try {
        setClientDefinitions((prevClients) =>
          prevClients.filter((client) => client.id !== id)
        );
        showMessage("Client supprimé avec succès !", "success");
      } catch (error) {
        console.error("Erreur lors de la suppression du client:", error);
        showMessage(`Erreur de suppression client: ${error.message}`, "error");
      }
    },
    [showMessage]
  );

<<<<<<< HEAD
  // Fonctions de gestion des types d'activité (maintenant en mémoire)
  const handleAddActivityType = useCallback(
    async (activityTypeData) => {
      try {
        const newId =
          activityTypeDefinitions.length > 0
            ? Math.max(...activityTypeDefinitions.map((t) => t.id)) + 1
            : 1;
        const newActivityType = { id: newId, ...activityTypeData };
        setActivityTypeDefinitions((prevTypes) => [
          ...prevTypes,
          newActivityType,
        ]);
        showMessage("Type d'activité ajouté avec succès !", "success");
      } catch (error) {
        console.error("Erreur lors de l'ajout du type d'activité:", error);
        showMessage(
          `Erreur d'ajout de type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [showMessage, activityTypeDefinitions]
  );

  const handleUpdateActivityType = useCallback(
    async (id, activityTypeData) => {
      try {
        setActivityTypeDefinitions((prevTypes) =>
          prevTypes.map((type) =>
            type.id === id ? { ...type, ...activityTypeData } : type
          )
        );
        showMessage("Type d'activité mis à jour avec succès !", "success");
      } catch (error) {
        console.error(
          "Erreur lors de la mise à jour du type d'activité:",
          error
        );
        showMessage(
          `Erreur de mise à jour de type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [showMessage]
  );

  const handleDeleteActivityType = useCallback(
    async (id) => {
      try {
        setActivityTypeDefinitions((prevTypes) =>
          prevTypes.filter((type) => type.id !== id)
        );
        setCraActivities((prevActivities) =>
          prevActivities.map((activity) =>
            activity.type_activite ===
            activityTypeDefinitions.find((t) => t.id === id)?.name
              ? { ...activity, type_activite: "Type Inconnu" }
              : activity
          )
        );
        showMessage("Type d'activité supprimé avec succès !", "success");
      } catch (error) {
        console.error(
          "Erreur lors de la suppression du type d'activité:",
          error
        );
        showMessage(
          `Erreur de suppression de type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [activityTypeDefinitions, showMessage]
  );

  // Fonctions de gestion des activités CRA (maintenant en mémoire)
=======
  // FONCTIONS CORRIGÉES CI-DESSOUS POUR AJOUTER `client_name`
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
  const handleAddCraActivity = useCallback(
    async (activityData) => {
      if (!currentUserId || currentUserId === "default-user-id") {
        // Vérifier l'ID par défaut
        showMessage(
          "L'ajout d'activités n'est pas persistant en mode démo. Veuillez noter que les données seront perdues au rechargement.",
          "info"
        );
      }

      const dateToFormat = parseISO(activityData.date);
      if (!isValid(dateToFormat)) {
        showMessage("Erreur : Date d'activité invalide.", "error");
        return;
      }
      const formattedDate = format(dateToFormat, "yyyy-MM-dd");

      const newActivityTime = parseFloat(activityData.tempsPasse) || 0;
      const isOvertime = activityData.typeActivite === "Heure supplémentaire";
      const isBillable = activityData.isBillable;

      const totalTimeForDayExcludingOvertime = craActivities
        .filter(
          (activity) =>
            activity.user_id === currentUserId &&
            format(activity.date_activite, "yyyy-MM-dd") === formattedDate &&
            activity.type_activite !== "Heure supplémentaire"
        )
        .reduce(
          (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
          0
        );

      if (
        !isOvertime &&
        totalTimeForDayExcludingOvertime + newActivityTime > 1
      ) {
        showMessage(
          `Le temps total pour le ${format(dateToFormat, "dd MMMM", {
            locale: fr,
          })} dépassera 1 jour (${(
            totalTimeForDayExcludingOvertime + newActivityTime
          ).toFixed(
            2
          )}j). Maximum autorisé pour les activités régulières : 1 jour.`,
          "error"
        );
        return;
      }

      // Ajout du nom du client
      let clientName = null;
      if (activityData.clientId && clientDefinitions.length > 0) {
        const clientObj = clientDefinitions.find(
          (c) => String(c.id) === String(activityData.clientId)
        );
        if (clientObj) {
          clientName = clientObj.nom_client;
        }
      }

      try {
        const newId = `cra${craActivities.length + 1}-${Date.now()}`; // ID unique simple
        const newCraActivity = {
          id: newId,
          description_activite: activityData.descriptionActivite,
          temps_passe: newActivityTime,
<<<<<<< HEAD
          date_activite: dateToFormat, // Stocker comme objet Date
=======
          date_activite: formattedDate,
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
          type_activite: activityData.typeActivite,
          override_non_working_day: activityData.overrideNonWorkingDay,
          user_id: currentUserId,
          client_id:
            activityData.clientId === ""
              ? null
              : parseInt(activityData.clientId),
          is_billable: isBillable,
<<<<<<< HEAD
          status: "draft", // Nouvelle activité est toujours en brouillon
        };
=======
          client_name: clientName,
        };

        const response = await fetch("/api/cra_activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Erreur lors de la création de l'activité CRA."
          );
        }
        const newCraActivity = await response.json();
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
        setCraActivities((prevActivities) => [
          ...prevActivities,
          newCraActivity,
        ]);
<<<<<<< HEAD

        if (isOvertime) {
          if (totalTimeForDayExcludingOvertime >= 1) {
            showMessage(
              `Heure supplémentaire ajoutée pour le ${format(
                dateToFormat,
                "dd MMMM",
                { locale: fr }
              )}. Le total des activités régulières pour ce jour est déjà de 1 jour.`,
              "info"
            );
          } else {
            showMessage(
              "Heure supplémentaire ajoutée avec succès !",
              "success"
            );
          }
        } else {
          showMessage("Activité CRA ajoutée avec succès !", "success");
        }
=======
        showMessage("Activité CRA ajoutée avec succès !", "success");
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
      } catch (error) {
        console.error("Erreur lors de l'ajout de l'activité CRA:", error);
        showMessage(`Erreur d'ajout d'activité CRA: ${error.message}`, "error");
      }
    },
<<<<<<< HEAD
    [showMessage, currentUserId, craActivities]
=======
    [showMessage, currentUserId, craActivities, clientDefinitions]
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
  );

  const handleUpdateCraActivity = useCallback(
    async (id, activityData) => {
      if (!currentUserId || currentUserId === "default-user-id") {
        // Vérifier l'ID par défaut
        showMessage(
          "La modification d'activités n'est pas persistante en mode démo. Veuillez noter que les données seront perdues au rechargement.",
          "info"
        );
      }

      const dateToFormat = parseISO(activityData.date);
      if (!isValid(dateToFormat)) {
        showMessage("Erreur : Date d'activité invalide.", "error");
        return;
      }
      const formattedDate = format(dateToFormat, "yyyy-MM-dd");

      const updatedActivityTime = parseFloat(activityData.tempsPasse) || 0;
      const isOvertime = activityData.typeActivite === "Heure supplémentaire";
      const isBillable = activityData.isBillable;

      const totalTimeForDayExcludingCurrentAndOvertime = craActivities
        .filter(
          (activity) =>
            activity.user_id === currentUserId &&
<<<<<<< HEAD
            format(activity.date_activite, "yyyy-MM-dd") === formattedDate &&
=======
            activity.date_activite === formattedDate &&
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
            activity.id !== id &&
            activity.type_activite !== "Heure supplémentaire"
        )
        .reduce(
          (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
          0
        );

      if (
        !isOvertime &&
        totalTimeForDayExcludingCurrentAndOvertime + updatedActivityTime > 1
      ) {
        showMessage(
          `Le temps total pour le ${format(dateToFormat, "dd MMMM", {
            locale: fr,
          })} dépassera 1 jour (${(
            totalTimeForDayExcludingCurrentAndOvertime + updatedActivityTime
          ).toFixed(
            2
          )}j). Maximum autorisé pour les activités régulières : 1 jour.`,
          "error"
        );
        return;
      }

      // Ajout du nom du client pour la modification aussi
      let clientName = null;
      if (activityData.clientId && clientDefinitions.length > 0) {
        const clientObj = clientDefinitions.find(
          (c) => String(c.id) === String(activityData.clientId)
        );
        if (clientObj) {
          clientName = clientObj.nom_client;
        }
      }

      try {
<<<<<<< HEAD
        setCraActivities((prevActivities) =>
          prevActivities.map((activity) =>
            activity.id === id
              ? {
                  ...activity,
                  description_activite: activityData.descriptionActivite,
                  temps_passe: updatedActivityTime,
                  date_activite: dateToFormat, // Stocker comme objet Date
                  type_activite: activityData.typeActivite,
                  override_non_working_day: activityData.overrideNonWorkingDay,
                  client_id:
                    activityData.clientId === ""
                      ? null
                      : parseInt(activityData.clientId),
                  is_billable: isBillable,
                }
              : activity
          )
        );

        if (isOvertime) {
          if (totalTimeForDayExcludingCurrentAndOvertime >= 1) {
            showMessage(
              `Heure supplémentaire mise à jour pour le ${format(
                dateToFormat,
                "dd MMMM",
                { locale: fr }
              )}. Le total des activités régulières pour ce jour est déjà de 1 jour.`,
              "info"
            );
          } else {
            showMessage(
              "Heure supplémentaire mise à jour avec succès !",
              "success"
            );
          }
        } else {
          showMessage("Activité CRA mise à jour avec succès !", "success");
        }
=======
        const payload = {
          id,
          description_activite: activityData.descriptionActivite,
          temps_passe: updatedActivityTime,
          date_activite: formattedDate,
          type_activite: activityData.typeActivite,
          override_non_working_day: activityData.overrideNonWorkingDay,
          user_id: currentUserId,
          client_id:
            activityData.clientId === ""
              ? null
              : parseInt(activityData.clientId),
          is_billable: isBillable,
          client_name: clientName,
        };

        const response = await fetch(
          `/api/cra_activities?action=update-activity`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Erreur lors de la modification de l'activité CRA."
          );
        }
        fetchData();
        showMessage("Activité CRA mise à jour avec succès !", "success");
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
      } catch (error) {
        console.error(
          "Erreur lors de la mise à jour de l'activité CRA:",
          error
        );
        showMessage(
          `Erreur de mise à jour d'activité CRA: ${error.message}`,
          "error"
        );
      }
    },
<<<<<<< HEAD
    [showMessage, currentUserId, craActivities]
  );

  const handleDeleteCraActivity = useCallback(
    async (id, bypassAuth = false) => {
      if (!currentUserId || currentUserId === "default-user-id") {
        // Vérifier l'ID par défaut
        showMessage(
          "La suppression d'activités n'est pas persistante en mode démo. Veuillez noter que les données seront perdues au rechargement.",
          "info"
        );
      }
      try {
        setCraActivities((prevActivities) =>
          prevActivities.filter((activity) => activity.id !== id)
        );
        showMessage("Activité CRA supprimée avec succès !", "success");
      } catch (error) {
        console.error(
          "Erreur lors de la suppression de l'activité CRA:",
          error
        );
        showMessage(
          `Erreur de suppression d'activité CRA: ${error.message}`,
          "error"
        );
      }
    },
    [showMessage, currentUserId]
  );

  const handleDuplicateActivity = useCallback(
    async (activityToDuplicate) => {
      if (!currentUserId || currentUserId === "default-user-id") {
        // Vérifier l'ID par défaut
        showMessage(
          "La duplication d'activités n'est pas persistante en mode démo.",
          "info"
        );
      }
      try {
        const newId = `cra${craActivities.length + 1}-${Date.now()}-dup`; // ID unique simple
        const duplicatedActivity = {
          ...activityToDuplicate,
          id: newId,
          status: "draft", // La duplication crée toujours un brouillon
          // Assurez-vous que date_activite est un objet Date si nécessaire
          date_activite:
            activityToDuplicate.date_activite instanceof Date
              ? activityToDuplicate.date_activite
              : parseISO(activityToDuplicate.date_activite),
        };
        setCraActivities((prev) => [...prev, duplicatedActivity]);
        showMessage("Activité dupliquée avec succès !", "success");
      } catch (e) {
        console.error("Erreur lors de la duplication de l'activité:", e);
        showMessage("Erreur lors de la duplication de l'activité.", "error");
      }
    },
    [currentUserId, showMessage, craActivities]
  );

  // handleFinalizeMonth (maintenant en mémoire)
  const handleFinalizeMonth = useCallback(
    async (year, month) => {
      if (!currentUserId || currentUserId === "default-user-id") {
        // Vérifier l'ID par défaut
        showMessage(
          "La finalisation n'est pas persistante en mode démo.",
          "info"
        );
      }
      try {
        setCraActivities((prevActivities) =>
          prevActivities.map((activity) => {
            const activityMonth = activity.date_activite.getMonth() + 1;
            const activityYear = activity.date_activite.getFullYear();
            if (
              activity.user_id === currentUserId &&
              activityYear === year &&
              activityMonth === month &&
              activity.status === "draft" // Seuls les brouillons peuvent être finalisés
            ) {
              return { ...activity, status: "finalized" };
            }
            return activity;
          })
        );
        showMessage(
          `Mois ${format(new Date(year, month - 1), "MMMM", {
            locale: fr,
          })} finalisé avec succès !`,
          "success"
        );
      } catch (error) {
        console.error("Erreur lors de la finalisation du mois:", error);
        showMessage(`Erreur de finalisation: ${error.message}`, "error");
      }
    },
    [showMessage, currentUserId]
  );

  // handleUpdateCraStatus (maintenant en mémoire)
  const handleUpdateCraStatus = useCallback(
    async (targetUserId, year, month, newStatus, message) => {
      if (!currentUserId || currentUserId === "default-user-id") {
        // Vérifier l'ID par défaut
        showMessage(
          "La mise à jour de statut n'est pas persistante en mode démo.",
          "info"
        );
      }
      if (!targetUserId) {
        showMessage("ID utilisateur cible manquant.", "error");
        return;
      }

      try {
        setCraActivities((prevActivities) =>
          prevActivities.map((activity) => {
            const activityMonth = activity.date_activite.getMonth() + 1;
            const activityYear = activity.date_activite.getFullYear();
            if (
              activity.user_id === targetUserId &&
              activityYear === year &&
              activityMonth === month
            ) {
              const updatedActivity = { ...activity, status: newStatus };
              if (newStatus === "rejected") {
                updatedActivity.rejection_reason = message;
                updatedActivity.rejected_by = currentUserName; // Simuler l'administrateur
                updatedActivity.rejected_at = new Date(); // Date de rejet
              } else {
                updatedActivity.rejection_reason = null;
                updatedActivity.rejected_by = null;
                updatedActivity.rejected_at = null;
              }
              return updatedActivity;
            }
            return activity;
          })
        );
        showMessage(
          `Mois mis à jour à '${newStatus}' avec succès !`,
          "success"
        );
      } catch (error) {
        console.error(
          "Erreur lors de la mise à jour du statut du CRA :",
          error
        );
        showMessage(
          `Erreur lors de la mise à jour du statut : ${error.message}`,
          "error"
        );
      }
    },
    [currentUserId, currentUserName, showMessage]
  );
=======
    [showMessage, currentUserId, craActivities, clientDefinitions, fetchData]
  );

  // ... le reste de ton code (handlers activity types, clients, etc. inchangés) ...
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed

  if (status === "loading" || !currentUserId) {
    return (
      <div className="flex justify-center items-center h-screen text-lg font-semibold text-gray-700">
        Chargement de la session utilisateur...
      </div>
    );
  }

  // Ce bloc gère l'affichage en mode démo pour les utilisateurs non authentifiés
  if (currentUserId === "default-user-id") {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="mb-4 flex justify-between items-center">
          <div className="text-gray-700 text-lg font-semibold">
            Bienvenue, {currentUserName}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push("/dashboard/admin")}
              className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow-md hover:bg-gray-300 transition duration-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Retour au Tableau de Bord Admin
            </button>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8">
          Gestionnaire CRA (Mode Démo)
        </h1>
        <p className="text-center text-red-600 mb-4 font-medium">
          Vous êtes en mode démonstration. Toutes les modifications seront
          perdues au rechargement de la page.
        </p>

        {/* Navigation par onglets */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setActiveTab("craManager")}
            className={`px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${
              activeTab === "craManager"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Mon CRA
          </button>
          <button
            onClick={() => setActiveTab("sentCraHistory")}
            className={`ml-2 px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${
              activeTab === "sentCraHistory"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Historique des CRAs envoyés
          </button>
        </div>

        {/* Contenu conditionnel des onglets */}
        {activeTab === "craManager" && (
          <CraBoard
            craActivities={craActivities}
            activityTypeDefinitions={activityTypeDefinitions}
            clientDefinitions={clientDefinitions}
            onAddCraActivity={handleAddCraActivity}
            onUpdateCraActivity={handleUpdateCraActivity}
            onDeleteCraActivity={handleDeleteCraActivity}
            showMessage={showMessage}
            onFinalizeMonth={handleFinalizeMonth}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        )}

        {activeTab === "sentCraHistory" && (
          <SentCraHistory
            craActivities={craActivities}
            clientDefinitions={clientDefinitions}
            activityTypeDefinitions={activityTypeDefinitions}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            showMessage={showMessage}
            onUpdateCraStatus={handleUpdateCraStatus}
            onFinalizeMonth={handleFinalizeMonth} // Passer également pour la finalisation
          />
        )}

        {/* Gestionnaire unifié pour les clients et les types d'activité */}
        <UnifiedManager
          clientDefinitions={clientDefinitions}
          onAddClient={handleAddClient}
          onUpdateClient={handleUpdateClient}
          onDeleteClient={handleDeleteClient}
          activityTypeDefinitions={activityTypeDefinitions}
          onAddActivityType={handleAddActivityType}
          onUpdateActivityType={handleUpdateActivityType}
          onDeleteActivityType={handleDeleteActivityType}
          showMessage={showMessage}
        />

        {/* Affichage du message Toast */}
        <ToastMessage
          message={toastMessage.message}
          type={toastMessage.type}
          isVisible={toastMessage.isVisible}
          onClose={hideMessage}
        />
      </div>
    );
  }

  // Bloc pour les utilisateurs authentifiés (si NextAuth est configuré)
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
<<<<<<< HEAD
=======
      {/* ... en-tête, navigation, etc ... */}

>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
      <div className="mb-4 flex justify-between items-center">
        <div className="text-gray-700 text-lg font-semibold">
          Bienvenue, {currentUserName}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => router.push("/dashboard/admin")}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow-md hover:bg-gray-300 transition duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour au Tableau de Bord Admin
          </button>
        </div>
      </div>

      <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8">
        Gestionnaire CRA
      </h1>

      {/* Navigation par onglets */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setActiveTab("craManager")}
          className={`px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${activeTab === "craManager"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
        >
          Mon CRA
        </button>
        <button
          onClick={() => setActiveTab("sentCraHistory")}
          className={`ml-2 px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${activeTab === "sentCraHistory"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
        >
          Historique des CRAs envoyés
        </button>
      </div>

      {/* Contenu conditionnel des onglets */}
      {activeTab === "craManager" && (
        <CraBoard
          craActivities={craActivities}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          onAddCraActivity={handleAddCraActivity}
          onUpdateCraActivity={handleUpdateCraActivity}
          onDeleteCraActivity={() => { }} // ... complète ou récupère ta logique
          showMessage={showMessage}
          onFinalizeMonth={() => { }} // ... idem si besoin
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      {activeTab === "sentCraHistory" && (
        <SentCraHistory
          craActivities={craActivities}
          clientDefinitions={clientDefinitions}
          activityTypeDefinitions={activityTypeDefinitions}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          showMessage={showMessage}
<<<<<<< HEAD
          onUpdateCraStatus={handleUpdateCraStatus}
          onFinalizeMonth={handleFinalizeMonth} // Passer également pour la finalisation
=======
          onUpdateCraStatus={() => { }} // ... idem si besoin
>>>>>>> 7314d3eeca7686ce75b3e4698cdb28c7e07bd0ed
        />
      )}

      <UnifiedManager
        clientDefinitions={clientDefinitions}
        onAddClient={handleAddClient}
        onUpdateClient={handleUpdateClient}
        onDeleteClient={handleDeleteClient}
        activityTypeDefinitions={activityTypeDefinitions}
        onAddActivityType={() => { }}
        onUpdateActivityType={() => { }}
        onDeleteActivityType={() => { }}
        showMessage={showMessage}
      />

      <ToastMessage
        message={toastMessage.message}
        type={toastMessage.type}
        isVisible={toastMessage.isVisible}
        onClose={hideMessage}
      />
    </div>
  );
}