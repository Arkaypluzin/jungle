import React, { useState } from "react";
import ConfirmationModal from "./ConfirmationModal";

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
  // ---- Gestion clients ----
  const [newClientName, setNewClientName] = useState("");
  const [editingClient, setEditingClient] = useState(null);

  // ---- Gestion types activité ----
  const [newActivityTypeName, setNewActivityTypeName] = useState("");
  const [newActivityTypeIsBillable, setNewActivityTypeIsBillable] = useState(true);
  const [editingActivityType, setEditingActivityType] = useState(null);

  // ---- Modal confirmations ----
  const [showClientConfirmModal, setShowClientConfirmModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [showActivityTypeConfirmModal, setShowActivityTypeConfirmModal] = useState(false);
  const [activityTypeToDelete, setActivityTypeToDelete] = useState(null);

  // ---- Handlers clients ----
  const handleAddClientSubmit = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      showMessage("Le nom du client ne peut pas être vide.", "error");
      return;
    }
    await onAddClient({ nom_client: newClientName });
    setNewClientName("");
  };

  const handleUpdateClientSubmit = async (e) => {
    e.preventDefault();
    if (!editingClient || !editingClient.nom_client.trim()) {
      showMessage("Le nom du client ne peut pas être vide.", "error");
      return;
    }
    await onUpdateClient(editingClient.id, {
      nom_client: editingClient.nom_client,
    });
    setEditingClient(null);
  };

  const requestDeleteClient = (clientId) => {
    setClientToDelete(clientId);
    setShowClientConfirmModal(true);
  };

  const confirmDeleteClient = async () => {
    setShowClientConfirmModal(false);
    if (clientToDelete) {
      await onDeleteClient(clientToDelete);
      setClientToDelete(null);
    }
  };

  const cancelDeleteClient = () => {
    setShowClientConfirmModal(false);
    setClientToDelete(null);
  };

  // ---- Handlers types activité ----
  const handleAddActivityTypeSubmit = async (e) => {
    e.preventDefault();
    if (!newActivityTypeName.trim()) {
      showMessage("Le nom du type d'activité ne peut pas être vide.", "error");
      return;
    }
    await onAddActivityType({
      name: newActivityTypeName,
      is_billable: newActivityTypeIsBillable ? 1 : 0,
    });
    setNewActivityTypeName("");
    setNewActivityTypeIsBillable(true);
  };

  const handleUpdateActivityTypeSubmit = async (e) => {
    e.preventDefault();
    if (!editingActivityType || !editingActivityType.name.trim()) {
      showMessage("Le nom du type d'activité ne peut pas être vide.", "error");
      return;
    }
    await onUpdateActivityType(editingActivityType.id, {
      name: editingActivityType.name,
      is_billable: editingActivityType.is_billable ? 1 : 0,
    });
    setEditingActivityType(null);
  };

  const requestDeleteActivityType = (activityTypeId) => {
    setActivityTypeToDelete(activityTypeId);
    setShowActivityTypeConfirmModal(true);
  };

  const confirmDeleteActivityType = async () => {
    setShowActivityTypeConfirmModal(false);
    if (activityTypeToDelete) {
      await onDeleteActivityType(activityTypeToDelete);
      setActivityTypeToDelete(null);
    }
  };

  const cancelDeleteActivityType = () => {
    setShowActivityTypeConfirmModal(false);
    setActivityTypeToDelete(null);
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8">
      <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-8">
        Gestion Unifiée (clients & types activités)
      </h2>

      {/* Section Clients */}
      <div className="mb-10 p-6 border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">
          Gestion des Clients
        </h3>
        <form
          onSubmit={editingClient ? handleUpdateClientSubmit : handleAddClientSubmit}
          className="mb-6 flex flex-col sm:flex-row gap-4"
        >
          <input
            type="text"
            placeholder="Nom du nouveau client"
            value={editingClient ? editingClient.nom_client : newClientName}
            onChange={(e) =>
              editingClient
                ? setEditingClient({ ...editingClient, nom_client: e.target.value })
                : setNewClientName(e.target.value)
            }
            className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
          >
            {editingClient ? "Modifier le client" : "Ajouter un client"}
          </button>
          {editingClient && (
            <button
              type="button"
              onClick={() => setEditingClient(null)}
              className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300"
            >
              Annuler
            </button>
          )}
        </form>

        <h4 className="text-xl font-semibold text-gray-700 mb-4">Clients existants :</h4>
        {clientDefinitions.length === 0 ? (
          <p className="text-gray-500">Aucun client défini.</p>
        ) : (
          <ul className="space-y-2">
            {clientDefinitions.map((client) => (
              <li
                key={client.id}
                className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200 shadow-sm"
              >
                <span className="text-gray-800 font-medium">{client.nom_client}</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingClient(client)}
                    className="p-2 rounded-full bg-yellow-400 text-white hover:bg-yellow-500 transition duration-300"
                    title="Modifier"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => requestDeleteClient(client.id)}
                    className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition duration-300"
                    title="Supprimer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm-1 3a1 1 0 100 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Section Types activité */}
      <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">
          Gestion types activité
        </h3>
        <form
          onSubmit={editingActivityType ? handleUpdateActivityTypeSubmit : handleAddActivityTypeSubmit}
          className="mb-6 flex flex-col sm:flex-row gap-4 items-center"
        >
          <input
            type="text"
            placeholder="Nom du nouveau type d'activité"
            value={editingActivityType ? editingActivityType.name : newActivityTypeName}
            onChange={(e) =>
              editingActivityType
                ? setEditingActivityType({ ...editingActivityType, name: e.target.value })
                : setNewActivityTypeName(e.target.value)
            }
            className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <label htmlFor="isBillableActivityType" className="flex items-center text-gray-700 font-medium">
            <input
              type="checkbox"
              id="isBillableActivityType"
              checked={
                editingActivityType
                  ? editingActivityType.is_billable === 1 || editingActivityType.is_billable === true
                  : newActivityTypeIsBillable
              }
              onChange={(e) =>
                editingActivityType
                  ? setEditingActivityType({
                    ...editingActivityType,
                    is_billable: e.target.checked ? 1 : 0,
                  })
                  : setNewActivityTypeIsBillable(e.target.checked)
              }
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
            />
            Facturable
          </label>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
          >
            {editingActivityType ? "Modifier le type" : "Ajouter un type"}
          </button>
          {editingActivityType && (
            <button
              type="button"
              onClick={() => setEditingActivityType(null)}
              className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300"
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
                key={type.id ?? type._id ?? `activity-type-${idx}`}
                className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200 shadow-sm"
              >
                <span className="text-gray-800 font-medium">
                  {type.name}
                  {type.is_billable === 1 || type.is_billable === true ? (
                    <span className="ml-2 text-green-600 text-sm" title="Facturable">
                      {" "}
                      (Facturable)
                    </span>
                  ) : (
                    <span className="ml-2 text-red-600 text-sm" title="Non facturable">
                      {" "}
                      (Non facturable)
                    </span>
                  )}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingActivityType(type)}
                    className="p-2 rounded-full bg-yellow-400 text-white hover:bg-yellow-500 transition duration-300"
                    title="Modifier"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => requestDeleteActivityType(type.id)}
                    className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition duration-300"
                    title="Supprimer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm-1 3a1 1 0 100 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modals confirmation */}
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