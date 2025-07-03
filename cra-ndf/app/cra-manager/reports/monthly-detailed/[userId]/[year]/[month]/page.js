// app/cra-manager/page.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CraBoard from "@/components/CraBoard";
import SentCraHistory from "@/components/SentCraHistory";
import { format, isSameMonth, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function CRAPage() {
  const [craActivities, setCraActivities] = useState([]);
  const [activityTypeDefinitions, setActivityTypeDefinitions] = useState([]);
  const [clientDefinitions, setClientDefinitions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  // Remplacez ces valeurs par celles réelles de l'utilisateur connecté
  const currentUserId = 1; // Exemple d'ID utilisateur
  const currentUserName = "John Doe"; // Exemple de nom d'utilisateur

  const showMessage = useCallback((msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    const timer = setTimeout(() => {
      setMessage(null);
      setMessageType(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Fonction utilitaire pour gérer les erreurs de fetch de manière robuste
  const handleFetchError = async (response) => {
    let errorMessage = `Erreur (${response.status} ${
      response.statusText || ""
    }) : Échec de l'opération.`;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      try {
        const errorData = await response.json();
        // Utilise errorData.message, errorData.error, ou une stringification pour plus de robustesse
        errorMessage =
          errorData.message ||
          errorData.error ||
          JSON.stringify(errorData) ||
          errorMessage;
      } catch (jsonError) {
        console.warn(
          "Could not parse error response as JSON, falling back to text:",
          jsonError
        );
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (textError) {
          console.warn("Could not read error response as text:", textError);
        }
      }
    } else {
      // If not JSON, try to read as text
      try {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      } catch (textError) {
        console.warn("Could not read error response as text:", textError); // Corrected typo here
      }
    }
    throw new Error(errorMessage);
  };

  // Fetch CRA Activities
  const fetchCraActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cra-activities");
      if (!response.ok) {
        await handleFetchError(response); // Utilisation de la fonction d'erreur
      }
      const data = await response.json();
      // Ensure date_activite is a Date object
      const parsedData = data.map((activity) => ({
        ...activity,
        date_activite: activity.date_activite
          ? parseISO(activity.date_activite)
          : null,
      }));
      setCraActivities(parsedData);
    } catch (err) {
      console.error("Failed to fetch CRA activities:", err);
      setError(err.message);
      showMessage("Échec du chargement des activités CRA.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  // Fetch Activity Type Definitions
  const fetchActivityTypeDefinitions = useCallback(async () => {
    try {
      const response = await fetch("/api/activity-types");
      if (!response.ok) {
        await handleFetchError(response);
      }
      const data = await response.json();
      setActivityTypeDefinitions(data);
    } catch (err) {
      console.error("Failed to fetch activity types:", err);
      showMessage("Échec du chargement des types d'activités.", "error");
    }
  }, [showMessage]);

  // Fetch Client Definitions
  const fetchClientDefinitions = useCallback(async () => {
    try {
      const response = await fetch("/api/clients");
      if (!response.ok) {
        await handleFetchError(response);
      }
      const data = await response.json();
      setClientDefinitions(data);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      showMessage("Échec du chargement des clients.", "error");
    }
  }, [showMessage]);

  useEffect(() => {
    fetchCraActivities();
    fetchActivityTypeDefinitions();
    fetchClientDefinitions();
  }, [
    fetchCraActivities,
    fetchActivityTypeDefinitions,
    fetchClientDefinitions,
  ]);

  const handleAddCraActivity = useCallback(
    async (newActivityData) => {
      // newActivityData vient de ActivityModal
      try {
        // Ajouter l'ID utilisateur avant l'envoi
        const activityToSend = { ...newActivityData, user_id: currentUserId };

        const response = await fetch("/api/cra-activities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(activityToSend),
        });

        if (!response.ok) {
          await handleFetchError(response);
        }

        const addedActivity = await response.json(); // This is `activityData` in the error message

        // CRITICAL FIX: Changed `addedActivity.date` to `addedActivity.date_activite`
        // This addresses the error: "Cannot read properties of undefined (reading 'split') at line 310"
        const dateToFormat = addedActivity.date_activite
          ? parseISO(addedActivity.date_activite)
          : null;

        if (!isValid(dateToFormat)) {
          showMessage("Erreur : Date d'activité invalide.", "error");
          return;
        }

        const parsedActivity = {
          ...addedActivity,
          date_activite: dateToFormat, // Use the already parsed and validated date
        };
        setCraActivities((prevActivities) => [
          ...prevActivities,
          parsedActivity,
        ]);
        showMessage("Activité ajoutée avec succès !", "success");
      } catch (error) {
        showMessage(
          `Erreur lors de l'ajout de l'activité : ${error.message}`,
          "error"
        );
        console.error("Erreur lors de l'ajout de l'activité :", error);
      }
    },
    [showMessage, setCraActivities, currentUserId]
  );

  const handleUpdateCraActivity = useCallback(
    async (updatedActivityData) => {
      // updatedActivityData vient de ActivityModal
      try {
        const response = await fetch(
          `/api/cra-activities/${updatedActivityData.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedActivityData),
          }
        );

        if (!response.ok) {
          await handleFetchError(response);
        }

        const updatedActivity = await response.json();
        // Assurez-vous que date_activite est bien un objet Date après la réponse API
        const parsedActivity = {
          ...updatedActivity,
          date_activite: updatedActivity.date_activite
            ? parseISO(updatedActivity.date_activite)
            : null,
        };
        setCraActivities((prevActivities) =>
          prevActivities.map((act) =>
            act.id === parsedActivity.id ? parsedActivity : act
          )
        );
        showMessage("Activité mise à jour avec succès !", "success");
      } catch (error) {
        showMessage(
          `Erreur lors de la mise à jour de l'activité : ${error.message}`,
          "error"
        );
        console.error("Erreur lors de la mise à jour de l'activité :", error);
      }
    },
    [showMessage, setCraActivities]
  );

  const handleDeleteCraActivity = useCallback(
    async (activityId) => {
      try {
        const response = await fetch(`/api/cra-activities/${activityId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          await handleFetchError(response);
        }

        // Si la suppression est réussie (code 200, 204, etc.), mettez à jour l'état
        setCraActivities((prevActivities) =>
          prevActivities.filter((activity) => activity.id !== activityId)
        );
        showMessage("Activité supprimée avec succès !", "success");
      } catch (error) {
        showMessage(
          `Erreur lors de la suppression de l'activité : ${error.message}`,
          "error"
        );
        console.error("Erreur lors de la suppression de l'activité :", error);
      }
    },
    [showMessage, setCraActivities]
  );

  const handleFinalizeMonth = useCallback(
    async (userId, year, month) => {
      try {
        const response = await fetch("/api/cra-activities/finalize-month", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, year, month }),
        });

        if (!response.ok) {
          await handleFetchError(response);
        }

        // Si la finalisation réussit, rafraîchissez les activités pour mettre à jour les statuts
        await fetchCraActivities();
        showMessage("Mois finalisé avec succès !", "success");
      } catch (error) {
        showMessage(`Erreur de finalisation : ${error.message}`, "error");
        console.error("Erreur lors de la finalisation du mois :", error);
      }
    },
    [showMessage, fetchCraActivities]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold text-blue-600">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-xl">Erreur : {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      {message && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-md shadow-lg text-white ${
            messageType === "success"
              ? "bg-green-500"
              : messageType === "error"
              ? "bg-red-500"
              : "bg-blue-500"
          } z-50`}
        >
          {message}
        </div>
      )}

      <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
        Gestion des CRA
      </h1>

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

      <SentCraHistory
        craActivities={craActivities}
        clientDefinitions={clientDefinitions}
        activityTypeDefinitions={activityTypeDefinitions}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        showMessage={showMessage}
      />
    </div>
  );
}
