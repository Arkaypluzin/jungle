"use client";
import { useState, useEffect } from "react";
import { Pencil, Trash2, X } from "lucide-react";

const TRAJET_TYPES = [
    { label: "Aller", value: 1 },
    { label: "Aller-Retour", value: 2 }
];

function toYYYYMMDD(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
}

export default function NdfKiloTable({ ndfId, ndfStatut }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pour l'édition
    const [editRow, setEditRow] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");

    // Pour la suppression (modal de confirmation)
    const [deleteTarget, setDeleteTarget] = useState(null); // uuid

    const fetchRows = async () => {
        setLoading(true);
        const res = await fetch(`/api/ndf_kilo?id_ndf=${ndfId}`);
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    useEffect(() => { if (ndfId) fetchRows(); }, [ndfId]);

    // Ouvre la modale de modification
    function handleEdit(row) {
        setEditRow(row);
        setEditForm({
            date_debut: toYYYYMMDD(row.date_debut),
            date_fin: toYYYYMMDD(row.date_fin),
            depart: row.depart,
            arrivee: row.arrivee,
            distance: row.distance,
            type_trajet: row.type_trajet,
            motif: row.motif,
            total_euro: calculateTotal(row.distance, row.type_trajet)
        });
        setEditError("");
    }

    function closeEditModal() {
        setEditRow(null);
        setEditForm(null);
        setEditError("");
        setEditLoading(false);
    }

    function calculateTotal(distance, type_trajet) {
        const d = parseFloat(distance);
        const t = parseInt(type_trajet);
        if (!isNaN(d) && !isNaN(t)) {
            return (d * t).toFixed(2);
        }
        return "";
    }

    function handleEditFormChange(field, value) {
        setEditForm(form => {
            const updated = { ...form, [field]: value };
            if (field === "distance" || field === "type_trajet") {
                updated.total_euro = calculateTotal(updated.distance, updated.type_trajet);
            }
            return updated;
        });
    }

    async function handleEditSubmit(e) {
        e.preventDefault();
        setEditLoading(true);
        setEditError("");
        try {
            const res = await fetch(`/api/ndf_kilo/${editRow.uuid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la modification.");
            }
            closeEditModal();
            fetchRows();
        } catch (err) {
            setEditError(err.message);
        } finally {
            setEditLoading(false);
        }
    }

    // Ouvre le modal de suppression
    function askDelete(uuid) {
        setDeleteTarget(uuid);
    }

    // Supprime la ligne après confirmation
    async function confirmDelete() {
        const uuid = deleteTarget;
        setDeleteTarget(null);
        if (!uuid) return;
        await fetch(`/api/ndf_kilo/${uuid}`, { method: "DELETE" });
        fetchRows();
    }

    // Ferme le modal de suppression sans rien faire
    function cancelDelete() {
        setDeleteTarget(null);
    }

    function totalKm() {
        return rows.reduce((acc, r) => acc + (parseFloat(r.distance) || 0), 0);
    }
    function totalEuro() {
        return rows.reduce((acc, r) => acc + (parseFloat(r.total_euro) || 0), 0);
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg my-8 mx-auto max-w-6xl">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Date début</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Date fin</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Départ</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Arrivée</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Distance (km)</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Type de trajet</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Motif</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Total €</th>
                            {ndfStatut === "Provisoire" && (
                                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="py-8 text-center text-gray-400">Chargement...</td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="py-8 text-center text-gray-400">Aucune ligne kilométrique.</td>
                            </tr>
                        ) : (
                            rows.map(row => (
                                <tr key={row.uuid} className="hover:bg-gray-50 text-gray-900">
                                    <td className="px-2 py-2 text-sm text-center">{toYYYYMMDD(row.date_debut)}</td>
                                    <td className="px-2 py-2 text-sm text-center">{toYYYYMMDD(row.date_fin)}</td>
                                    <td className="px-2 py-2 text-sm text-center">{row.depart}</td>
                                    <td className="px-2 py-2 text-sm text-center">{row.arrivee}</td>
                                    <td className="px-2 py-2 text-sm text-center">{row.distance}</td>
                                    <td className="px-2 py-2 text-sm text-center">
                                        {TRAJET_TYPES.find(t => t.value === row.type_trajet)?.label}
                                    </td>
                                    <td className="px-2 py-2 text-sm text-center">{row.motif}</td>
                                    <td className="px-2 py-2 text-sm text-center font-bold">{parseFloat(row.total_euro).toFixed(2)}€</td>
                                    {ndfStatut === "Provisoire" && (
                                        <td className="px-2 py-2 text-center flex gap-2 justify-center">
                                            <button
                                                className="text-blue-600 hover:bg-blue-100 rounded-full p-1 transition"
                                                onClick={() => handleEdit(row)}
                                                title="Éditer"
                                                aria-label="Éditer"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                className="text-red-600 hover:bg-red-100 rounded-full p-1 transition"
                                                onClick={() => askDelete(row.uuid)}
                                                title="Supprimer"
                                                aria-label="Supprimer"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                        <tr>
                            <td colSpan={2} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                                Total kilomètres
                            </td>
                            <td className="py-3 px-4 text-right text-base font-bold text-blue-900">
                                {totalKm().toFixed(1)}
                            </td>
                            <td colSpan={8}></td>
                            {ndfStatut === "Provisoire" && <td></td>}
                        </tr>
                        <tr>
                            <td colSpan={2} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                                Total
                            </td>
                            <td className="py-3 px-4 text-right text-base font-bold text-green-800">
                                {totalEuro().toFixed(2)}€
                            </td>
                            <td colSpan={8}></td>
                            {ndfStatut === "Provisoire" && <td></td>}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* --- Modal Edition --- */}
            {editRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto text-gray-900">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={closeEditModal}
                            aria-label="Fermer la modale"
                            disabled={editLoading}
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Modifier la ligne kilométrique</h2>
                        <form onSubmit={handleEditSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                                <input
                                    type="date"
                                    required
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                    value={editForm.date_debut}
                                    onChange={e => handleEditFormChange("date_debut", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                                <input
                                    type="date"
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                    value={editForm.date_fin || ""}
                                    onChange={e => handleEditFormChange("date_fin", e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Départ</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={editForm.depart}
                                        onChange={e => handleEditFormChange("depart", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Arrivée</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={editForm.arrivee}
                                        onChange={e => handleEditFormChange("arrivee", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        step="0.1"
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={editForm.distance}
                                        onChange={e => handleEditFormChange("distance", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de trajet</label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={editForm.type_trajet}
                                        onChange={e => handleEditFormChange("type_trajet", e.target.value)}
                                    >
                                        {TRAJET_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
                                <input
                                    type="text"
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                    value={editForm.motif}
                                    onChange={e => handleEditFormChange("motif", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total (€)</label>
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    step="0.01"
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                    value={editForm.total_euro}
                                    readOnly
                                />
                            </div>
                            {editError && (
                                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
                                    {editError}
                                </div>
                            )}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-300"
                                    onClick={closeEditModal}
                                    disabled={editLoading}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    {editLoading ? "Modification..." : "Enregistrer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Modal de confirmation suppression --- */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative text-gray-900">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={cancelDelete}
                            aria-label="Fermer la modale"
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-lg font-bold mb-4">Supprimer la ligne ?</h2>
                        <p className="mb-6 text-gray-700">Voulez-vous vraiment supprimer cette ligne kilométrique ? Cette action est irréversible.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                className="px-5 py-2 bg-gray-200 text-gray-700 rounded-md shadow-sm font-medium hover:bg-gray-300"
                                onClick={cancelDelete}
                            >
                                Annuler
                            </button>
                            <button
                                className="px-5 py-2 bg-red-600 text-white rounded-md shadow-sm font-medium hover:bg-red-700"
                                onClick={confirmDelete}
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}