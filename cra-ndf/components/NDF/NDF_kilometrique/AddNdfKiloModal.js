"use client";
import { useState } from "react";
import { X } from "lucide-react";

const TRAJET_TYPES = [
    { label: "Aller", value: 1 },
    { label: "Aller-Retour", value: 2 }
];

// Helper pour comparer les dates
function isDateInvalid(dateDebut, dateFin) {
    if (!dateDebut || !dateFin) return false;
    return new Date(dateDebut) > new Date(dateFin);
}

export default function AddNdfKiloModal({ ndfId, onAdded }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        date_debut: "",
        date_fin: "",
        depart: "",
        arrivee: "",
        distance: "",
        type_trajet: "1",
        motif: "",
        type_vehicule: "",
        cv: "",
        total_euro: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function handleChange(field, value) {
        setForm(f => {
            const newForm = { ...f, [field]: value };
            // reset CV si type_vehicule change
            if (field === "type_vehicule") newForm.cv = "";
            // recalcule le total si nécessaire
            if (field === "distance" || field === "type_trajet") {
                const d = parseFloat(field === "distance" ? value : newForm.distance);
                const t = parseInt(field === "type_trajet" ? value : newForm.type_trajet);
                newForm.total_euro = (!isNaN(d) && !isNaN(t)) ? (d * t).toFixed(2) : "";
            }
            return newForm;
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        // === Vérif dates ===
        if (
            form.date_debut &&
            form.date_fin &&
            isDateInvalid(form.date_debut, form.date_fin)
        ) {
            setError("La date de début ne peut pas être supérieure à la date de fin.");
            return;
        }

        setLoading(true);
        try {
            if (!ndfId) throw new Error("ID de la note de frais manquant.");
            const body = {
                ...form,
                id_ndf: ndfId,
                type_trajet: parseInt(form.type_trajet),
                distance: parseFloat(form.distance)
            };
            if (!body.type_vehicule) delete body.type_vehicule;
            if (!body.cv) delete body.cv;

            const res = await fetch("/api/ndf_kilo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Erreur lors de l'ajout.");
            }
            setOpen(false);
            setForm({
                date_debut: "",
                date_fin: "",
                depart: "",
                arrivee: "",
                distance: "",
                type_trajet: "1",
                motif: "",
                type_vehicule: "",
                cv: "",
                total_euro: ""
            });
            if (onAdded) onAdded();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Listes pour le champ "CV" selon le type de véhicule
    const cvOptionsMoto = [
        { value: "1", label: "1 CV" },
        { value: "2-3-4-5", label: "2, 3, 4 ou 5 CV" },
        { value: "plus5", label: "Plus de 5 CV" }
    ];
    const cvOptionsVoiture = [
        { value: "3-", label: "3 CV et moins" },
        { value: "4", label: "4 CV" },
        { value: "5", label: "5 CV" },
        { value: "6", label: "6 CV" },
        { value: "7+", label: "7 CV et plus" }
    ];

    return (
        <>
            <button
                className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold shadow hover:bg-green-700"
                onClick={() => setOpen(true)}
            >
                + Ajouter ligne kilométrique
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative max-h-[95vh] overflow-y-auto text-gray-900">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={() => setOpen(false)}
                            aria-label="Fermer la modale"
                            disabled={loading}
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Nouvelle ligne kilométrique</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                                <input
                                    type="date"
                                    required
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                    value={form.date_debut}
                                    onChange={e => handleChange("date_debut", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                                <input
                                    type="date"
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                    value={form.date_fin}
                                    onChange={e => handleChange("date_fin", e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Départ</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={form.depart}
                                        onChange={e => handleChange("depart", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Arrivée</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={form.arrivee}
                                        onChange={e => handleChange("arrivee", e.target.value)}
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
                                        value={form.distance}
                                        onChange={e => handleChange("distance", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de trajet</label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={form.type_trajet}
                                        onChange={e => handleChange("type_trajet", e.target.value)}
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
                                    value={form.motif}
                                    onChange={e => handleChange("motif", e.target.value)}
                                />
                            </div>
                            {/* ---------- NOUVEAUX CHAMPS ----------- */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type de véhicule</label>
                                <select
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                    value={form.type_vehicule}
                                    onChange={e => handleChange("type_vehicule", e.target.value)}
                                    required
                                >
                                    <option value="">Sélectionner</option>
                                    <option value="moto">Moto</option>
                                    <option value="voiture">Voiture</option>
                                </select>
                            </div>
                            {form.type_vehicule === "moto" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CV (Moto)</label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={form.cv}
                                        onChange={e => handleChange("cv", e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner</option>
                                        {cvOptionsMoto.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            )}
                            {form.type_vehicule === "voiture" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CV (Voiture)</label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={form.cv}
                                        onChange={e => handleChange("cv", e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner</option>
                                        {cvOptionsVoiture.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            )}
                            {/* -------------------------------------- */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total (€)</label>
                                <input
                                    type="number"
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                    value={form.total_euro}
                                    readOnly
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
                                    onClick={() => setOpen(false)}
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
