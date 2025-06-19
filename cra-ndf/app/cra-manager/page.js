"use client"; // Ce composant est un Client Component

import React, { useState, useEffect, useCallback } from "react";
import UnifiedManager from "../../components/UnifiedManager"; // Chemin correct vers le composant

export default function CRAPage() {
  const [activityTypes, setActivityTypes] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // État pour gérer l'onglet actif, initialisé à "activities"
  const [activeTab, setActiveTab] = useState("activities");

  // Fonction pour récupérer les données initiales
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null); // Réinitialiser les erreurs

    try {
      // Récupération des activités
      const activitiesRes = await fetch("/api/cra_activities");
      if (!activitiesRes.ok) {
        const errorData = await activitiesRes.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${activitiesRes.status}`
        );
      }
      const activitiesData = await activitiesRes.json();
      setActivityTypes(activitiesData);

      // Récupération des clients
      const clientsRes = await fetch("/api/client");
      if (!clientsRes.ok) {
        const errorData = await clientsRes.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${clientsRes.status}`
        );
      }
      const clientsData = await clientsRes.json();
      setClientTypes(clientsData);
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError(`Erreur de chargement des données: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []); // Aucune dépendance car fetchData est stable et n'a pas besoin de changer

  // Exécute fetchData au montage du composant
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Déclenche le useEffect quand fetchData change (une fois au début)

  // --- Fonctions passées à UnifiedManager pour les Activités ---
  const handleAddActivity = useCallback(
    async (activityData) => {
      try {
        const res = await fetch("/api/cra_activities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(activityData),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        }

        console.log("Activité ajoutée avec succès:", await res.json());
        await fetchData(); // Re-fetch pour mettre à jour la liste
        return true;
      } catch (err) {
        console.error("Erreur lors de l'ajout de l'activité:", err);
        setError(`Erreur lors de l'ajout de l'activité: ${err.message}`);
        return false;
      }
    },
    [fetchData]
  );

  const handleUpdateActivity = useCallback(
    async (id, updateData) => {
      try {
        const res = await fetch(`/api/cra_activities/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        }

        console.log("Activité mise à jour avec succès.");
        await fetchData(); // Re-fetch pour mettre à jour la liste
        return true;
      } catch (err) {
        console.error(
          `Erreur lors de la mise à jour de l'activité ${id}:`,
          err
        );
        setError(`Erreur lors de la mise à jour de l'activité: ${err.message}`);
        return false;
      }
    },
    [fetchData]
  );

  const handleDeleteActivity = useCallback(
    async (id) => {
      try {
        const res = await fetch(`/api/cra_activities/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        }

        console.log("Activité supprimée avec succès.");
        await fetchData(); // Re-fetch pour mettre à jour la liste
        return true;
      } catch (err) {
        console.error(
          `Erreur lors de la suppression de l'activité ${id}:`,
          err
        );
        setError(`Erreur lors de la suppression de l'activité: ${err.message}`);
        return false;
      }
    },
    [fetchData]
  );

  // --- Fonctions passées à UnifiedManager pour les Clients ---
  const handleAddClient = useCallback(
    async (clientData) => {
      try {
        const res = await fetch("/api/client", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(clientData),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        }

        console.log("Client ajouté avec succès:", await res.json());
        await fetchData(); // Re-fetch pour mettre à jour la liste
        return true;
      } catch (err) {
        console.error("Erreur lors de l'ajout du client:", err);
        setError(`Erreur lors de l'ajout du client: ${err.message}`);
        return false;
      }
    },
    [fetchData]
  );

  const handleUpdateClient = useCallback(
    async (id, updateData) => {
      try {
        const res = await fetch(`/api/client/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        }

        console.log("Client mis à jour avec succès.");
        await fetchData(); // Re-fetch pour mettre à jour la liste
        return true;
      } catch (err) {
        console.error(`Erreur lors de la mise à jour du client ${id}:`, err);
        setError(`Erreur lors de la mise à jour du client: ${err.message}`);
        return false;
      }
    },
    [fetchData]
  );

  const handleDeleteClient = useCallback(
    async (id) => {
      try {
        const res = await fetch(`/api/client/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        }

        console.log("Client supprimé avec succès.");
        await fetchData(); // Re-fetch pour mettre à jour la liste
        return true;
      } catch (err) {
        console.error(`Erreur lors de la suppression du client ${id}:`, err);
        setError(`Erreur lors de la suppression du client: ${err.message}`);
        return false;
      }
    },
    [fetchData]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg text-gray-700">
        Chargement des données...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-lg text-red-600">
        <p>{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <UnifiedManager
      activityTypes={activityTypes}
      onAddActivity={handleAddActivity}
      onUpdateActivity={handleUpdateActivity}
      onDeleteActivity={handleDeleteActivity}
      clientTypes={clientTypes}
      onAddClient={handleAddClient}
      onUpdateClient={handleUpdateClient}
      onDeleteClient={handleDeleteClient}
      // Passe l'état et la fonction de mise à jour de l'onglet actif
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );
}
