"use client";
import { useState } from "react";
import { X } from "lucide-react";

const TRAJET_TYPES = [
    { label: "Aller", value: 1 },
    { label: "Aller-Retour", value: 2 }
];

export default function AddNdfKiloModal({ ndfId, ndfStatut, onAdded }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        date_debut: "",
        date_fin: "",
        depart: "",
        arrivee: "",
        distance: "",
        type_trajet: 1,
        motif: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function resetForm() {
        setForm({
            date_debut: "",
            date_fin: "",
            depart: "",
            arrivee: "",
            distance: "",
            type_trajet: 1,
            motif: ""
        });
        setError("");
    }

    // Calcul automatique du total (distance * type_trajet)
    const distanceNum = parseFloat(form.distance) || 0;
    const typeTrajetNum = parseInt(form.type_trajet) || 1;
    const totalAuto = (distanceNum * typeTrajetNum).toFixed(2);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const bodyToSend = {
                ...form,
                id_ndf: ndfId,
                total_euro: totalAuto // On envoie le total calculé !
            };
            const res = await fetch("/api/ndf_kilo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyToSend)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de l’ajout.");
            }
            setOpen(false);
            resetForm();
            onAdded?.();
            window.location.reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            {ndfStatut === "Provisoire" && (
                <button
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    onClick={() => setOpen(true)}
                >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter frais kilométrique
                </button>
            )}

            {open && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto text-gray-800">
                        <button
                            type="button"
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={() => { setOpen(false); resetForm(); }}
                            aria-label="Fermer la modale"
                            disabled={loading}
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
                            Nouveau frais kilométrique
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date début :</label>
                                <input
                                    type="date"
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                    required
                                    value={form.date_debut}
                                    onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date fin :</label>
                                <input
                                    type="date"
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                    value={form.date_fin}
                                    onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Départ :</label>
                                    <input
                                        type="text"
                                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                        required
                                        value={form.depart}
                                        onChange={e => setForm(f => ({ ...f, depart: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Arrivée :</label>
                                    <input
                                        type="text"
                                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                        required
                                        value={form.arrivee}
                                        onChange={e => setForm(f => ({ ...f, arrivee: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Distance (km) :</label>
                                    <input
                                        type="number"
                                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                        required
                                        min={0}
                                        step="0.1"
                                        value={form.distance}
                                        onChange={e => setForm(f => ({ ...f, distance: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de trajet :</label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                        value={form.type_trajet}
                                        onChange={e => setForm(f => ({ ...f, type_trajet: parseInt(e.target.value) }))}
                                    >
                                        {TRAJET_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
                                <input
                                    type="text"
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-900 font-semibold"
                                    value={totalAuto}
                                    readOnly
                                    tabIndex={-1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Motif :</label>
                                <input
                                    type="text"
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                    value={form.motif}
                                    onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}
                                />
                            </div>
                            {error && (
                                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
                                    {error}
                                </div>
                            )}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-300"
                                    onClick={() => { setOpen(false); resetForm(); }}
                                    disabled={loading}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    {loading ? "Ajout..." : "Ajouter"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}