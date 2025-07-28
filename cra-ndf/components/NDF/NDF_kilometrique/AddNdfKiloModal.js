"use client";
import { useState } from "react";
import { X, Plus, Trash } from "lucide-react";

function calcIndemniteVoiture(cv, total) {
    total = parseFloat(total);
    if (isNaN(total) || !cv) return "";
    let bar = null;
    if (cv === "3-") bar = 3;
    if (cv === "4") bar = 4;
    if (cv === "5") bar = 5;
    if (cv === "6") bar = 6;
    if (cv === "7+") bar = 7;
    if (!bar) return "";
    if (bar === 3) {
        if (total <= 5000) return (total * 0.529).toFixed(2);
        if (total <= 20000) return (total * 0.316 + 1061).toFixed(2);
        return (total * 0.369).toFixed(2);
    }
    if (bar === 4) {
        if (total <= 5000) return (total * 0.606).toFixed(2);
        if (total <= 20000) return (total * 0.340 + 1330).toFixed(2);
        return (total * 0.408).toFixed(2);
    }
    if (bar === 5) {
        if (total <= 5000) return (total * 0.636).toFixed(2);
        if (total <= 20000) return (total * 0.356 + 1391).toFixed(2);
        return (total * 0.427).toFixed(2);
    }
    if (bar === 6) {
        if (total <= 5000) return (total * 0.665).toFixed(2);
        if (total <= 20000) return (total * 0.374 + 1457).toFixed(2);
        return (total * 0.448).toFixed(2);
    }
    if (bar === 7) {
        if (total <= 5000) return (total * 0.697).toFixed(2);
        if (total <= 20000) return (total * 0.394 + 1512).toFixed(2);
        return (total * 0.470).toFixed(2);
    }
    return "";
}
function calcIndemniteMoto(cv, total) {
    total = parseFloat(total);
    if (isNaN(total) || !cv) return "";
    if (cv === "1") {
        if (total <= 3000) return (total * 0.395).toFixed(2);
        if (total <= 6000) return (total * 0.099 + 891).toFixed(2);
        return (total * 0.248).toFixed(2);
    }
    if (cv === "2-3-4-5") {
        if (total <= 3000) return (total * 0.468).toFixed(2);
        if (total <= 6000) return (total * 0.082 + 1158).toFixed(2);
        return (total * 0.275).toFixed(2);
    }
    if (cv === "plus5") {
        if (total <= 3000) return (total * 0.606).toFixed(2);
        if (total <= 6000) return (total * 0.079 + 1583).toFixed(2);
        return (total * 0.343).toFixed(2);
    }
    return "";
}
function calcIndemnite(type_vehicule, cv, total) {
    if (type_vehicule === "voiture") return calcIndemniteVoiture(cv, total);
    if (type_vehicule === "moto") return calcIndemniteMoto(cv, total);
    return "";
}
function isDateInvalid(dateDebut, dateFin) {
    if (!dateDebut || !dateFin) return false;
    return new Date(dateDebut) > new Date(dateFin);
}

const TRAJET_TYPES = [
    { label: "Aller", value: 1 },
    { label: "Aller-Retour", value: 2 }
];
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
const emptyLigne = {
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
};

export default function AddNdfKiloModal({ ndfId, ndfStatut = "Provisoire", onAdded }) {
    const [open, setOpen] = useState(false);
    const [lignes, setLignes] = useState([{ ...emptyLigne }]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function handleChange(idx, field, value) {
        setLignes(lgs => {
            const arr = lgs.map((l, i) => {
                if (i !== idx) return l;
                const newL = { ...l, [field]: value };
                if (field === "type_vehicule") newL.cv = "";
                if (field === "distance" || field === "type_trajet") {
                    const d = parseFloat(field === "distance" ? value : newL.distance);
                    const t = parseInt(field === "type_trajet" ? value : newL.type_trajet);
                    newL.total_euro = (!isNaN(d) && !isNaN(t)) ? (d * t).toFixed(2) : "";
                }
                return newL;
            });
            return arr;
        });
    }
    function addLigne() {
        setLignes(lgs => [...lgs, { ...emptyLigne }]);
    }
    function removeLigne(idx) {
        setLignes(lgs => lgs.length > 1 ? lgs.filter((_, i) => i !== idx) : lgs);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        for (let i = 0; i < lignes.length; i++) {
            const ligne = lignes[i];
            if (!ligne.date_debut || !ligne.depart || !ligne.arrivee || !ligne.type_vehicule || !ligne.cv || !ligne.distance) {
                setError(`Veuillez compléter tous les champs obligatoires pour la ligne ${i + 1}.`);
                setLoading(false);
                return;
            }
            if (ligne.date_debut && ligne.date_fin && isDateInvalid(ligne.date_debut, ligne.date_fin)) {
                setError(`Date de début supérieure à date de fin (ligne ${i + 1}).`);
                setLoading(false);
                return;
            }
        }

        try {
            const body = lignes.map(ligne => ({
                ...ligne,
                id_ndf: ndfId,
                type_trajet: parseInt(ligne.type_trajet),
                distance: parseFloat(ligne.distance)
            }));
            const res = await fetch("/api/ndf_kilo/multi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Erreur lors de l'ajout.");
            }
            setOpen(false);
            setLignes([{ ...emptyLigne }]);
            if (onAdded) onAdded();
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
                    className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold shadow hover:bg-green-700"
                    onClick={() => setOpen(true)}
                >
                    + Ajouter ligne(s) kilométrique(s)
                </button>
            )}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl relative max-h-[95vh] overflow-y-auto text-gray-900">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={() => setOpen(false)}
                            aria-label="Fermer la modale"
                            disabled={loading}
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Ajouter ligne(s) kilométrique(s)</h2>
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {lignes.map((form, idx) => (
                                <div key={idx} className="border rounded-lg p-4 mb-4 relative bg-gray-50 shadow-sm">
                                    <div className="absolute top-2 right-2">
                                        {lignes.length > 1 && (
                                            <button
                                                type="button"
                                                className="p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                                                onClick={() => removeLigne(idx)}
                                                title="Supprimer cette ligne"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                                            <input
                                                type="date"
                                                required
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                                value={form.date_debut}
                                                onChange={e => handleChange(idx, "date_debut", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                                            <input
                                                type="date"
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                                value={form.date_fin}
                                                onChange={e => handleChange(idx, "date_fin", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Départ</label>
                                            <input
                                                type="text"
                                                required
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                                value={form.depart}
                                                onChange={e => handleChange(idx, "depart", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Arrivée</label>
                                            <input
                                                type="text"
                                                required
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                                value={form.arrivee}
                                                onChange={e => handleChange(idx, "arrivee", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
                                            <input
                                                type="number"
                                                required
                                                min={0}
                                                step="0.1"
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                                value={form.distance}
                                                onChange={e => handleChange(idx, "distance", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type de trajet</label>
                                            <select
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                                value={form.type_trajet}
                                                onChange={e => handleChange(idx, "type_trajet", e.target.value)}
                                            >
                                                {TRAJET_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
                                            <input
                                                type="text"
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                                value={form.motif}
                                                onChange={e => handleChange(idx, "motif", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type de véhicule</label>
                                            <select
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                                value={form.type_vehicule}
                                                onChange={e => handleChange(idx, "type_vehicule", e.target.value)}
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
                                                    onChange={e => handleChange(idx, "cv", e.target.value)}
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
                                                    onChange={e => handleChange(idx, "cv", e.target.value)}
                                                    required
                                                >
                                                    <option value="">Sélectionner</option>
                                                    {cvOptionsVoiture.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Total (€)</label>
                                            <input
                                                type="number"
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                                value={form.total_euro}
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Indemnités (€)</label>
                                            <input
                                                type="text"
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                                value={calcIndemnite(form.type_vehicule, form.cv, form.total_euro)}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="flex gap-3 justify-start mb-4">
                                <button
                                    type="button"
                                    onClick={addLigne}
                                    className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-600 font-semibold rounded hover:bg-blue-200"
                                >
                                    <Plus size={18} className="mr-2" />
                                    Ajouter une ligne
                                </button>
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
                                    {loading ? "Ajout..." : "Ajouter toutes les lignes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}