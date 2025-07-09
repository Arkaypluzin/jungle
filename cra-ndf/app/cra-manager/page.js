// app/cra-manager/page.js
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CraBoard from "@/components/CraBoard";
import UnifiedManager from "@/components/UnifiedManager";
import ReceivedCras from "@/components/ReceivedCras"; // <-- NOUVEL IMPORT : le composant réel
import { startOfMonth, endOfMonth, format } from "date-fns";

// Composant ToastMessage simplifié et inclus directement
const ToastMessage = ({ message, type, isVisible, onClose }) => {
  if (!isVisible) return null;

  const bgColor =
    {
      success: "bg-green-500",
      error: "bg-red-500",
      info: "bg-blue-500",
      warning: "bg-yellow-500",
    }[type] || "bg-gray-500";

  return (
    <div
      className={`fixed bottom-4 right-4 p-4 rounded-lg text-white shadow-lg ${bgColor} z-50`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 font-bold">
        &times;
      </button>
    </div>
  );
};

// REMOVED: Le placeholder ReceivedCraList n'est plus nécessaire ici.

export default function CRAPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "info",
    isVisible: false,
  });

  const showMessage = useCallback((message, type = "success") => {
    setToastMessage({ message, type, isVisible: true });
    setTimeout(() => {
      setToastMessage((prev) => ({ ...prev, isVisible: false }));
    }, 5000); // Masquer après 5 secondes
  }, []);

  const hideMessage = useCallback(() => {
    setToastMessage((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const [activeTab, setActiveTab] = useState("craManager");
  const [craActivities, setCraActivities] = useState([]);
  const [clientDefinitions, setClientDefinitions] = useState([]);
  const [activityTypeDefinitions, setActivityTypeDefinitions] = useState([]);
  const [loading, setLoading] = useState(true); // Gère l'état de chargement global

  const [error, setError] = useState(null); // Conserve l'état d'erreur

  // Nouvel état pour le mois actuellement affiché dans le calendrier
  const [currentDisplayedMonth, setCurrentDisplayedMonth] = useState(
    new Date()
  );

  const currentUserId = session?.user?.id; // L'ID utilisateur réel de la session
  const currentUserName =
    session?.user?.name || session?.user?.email || "Utilisateur";
  // ATTENTION: Remplacez 'admin' par le rôle réel de l'utilisateur si vous avez une gestion des rôles via Clerk/DB
  // Pour le test initial, vous pouvez le laisser en dur si vous savez que l'utilisateur est admin/manager.
  const currentUserRole = "admin"; // Exemple: "admin", "manager", "user"

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

  const fetchCraActivitiesForMonth = useCallback(
    async (monthToFetch) => {
      console.log(
        "CRAPage: fetchCraActivitiesForMonth appelée. currentUserId:",
        currentUserId,
        "Mois à récupérer:",
        format(monthToFetch, "yyyy-MM")
      );
      if (!currentUserId || currentUserId === "unauthenticated") {
        setCraActivities([]);
        return [];
      }
      setError(null);

      try {
        const startDate = format(startOfMonth(monthToFetch), "yyyy-MM-dd");
        const endDate = format(endOfMonth(monthToFetch), "yyyy-MM-dd");

        const activitiesData = await fetchAndParse(
          `/api/cra_activities?userId=${currentUserId}&startDate=${startDate}&endDate=${endDate}`,
          "activités CRA"
        );
        console.log(
          "CRAPage: Données d'activités CRA reçues (après API transformation et lookup):",
          JSON.stringify(activitiesData, null, 2)
        );
        setCraActivities(activitiesData);
        console.log(
          "CRAPage: >>> Activités CRA chargées (fetchCraActivitiesForMonth):",
          activitiesData.length,
          "activités. État craActivities mis à jour."
        );
        return activitiesData;
      } catch (err) {
        console.error(
          "CRAPage: Erreur lors du chargement des activités CRA:",
          err
        );
        showMessage(
          `Erreur de chargement des activités CRA: ${err.message}`,
          "error"
        );
        setCraActivities([]);
        throw err;
      }
    },
    [currentUserId, showMessage, fetchAndParse]
  );

  const fetchClients = useCallback(async () => {
    try {
      const clientsData = await fetchAndParse("/api/client", "clients");
      console.log(
        "CRAPage: Données brutes des clients reçues (après API transformation):",
        JSON.stringify(clientsData, null, 2)
      );

      clientsData.slice(0, 5).forEach((client, index) => {
        console.log(
          `CRAPage: Client ${index} ID:`,
          client.id,
          "Nom:",
          client.nom_client
        );
      });

      setClientDefinitions(clientsData);
      console.log(
        "CRAPage: >>> Définitions de clients chargées:",
        clientsData.length,
        "clients. État clientDefinitions mis à jour."
      );
      return clientsData;
    } catch (err) {
      console.error("CRAPage: Erreur lors du chargement des clients:", err);
      showMessage(`Erreur de chargement des clients: ${err.message}`, "error");
      setClientDefinitions([]);
      throw err;
    }
  }, [showMessage, fetchAndParse]);

  const fetchActivityTypes = useCallback(async () => {
    try {
      const activityTypesData = await fetchAndParse(
        "/api/activity_type",
        "types d'activité"
      );
      console.log(
        "CRAPage: Données brutes des types d'activité reçues (après API transformation):",
        JSON.stringify(activityTypesData, null, 2)
      );
      setActivityTypeDefinitions(activityTypesData);
      console.log(
        "CRAPage: >>> Définitions de types d'activité chargées:",
        activityTypesData.length,
        "types. État activityTypeDefinitions mis à jour."
      );
      activityTypesData.slice(0, 5).forEach((type, index) => {
        console.log(
          `CRAPage: Type d'activité ${index} ID:`,
          type.id,
          "Nom:",
          type.name
        );
      });
      return activityTypesData;
    } catch (err) {
      console.error(
        "CRAPage: Erreur lors du chargement des types d'activité:",
        err
      );
      showMessage(
        `Erreur de chargement des types d'activité: ${err.message}`,
        "error"
      );
      setActivityTypeDefinitions([]);
      throw err;
    }
  }, [showMessage, fetchAndParse]);

  // Initialisation des données au chargement du composant ou changement de session
  useEffect(() => {
    console.log(
      "CRAPage: useEffect principal déclenché. Status:",
      status,
      "UserId:",
      currentUserId
    );
    if (status === "loading") return;

    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (status === "authenticated" && currentUserId) {
          // Utiliser Promise.all pour charger les définitions et ensuite les activités
          await Promise.all([fetchClients(), fetchActivityTypes()]);
          // Une fois les définitions chargées, charger les activités
          await fetchCraActivitiesForMonth(currentDisplayedMonth);
        } else if (status === "unauthenticated") {
          setClientDefinitions([]);
          setActivityTypeDefinitions([]);
          setCraActivities([]);
        }
      } catch (err) {
        console.error(
          "CRAPage: Erreur lors du chargement initial des données:",
          err
        );
        setError(`Erreur de chargement des données: ${err.message}`);
        showMessage(
          `Erreur de chargement des données: ${err.message}`,
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [
    status,
    currentUserId,
    fetchClients,
    fetchActivityTypes,
    fetchCraActivitiesForMonth,
    showMessage,
    currentDisplayedMonth,
  ]);

  const handleAddCraActivity = useCallback(
    async (activityData) => {
      if (!currentUserId || currentUserId === "unauthenticated") {
        showMessage(
          "Veuillez vous connecter pour ajouter des activités.",
          "error"
        );
        throw new Error("Utilisateur non authentifié.");
      }
      try {
        const payload = { ...activityData, user_id: currentUserId };
        console.log(
          "CRAPage: handleAddCraActivity - Payload envoyé:",
          JSON.stringify(payload, null, 2)
        );
        const response = await fetch("/api/cra_activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "CRAPage: Erreur API lors de la création de l'activité:",
            errorData
          );
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${response.statusText}` ||
              "Erreur lors de la création de l'activité CRA."
          );
        }
        const newActivity = await response.json();
        console.log(
          "CRAPage: Activité CRA créée avec succès (réponse API brute):",
          newActivity
        );
        // Après la création, on recharge les activités pour s'assurer qu'elles sont populées
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        showMessage("Activité ajoutée avec succès !", "success"); // Déplacé ici pour s'assurer du rechargement
        return newActivity;
      } catch (error) {
        console.error(
          "CRAPage: Échec de la création de l'activité CRA:",
          error
        );
        showMessage(
          `Échec de la création de l'activité: ${error.message}`,
          "error"
        );
        throw error;
      }
    },
    [
      showMessage,
      currentUserId,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
    ]
  );

  const handleUpdateCraActivity = useCallback(
    async (id, activityData) => {
      if (!currentUserId || currentUserId === "unauthenticated") {
        showMessage(
          "Veuillez vous connecter pour modifier des activités.",
          "error"
        );
        throw new Error("Utilisateur non authentifié.");
      }
      try {
        const payload = { ...activityData, user_id: currentUserId };
        console.log(
          "CRAPage: handleUpdateCraActivity - Payload envoyé:",
          JSON.stringify(payload, null, 2)
        );
        const response = await fetch(`/api/cra_activities/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "CRAPage: Erreur API lors de la mise à jour de l'activité:",
            errorData
          );
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${response.statusText}` ||
              "Erreur lors de la mise à jour de l'activité CRA."
          );
        }
        const updatedActivity = await response.json();
        console.log(
          "CRAPage: Activité CRA mise à jour avec succès (réponse API brute):",
          updatedActivity
        );
        // Après la mise à jour, on recharge les activités pour s'assurer qu'elles sont populées
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        showMessage; //("Activité mise à jour avec succès !", "success"); // Déplacé ici
        return updatedActivity;
      } catch (error) {
        console.error(
          "CRAPage: Échec de la mise à jour de l'activité CRA:",
          error
        );
        showMessage(
          `Échec de la mise à jour de l'activité: ${error.message}`,
          "error"
        );
        throw error;
      }
    },
    [
      showMessage,
      currentUserId,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
    ]
  );

  const handleDeleteActivity = useCallback(
    async (id) => {
      if (!currentUserId || currentUserId === "unauthenticated") {
        showMessage(
          "Veuillez vous connecter pour supprimer des activités.",
          "error"
        );
        throw new Error("Utilisateur non authentifié.");
      }
      try {
        console.log(
          `CRAPage: handleDeleteActivity - Tentative de suppression de l'ID: ${id}`
        );
        const response = await fetch(`/api/cra_activities/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "CRAPage: Erreur API lors de la suppression de l'activité:",
            errorData
          );
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${response.statusText}` ||
              "Échec de la suppression de l'activité CRA."
          );
        }
        console.log(`CRAPage: Activité CRA ${id} supprimée avec succès.`);
        // Après la suppression, on recharge les activités
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        showMessage("Activité supprimée avec succès !", "success"); // Déplacé ici
      } catch (error) {
        console.error(
          "CRAPage: Échec de la suppression de l'activité CRA:",
          error
        );
        showMessage(
          `Échec de la suppression de l'activité: ${error.message}`,
          "error"
        );
        throw error;
      }
    },
    [
      showMessage,
      currentUserId,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
    ]
  );

  const handleAddClient = useCallback(
    async (clientData) => {
      try {
        console.log(
          "CRAPage: handleAddClient - Données à envoyer (avant fetch):",
          JSON.stringify(clientData, null, 2)
        );
        const res = await fetch("/api/client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        });

        console.log(
          `CRAPage: handleAddClient - Réponse API statut: ${res.status}`
        );
        if (!res.ok) {
          const errorData = await res.json();
          console.error("CRAPage: handleAddClient - Erreur API:", errorData);
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Client ajouté avec succès !", "success");
        await fetchClients();
        // Recharge les activités pour s'assurer que les nouvelles associations sont visibles
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error("CRAPage: Erreur lors de l'ajout du client:", error);
        showMessage(`Échec de l'ajout du client: ${error.message}`, "error");
      }
    },
    [
      fetchClients,
      showMessage,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
    ]
  );

  const handleUpdateClient = useCallback(
    async (id, clientData) => {
      console.log(
        `CRAPage: handleUpdateClient - ID reçu: ${id}, Données:`,
        clientData
      );
      if (!id) {
        showMessage(
          "Erreur: ID du client manquant pour la mise à jour.",
          "error"
        );
        console.error(
          "CRAPage: ID du client est undefined lors de la mise à jour."
        );
        return;
      }
      try {
        const res = await fetch(`/api/client/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Client mis à jour avec succès !", "success");
        await fetchClients();
        // Recharge les activités pour s'assurer que les nouvelles associations sont visibles
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error(
          "CRAPage: Erreur lors de la mise à jour du client:",
          error
        );
        showMessage(
          `Échec de la mise à jour du client: ${error.message}`,
          "error"
        );
      }
    },
    [
      fetchClients,
      fetchCraActivitiesForMonth,
      showMessage,
      currentDisplayedMonth,
    ]
  );

  const handleDeleteClient = useCallback(
    async (id) => {
      console.log(`CRAPage: handleDeleteClient - ID reçu: ${id}`);
      if (!id) {
        showMessage(
          "Erreur: ID du client manquant pour la suppression.",
          "error"
        );
        console.error(
          "CRAPage: ID du client est undefined lors de la suppression."
        );
        return;
      }
      try {
        const res = await fetch(`/api/client/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Client supprimé avec succès !", "success");
        await fetchClients();
        // Recharge les activités pour s'assurer que les nouvelles associations sont visibles
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error("CRAPage: Échec de la suppression du client:", error);
        showMessage(
          `Échec de la suppression du client: ${error.message}`,
          "error"
        );
      }
    },
    [
      fetchClients,
      fetchCraActivitiesForMonth,
      showMessage,
      currentDisplayedMonth,
    ]
  );

  const handleAddActivityType = useCallback(
    async (typeData) => {
      try {
        const res = await fetch("/api/activity_type", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(typeData),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Type d'activité ajouté avec succès !", "success");
        await fetchActivityTypes();
        // Recharge les activités pour s'assurer que les nouvelles associations sont visibles
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error(
          "CRAPage: Erreur lors de l'ajout du type d'activité:",
          error
        );
        showMessage(
          `Échec de l'ajout du type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [
      fetchActivityTypes,
      showMessage,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
    ]
  );

  const handleUpdateActivityType = useCallback(
    async (id, typeData) => {
      try {
        console.log(
          `CRAPage: handleUpdateActivityType - ID: ${id}, Données:`,
          typeData
        );
        const res = await fetch(`/api/activity_type/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(typeData),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Type d'activité mis à jour avec succès !", "success");
        await fetchActivityTypes();
        // Recharge les activités pour s'assurer que les nouvelles associations sont visibles
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error(
          "CRAPage: Erreur lors de la mise à jour du type d'activité:",
          error
        );
        showMessage(
          `Échec de la mise à jour du type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [
      fetchActivityTypes,
      fetchCraActivitiesForMonth,
      showMessage,
      currentDisplayedMonth,
    ]
  );

  const handleDeleteActivityType = useCallback(
    async (id) => {
      try {
        const res = await fetch(`/api/activity_type/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Type d'activité supprimé avec succès !", "success");
        await fetchActivityTypes();
        // Recharge les activités pour s'assurer que les nouvelles associations sont visibles
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error(
          "CRAPage: Échec de la suppression du type d'activité:",
          error
        );
        showMessage(
          `Échec de la suppression du type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [
      fetchActivityTypes,
      fetchCraActivitiesForMonth,
      showMessage,
      currentDisplayedMonth,
    ]
  );

  // Affiche un message de chargement tant que les données initiales ne sont pas prêtes
  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-700">
        Chargement des données...
      </div>
    );
  }

  // Affiche un message si l'utilisateur n'est pas authentifié
  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <p className="text-xl text-red-600 mb-4">
          Vous devez être connecté pour accéder à cette page.
        </p>
        <button
          onClick={() => router.push("/api/auth/signin")}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
        >
          Se connecter
        </button>
      </div>
    );
  }

  // Affiche une erreur si le chargement initial a échoué
  if (error) {
    return <div className="text-red-500 text-center py-8">Erreur: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {/* Modification ici: utilisation de max-w-7xl pour plus d'espace */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bouton de retour */}
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Retour
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setActiveTab("craManager")}
            className={`px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${
              activeTab === "craManager"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Mon CRA
          </button>
          <button
            onClick={() => setActiveTab("sentCraHistory")}
            className={`ml-4 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${
              activeTab === "sentCraHistory"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Historique des CRAs envoyés
          </button>
          <button
            onClick={() => setActiveTab("gestion")}
            className={`ml-4 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${
              activeTab === "gestion"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Gestion
          </button>
          <button
            onClick={() => setActiveTab("receivedCras")}
            className={`ml-4 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${
              activeTab === "receivedCras"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            CRAs Reçus
          </button>
        </div>

        {activeTab === "craManager" && (
          <CraBoard
            userId={currentUserId}
            userFirstName={currentUserName}
            activities={craActivities}
            activityTypeDefinitions={activityTypeDefinitions}
            clientDefinitions={clientDefinitions}
            onAddActivity={handleAddCraActivity}
            onUpdateActivity={handleUpdateCraActivity}
            onDeleteActivity={handleDeleteActivity}
            fetchActivitiesForMonth={fetchCraActivitiesForMonth}
            showMessage={showMessage}
            currentMonth={currentDisplayedMonth}
            onMonthChange={setCurrentDisplayedMonth}
          />
        )}

        {activeTab === "sentCraHistory" && (
          <p className="text-center text-gray-600 text-lg">
            Historique des CRAs envoyés à implémenter.
          </p>
        )}

        {activeTab === "gestion" && (
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
        )}

        {activeTab === "receivedCras" && (
          // Remplacement du placeholder par le composant ReceivedCras réel
          <ReceivedCras
            userId={currentUserId}
            userFirstName={currentUserName}
            userRole={currentUserRole} // Passe le rôle de l'utilisateur
            showMessage={showMessage}
          />
        )}
      </div>

      <ToastMessage
        message={toastMessage.message}
        type={toastMessage.type}
        isVisible={toastMessage.isVisible}
        onClose={hideMessage}
      />
    </div>
  );
}
