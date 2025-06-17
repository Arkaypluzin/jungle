// app/components/UnifiedManager.js
// Note: "use client" n'est pas pertinent en JS pur pour le navigateur.

// Les styles Tailwind CSS restent inchangés et seront utilisés directement
const managerStyles = {
  container:
    "font-sans mx-auto w-full max-w-5xl lg:max-w-6xl p-4 sm:p-8 bg-gray-50 shadow-xl rounded-xl border border-gray-100 mt-8",
  tabContainer: "flex justify-center mb-6 border-b border-gray-200",
  tabButton:
    "px-6 py-3 text-lg font-semibold text-gray-600 border-b-2 border-transparent hover:border-blue-500 hover:text-blue-700 transition-colors duration-200 focus:outline-none",
  tabButtonActive: "text-blue-700 border-blue-500",
  header:
    "text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 border-b pb-3 text-center",
  form: "mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-100 rounded-lg flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center sm:items-center",
  input:
    "px-4 py-2.5 h-10 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm w-full flex-grow text-sm",
  select:
    "px-4 py-2.5 h-10 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm appearance-none cursor-pointer bg-white w-full sm:w-auto text-sm",
  button:
    "px-6 py-2.5 h-10 text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg font-semibold bg-blue-600 text-white w-full sm:w-auto",
  list: "bg-white rounded-lg border border-gray-200 shadow-md p-3 sm:p-4",
  listItem:
    "flex flex-wrap justify-between items-center p-2 sm:p-3 border-b border-gray-100 last:border-b-0 gap-2",
  itemName: "font-medium text-gray-800 flex-grow text-sm sm:text-base",
  editInput:
    "px-4 py-2.5 h-10 border border-blue-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-grow text-sm",
  editSelect:
    "px-4 py-2.5 h-10 border border-blue-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm",
  buttonGroup: "flex flex-wrap space-x-4 ml-auto",
  actionButton:
    "px-6 py-2.5 h-10 text-sm rounded-md transition-colors duration-150",
  saveButton: "bg-green-500 text-white hover:bg-green-600",
  cancelButton: "bg-gray-300 text-gray-800 hover:bg-gray-400",
  editButton: "bg-blue-500 text-white hover:bg-blue-600",
  deleteButton: "bg-red-500 text-white hover:bg-red-600",
};

// Options pour le sélecteur de type d'activité/absence
const ACTIVITY_TYPES_OPTIONS = [
  { value: "activity", label: "Activité" },
  { value: "absence", label: "Absence" },
];

// Fonction pour la modale de confirmation personnalisée
const ConfirmModal = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null;

  return React.createElement(
    "div",
    {
      className:
        "fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50",
    },
    React.createElement(
      "div",
      {
        className:
          "bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center",
      },
      React.createElement(
        "p",
        { className: "text-lg font-semibold mb-4" },
        message
      ),
      React.createElement(
        "div",
        { className: "flex justify-around gap-4" },
        React.createElement(
          "button",
          {
            onClick: onConfirm,
            className:
              "flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200",
          },
          "Confirmer"
        ),
        React.createElement(
          "button",
          {
            onClick: onCancel,
            className:
              "flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200",
          },
          "Annuler"
        )
      )
    )
  );
};

// Le composant fonctionnel UnifiedManager en JavaScript pur
function UnifiedManager({
  activityTypes: propActivityTypes, // Renommé pour éviter la collision avec l'état local
  onActivityTypesChange,
  clientTypes: propClientTypes, // Renommé pour éviter la collision avec l'état local
  onClientTypesChange,
}) {
  const [activeTab, setActiveTab] = React.useState("activities"); // 'activities' ou 'clients', contrôle l'onglet actif

  // États et logiques pour les activités
  const [activities, setActivities] = React.useState(propActivityTypes || []);
  const [newActivityName, setNewActivityName] = React.useState("");
  const [newActivityType, setNewActivityType] = React.useState("activity");
  const [editingActivityId, setEditingActivityId] = React.useState(null);
  const [editingActivityName, setEditingActivityName] = React.useState("");
  const [editingActivityType, setEditingActivityType] = React.useState("");

  // États et logiques pour les clients
  const [clients, setClients] = React.useState(propClientTypes || []);
  const [newClientName, setNewClientName] = React.useState("");
  const [editingClientId, setEditingClientId] = React.useState(null);
  const [editingClientName, setEditingClientName] = React.useState("");

  // États pour la modale de confirmation
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [confirmMessage, setConfirmMessage] = React.useState("");
  const [confirmAction, setConfirmAction] = React.useState(null);

  // Synchronise les props 'activityTypes' avec l'état local quand elles changent
  React.useEffect(() => {
    if (Array.isArray(propActivityTypes)) {
      setActivities(propActivityTypes);
    }
  }, [propActivityTypes]);

  // Synchronise les props 'clientTypes' avec l'état local quand elles changent
  React.useEffect(() => {
    if (Array.isArray(propClientTypes)) {
      setClients(propClientTypes);
    }
  }, [propClientTypes]);

  // Génération d'ID unique pour les éléments côté client
  const generateUniqueId = React.useCallback(() => {
    return Math.random().toString(36).substring(2, 9);
  }, []);

  // --- Logique de gestion des Activités (purement côté client) ---
  const handleAddActivity = React.useCallback(() => {
    if (newActivityName.trim() === "") {
      console.error("Le nom de l'activité ne peut pas être vide.");
      return;
    }
    const newId = generateUniqueId();
    const updatedActivities = [
      ...activities,
      { id: newId, name: newActivityName.trim(), type: newActivityType },
    ];
    setActivities(updatedActivities);
    onActivityTypesChange(updatedActivities); // Informe le composant parent pour la persistance (localStorage)
    setNewActivityName("");
    setNewActivityType("activity");
  }, [
    activities,
    newActivityName,
    newActivityType,
    onActivityTypesChange,
    generateUniqueId,
  ]);

  const handleEditActivityClick = React.useCallback((activity) => {
    setEditingActivityId(activity.id);
    setEditingActivityName(activity.name);
    setEditingActivityType(activity.type);
  }, []);

  const handleSaveActivityEdit = React.useCallback(() => {
    if (editingActivityName.trim() === "") {
      console.error("Le nom de l'activité ne peut pas être vide.");
      return;
    }
    const updatedActivities = activities.map((activity) =>
      activity.id === editingActivityId
        ? {
            ...activity,
            name: editingActivityName.trim(),
            type: editingActivityType,
          }
        : activity
    );
    setActivities(updatedActivities);
    onActivityTypesChange(updatedActivities); // Informe le composant parent
    setEditingActivityId(null);
    setEditingActivityName("");
    setEditingActivityType("");
  }, [
    activities,
    editingActivityId,
    editingActivityName,
    editingActivityType,
    onActivityTypesChange,
  ]);

  const handleCancelActivityEdit = React.useCallback(() => {
    setEditingActivityId(null);
    setEditingActivityName("");
    setEditingActivityType("");
  }, []);

  const handleDeleteActivity = React.useCallback(
    (idToDelete) => {
      setConfirmMessage(
        "Êtes-vous sûr de vouloir supprimer ce type d'activité ? Toutes les données associées seront perdues pour le mois en cours."
      );
      setConfirmAction(() => () => {
        const updatedActivities = activities.filter(
          (activity) => activity.id !== idToDelete
        );
        setActivities(updatedActivities);
        onActivityTypesChange(updatedActivities); // Informe le composant parent
        setShowConfirm(false); // Ferme la modale
      });
      setShowConfirm(true); // Ouvre la modale
    },
    [activities, onActivityTypesChange]
  );

  // --- Logique de gestion des Clients (purement côté client) ---
  const handleAddClient = React.useCallback(() => {
    if (newClientName.trim() === "") {
      console.error("Le nom du client ne peut pas être vide.");
      return;
    }
    const newId = generateUniqueId(); // Génération d'ID côté client
    const updatedClients = [
      ...clients,
      { id: newId, name: newClientName.trim() },
    ];
    setClients(updatedClients);
    onClientTypesChange(updatedClients); // Informe le composant parent pour la persistance (localStorage)
    setNewClientName("");
  }, [clients, newClientName, onClientTypesChange, generateUniqueId]);

  const handleEditClientClick = React.useCallback((client) => {
    setEditingClientId(client.id);
    setEditingClientName(client.name);
  }, []);

  const handleSaveClientEdit = React.useCallback(() => {
    if (editingClientName.trim() === "") {
      console.error("Le nom du client ne peut pas être vide.");
      return;
    }
    const updatedClients = clients.map((client) =>
      client.id === editingClientId
        ? { ...client, name: editingClientName.trim() }
        : client
    );
    setClients(updatedClients);
    onClientTypesChange(updatedClients); // Informe le composant parent
    setEditingClientId(null);
    setEditingClientName("");
  }, [clients, editingClientId, editingClientName, onClientTypesChange]);

  const handleCancelClientEdit = React.useCallback(() => {
    setEditingClientId(null);
    setEditingClientName("");
  }, []);

  const handleDeleteClient = React.useCallback(
    (idToDelete) => {
      setConfirmMessage(
        "Êtes-vous sûr de vouloir supprimer ce client ? Cela pourrait affecter les activités qui lui sont liées."
      );
      setConfirmAction(() => () => {
        const updatedClients = clients.filter(
          (client) => client.id !== idToDelete
        );
        setClients(updatedClients);
        onClientTypesChange(updatedClients); // Informe le composant parent
        setShowConfirm(false); // Ferme la modale
      });
      setShowConfirm(true); // Ouvre la modale
    },
    [clients, onClientTypesChange]
  );

  // Rendu du composant
  return React.createElement(
    "div",
    { className: managerStyles.container },
    // Boutons de navigation entre les onglets
    React.createElement(
      "div",
      { className: managerStyles.tabContainer },
      React.createElement(
        "button",
        {
          onClick: () => setActiveTab("activities"),
          className: `${managerStyles.tabButton} ${
            activeTab === "activities" ? managerStyles.tabButtonActive : ""
          }`,
        },
        "Gérer les Activités"
      ),
      React.createElement(
        "button",
        {
          onClick: () => setActiveTab("clients"),
          className: `${managerStyles.tabButton} ${
            activeTab === "clients" ? managerStyles.tabButtonActive : ""
          }`,
        },
        "Gérer les Clients"
      )
    ),

    // Contenu affiché en fonction de l'onglet actif
    activeTab === "activities" &&
      React.createElement(
        "div",
        null,
        React.createElement(
          "h2",
          { className: managerStyles.header },
          "Gestion des types d'activités/absences"
        ),
        // Formulaire d'ajout d'activité/absence
        React.createElement(
          "div",
          { className: managerStyles.form },
          React.createElement("input", {
            type: "text",
            placeholder: "Nom de l'activité/absence",
            value: newActivityName,
            onChange: (e) => setNewActivityName(e.target.value),
            className: managerStyles.input,
          }),
          React.createElement(
            "select",
            {
              value: newActivityType,
              onChange: (e) => setNewActivityType(e.target.value),
              className: managerStyles.select,
            },
            ACTIVITY_TYPES_OPTIONS.map((option) =>
              React.createElement(
                "option",
                { key: option.value, value: option.value },
                option.label
              )
            )
          ),
          React.createElement(
            "button",
            {
              onClick: handleAddActivity,
              className: managerStyles.button,
            },
            "Ajouter Activité"
          )
        ),

        // Liste des activités/absences existantes
        React.createElement(
          "div",
          { className: managerStyles.list },
          Array.isArray(activities) && activities.length > 0
            ? activities.map((activity) =>
                React.createElement(
                  "div",
                  { key: activity.id, className: managerStyles.listItem },
                  editingActivityId === activity.id
                    ? // Mode édition activité
                      React.createElement(
                        React.Fragment,
                        null,
                        React.createElement("input", {
                          type: "text",
                          value: editingActivityName,
                          onChange: (e) =>
                            setEditingActivityName(e.target.value),
                          className: managerStyles.editInput,
                        }),
                        React.createElement(
                          "select",
                          {
                            value: editingActivityType,
                            onChange: (e) =>
                              setEditingActivityType(e.target.value),
                            className: managerStyles.editSelect,
                          },
                          ACTIVITY_TYPES_OPTIONS.map((option) =>
                            React.createElement(
                              "option",
                              { key: option.value, value: option.value },
                              option.label
                            )
                          )
                        ),
                        React.createElement(
                          "div",
                          { className: managerStyles.buttonGroup },
                          React.createElement(
                            "button",
                            {
                              onClick: handleSaveActivityEdit,
                              className: `${managerStyles.actionButton} ${managerStyles.saveButton}`,
                            },
                            "Sauver"
                          ),
                          React.createElement(
                            "button",
                            {
                              onClick: handleCancelActivityEdit,
                              className: `${managerStyles.actionButton} ${managerStyles.cancelButton}`,
                            },
                            "Annuler"
                          )
                        )
                      )
                    : // Mode affichage activité
                      React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(
                          "span",
                          { className: managerStyles.itemName },
                          `${activity.name} (${
                            activity.type === "activity"
                              ? "Activité"
                              : "Absence"
                          })`
                        ),
                        React.createElement(
                          "div",
                          { className: managerStyles.buttonGroup },
                          React.createElement(
                            "button",
                            {
                              onClick: () => handleEditActivityClick(activity),
                              className: `${managerStyles.actionButton} ${managerStyles.editButton}`,
                            },
                            "Éditer"
                          ),
                          React.createElement(
                            "button",
                            {
                              onClick: () => handleDeleteActivity(activity.id),
                              className: `${managerStyles.actionButton} ${managerStyles.deleteButton}`,
                            },
                            "Supprimer"
                          )
                        )
                      )
                )
              )
            : React.createElement(
                "p",
                { className: "text-gray-500 text-center p-4" },
                "Aucun type d'activité/absence défini."
              )
        )
      ),

    activeTab === "clients" &&
      React.createElement(
        "div",
        null,
        React.createElement(
          "h2",
          { className: managerStyles.header },
          "Gestion des Clients"
        ),
        // Formulaire d'ajout de nouveau client
        React.createElement(
          "div",
          { className: managerStyles.form },
          React.createElement("input", {
            type: "text",
            placeholder: "Nom du nouveau client",
            value: newClientName,
            onChange: (e) => setNewClientName(e.target.value),
            className: managerStyles.input,
          }),
          React.createElement(
            "button",
            { onClick: handleAddClient, className: managerStyles.button },
            "Ajouter Client"
          )
        ),

        // Liste des clients existants
        React.createElement(
          "div",
          { className: managerStyles.list },
          Array.isArray(clients) && clients.length > 0
            ? clients.map((client) =>
                React.createElement(
                  "div",
                  { key: client.id, className: managerStyles.listItem },
                  editingClientId === client.id
                    ? // Mode édition client
                      React.createElement(
                        React.Fragment,
                        null,
                        React.createElement("input", {
                          type: "text",
                          value: editingClientName,
                          onChange: (e) => setEditingClientName(e.target.value),
                          className: managerStyles.editInput,
                        }),
                        React.createElement(
                          "div",
                          { className: managerStyles.buttonGroup },
                          React.createElement(
                            "button",
                            {
                              onClick: handleSaveClientEdit,
                              className: `${managerStyles.actionButton} ${managerStyles.saveButton}`,
                            },
                            "Sauver"
                          ),
                          React.createElement(
                            "button",
                            {
                              onClick: handleCancelClientEdit,
                              className: `${managerStyles.actionButton} ${managerStyles.cancelButton}`,
                            },
                            "Annuler"
                          )
                        )
                      )
                    : // Mode affichage client
                      React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(
                          "span",
                          { className: managerStyles.itemName },
                          client.name
                        ),
                        React.createElement(
                          "div",
                          { className: managerStyles.buttonGroup },
                          React.createElement(
                            "button",
                            {
                              onClick: () => handleEditClientClick(client),
                              className: `${managerStyles.actionButton} ${managerStyles.editButton}`,
                            },
                            "Éditer"
                          ),
                          React.createElement(
                            "button",
                            {
                              onClick: () => handleDeleteClient(client.id),
                              className: `${managerStyles.actionButton} ${managerStyles.deleteButton}`,
                            },
                            "Supprimer"
                          )
                        )
                      )
                )
              )
            : React.createElement(
                "p",
                { className: "text-gray-500 text-center p-4" },
                "Aucun client défini."
              )
        )
      ),
    // Modale de confirmation
    React.createElement(ConfirmModal, {
      show: showConfirm,
      message: confirmMessage,
      onConfirm: confirmAction,
      onCancel: () => setShowConfirm(false),
    })
  );
}
