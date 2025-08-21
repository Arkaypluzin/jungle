"use client";

import { useEffect, useState, useCallback } from "react";
import { PlusCircle, Edit2, Trash2, Loader2 } from "lucide-react";

export default function UnifiedAdminPage() {
  const [activeTab, setActiveTab] = useState("projets");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshFlag, setRefreshFlag] = useState(0);

  // --- États pour les Projets ---
  const [projets, setProjets] = useState([]);
  const [projetModalOpen, setProjetModalOpen] = useState(false);
  const [nomProjet, setNomProjet] = useState("");
  const [editProjet, setEditProjet] = useState(null);
  const [editNomProjet, setEditNomProjet] = useState("");

  // --- États pour les Clients ---
  const [clients, setClients] = useState([]);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [nomClient, setNomClient] = useState("");
  const [editClient, setEditClient] = useState(null);
  const [editNomClient, setEditNomClient] = useState("");

  // --- États pour les Types d'Activité ---
  const [activityTypes, setActivityTypes] = useState([]);
  // Nouvel état pour gérer le filtre de l'onglet "Types d'Activité"
  const [filterActivityType, setFilterActivityType] = useState("all");
  const [activityTypeModalOpen, setActivityTypeModalOpen] = useState(false);
  const [newActivityTypeData, setNewActivityTypeData] = useState({
    name: "",
    is_billable: false,
    requires_client: true,
    is_overtime: false,
    is_absence: false,
  });
  const [editActivityType, setEditActivityType] = useState(null);
  const [editActivityTypeData, setEditActivityTypeData] = useState(null);

  // --- État commun pour les formulaires ---
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // --- État commun pour la suppression ---
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // --- Effet de chargement initial ---
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        let endpoint = "";
        if (activeTab === "projets") {
          endpoint = "/api/projets";
        } else if (activeTab === "clients") {
          endpoint = "/api/client";
        } else if (activeTab === "activityTypes") {
          endpoint = "/api/activity_type";
        }

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error("Erreur de l'API");
        const data = await res.json();

        if (activeTab === "projets") {
          setProjets(data);
        } else if (activeTab === "clients") {
          setClients(data);
        } else if (activeTab === "activityTypes") {
          setActivityTypes(data);
        }
      } catch (err) {
        setError("Erreur lors du chargement des données. Veuillez vérifier l'API.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeTab, refreshFlag]);

  // --- Logique de suppression unifiée ---
  const openDeleteModal = useCallback((item) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
    setDeleteError("");
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    setDeleteError("");

    let endpoint = "";
    const id = itemToDelete.id || itemToDelete.uuid;

    if (activeTab === "projets") {
      endpoint = `/api/projets/${id}`;
    } else if (activeTab === "clients") {
      endpoint = `/api/client/${id}`;
    } else if (activeTab === "activityTypes") {
      endpoint = `/api/activity_type/${id}`;
    }

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        setDeleteModalOpen(false);
        setItemToDelete(null);
        setRefreshFlag((f) => f + 1);
      } else {
        const data = await res.json();
        setDeleteError(data.message || "Erreur lors de la suppression.");
      }
    } catch (err) {
      setDeleteError("Erreur serveur lors de la suppression.");
    } finally {
      setDeleteLoading(false);
    }
  }, [itemToDelete, activeTab]);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalOpen(false);
    setItemToDelete(null);
    setDeleteError("");
  }, []);

  // --- Logique de gestion pour les Projets ---
  const handleCreateProjet = useCallback(
    async (e) => {
      e.preventDefault();
      setFormLoading(true);
      setFormError("");
      const nom = nomProjet.trim();
      if (!nom) {
        setFormError("Le nom du projet est requis.");
        setFormLoading(false);
        return;
      }
      const res = await fetch("/api/projets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom }),
      });
      if (res.ok) {
        setProjetModalOpen(false);
        setNomProjet("");
        setRefreshFlag((f) => f + 1);
      } else {
        const data = await res.json();
        setFormError(data.message || "Erreur lors de la création.");
      }
      setFormLoading(false);
    },
    [nomProjet]
  );

  const handleEditProjet = useCallback(
    async (e) => {
      e.preventDefault();
      setFormLoading(true);
      setFormError("");
      const nom = editNomProjet.trim();
      if (!nom) {
        setFormError("Le nom du projet est requis.");
        setFormLoading(false);
        return;
      }
      const res = await fetch(`/api/projets/${editProjet.id || editProjet.uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom }),
      });
      if (res.ok) {
        setProjetModalOpen(false);
        setEditProjet(null);
        setEditNomProjet("");
        setRefreshFlag((f) => f + 1);
      } else {
        const data = await res.json();
        setFormError(data.message || "Erreur lors de la modification.");
      }
      setFormLoading(false);
    },
    [editProjet, editNomProjet]
  );

  // --- Logique de gestion pour les Clients ---
  const handleCreateClient = useCallback(
    async (e) => {
      e.preventDefault();
      setFormLoading(true);
      setFormError("");
      const nom_client = nomClient.trim();
      if (!nom_client) {
        setFormError("Le nom du client est requis.");
        setFormLoading(false);
        return;
      }
      const res = await fetch("/api/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom_client }),
      });
      if (res.ok) {
        setClientModalOpen(false);
        setNomClient("");
        setRefreshFlag((f) => f + 1);
      } else {
        const data = await res.json();
        setFormError(data.message || "Erreur lors de la création.");
      }
      setFormLoading(false);
    },
    [nomClient]
  );

  const handleEditClient = useCallback(
    async (e) => {
      e.preventDefault();
      setFormLoading(true);
      setFormError("");
      const nom_client = editNomClient.trim();
      if (!nom_client) {
        setFormError("Le nom du client est requis.");
        setFormLoading(false);
        return;
      }
      const res = await fetch(`/api/client/${editClient.id || editClient.uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom_client }),
      });
      if (res.ok) {
        setClientModalOpen(false);
        setEditClient(null);
        setEditNomClient("");
        setRefreshFlag((f) => f + 1);
      } else {
        const data = await res.json();
        setFormError(data.message || "Erreur lors de la modification.");
      }
      setFormLoading(false);
    },
    [editClient, editNomClient]
  );

  // --- Logique de gestion pour les Types d'Activité ---
  const handleCreateActivityType = useCallback(
    async (e) => {
      e.preventDefault();
      setFormLoading(true);
      setFormError("");
      if (!newActivityTypeData.name.trim()) {
        setFormError("Le nom du type d'activité est requis.");
        setFormLoading(false);
        return;
      }
      const res = await fetch("/api/activity_type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newActivityTypeData),
      });
      if (res.ok) {
        setActivityTypeModalOpen(false);
        setNewActivityTypeData({
          name: "",
          is_billable: false,
          requires_client: true,
          is_overtime: false,
          is_absence: false,
        });
        setRefreshFlag((f) => f + 1);
      } else {
        const data = await res.json();
        setFormError(data.message || "Erreur lors de la création.");
      }
      setFormLoading(false);
    },
    [newActivityTypeData]
  );

  const handleEditActivityType = useCallback(
    async (e) => {
      e.preventDefault();
      setFormLoading(true);
      setFormError("");
      if (!editActivityTypeData.name.trim()) {
        setFormError("Le nom du type d'activité est requis.");
        setFormLoading(false);
        return;
      }
      const res = await fetch(
        `/api/activity_type/${editActivityType.id || editActivityType.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editActivityTypeData),
        }
      );
      if (res.ok) {
        setActivityTypeModalOpen(false);
        setEditActivityType(null);
        setEditActivityTypeData(null);
        setRefreshFlag((f) => f + 1);
      } else {
        const data = await res.json();
        setFormError(data.message || "Erreur lors de la modification.");
      }
      setFormLoading(false);
    },
    [editActivityType, editActivityTypeData]
  );


  // --- Rendu conditionnel des onglets ---
  const renderContent = () => {
    let dataList = [];
    let title = "";
    let itemLabel = "";
    let handleAddOpen;
    let handleEditOpen;

    switch (activeTab) {
      case "projets":
        dataList = projets;
        title = "Gestion des Projets";
        itemLabel = "Projet";
        handleAddOpen = () => setProjetModalOpen(true);
        handleEditOpen = (item) => {
          setEditProjet(item);
          setEditNomProjet(item.nom || "");
          setProjetModalOpen(true);
        };
        break;
      case "clients":
        dataList = clients;
        title = "Gestion des Clients";
        itemLabel = "Client";
        handleAddOpen = () => setClientModalOpen(true);
        handleEditOpen = (item) => {
          setEditClient(item);
          setEditNomClient(item.nom_client || "");
          setClientModalOpen(true);
        };
        break;
      case "activityTypes":
        // Filtrer les types d'activité en fonction du sous-onglet
        dataList = activityTypes.filter(item => {
          if (filterActivityType === "presence") {
            return !item.is_absence;
          } else if (filterActivityType === "absence") {
            return item.is_absence;
          }
          return true;
        });

        title = "Gestion des Types d'Activité";
        itemLabel = "Type d'Activité";
        handleAddOpen = () => setActivityTypeModalOpen(true);
        handleEditOpen = (item) => {
          setEditActivityType(item);
          setEditActivityTypeData({
            name: item.name,
            is_billable: item.is_billable,
            requires_client: item.requires_client,
            is_overtime: item.is_overtime,
            is_absence: item.is_absence,
          });
          setActivityTypeModalOpen(true);
        };
        break;
      default:
        return null;
    }

    return (
      <div className="bg-white rounded-2xl shadow-lg border px-2 py-3 sm:px-6 sm:py-6 min-h-[300px] transition-all">
        {activeTab === "activityTypes" && (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setFilterActivityType("all")}
              className={`px-4 py-2 rounded-l-lg font-semibold transition duration-300 ${filterActivityType === "all" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterActivityType("presence")}
              className={`px-4 py-2 font-semibold transition duration-300 ${filterActivityType === "presence" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              Présences
            </button>
            <button
              onClick={() => setFilterActivityType("absence")}
              className={`px-4 py-2 rounded-r-lg font-semibold transition duration-300 ${filterActivityType === "absence" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              Absences
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-8 sticky top-2 bg-white/95 z-10 rounded-xl shadow-sm px-3 py-2">
          <span className="font-medium text-lg text-gray-700">
            {title.replace('Gestion des ', '')} ({dataList.length})
          </span>
          <button
            onClick={handleAddOpen}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg shadow hover:bg-green-700 transition-all font-semibold"
          >
            <PlusCircle className="w-5 h-5" />
            Nouveau {itemLabel}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin w-8 h-8 text-blue-400" />
            <span className="ml-3 text-blue-500">Chargement des {itemLabel}s…</span>
          </div>
        ) : error ? (
          <p className="text-red-500 py-10 text-center">{error}</p>
        ) : dataList.length === 0 ? (
          <p className="text-gray-400 text-lg py-10 text-center">Aucun {itemLabel.toLowerCase()} trouvé pour ce filtre.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {dataList.map((item) => (
              <div
                key={item.id || item.uuid}
                className="bg-gradient-to-br from-blue-50 to-white border rounded-xl shadow-sm p-6 flex flex-col justify-between group hover:shadow-xl transition-all"
              >
                <div>
                  <div className="font-semibold text-xl text-gray-800 mb-2 group-hover:text-blue-700 transition">
                    {activeTab === "projets" && item.nom}
                    {activeTab === "clients" && item.nom_client}
                    {activeTab === "activityTypes" && item.name}
                  </div>
                  {activeTab === "activityTypes" && (
                    <div className="flex flex-wrap text-sm text-gray-500 gap-x-3 mt-1">
                      {item.is_billable ? <span className="text-green-600">Facturable</span> : <span className="text-red-600">Non Facturable</span>}
                      {item.requires_client ? <span className="text-blue-600">Client Requis</span> : <span className="text-gray-500">Client Non Requis</span>}
                      {item.is_overtime ? <span className="text-purple-600">Heures Supp.</span> : <span className="text-gray-500">Non HS</span>}
                      {item.is_absence ? <span className="text-red-600 font-bold">Absence</span> : <span className="text-green-600 font-bold">Présence</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleEditOpen(item)}
                    className="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-md bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-100 font-medium shadow-sm transition-all"
                  >
                    <Edit2 className="w-5 h-5" /> Modifier
                  </button>
                  <button
                    onClick={() => openDeleteModal(item)}
                    className="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-md bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-100 font-medium shadow-sm transition-all"
                  >
                    <Trash2 className="w-5 h-5" /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Gestion des Données de Référence
            </h1>
            <div className="text-gray-500 text-sm">Admin | Gérer tous les éléments de base de votre application</div>
          </div>
          {/* Le composant BtnRetour a été remplacé par un simple lien de retour pour éviter les erreurs d'importation */}
          <a href="/dashboard/admin" className="px-4 py-2 rounded-lg text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors">
            Retour
          </a>
        </div>

        {/* Onglets */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setActiveTab("projets")}
            className={`px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${activeTab === "projets" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
          >
            Projets
          </button>
          <button
            onClick={() => setActiveTab("clients")}
            className={`ml-2 px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${activeTab === "clients" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
          >
            Clients
          </button>
          <button
            onClick={() => setActiveTab("activityTypes")}
            className={`ml-2 px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${activeTab === "activityTypes" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
          >
            Activités
          </button>
        </div>

        {/* Contenu principal */}
        {renderContent()}

        {/* Modale d'Ajout/Édition pour les Projets */}
        {projetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fadeIn">
              <button
                onClick={() => { setProjetModalOpen(false); setFormError(""); setEditProjet(null); setNomProjet(""); setEditNomProjet(""); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
                aria-label="Fermer"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold mb-4 text-blue-700">
                {editProjet ? "Modifier le projet" : "Nouveau projet"}
              </h2>
              <form onSubmit={editProjet ? handleEditProjet : handleCreateProjet} className="space-y-5">
                <div>
                  <label className="block mb-1 font-medium text-gray-700">Nom du projet</label>
                  <input
                    type="text"
                    value={editProjet ? editNomProjet : nomProjet}
                    onChange={e => editProjet ? setEditNomProjet(e.target.value) : setNomProjet(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                    placeholder="Nom du projet"
                    required
                  />
                </div>
                {formError && <div className="text-red-500 text-sm">{formError}</div>}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setProjetModalOpen(false); setFormError(""); setEditProjet(null); setNomProjet(""); setEditNomProjet(""); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    disabled={formLoading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={formLoading}
                  >
                    {formLoading ? (editProjet ? "Modification..." : "Création...") : (editProjet ? "Enregistrer" : "Créer")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modale d'Ajout/Édition pour les Clients */}
        {clientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fadeIn">
              <button
                onClick={() => { setClientModalOpen(false); setFormError(""); setEditClient(null); setNomClient(""); setEditNomClient(""); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
                aria-label="Fermer"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold mb-4 text-blue-700">
                {editClient ? "Modifier le client" : "Nouveau client"}
              </h2>
              <form onSubmit={editClient ? handleEditClient : handleCreateClient} className="space-y-5">
                <div>
                  <label className="block mb-1 font-medium text-gray-700">Nom du client</label>
                  <input
                    type="text"
                    value={editClient ? editNomClient : nomClient}
                    onChange={e => editClient ? setEditNomClient(e.target.value) : setNomClient(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                    placeholder="Nom du client"
                    required
                  />
                </div>
                {formError && <div className="text-red-500 text-sm">{formError}</div>}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setClientModalOpen(false); setFormError(""); setEditClient(null); setNomClient(""); setEditNomClient(""); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    disabled={formLoading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={formLoading}
                  >
                    {formLoading ? (editClient ? "Modification..." : "Création...") : (editClient ? "Enregistrer" : "Créer")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modale d'Ajout/Édition pour les Types d'Activité */}
        {activityTypeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fadeIn">
              <button
                onClick={() => { setActivityTypeModalOpen(false); setFormError(""); setEditActivityType(null); setEditActivityTypeData(null); setNewActivityTypeData({ name: "", is_billable: false, requires_client: true, is_overtime: false, is_absence: false }); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
                aria-label="Fermer"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold mb-4 text-blue-700">
                {editActivityType ? "Modifier le type d'activité" : "Nouveau type d'activité"}
              </h2>
              <form onSubmit={editActivityType ? handleEditActivityType : handleCreateActivityType} className="space-y-5">
                <div>
                  <label className="block mb-1 font-medium text-gray-700">Nom</label>
                  <input
                    type="text"
                    name="name"
                    value={editActivityTypeData ? editActivityTypeData.name : newActivityTypeData.name}
                    onChange={e => editActivityTypeData ? setEditActivityTypeData({ ...editActivityTypeData, name: e.target.value }) : setNewActivityTypeData({ ...newActivityTypeData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                    placeholder="Nom du type d'activité"
                    required
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center text-gray-700 font-medium">
                    <input
                      type="checkbox"
                      name="is_billable"
                      checked={editActivityTypeData ? editActivityTypeData.is_billable : newActivityTypeData.is_billable}
                      onChange={e => editActivityTypeData ? setEditActivityTypeData({ ...editActivityTypeData, is_billable: e.target.checked }) : setNewActivityTypeData({ ...newActivityTypeData, is_billable: e.target.checked })}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    Facturable
                  </label>
                  <label className="flex items-center text-gray-700 font-medium">
                    <input
                      type="checkbox"
                      name="requires_client"
                      checked={editActivityTypeData ? editActivityTypeData.requires_client : newActivityTypeData.requires_client}
                      onChange={e => editActivityTypeData ? setEditActivityTypeData({ ...editActivityTypeData, requires_client: e.target.checked }) : setNewActivityTypeData({ ...newActivityTypeData, requires_client: e.target.checked })}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    Nécessite un client
                  </label>
                  <label className="flex items-center text-gray-700 font-medium">
                    <input
                      type="checkbox"
                      name="is_overtime"
                      checked={editActivityTypeData ? editActivityTypeData.is_overtime : newActivityTypeData.is_overtime}
                      onChange={e => editActivityTypeData ? setEditActivityTypeData({ ...editActivityTypeData, is_overtime: e.target.checked }) : setNewActivityTypeData({ ...newActivityTypeData, is_overtime: e.target.checked })}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    Heures supplémentaires
                  </label>
                  <label className="flex items-center text-gray-700 font-medium">
                    <input
                      type="checkbox"
                      name="is_absence"
                      checked={editActivityTypeData ? editActivityTypeData.is_absence : newActivityTypeData.is_absence}
                      onChange={e => editActivityTypeData ? setEditActivityTypeData({ ...editActivityTypeData, is_absence: e.target.checked }) : setNewActivityTypeData({ ...newActivityTypeData, is_absence: e.target.checked })}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    Est une absence
                  </label>
                </div>
                {formError && <div className="text-red-500 text-sm">{formError}</div>}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setActivityTypeModalOpen(false); setFormError(""); setEditActivityType(null); setEditActivityTypeData(null); setNewActivityTypeData({ name: "", is_billable: false, requires_client: true, is_overtime: false, is_absence: false }); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    disabled={formLoading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={formLoading}
                  >
                    {formLoading ? (editActivityType ? "Modification..." : "Création...") : (editActivityType ? "Enregistrer" : "Créer")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modale de Suppression */}
        {deleteModalOpen && itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fadeIn">
              <button
                onClick={closeDeleteModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
                aria-label="Fermer"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold mb-4 text-red-700">Confirmer la suppression</h2>
              <p className="mb-6 text-black">
                Êtes-vous sûr de vouloir supprimer{" "}
                {activeTab === "projets" && <b>le projet {itemToDelete.nom}</b>}
                {activeTab === "clients" && <b>le client {itemToDelete.nom_client}</b>}
                {activeTab === "activityTypes" && <b>le type d&apos;activité {itemToDelete.name}</b>} ?
                <br />
                <span className="text-red-500 font-bold">Cette action est irréversible.</span>
              </p>
              {deleteError && <div className="text-red-500 text-sm mb-2">{deleteError}</div>}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  disabled={deleteLoading}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirmed}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
