"use client";

import React, { useState, useCallback, useEffect } from "react";
import ConfirmationModal from "../Modals/ConfirmationModal";

export default function UnifiedManager({
  clientDefinitions,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  activityTypeDefinitions,
  onAddActivityType,
  onUpdateActivityType,
  onDeleteActivityType,
  showMessage,
}) {
  const [activeTab, setActiveTab] = useState("clients");

  // --- Client Management States and Callbacks ---
  const [newClientData, setNewClientData] = useState({ nom_client: "" });
  const [editClientData, setEditClientData] = useState(null);
  const [isClientEditModalOpen, setIsClientEditModalOpen] = useState(false);

  const handleNewClientChange = useCallback((e) => {
    setNewClientData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleEditClientChange = useCallback((e) => {
    setEditClientData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleAddClientSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      // Assurez-vous que le nom du client est toujours une chaîne et supprimez les espaces blancs
      const clientName = newClientData.nom_client
        ? String(newClientData.nom_client).trim()
        : "";

      console.log(
        "UnifiedManager: Tentative d'ajout de client. Nom actuel (après trim):",
        `"${clientName}"`
      ); // NOUVEAU LOG CLÉ

      // Validation côté client: Si le nom est vide après avoir retiré les espaces
      if (clientName === "") {
        showMessage("Le nom du client est requis (côté client).", "error"); // Message plus spécifique
        console.warn(
          "UnifiedManager: Validation côté client bloquée: Nom du client vide ou espaces."
        );
        return; // Empêche l'envoi de la requête API
      }

      console.log(
        "UnifiedManager: Validation côté client réussie. Envoi de newClientData à onAddClient:",
        JSON.stringify({ nom_client: clientName })
      );
      await onAddClient({ nom_client: clientName }); // Passez la valeur nettoyée
      setNewClientData({ nom_client: "" }); // Réinitialisez l'input
    },
    [newClientData, onAddClient, showMessage]
  );

  const handleUpdateClientSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (
        editClientData &&
        (!editClientData.nom_client || editClientData.nom_client.trim() === "")
      ) {
        showMessage("Le nom du client est requis.", "error");
        return;
      }
      if (editClientData) {
        console.log(
          "UnifiedManager: Tentative de mise à jour du client avec ID:",
          editClientData.id,
          "et données:",
          editClientData
        );
        try {
          await onUpdateClient(editClientData.id, editClientData);
          setIsClientEditModalOpen(false);
          setEditClientData(null);
        } catch (error) {
          console.error(
            "UnifiedManager: Erreur lors de la soumission de la mise à jour du client:",
            error
          );
          showMessage(
            `Échec de la mise à jour du client: ${error.message}`,
            "error"
          );
        }
      }
    },
    [editClientData, onUpdateClient, showMessage]
  );

  const [showClientConfirmModal, setShowClientConfirmModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const requestDeleteClient = useCallback((client) => {
    console.log(
      "UnifiedManager: Demande de suppression du client avec ID:",
      client.id,
      "Nom:",
      client.nom_client
    );
    setClientToDelete(client.id);
    setShowClientConfirmModal(true);
  }, []);

  const confirmDeleteClient = useCallback(async () => {
    setShowClientConfirmModal(false);
    if (clientToDelete) {
      console.log(
        "UnifiedManager: Confirmation de suppression du client avec ID:",
        clientToDelete
      );
      await onDeleteClient(clientToDelete);
      setClientToDelete(null);
    }
  }, [clientToDelete, onDeleteClient]);

  const cancelDeleteClient = useCallback(() => {
    setShowClientConfirmModal(false);
    setClientToDelete(null);
  }, []);

  const openClientEditModal = useCallback((client) => {
    console.log(
      "UnifiedManager: Ouverture de la modale d'édition pour le client:",
      client.id,
      "Nom:",
      client.nom_client
    );
    setEditClientData({ id: client.id, nom_client: client.nom_client });
    setIsClientEditModalOpen(true);
  }, []);

  const closeClientEditModal = useCallback(() => {
    setIsClientEditModalOpen(false);
    setEditClientData(null);
  }, []);

  // --- Activity Type Management States and Callbacks ---
  const [newActivityTypeData, setNewActivityTypeData] = useState({
    name: "",
    is_billable: false,
    requires_client: true,
    is_overtime: false,
    is_absence: false, // NOUVEAU: Ajout de is_absence
  });
  const [editActivityTypeData, setEditActivityTypeData] = useState(null);
  const [isActivityTypeEditModalOpen, setIsActivityTypeEditModalOpen] =
    useState(false);

  const handleNewActivityTypeChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setNewActivityTypeData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleEditActivityTypeChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setEditActivityTypeData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleAddActivityTypeSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newActivityTypeData.name.trim()) {
        showMessage("Le nom du type d'activité est requis.", "error");
        return;
      }
      await onAddActivityType(newActivityTypeData);
      setNewActivityTypeData({
        name: "",
        is_billable: false,
        requires_client: true,
        is_overtime: false,
        is_absence: false, // Réinitialisation de is_absence
      });
    },
    [newActivityTypeData, onAddActivityType, showMessage]
  );

  const handleUpdateActivityTypeSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (editActivityTypeData && !editActivityTypeData.name.trim()) {
        showMessage("Le nom du type d'activité est requis.", "error");
        return;
      }
      if (editActivityTypeData) {
        console.log(
          "UnifiedManager: Tentative de mise à jour du type d'activité avec ID:",
          editActivityTypeData.id,
          "et données:",
          editActivityTypeData
        );
        try {
          await onUpdateActivityType(
            editActivityTypeData.id,
            editActivityTypeData
          );
          setIsActivityTypeEditModalOpen(false);
          setEditActivityTypeData(null);
        } catch (error) {
          console.error(
            "UnifiedManager: Erreur lors de la soumission de la mise à jour du type d'activité:",
            error
          );
          showMessage(
            `Échec de la mise à jour du type d'activité: ${error.message}`,
            "error"
          );
        }
      }
    },
    [editActivityTypeData, onUpdateActivityType, showMessage]
  );

  const [showActivityTypeConfirmModal, setShowActivityTypeConfirmModal] =
    useState(false);
  const [activityTypeToDelete, setActivityTypeToDelete] = useState(null);

  const requestDeleteActivityType = useCallback((activityTypeId) => {
    setActivityTypeToDelete(activityTypeId);
    setShowActivityTypeConfirmModal(true);
  }, []);

  const confirmDeleteActivityType = useCallback(async () => {
    setShowActivityTypeConfirmModal(false);
    if (activityTypeToDelete) {
      await onDeleteActivityType(activityTypeToDelete);
      setActivityTypeToDelete(null);
    }
  }, [activityTypeToDelete, onDeleteActivityType]);

  const cancelDeleteActivityType = useCallback(() => {
    setShowActivityTypeConfirmModal(false);
    setActivityTypeToDelete(null);
  }, []);

  const openActivityTypeEditModal = useCallback((activityType) => {
    setEditActivityTypeData({
      id: activityType.id,
      name: activityType.name,
      is_billable: activityType.is_billable ?? false,
      requires_client: activityType.requires_client ?? true,
      is_overtime: activityType.is_overtime ?? false,
      is_absence: activityType.is_absence ?? false, // NOUVEAU: Récupération de is_absence
    });
    setIsActivityTypeEditModalOpen(true);
  }, []);

  const closeActivityTypeEditModal = useCallback(() => {
    setIsActivityTypeEditModalOpen(false);
    setEditActivityTypeData(null);
  }, []);

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 w-full max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Gestion des Données de Référence
      </h2>

      <div className="flex justify-center mb-6">
        <button
          onClick={() => setActiveTab("clients")}
          className={`px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${
            activeTab === "clients"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Clients
        </button>
        <button
          onClick={() => setActiveTab("activityTypes")}
          className={`ml-2 px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${
            activeTab === "activityTypes"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Types Activité
        </button>
      </div>

      {activeTab === "clients" && (
        <div className="mb-10 p-6 border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">
            Gestion des Clients
          </h3>
          <form
            onSubmit={
              isClientEditModalOpen
                ? handleUpdateClientSubmit
                : handleAddClientSubmit
            }
            className="mb-6 flex flex-col sm:flex-row gap-4"
          >
            <input
              type="text"
              name="nom_client"
              placeholder="Nom du nouveau client"
              value={
                isClientEditModalOpen && editClientData
                  ? editClientData.nom_client
                  : newClientData.nom_client
              }
              onChange={
                isClientEditModalOpen
                  ? handleEditClientChange
                  : handleNewClientChange
              }
              className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
            >
              {isClientEditModalOpen
                ? "Modifier le client"
                : "Ajouter un client"}
            </button>
            {isClientEditModalOpen && (
              <button
                type="button"
                onClick={closeClientEditModal}
                className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300"
              >
                Annuler
              </button>
            )}
          </form>

          <h4 className="text-xl font-semibold text-gray-700 mb-4">
            Clients existants :
          </h4>
          {clientDefinitions.length === 0 ? (
            <p className="text-gray-500">Aucun client défini.</p>
          ) : (
            <ul className="space-y-2">
              {clientDefinitions.map((client) => (
                <li
                  key={client.id || client._id?.toString() || client.nom_client}
                  className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200 shadow-sm"
                >
                  <span className="text-gray-800 font-medium">
                    {client.nom_client}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openClientEditModal(client)}
                      className="p-2 rounded-full bg-yellow-400 text-white hover:bg-yellow-500 transition duration-300"
                      title="Modifier"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => requestDeleteClient(client)}
                      className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition duration-300"
                      title="Supprimer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm-1 3a1 1 0 100 2h8a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "activityTypes" && (
        <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">
            Gestion types activité
          </h3>
          <form
            onSubmit={
              isActivityTypeEditModalOpen
                ? handleUpdateActivityTypeSubmit
                : handleAddActivityTypeSubmit
            }
            className="mb-6 flex flex-col sm:flex-row gap-4 items-center flex-wrap"
          >
            <input
              type="text"
              name="name"
              placeholder="Nom du nouveau type d'activité"
              value={
                isActivityTypeEditModalOpen && editActivityTypeData
                  ? editActivityTypeData.name
                  : newActivityTypeData.name
              }
              onChange={
                isActivityTypeEditModalOpen
                  ? handleEditActivityTypeChange
                  : handleNewActivityTypeChange
              }
              className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
            />
            <label
              htmlFor="is_billable"
              className="flex items-center text-gray-700 font-medium px-2 py-1"
            >
              <input
                type="checkbox"
                id="is_billable"
                name="is_billable"
                checked={
                  isActivityTypeEditModalOpen && editActivityTypeData
                    ? editActivityTypeData.is_billable
                    : newActivityTypeData.is_billable
                }
                onChange={
                  isActivityTypeEditModalOpen
                    ? handleEditActivityTypeChange
                    : handleNewActivityTypeChange
                }
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              Facturable
            </label>
            <label
              htmlFor="requires_client"
              className="flex items-center text-gray-700 font-medium px-2 py-1"
            >
              <input
                type="checkbox"
                id="requires_client"
                name="requires_client"
                checked={
                  isActivityTypeEditModalOpen && editActivityTypeData
                    ? editActivityTypeData.requires_client
                    : newActivityTypeData.requires_client
                }
                onChange={
                  isActivityTypeEditModalOpen
                    ? handleEditActivityTypeChange
                    : handleNewActivityTypeChange
                }
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              Nécessite un client
            </label>
            <label
              htmlFor="is_overtime"
              className="flex items-center text-gray-700 font-medium px-2 py-1"
            >
              <input
                type="checkbox"
                id="is_overtime"
                name="is_overtime"
                checked={
                  isActivityTypeEditModalOpen && editActivityTypeData
                    ? editActivityTypeData.is_overtime
                    : newActivityTypeData.is_overtime
                }
                onChange={
                  isActivityTypeEditModalOpen
                    ? handleEditActivityTypeChange
                    : handleNewActivityTypeChange
                }
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              Heures supplémentaires
            </label>
            {/* NOUVEAU CHAMP: is_absence */}
            <label
              htmlFor="is_absence"
              className="flex items-center text-gray-700 font-medium px-2 py-1"
            >
              <input
                type="checkbox"
                id="is_absence"
                name="is_absence"
                checked={
                  isActivityTypeEditModalOpen && editActivityTypeData
                    ? editActivityTypeData.is_absence
                    : newActivityTypeData.is_absence
                }
                onChange={
                  isActivityTypeEditModalOpen
                    ? handleEditActivityTypeChange
                    : handleNewActivityTypeChange
                }
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              Est une absence
            </label>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 min-w-[120px]"
            >
              {isActivityTypeEditModalOpen
                ? "Modifier le type"
                : "Ajouter un type"}
            </button>
            {isActivityTypeEditModalOpen && (
              <button
                type="button"
                onClick={closeActivityTypeEditModal}
                className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300 min-w-[100px]"
              >
                Annuler
              </button>
            )}
          </form>

          <h4 className="text-xl font-semibold text-gray-700 mb-4">
            Types activité existants :
          </h4>
          {activityTypeDefinitions.length === 0 ? (
            <p className="text-gray-500">Aucun type activité défini.</p>
          ) : (
            <ul className="space-y-2">
              {activityTypeDefinitions.map((type, idx) => (
                <li
                  key={
                    type.id ?? type._id?.toString() ?? `activity-type-${idx}`
                  }
                  className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200 shadow-sm"
                >
                  <span className="text-gray-800 font-medium">
                    {type.name}
                    {type.is_billable ? (
                      <span
                        className="ml-2 text-green-600 text-sm"
                        title="Facturable"
                      >
                        {" "}
                        (Facturable)
                      </span>
                    ) : (
                      <span
                        className="ml-2 text-red-600 text-sm"
                        title="Non facturable"
                      >
                        {" "}
                        (Non facturable)
                      </span>
                    )}
                    {type.requires_client ? (
                      <span
                        className="ml-2 text-blue-600 text-sm"
                        title="Nécessite un client"
                      >
                        {" "}
                        (Client requis)
                      </span>
                    ) : (
                      <span
                        className="ml-2 text-gray-500 text-sm"
                        title="Client non requis"
                      >
                        {" "}
                        (Client non requis)
                      </span>
                    )}
                    {type.is_overtime ? (
                      <span
                        className="ml-2 text-purple-600 text-sm"
                        title="Heures supplémentaires"
                      >
                        {" "}
                        (HS)
                      </span>
                    ) : (
                      <span
                        className="ml-2 text-gray-500 text-sm"
                        title="Pas d'heures supplémentaires"
                      >
                        {" "}
                        (Non HS)
                      </span>
                    )}
                    {/* NOUVEAU: Affichage de is_absence */}
                    {type.is_absence ? (
                      <span
                        className="ml-2 text-orange-600 text-sm font-bold"
                        title="Est une absence"
                      >
                        {" "}
                        (Absence) 🏖️
                      </span>
                    ) : (
                      <span
                        className="ml-2 text-gray-500 text-sm"
                        title="Est une présence"
                      >
                        {" "}
                        (Présence) 💼
                      </span>
                    )}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openActivityTypeEditModal(type)}
                      className="p-2 rounded-full bg-yellow-400 text-white hover:bg-yellow-500 transition duration-300"
                      title="Modifier"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => requestDeleteActivityType(type.id)}
                      className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition duration-300"
                      title="Supprimer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm-1 3a1 1 0 100 2h8a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={showClientConfirmModal}
        onClose={cancelDeleteClient}
        onConfirm={confirmDeleteClient}
        title="Confirmer la suppression du client"
        message="Êtes-vous sûr de vouloir supprimer ce client ? Toutes les activités associées à ce client resteront mais n'auront plus de client attribué."
      />
      <ConfirmationModal
        isOpen={showActivityTypeConfirmModal}
        onClose={cancelDeleteActivityType}
        onConfirm={confirmDeleteActivityType}
        title="Confirmer la suppression du type d'activité"
        message="Êtes-vous sûr de vouloir supprimer ce type d'activité ? Toutes les activités de ce type seront marquées comme 'Type Inconnu'."
      />
    </div>
  );
}
