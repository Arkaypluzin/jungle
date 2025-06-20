// app/cra-manager/page.js
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import CraBoard from "../../components/CraBoard";
import UnifiedManager from "../../components/UnifiedManager";
import SummaryReport from "../../components/SummaryReport";

export default function CRAPage() {
  const [craActivities, setCraActivities] = useState([]);
  const [clientDefinitions, setClientDefinitions] = useState([]);
  const [activityTypeDefinitions, setActivityTypeDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const clientsRes = await fetch("/api/client");
      if (!clientsRes.ok) {
        const errorData = await clientsRes.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${clientsRes.status}`
        );
      }
      const clientsData = await clientsRes.json();
      setClientDefinitions(clientsData);

      const craActivitiesRes = await fetch("/api/cra_activities");
      if (!craActivitiesRes.ok) {
        const errorData = await craActivitiesRes.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${craActivitiesRes.status}`
        );
      }
      const craActivitiesData = await craActivitiesRes.json();
      setCraActivities(craActivitiesData);

      const activityTypesRes = await fetch("/api/activity_type");
      if (!activityTypesRes.ok) {
        const errorData = await activityTypesRes.json();
        throw new Error(
          errorData.message || `Erreur HTTP! status: ${activityTypesRes.status}`
        );
      }
      const activityTypesData = await activityTypesRes.json();
      setActivityTypeDefinitions(activityTypesData);
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError(`Erreur de chargement des données: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client Management Functions
  const handleAddClient = useCallback(
    async (clientData) => {
      try {
        const response = await fetch("/api/client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add client");
        }
        await fetchData();
      } catch (error) {
        console.error("Error adding client:", error);
        alert(`Erreur d'ajout de client: ${error.message}`);
      }
    },
    [fetchData]
  );

  const handleUpdateClient = useCallback(
    async (id, clientData) => {
      try {
        const response = await fetch(`/api/client/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        });
        if (!response.ok) {
          if (response.status === 204) {
            console.log("Client mis à jour avec succès (204 No Content).");
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to update client");
          }
        }
        await fetchData();
      } catch (error) {
        console.error("Error updating client:", error);
        alert(`Erreur de mise à jour client: ${error.message}`);
      }
    },
    [fetchData]
  );

  const handleDeleteClient = useCallback(
    async (id) => {
      if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;
      try {
        const response = await fetch(`/api/client/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          if (response.status === 204) {
            console.log("Client supprimé avec succès (204 No Content).");
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to delete client");
          }
        }
        await fetchData();
      } catch (error) {
        console.error("Error deleting client:", error);
        alert(`Erreur de suppression client: ${error.message}`);
      }
    },
    [fetchData]
  );

  // Activity Type Management Functions
  const handleAddActivityType = useCallback(
    async (activityTypeData) => {
      try {
        const response = await fetch("/api/activity_type", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activityTypeData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add activity type");
        }
        await fetchData();
      } catch (error) {
        console.error("Error adding activity type:", error);
        alert(`Erreur d'ajout de type d'activité: ${error.message}`);
      }
    },
    [fetchData]
  );

  const handleUpdateActivityType = useCallback(
    async (id, activityTypeData) => {
      try {
        const response = await fetch(`/api/activity_type/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activityTypeData),
        });
        if (!response.ok) {
          if (response.status === 204) {
            console.log(
              "Type d'activité mis à jour avec succès (204 No Content)."
            );
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "Failed to update activity type"
            );
          }
        }
        await fetchData();
      } catch (error) {
        console.error("Error updating activity type:", error);
        alert(`Erreur de mise à jour de type d'activité: ${error.message}`);
      }
    },
    [fetchData]
  );

  const handleDeleteActivityType = useCallback(
    async (id) => {
      if (
        !confirm(
          "Êtes-vous sûr de vouloir supprimer ce type d'activité ? Cela affectera les CRAs existants qui l'utilisent."
        )
      )
        return;
      try {
        const response = await fetch(`/api/activity_type/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          if (response.status === 204) {
            console.log(
              "Type d'activité supprimé avec succès (204 No Content)."
            );
          } else {
            const errorData = await response.json();
            throw new new Error(
              errorData.message || "Failed to delete activity type"
            )();
          }
        }
        await fetchData();
      } catch (error) {
        console.error("Error deleting activity type:", error);
        alert(`Erreur de suppression de type d'activité: ${error.message}`);
      }
    },
    [fetchData]
  );

  // CRA Activity Management Functions
  const handleAddCraActivity = useCallback(
    async (activityData) => {
      try {
        const payload = {
          description_activite: activityData.descriptionActivite,
          temps_passe: parseFloat(activityData.tempsPasse),
          date_activite: activityData.dateCra,
          type_activite: activityData.typeActivite,
          client_name: activityData.clientName,
          override_non_working_day: activityData.overrideNonWorkingDay,
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
        await fetchData();
      } catch (error) {
        console.error("Erreur lors de l'ajout d'activité CRA:", error);
        alert(`Erreur d'ajout d'activité CRA: ${error.message}`);
      }
    },
    [fetchData]
  );

  const handleUpdateCraActivity = useCallback(
    async (id, activityData) => {
      try {
        const payload = {
          description_activite: activityData.descriptionActivite,
          temps_passe: parseFloat(activityData.tempsPasse),
          date_activite: activityData.dateCra,
          type_activite: activityData.typeActivite,
          client_name: activityData.clientName,
          override_non_working_day: activityData.overrideNonWorkingDay,
        };
        const response = await fetch(`/api/cra_activities/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          if (response.status === 204) {
            console.log(
              "Activité CRA mise à jour avec succès (204 No Content)."
            );
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "Failed to update CRA activity"
            );
          }
        }
        await fetchData();
      } catch (error) {
        console.error("Error updating CRA activity:", error);
        alert(`Erreur de mise à jour d'activité CRA: ${error.message}`);
      }
    },
    [fetchData]
  );

  const handleDeleteCraActivity = useCallback(
    async (id) => {
      try {
        const response = await fetch(`/api/cra_activities/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          if (response.status === 204) {
            console.log("Activité CRA supprimée avec succès (204 No Content).");
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "Failed to delete CRA activity"
            );
          }
        }
        await fetchData();
      } catch (error) {
        console.error("Error deleting CRA activity:", error);
        alert(`Erreur de suppression d'activité CRA: ${error.message}`);
      }
    },
    [fetchData]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-700">
        Chargement des données...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-red-600">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8">
        Gestionnaire CRA
      </h1>

      {/* Calendrier en premier */}
      <CraBoard
        craActivities={craActivities}
        activityTypeDefinitions={activityTypeDefinitions}
        clientDefinitions={clientDefinitions}
        onAddCraActivity={handleAddCraActivity}
        onUpdateCraActivity={handleUpdateCraActivity}
        onDeleteCraActivity={handleDeleteCraActivity}
      />

      {/* Gestionnaire Unified en second */}
      <UnifiedManager
        clientDefinitions={clientDefinitions}
        onAddClient={handleAddClient}
        onUpdateClient={handleUpdateClient}
        onDeleteClient={handleDeleteClient}
        activityTypeDefinitions={activityTypeDefinitions}
        onAddActivityType={handleAddActivityType}
        onUpdateActivityType={handleUpdateActivityType}
        onDeleteActivityType={handleDeleteActivityType}
      />
    </div>
  );
}
