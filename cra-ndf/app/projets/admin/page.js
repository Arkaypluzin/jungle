"use client";
import { useEffect, useState } from "react";
import BtnRetour from "@/components/BtnRetour";
import { PlusCircle, Edit2, Trash2, Loader2 } from "lucide-react";

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

    // --- UI ---
    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-4 py-10">
                {/* HEADER */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">
                            Gestion des projets
                        </h1>
                        <div className="text-gray-500 text-sm">Admin | Ajouter, modifier, supprimer vos projets</div>
                    </div>
                    <BtnRetour fallback="/dashboard/admin" />
                </div>

                {/* BARRE D'ACTIONS */}
                <div className="flex items-center justify-between gap-3 mb-8 sticky top-2 bg-white/95 z-10 rounded-xl shadow-sm px-3 py-2">
                    <span className="font-medium text-lg text-gray-700">Projets ({projets.length})</span>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg shadow hover:bg-green-700 transition-all font-semibold"
                    >
                        <PlusCircle className="w-5 h-5" />
                        Nouveau projet
                    </button>
                </div>

                {/* LISTE */}
                <div className="bg-white rounded-2xl shadow-lg border px-2 py-3 sm:px-6 sm:py-6 min-h-[300px] transition-all">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="animate-spin w-8 h-8 text-blue-400" />
                            <span className="ml-3 text-blue-500">Chargement des projets…</span>
                        </div>
                    ) : error ? (
                        <p className="text-red-500 py-10 text-center">{error}</p>
                    ) : projets.length === 0 ? (
                        <p className="text-gray-400 text-lg py-10 text-center">Aucun projet trouvé.</p>
                    ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                            {projets.map((projet) => (
                                <div
                                    key={projet.id || projet.uuid}
                                    className="bg-gradient-to-br from-blue-50 to-white border rounded-xl shadow-sm p-6 flex flex-col justify-between group hover:shadow-xl transition-all"
                                >
                                    <div>
                                        <div className="font-semibold text-xl text-gray-800 mb-2 group-hover:text-blue-700 transition">
                                            {projet.nom}
                                        </div>
                                        <div className="text-gray-400 text-xs">
                                            ID: <span className="font-mono">{projet.id || projet.uuid}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => openEditModal(projet)}
                                            className="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-md bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-100 font-medium shadow-sm transition-all"
                                        >
                                            <Edit2 className="w-5 h-5" /> Modifier
                                        </button>
                                        <button
                                            onClick={() => openDeleteModal(projet)}
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

                {/* MODALS */}
                {/* Ajout */}
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fadeIn">
                            <button
                                onClick={() => { setModalOpen(false); setFormError(""); setNomProjet(""); }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                            <h2 className="text-2xl font-bold mb-4 text-blue-700">Nouveau projet</h2>
                            <form onSubmit={handleCreateProjet} className="space-y-5">
                                <div>
                                    <label className="block mb-1 font-medium text-gray-700">Nom du projet</label>
                                    <input
                                        type="text"
                                        value={nomProjet}
                                        onChange={e => setNomProjet(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                                        placeholder="Nom du projet"
                                        required
                                    />
                                </div>
                                {formError && <div className="text-red-500 text-sm">{formError}</div>}
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => { setModalOpen(false); setFormError(""); setNomProjet(""); }}
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
                                        {formLoading ? "Création..." : "Créer"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edition */}
                {editModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fadeIn">
                            <button
                                onClick={() => { setEditModalOpen(false); setEditFormError(""); setEditProjet(null); setEditNomProjet(""); }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                            <h2 className="text-2xl font-bold mb-4 text-blue-700">Modifier le projet</h2>
                            <form onSubmit={handleEditProjet} className="space-y-5">
                                <div>
                                    <label className="block mb-1 font-medium text-gray-700">Nom du projet</label>
                                    <input
                                        type="text"
                                        value={editNomProjet}
                                        onChange={e => setEditNomProjet(e.target.value)}
                                        className="w-full text-black px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        placeholder="Nom du projet"
                                        required
                                    />
                                </div>
                                {editFormError && <div className="text-red-500 text-sm">{editFormError}</div>}
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => { setEditModalOpen(false); setEditFormError(""); setEditProjet(null); setEditNomProjet(""); }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
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

                {/* Suppression */}
                {deleteModalOpen && deleteProjet && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fadeIn">
                            <button
                                onClick={() => { setDeleteModalOpen(false); setDeleteProjet(null); setDeleteError(""); }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                            <h2 className="text-2xl font-bold mb-4 text-red-700">Confirmer la suppression</h2>
                            <p className="mb-6 text-black">
                                Êtes-vous sûr de vouloir supprimer le projet <b>{deleteProjet.nom}</b> ?
                                <br />
                                <span className="text-red-500 font-bold">Cette action est irréversible.</span>
                            </p>
                            {deleteError && <div className="text-red-500 text-sm mb-2">{deleteError}</div>}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => { setDeleteModalOpen(false); setDeleteProjet(null); setDeleteError(""); }}
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