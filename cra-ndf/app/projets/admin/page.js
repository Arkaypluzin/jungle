"use client";
import { useEffect, useState } from "react";
import BtnRetour from "@/components/BtnRetour";

export default function ProjetAdminPage() {
    const [projets, setProjets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshFlag, setRefreshFlag] = useState(0);

    const [modalOpen, setModalOpen] = useState(false);
    const [nomProjet, setNomProjet] = useState("");
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editProjet, setEditProjet] = useState(null);
    const [editNomProjet, setEditNomProjet] = useState("");
    const [editFormError, setEditFormError] = useState("");
    const [editFormLoading, setEditFormLoading] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteProjet, setDeleteProjet] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        setLoading(true);
        fetch("/api/projets")
            .then((res) => res.json())
            .then((data) => {
                setProjets(data);
                setLoading(false);
            })
            .catch(() => {
                setError("Erreur lors du chargement des projets.");
                setLoading(false);
            });
    }, [refreshFlag]);

    function openDeleteModal(projet) {
        setDeleteProjet(projet);
        setDeleteModalOpen(true);
        setDeleteError("");
    }

    async function handleDeleteConfirmed() {
        if (!deleteProjet) return;
        setDeleteLoading(true);
        setDeleteError("");
        const id = deleteProjet.id || deleteProjet.uuid;
        const res = await fetch(`/api/projets/${id}`, { method: "DELETE" });
        setDeleteLoading(false);
        if (res.ok) {
            setDeleteModalOpen(false);
            setDeleteProjet(null);
            setRefreshFlag((f) => f + 1);
        } else {
            setDeleteError("Erreur lors de la suppression.");
        }
    }

    async function handleCreateProjet(e) {
        e.preventDefault();
        setFormLoading(true);
        setFormError("");
        if (!nomProjet.trim()) {
            setFormError("Le nom du projet est requis.");
            setFormLoading(false);
            return;
        }
        try {
            const res = await fetch("/api/projets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nom: nomProjet.trim() }),
            });
            if (res.ok) {
                setModalOpen(false);
                setNomProjet("");
                setRefreshFlag((f) => f + 1);
            } else {
                const data = await res.json();
                setFormError(data.message || "Erreur lors de la création.");
            }
        } catch (err) {
            setFormError("Erreur serveur");
        }
        setFormLoading(false);
    }

    function openEditModal(projet) {
        setEditProjet(projet);
        setEditNomProjet(projet.nom || "");
        setEditFormError("");
        setEditModalOpen(true);
    }

    async function handleEditProjet(e) {
        e.preventDefault();
        setEditFormLoading(true);
        setEditFormError("");
        if (!editNomProjet.trim()) {
            setEditFormError("Le nom du projet est requis.");
            setEditFormLoading(false);
            return;
        }
        try {
            const res = await fetch(`/api/projets/${editProjet.id || editProjet.uuid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nom: editNomProjet.trim() }),
            });
            if (res.ok) {
                setEditModalOpen(false);
                setEditProjet(null);
                setEditNomProjet("");
                setRefreshFlag((f) => f + 1);
            } else {
                const data = await res.json();
                setEditFormError(data.message || "Erreur lors de la modification.");
            }
        } catch (err) {
            setEditFormError("Erreur serveur");
        }
        setEditFormLoading(false);
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Liste des projets</h1>
                <BtnRetour fallback="/dashboard/admin" />
            </div>

            <div className="flex mb-8">
                <button
                    onClick={() => setModalOpen(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                    + Nouveau projet
                </button>
            </div>

            {loading ? (
                <p>Chargement...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : projets.length === 0 ? (
                <p>Aucun projet trouvé.</p>
            ) : (
                <table className="w-full border rounded-lg shadow">
                    <thead className="bg-gray-100 text-black">
                        <tr>
                            <th className="py-3 px-4 text-left">Nom du projet</th>
                            <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projets.map((projet) => (
                            <tr
                                key={projet.id || projet.uuid}
                                className="border-b"
                            >
                                <td className="py-3 px-4">{projet.nom}</td>
                                <td className="py-3 px-4 flex justify-center gap-2">
                                    <button
                                        onClick={() => openEditModal(projet)}
                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => openDeleteModal(projet)}
                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {modalOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 text-black">
                    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full relative">
                        <button
                            onClick={() => { setModalOpen(false); setFormError(""); setNomProjet(""); }}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                            aria-label="Fermer"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-bold mb-6">Nouveau projet</h2>
                        <form onSubmit={handleCreateProjet} className="space-y-4">
                            <div>
                                <label className="block mb-2 font-medium text-gray-700">
                                    Nom du projet
                                </label>
                                <input
                                    type="text"
                                    value={nomProjet}
                                    onChange={e => setNomProjet(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Nom du projet"
                                    required
                                />
                            </div>
                            {formError && <div className="text-red-500 text-sm">{formError}</div>}
                            <div className="flex justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setModalOpen(false); setFormError(""); setNomProjet(""); }}
                                    className="mr-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                    disabled={formLoading}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                    disabled={formLoading}
                                >
                                    {formLoading ? "Création..." : "Créer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editModalOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 text-black">
                    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full relative">
                        <button
                            onClick={() => { setEditModalOpen(false); setEditFormError(""); setEditProjet(null); setEditNomProjet(""); }}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                            aria-label="Fermer"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-bold mb-6">Modifier le projet</h2>
                        <form onSubmit={handleEditProjet} className="space-y-4">
                            <div>
                                <label className="block mb-2 font-medium text-gray-700">
                                    Nom du projet
                                </label>
                                <input
                                    type="text"
                                    value={editNomProjet}
                                    onChange={e => setEditNomProjet(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Nom du projet"
                                    required
                                />
                            </div>
                            {editFormError && <div className="text-red-500 text-sm">{editFormError}</div>}
                            <div className="flex justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setEditModalOpen(false); setEditFormError(""); setEditProjet(null); setEditNomProjet(""); }}
                                    className="mr-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                    disabled={editFormLoading}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    disabled={editFormLoading}
                                >
                                    {editFormLoading ? "Modification..." : "Enregistrer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteModalOpen && deleteProjet && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 text-black">
                    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full relative">
                        <button
                            onClick={() => { setDeleteModalOpen(false); setDeleteProjet(null); setDeleteError(""); }}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                            aria-label="Fermer"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-bold mb-6 text-red-600">Confirmer la suppression</h2>
                        <p className="mb-6">
                            Êtes-vous sûr de vouloir supprimer le projet <b>{deleteProjet.nom}</b> ?
                            <br />
                            Cette action est <span className="text-red-500 font-bold">irréversible</span>.
                        </p>
                        {deleteError && <div className="text-red-500 text-sm mb-2">{deleteError}</div>}
                        <div className="flex justify-end gap-4 mt-6">
                            <button
                                type="button"
                                onClick={() => { setDeleteModalOpen(false); setDeleteProjet(null); setDeleteError(""); }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
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
    );
}