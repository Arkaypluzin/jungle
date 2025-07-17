"use client";
import { useState, useEffect, useMemo } from "react";
import { Pencil, X } from "lucide-react";

const NATURES = ["carburant", "parking", "peage", "repas", "achat divers"];
const TVAS = ["autre taux", "multi-taux", "0%", "5.5%", "10%", "20%"];
const MULTI_TVA_OPTIONS = ["0", "5.5", "10", "20"];

export default function EditNdfDetailModal({ detail, onEdited }) {
    // Init multi-taux à partir de string ou array
    function getMultiTauxFromDetail(detail) {
        if (Array.isArray(detail.tva)) {
            // Nouveau format déjà array [{ taux, montant }]
            return detail.tva.map(mt => ({
                taux: String(mt.taux ?? ""),
                montant: String(mt.montant ?? "")
            }));
        }
        if (detail.multiTaux && Array.isArray(detail.multiTaux)) {
            return detail.multiTaux.map(mt => ({
                taux: String(mt.taux ?? ""),
                montant: String(mt.montant ?? "")
            }));
        }
        // Ancien format: string genre "20% / 10%"
        if (typeof detail.tva === "string" && detail.tva.includes("/")) {
            const tauxList = detail.tva.split("/").map(t => t.replace("%", "").trim());
            let montantGlobal = parseFloat(detail.montant) || 0;
            let nb = tauxList.length;
            let approx = nb ? (montantGlobal / nb).toFixed(2) : "";
            return tauxList.map(t => ({ taux: t, montant: approx }));
        }
        return [{ taux: "", montant: "" }];
    }

    // Init nature du taux (pour l'UI)
    function detectTvaType(detail) {
        if (Array.isArray(detail.tva) || (detail.multiTaux && Array.isArray(detail.multiTaux)) || (typeof detail.tva === "string" && detail.tva.includes("/"))) {
            return "multi-taux";
        }
        if (typeof detail.tva === "string" && TVAS.includes(detail.tva.split(" ")[0])) return detail.tva;
        return "autre taux";
    }

    const [tva, setTva] = useState(() => detectTvaType(detail));
    const [autreTaux, setAutreTaux] = useState(() => {
        if (
            typeof detail.tva === "string" &&
            !TVAS.includes(detail.tva.split(" ")[0]) &&
            !detail.tva.includes("/")
        ) {
            return detail.tva;
        }
        return "";
    });
    const [multiTaux, setMultiTaux] = useState(() => getMultiTauxFromDetail(detail));
    const [open, setOpen] = useState(false);
    const [dateStr, setDateStr] = useState(detail.date_str);
    const [nature, setNature] = useState(detail.nature);
    const [description, setDescription] = useState(detail.description);
    const [montant, setMontant] = useState(detail.montant);
    const [imgFile, setImgFile] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [projets, setProjets] = useState([]);
    const [selectedClient, setSelectedClient] = useState(detail.client_id || "");
    const [selectedProjet, setSelectedProjet] = useState(detail.projet_id || "");
    const [valeurTTC, setValeurTTC] = useState(detail.valeurTTC || "");

    // Fonction utilitaire pour calculer TTC (pareil que dans ta table)
    function getTTC(montant, tva, multiTaux, tvaType) {
        let base = parseFloat(montant) || 0;
        if (tvaType === "multi-taux" && Array.isArray(multiTaux)) {
            return multiTaux.reduce((acc, mt) => {
                const ht = parseFloat(mt.montant) || 0;
                const taux = parseFloat(mt.taux) || 0;
                return acc + ht * (1 + taux / 100);
            }, 0).toFixed(2);
        }
        // autre taux / taux simple
        if (!tva || tva === "0%") return base.toFixed(2);
        if (tva && typeof tva === "string" && tva.includes("/")) {
            // split des taux si format "10% / 20%"
            const tauxList = tva.split("/").map(t => parseFloat(t.replace("%", "").trim()) || 0);
            const nb = tauxList.length;
            return (base * (1 + tauxList.reduce((s, t) => s + t, 0) / (100 * nb))).toFixed(2);
        }
        // taux simple (ex: "20%")
        const taux = parseFloat(tva.replace("%", "")) || 0;
        return (base * (1 + taux / 100)).toFixed(2);
    }

    useEffect(() => {
        if (open) {
            fetch("/api/client")
                .then(res => res.json())
                .then(data => setClients(Array.isArray(data) ? data : []))
                .catch(() => setClients([]));
            fetch("/api/projets")
                .then(res => res.json())
                .then(data => setProjets(Array.isArray(data) ? data : []))
                .catch(() => setProjets([]));
        }
    }, [open]);

    // Multi-taux gestion
    function handleMultiTauxChange(idx, field, value) {
        setMultiTaux(prev =>
            prev.map((mt, i) =>
                i === idx ? { ...mt, [field]: value } : mt
            )
        );
    }
    function addMultiTauxField() {
        if (multiTaux.length < 3) setMultiTaux([...multiTaux, { taux: "", montant: "" }]);
    }
    function removeMultiTauxField(idx) {
        if (multiTaux.length > 1) setMultiTaux(multiTaux.filter((_, i) => i !== idx));
    }
    // Montant HT global calculé
    const montantMultiHt = useMemo(() => {
        if (tva !== "multi-taux") return null;
        return multiTaux.reduce((acc, mt) => acc + (parseFloat(mt.montant) || 0), 0).toFixed(2);
    }, [multiTaux, tva]);
    useEffect(() => {
        if (tva === "multi-taux") {
            setMontant(montantMultiHt || "");
        }
    }, [montantMultiHt, tva]);

    // ------- HANDLE UPDATE / SUBMIT -------
    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        let img_url = detail.img_url;

        if (!selectedClient) {
            setError("Veuillez sélectionner un client.");
            setLoading(false);
            return;
        }
        if (!selectedProjet) {
            setError("Veuillez sélectionner un projet.");
            setLoading(false);
            return;
        }
        if (imgFile) {
            const formData = new FormData();
            formData.append("file", imgFile);
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                setError("Erreur upload image");
                setLoading(false);
                return;
            }
            const data = await res.json();
            img_url = data.url;
        }

        let tvaValue = tva;
        let montantValue = tva === "multi-taux" ? parseFloat(montantMultiHt) : parseFloat(montant);
        let body = {
            date_str: dateStr,
            nature,
            description,
            montant: montantValue,
            img_url,
            client_id: selectedClient,
            projet_id: selectedProjet
        };

        if (tva === "autre taux") {
            body.tva = autreTaux;
        } else if (tva === "multi-taux") {
            // Validation
            if (multiTaux.some(mt => !mt.taux || !mt.montant)) {
                setError("Veuillez compléter tous les taux et montants en multi-taux.");
                setLoading(false);
                return;
            }
            // On envoie un ARRAY [{ taux, montant }]
            body.tva = multiTaux.map(mt => ({
                taux: mt.taux,
                montant: mt.montant
            }));
        } else {
            body.tva = tva;
        }

        const res = await fetch(`/api/ndf_details/${detail.uuid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            setError("Erreur lors de la modification");
        } else {
            setOpen(false);
            onEdited?.();
        }
        setLoading(false);
    }

    // ----- UI identique à avant -----
    return (
        <>
            <button
                className="text-blue-600 p-2 rounded hover:bg-blue-100"
                title="Modifier"
                onClick={() => setOpen(true)}
            >
                <Pencil size={20} />
            </button>
            {open && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
                    <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl p-0">
                        <div className="overflow-y-auto max-h-[90vh] p-8">
                            <button
                                type="button"
                                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={() => setOpen(false)}
                                aria-label="Fermer la modale"
                                disabled={loading}
                            >
                                <X size={28} />
                            </button>
                            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center border-b pb-3">
                                Modifier la dépense
                            </h2>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date :
                                    </label>
                                    <input
                                        type="date"
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={dateStr}
                                        required
                                        onChange={e => setDateStr(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nature :
                                    </label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={nature}
                                        onChange={e => setNature(e.target.value)}
                                    >
                                        {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description :
                                    </label>
                                    <input
                                        type="text"
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Client :
                                    </label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedClient}
                                        onChange={e => setSelectedClient(e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner un client</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.nom_client}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Projet :
                                    </label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedProjet}
                                        onChange={e => setSelectedProjet(e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner un projet</option>
                                        {projets.map(p => (
                                            <option key={p.id || p.uuid} value={p.id || p.uuid}>
                                                {p.nom}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Valeur TTC (€) :
                                    </label>
                                    <input
                                        type="number"
                                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={valeurTTC}
                                        min={0}
                                        step="0.01"
                                        required
                                        onChange={e => setValeurTTC(e.target.value)}
                                        placeholder="Montant TTC du ticket"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        TVA :
                                    </label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={tva}
                                        onChange={e => {
                                            setTva(e.target.value);
                                            setAutreTaux("");
                                            setMultiTaux([{ taux: "", montant: "" }]);
                                        }}
                                    >
                                        {TVAS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                {tva === "autre taux" && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Taux personnalisé (%)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Taux personnalisé (%)"
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            value={autreTaux}
                                            required
                                            onChange={e => setAutreTaux(e.target.value)}
                                        />
                                    </div>
                                )}
                                {tva === "multi-taux" && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Taux multiples (%) et montants :
                                        </label>
                                        <div className="flex flex-col gap-2">
                                            {multiTaux.map((mt, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <select
                                                        className="block w-28 border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        value={mt.taux}
                                                        required
                                                        onChange={e => handleMultiTauxChange(idx, "taux", e.target.value)}
                                                    >
                                                        <option value="">Taux</option>
                                                        {MULTI_TVA_OPTIONS.map(option => (
                                                            <option key={option} value={option}>{option}%</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        placeholder="Montant HT"
                                                        min={0}
                                                        step="0.01"
                                                        className="block w-28 border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        value={mt.montant}
                                                        required
                                                        onChange={e => handleMultiTauxChange(idx, "montant", e.target.value)}
                                                    />
                                                    {multiTaux.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeMultiTauxField(idx)}
                                                            className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200"
                                                            title="Supprimer ce taux"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                    {idx === multiTaux.length - 1 && multiTaux.length < 3 && (
                                                        <button
                                                            type="button"
                                                            onClick={addMultiTauxField}
                                                            className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors duration-200"
                                                            title="Ajouter un taux"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-4 w-4"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <div className="text-right text-xs text-gray-500 mt-1">
                                                Total HT multi-taux : <span className="font-semibold">{montantMultiHt} €</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Montant HT (€) :
                                    </label>
                                    <input
                                        type="number"
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={montant}
                                        min={0}
                                        step="0.01"
                                        required
                                        onChange={e => setMontant(e.target.value)}
                                        disabled={tva === "multi-taux"}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Justificatif :
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="block"
                                            onChange={e => setImgFile(e.target.files[0])}
                                        />
                                        {detail.img_url &&
                                            <a href={detail.img_url} target="_blank" rel="noopener noreferrer"
                                                className="underline text-blue-700 hover:text-blue-900 text-sm">
                                                Voir l’image actuelle
                                            </a>
                                        }
                                    </div>
                                </div>
                                {error && (
                                    <div className="md:col-span-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm text-center">
                                        {error}
                                    </div>
                                )}
                                <div className="md:col-span-2 flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors duration-200"
                                        onClick={() => setOpen(false)}
                                        disabled={loading}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "Modification..." : "Modifier"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}