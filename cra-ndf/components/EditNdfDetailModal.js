"use client";
import { useState, useEffect, useMemo } from "react";
import { Pencil, X } from "lucide-react";

const NATURES = ["carburant", "parking", "peage", "repas", "achat divers"];
const TVAS = ["autre taux", "multi-taux", "0%", "5.5%", "10%", "20%"];
const MULTI_TVA_OPTIONS = ["0", "5.5", "10", "20"];
const MOYENS_PAIEMENT = ["Carte Bancaire", "Espèce", "PAYPAL", "Prélèvement Automatique", "TÉLÉPEAGE", "Chèque"];

function getMultiTauxFromDetail(detail) {
    if (detail.multiTaux && Array.isArray(detail.multiTaux)) {
        return detail.multiTaux.map(mt => ({
            taux: String(mt.taux ?? ""),
            montant: String(mt.montant ?? "")
        }));
    }
    if (typeof detail.tva === "string" && detail.tva.includes("/")) {
        const tauxList = detail.tva.split("/").map(t => t.replace("%", "").trim());
        let montantGlobal = parseFloat(detail.montant) || 0;
        let nb = tauxList.length;
        let approx = nb ? (montantGlobal / nb).toFixed(2) : "";
        return tauxList.map(t => ({ taux: t, montant: approx }));
    }
    return [{ taux: "", montant: "" }];
}

function detectTvaType(detail) {
    if ((detail.multiTaux && Array.isArray(detail.multiTaux)) || (typeof detail.tva === "string" && detail.tva.includes("/"))) {
        return "multi-taux";
    }
    if (typeof detail.tva === "string" && TVAS.includes(detail.tva.split(" ")[0])) return detail.tva;
    if (typeof detail.tva === "string" && detail.tva) return "autre taux";
    return "0%";
}

export default function EditNdfDetailModal({ detail, onEdited }) {
    const [open, setOpen] = useState(false);

    const [dateStr, setDateStr] = useState(detail.date_str || "");
    const [nature, setNature] = useState(detail.nature || NATURES[0]);
    const [description, setDescription] = useState(detail.description || "");
    const [tva, setTva] = useState(() => detectTvaType(detail));
    const [autreTaux, setAutreTaux] = useState(() => {
        if (typeof detail.tva === "string" && !TVAS.includes(detail.tva.split(" ")[0]) && !detail.tva.includes("/")) {
            return detail.tva;
        }
        return "";
    });
    const [multiTaux, setMultiTaux] = useState(() => getMultiTauxFromDetail(detail));
    const [montant, setMontant] = useState(detail.montant ? String(detail.montant) : "");
    const [valeurTTC, setValeurTTC] = useState(
        detail.valeur_ttc !== undefined && detail.valeur_ttc !== null ? String(detail.valeur_ttc) : ""
    );
    const [imgFile, setImgFile] = useState(null);
    const [clients, setClients] = useState([]);
    const [projets, setProjets] = useState([]);
    const [selectedClient, setSelectedClient] = useState(detail.client_id || "");
    const [selectedProjet, setSelectedProjet] = useState(detail.projet_id || "");
    const [moyenPaiement, setMoyenPaiement] = useState(detail.moyen_paiement || MOYENS_PAIEMENT[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            fetch("/api/client")
                .then(res => res.json())
                .then(data => setClients(Array.isArray(data) ? data : []));
            fetch("/api/projets")
                .then(res => res.json())
                .then(data => setProjets(Array.isArray(data) ? data : []));
        }
    }, [open]);

    // TVA simple ou autre taux
    const tauxMono = useMemo(() => {
        if (tva === "autre taux" && autreTaux) {
            return parseFloat(autreTaux.replace("%", "").replace(",", ".")) || 0;
        }
        if (TVAS.includes(tva) && tva !== "multi-taux" && tva !== "autre taux") {
            return parseFloat(tva.replace("%", "").replace(",", ".")) || 0;
        }
        return 0;
    }, [tva, autreTaux]);

    // Pour HT auto (sauf multi-taux)
    useEffect(() => {
        if (tva === "multi-taux") return;
        if (!valeurTTC || !tauxMono) {
            setMontant("");
            return;
        }
        const ttcNum = parseFloat(valeurTTC.replace(",", "."));
        const htNum = ttcNum / (1 + tauxMono / 100);
        setMontant(isNaN(htNum) ? "" : htNum.toFixed(2));
    }, [valeurTTC, tauxMono, tva]);

    // Calcul TVA simple
    const valeurTvaMono = useMemo(() => {
        if (tva === "multi-taux" || !montant || !tauxMono) return "";
        const montantNum = parseFloat(montant) || 0;
        const brut = montantNum * tauxMono / 100;
        const brutStr = (brut * 1000).toFixed(0);
        const intPart = Math.floor(brut * 100);
        const third = +brutStr % 10;
        let arrondi = intPart / 100;
        if (third >= 5) arrondi = (intPart + 1) / 100;
        return arrondi.toFixed(2);
    }, [montant, tauxMono, tva]);

    // Multi-taux
    const totalHTMulti = useMemo(() => {
        if (tva !== "multi-taux") return 0;
        return multiTaux.reduce((sum, mt) => sum + (parseFloat(mt.montant) || 0), 0);
    }, [multiTaux, tva]);

    const totalTVA = useMemo(() => {
        if (tva !== "multi-taux") return 0;
        return multiTaux.reduce((sum, mt) => {
            const tauxNum = parseFloat(mt.taux) || 0;
            const montantNum = parseFloat(mt.montant) || 0;
            const brut = montantNum * tauxNum / 100;
            const brutStr = (brut * 1000).toFixed(0);
            const intPart = Math.floor(brut * 100);
            const third = +brutStr % 10;
            let arrondi = intPart / 100;
            if (third >= 5) arrondi = (intPart + 1) / 100;
            return sum + arrondi;
        }, 0);
    }, [multiTaux, tva]);

    // Montant HT maj auto si multi-taux
    useEffect(() => {
        if (tva === "multi-taux") {
            setMontant(totalHTMulti.toFixed(2));
        }
    }, [totalHTMulti, tva]);

    // --- Handlers multi-taux
    function handleMultiTauxChange(idx, field, value) {
        setMultiTaux((prev) =>
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

    // --- SUBMIT
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

        // Vérification multi-taux stricte
        if (tva === "multi-taux") {
            if (!valeurTTC) {
                setError("Veuillez entrer la valeur TTC.");
                setLoading(false);
                return;
            }
            if (multiTaux.some((mt) => !mt.taux || !mt.montant)) {
                setError("Veuillez compléter tous les taux et montants en multi-taux.");
                setLoading(false);
                return;
            }
            const totalHT = totalHTMulti;
            const tvaTotal = totalTVA;
            const ttc = parseFloat(valeurTTC);
            const precision = 0.01;
            if (Math.abs(ttc - (totalHT + tvaTotal)) > precision) {
                setError(
                    `Le total TTC (${ttc.toFixed(2)}€) doit être égal à la somme du Total HT (${totalHT.toFixed(2)}€) + Total TVA (${totalTVA.toFixed(2)}€).`
                );
                setLoading(false);
                return;
            }
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
        let montantValue = tva === "multi-taux" ? parseFloat(totalHTMulti) : parseFloat(montant);
        let extra = {};
        if (tva === "autre taux") {
            tvaValue = autreTaux;
        } else if (tva === "multi-taux") {
            tvaValue = multiTaux.map(mt => `${parseFloat(mt.taux) || 0}%`).join(" / ");
            extra = { multiTaux: multiTaux.map(mt => ({ taux: mt.taux, montant: mt.montant })) };
        }

        const body = {
            date_str: dateStr,
            nature,
            description,
            tva: tvaValue,
            montant: montantValue,
            valeur_ttc: valeurTTC ? parseFloat(valeurTTC) : null,
            img_url,
            client_id: selectedClient,
            projet_id: selectedProjet,
            moyen_paiement: moyenPaiement,
            ...extra,
        };

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
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date :
                                    </label>
                                    <input
                                        type="date"
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900"
                                        value={dateStr}
                                        required
                                        onChange={e => setDateStr(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nature :
                                    </label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900"
                                        value={nature}
                                        onChange={e => setNature(e.target.value)}
                                    >
                                        {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Moyen de paiement :
                                    </label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900"
                                        value={moyenPaiement}
                                        onChange={e => setMoyenPaiement(e.target.value)}
                                        required
                                    >
                                        {MOYENS_PAIEMENT.map(mp => (
                                            <option key={mp} value={mp}>{mp}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description :
                                    </label>
                                    <input
                                        type="text"
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Valeur TTC (€) :
                                    </label>
                                    <input
                                        type="number"
                                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                                        value={valeurTTC}
                                        min={0}
                                        step="0.01"
                                        required
                                        onChange={e => setValeurTTC(e.target.value)}
                                        placeholder="Montant TTC du ticket"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        TVA :
                                    </label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900"
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
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Taux personnalisé (%) (ex: 8.5)"
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900"
                                            value={autreTaux}
                                            required
                                            onChange={e => setAutreTaux(e.target.value)}
                                        />
                                    </div>
                                )}
                                {tva === "multi-taux" && (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Taux multiples (%) – montants HT – valeur TVA :
                                        </label>
                                        {multiTaux.map((mt, idx) => {
                                            const tauxNum = parseFloat(mt.taux) || 0;
                                            const montantNum = parseFloat(mt.montant) || 0;
                                            let tvaValeur = "";
                                            if (mt.taux && mt.montant) {
                                                const brut = montantNum * tauxNum / 100;
                                                const brutStr = (brut * 1000).toFixed(0);
                                                const intPart = Math.floor(brut * 100);
                                                const third = +brutStr % 10;
                                                let arrondi = intPart / 100;
                                                if (third >= 5) arrondi = (intPart + 1) / 100;
                                                tvaValeur = arrondi.toFixed(2);
                                            }
                                            return (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <select
                                                        className="block w-20 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
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
                                                        className="block w-28 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                                                        value={mt.montant}
                                                        required
                                                        onChange={e => handleMultiTauxChange(idx, "montant", e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        className="block w-28 border border-gray-200 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-800"
                                                        value={tvaValeur}
                                                        readOnly
                                                        tabIndex={-1}
                                                        placeholder="Valeur TVA"
                                                        title="Valeur TVA calculée automatiquement"
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
                                            );
                                        })}
                                        {/* Affichage des totaux */}
                                        <div className="flex flex-col gap-1 mt-3 text-sm text-gray-700">
                                            <div>
                                                <span className="font-medium">Total HT saisi : </span>
                                                <span>{totalHTMulti.toFixed(2)} €</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Total TVA calculé : </span>
                                                <span>{totalTVA.toFixed(2)} €</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Total TTC attendu : </span>
                                                <span>{(totalHTMulti + totalTVA).toFixed(2)} €</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {tva !== "multi-taux" && (
                                    <div className="flex gap-4 items-end">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Montant HT (€) :
                                            </label>
                                            <input
                                                type="number"
                                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                                                value={montant}
                                                min={0}
                                                step="0.01"
                                                required
                                                onChange={e => setMontant(e.target.value)}
                                                readOnly
                                                tabIndex={-1}
                                                title="Montant HT calculé automatiquement à partir du TTC"
                                            />
                                        </div>
                                        <div className="w-48">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Valeur TVA (€) :
                                            </label>
                                            <input
                                                type="text"
                                                className="block w-full border border-gray-200 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-800"
                                                value={valeurTvaMono}
                                                readOnly
                                                tabIndex={-1}
                                                title="Valeur TVA calculée automatiquement"
                                            />
                                        </div>
                                    </div>
                                )}
                                {/* ANALYTIQUES */}
                                <div className="pt-4 border-t border-gray-200 mt-4">
                                    <h3 className="text-lg font-semibold mb-3 text-gray-800">ANALYTIQUES</h3>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Client :
                                        </label>
                                        <select
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900"
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
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Projet :
                                        </label>
                                        <select
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-white text-gray-900"
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
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm text-center">
                                        {error}
                                    </div>
                                )}
                                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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