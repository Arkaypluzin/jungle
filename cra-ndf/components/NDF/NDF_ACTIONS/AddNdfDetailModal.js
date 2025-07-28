"use client";
import { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash } from "lucide-react";

const NATURES = ["carburant", "parking", "peage", "repas", "achat divers"];
const TVAS = ["autre taux", "multi-taux", "0%", "5.5%", "10%", "20%"];
const MULTI_TVA_OPTIONS = ["0", "5.5", "10", "20"];
const MOYENS_PAIEMENT = [
  "Carte Bancaire", "Espèce", "PAYPAL", "Prélèvement Automatique", "TÉLÉPEAGE", "Chèque"
];
const TYPE_REPAS = ["Petit-déjeuner", "Déjeuner", "Dîner"];
const MONTHS_MAP = {
  Janvier: 0, Février: 1, Mars: 2, Avril: 3, Mai: 4, Juin: 5,
  Juillet: 6, Août: 7, Septembre: 8, Octobre: 9, Novembre: 10, Décembre: 11,
};

function getDefaultForm(minDate) {
  return {
    dateStr: minDate || "",
    nature: NATURES[0],
    description: "",
    tva: "0%",
    montant: "",
    valeurTTC: "",
    autreTaux: "",
    multiTaux: [{ taux: "", montant: "" }],
    imgFile: null,
    selectedClient: "",
    selectedProjet: "",
    moyenPaiement: MOYENS_PAIEMENT[0],
    typeRepas: TYPE_REPAS[0],
    invite: "",
    inviter: [],
  };
}

export default function AddNdfDetailModal({
  ndfId, ndfStatut, parentNdfMonth, parentNdfYear,
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState([]);
  const [clients, setClients] = useState([]);
  const [projets, setProjets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Dates min/max globales
  const monthIndex = parentNdfMonth ? MONTHS_MAP[parentNdfMonth] : null;
  const yearValue = parentNdfYear || new Date().getFullYear();
  const minDate = useMemo(() => {
    if (monthIndex !== null) return new Date(yearValue, monthIndex, 1).toISOString().split("T")[0];
    return "";
  }, [monthIndex, yearValue]);
  const maxDate = useMemo(() => {
    if (monthIndex !== null) return new Date(yearValue, monthIndex + 1, 0).toISOString().split("T")[0];
    return "";
  }, [monthIndex, yearValue]);

  // Initialisation data clients/projets
  useEffect(() => {
    if (open) {
      fetch("/api/client").then(res => res.json()).then(data => setClients(Array.isArray(data) ? data : []));
      fetch("/api/projets").then(res => res.json()).then(data => setProjets(Array.isArray(data) ? data : []));
    }
  }, [open]);

  // Initialisation d'une ligne si on ouvre
  useEffect(() => {
    if (open && details.length === 0) {
      setDetails([getDefaultForm(minDate)]);
    }
  }, [open, details.length, minDate]);

  function resetAll() {
    setDetails([getDefaultForm(minDate)]);
    setError("");
  }

  // Gestion d'une ligne de dépense
  function handleFieldChange(idx, field, value) {
    setDetails(prev =>
      prev.map((d, i) =>
        i === idx ? { ...d, [field]: value } : d
      )
    );
  }
  function handleMultiTauxChange(idx, tauxIdx, field, value) {
    setDetails(prev =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        const multiTaux = d.multiTaux.map((mt, mi) =>
          mi === tauxIdx ? { ...mt, [field]: value } : mt
        );
        return { ...d, multiTaux };
      })
    );
  }
  function addMultiTauxField(idx) {
    setDetails(prev =>
      prev.map((d, i) =>
        i === idx && d.multiTaux.length < 3
          ? { ...d, multiTaux: [...d.multiTaux, { taux: "", montant: "" }] }
          : d
      )
    );
  }
  function removeMultiTauxField(idx, tauxIdx) {
    setDetails(prev =>
      prev.map((d, i) =>
        i === idx && d.multiTaux.length > 1
          ? { ...d, multiTaux: d.multiTaux.filter((_, mi) => mi !== tauxIdx) }
          : d
      )
    );
  }
  function handleAddInvite(idx, val) {
    setDetails(prev =>
      prev.map((d, i) =>
        i === idx && val.trim()
          ? { ...d, inviter: [...d.inviter, val.trim()], invite: "" }
          : d
      )
    );
  }
  function handleRemoveInvite(idx, inviteIdx) {
    setDetails(prev =>
      prev.map((d, i) =>
        i === idx
          ? { ...d, inviter: d.inviter.filter((_, j) => j !== inviteIdx) }
          : d
      )
    );
  }
  function handleFileChange(idx, file) {
    setDetails(prev =>
      prev.map((d, i) =>
        i === idx ? { ...d, imgFile: file } : d
      )
    );
  }
  function addForm() {
    if (details.length < 5) setDetails([...details, getDefaultForm(minDate)]);
  }
  function removeForm(idx) {
    if (details.length > 1) setDetails(details.filter((_, i) => i !== idx));
  }

  // Upload pour une image individuelle
  async function uploadImage(imgFile) {
    if (!imgFile) return null;
    const formData = new FormData();
    formData.append("file", imgFile);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Erreur lors de l'upload de l'image.");
    }
    const data = await res.json();
    return data.url;
  }

  // Calculs automatiques de HT/TVA par ligne (même logique qu'avant, isolé pour chaque ligne)
  function autoFillDetail(d) {
    const tvaMono = (() => {
      if (d.tva === "autre taux" && d.autreTaux)
        return parseFloat(d.autreTaux.replace("%", "").replace(",", ".")) || 0;
      if (TVAS.includes(d.tva) && d.tva !== "multi-taux" && d.tva !== "autre taux")
        return parseFloat(d.tva.replace("%", "").replace(",", ".")) || 0;
      return 0;
    })();

    // Montant HT auto
    let montant = d.montant;
    if (d.tva !== "multi-taux" && d.valeurTTC && tvaMono) {
      const ttcNum = parseFloat(d.valeurTTC.toString().replace(",", "."));
      const htNum = ttcNum / (1 + tvaMono / 100);
      montant = isNaN(htNum) ? "" : htNum.toFixed(2);
    }
    // Valeur TVA auto
    let valeurTvaMono = "";
    if (d.tva !== "multi-taux" && montant && tvaMono) {
      const montantNum = parseFloat(montant) || 0;
      const brut = montantNum * tvaMono / 100;
      const brutStr = (brut * 1000).toFixed(0);
      const intPart = Math.floor(brut * 100);
      const third = +brutStr % 10;
      let arrondi = intPart / 100;
      if (third >= 5) arrondi = (intPart + 1) / 100;
      valeurTvaMono = arrondi.toFixed(2);
    }
    // Pour multi-taux
    let totalHTMulti = 0;
    let totalTVA = 0;
    if (d.tva === "multi-taux") {
      totalHTMulti = d.multiTaux.reduce((sum, mt) => sum + (parseFloat(mt.montant) || 0), 0);
      totalTVA = d.multiTaux.reduce((sum, mt) => {
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
    }
    return { ...d, montant, valeurTvaMono, totalHTMulti, totalTVA };
  }

  // Ajout multi
  async function handleMultiSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Validation basique
      if (ndfStatut !== "Provisoire") throw new Error("Impossible d’ajouter une dépense sur une note de frais non provisoire.");
      for (const d of details) {
        if (!d.selectedClient) throw new Error("Veuillez sélectionner un client.");
        if (!d.selectedProjet) throw new Error("Veuillez sélectionner un projet.");
        if (!d.dateStr) throw new Error("Veuillez remplir la date.");
        if (!d.valeurTTC) throw new Error("Veuillez remplir le montant TTC.");
        if (d.tva === "multi-taux") {
          if (!d.valeurTTC) throw new Error("Veuillez entrer la valeur TTC.");
          if (d.multiTaux.some(mt => !mt.taux || !mt.montant))
            throw new Error("Veuillez compléter tous les taux et montants en multi-taux.");
          const totalHT = d.multiTaux.reduce((sum, mt) => sum + (parseFloat(mt.montant) || 0), 0);
          const totalTVA = d.multiTaux.reduce((sum, mt) => {
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
          const ttc = parseFloat(d.valeurTTC);
          if (Math.abs(ttc - (totalHT + totalTVA)) > 0.01) {
            throw new Error(`Le total TTC doit être égal à la somme du Total HT + Total TVA sur toutes les lignes.`);
          }
        }
      }

      // Upload images en parallèle
      const imgs = await Promise.all(
        details.map(async (d) => {
          if (d.imgFile) return await uploadImage(d.imgFile);
          return null;
        })
      );

      // Prépare data
      const rowsToSend = details.map((d, idx) => {
        const auto = autoFillDetail(d);
        let tvaValue = d.tva;
        let montantValue = d.tva === "multi-taux" ? parseFloat(auto.totalHTMulti) : parseFloat(auto.montant);
        let extra = {};
        if (d.tva === "autre taux") tvaValue = d.autreTaux;
        else if (d.tva === "multi-taux") {
          tvaValue = d.multiTaux.map((mt) => `${parseFloat(mt.taux) || 0}%`).join(" / ");
          extra = { multiTaux: d.multiTaux.map(mt => ({ taux: mt.taux, montant: mt.montant })) };
        }
        const body = {
          id_ndf: ndfId,
          date_str: d.dateStr,
          nature: d.nature,
          description: d.description,
          tva: tvaValue,
          montant: montantValue,
          valeur_ttc: d.valeurTTC ? parseFloat(d.valeurTTC) : null,
          img_url: imgs[idx],
          client_id: d.selectedClient,
          projet_id: d.selectedProjet,
          moyen_paiement: d.moyenPaiement,
          ...extra,
        };
        if (d.nature === "repas") {
          body.type_repas = d.typeRepas;
          body.inviter = d.inviter;
        }
        return body;
      });

      // Appel à l’API multi
      const res = await fetch("/api/ndf_details/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rowsToSend),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l’ajout des dépenses.");
      }
      setOpen(false);
      resetAll();
      window.location.reload();
    } catch (err) {
      setError(err.message || err);
    } finally {
      setLoading(false);
    }
  }

  // --------- UI ----------
  return (
    <>
      {ndfStatut === "Provisoire" && (
        <button
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          onClick={() => { setOpen(true); resetAll(); }}>
          <Plus className="mr-2 h-5 w-5" />
          Ajouter une dépense
        </button>
      )}

      {open && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => { setOpen(false); resetAll(); }}
              disabled={loading}
              aria-label="Fermer la modale"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
              Nouvelle(s) dépense(s)
            </h2>

            <form onSubmit={handleMultiSubmit} className="space-y-5 text-black">
              {details.map((d, idx) => {
                const auto = autoFillDetail(d);
                return (
                  <div key={idx} className="relative mb-8 pb-8 border-b-2 border-gray-200">
                    {details.length > 1 && (
                      <button
                        type="button"
                        className="absolute top-0 right-0 text-red-500 hover:bg-red-100 rounded-full p-1"
                        title="Retirer ce formulaire"
                        onClick={() => removeForm(idx)}
                      ><Trash size={18} /></button>
                    )}
                    {/* ... ci-dessous: tous les champs habituels, juste préfixés de d. */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date :</label>
                        <input
                          type="date"
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                          value={d.dateStr}
                          required
                          min={minDate}
                          max={maxDate}
                          onChange={e => handleFieldChange(idx, "dateStr", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nature :</label>
                        <select
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                          value={d.nature}
                          onChange={e => handleFieldChange(idx, "nature", e.target.value)}
                        >
                          {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>

                    {d.nature === "repas" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Type de repas :</label>
                            <select
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                              value={d.typeRepas}
                              onChange={e => handleFieldChange(idx, "typeRepas", e.target.value)}
                            >
                              {TYPE_REPAS.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Invité(s) :</label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                                value={d.invite}
                                onChange={e => handleFieldChange(idx, "invite", e.target.value)}
                                placeholder="Nom de l'invité"
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddInvite(idx, d.invite);
                                  }
                                }}
                              />
                              <button type="button" className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
                                onClick={() => handleAddInvite(idx, d.invite)} tabIndex={0} title="Ajouter l'invité">
                                <Plus size={18} />
                              </button>
                            </div>
                            {d.inviter.length > 0 && (
                              <ul className="pl-2 space-y-1">
                                {d.inviter.map((nom, invIdx) => (
                                  <li key={invIdx} className="flex items-center gap-2 text-sm text-gray-800">
                                    <span className="flex-1">{nom}</span>
                                    <button type="button" className="text-red-600 hover:bg-red-100 rounded-full p-1"
                                      onClick={() => handleRemoveInvite(idx, invIdx)} title="Retirer">
                                      <Trash size={14} />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Moyen de paiement :</label>
                        <select
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                          value={d.moyenPaiement}
                          onChange={e => handleFieldChange(idx, "moyenPaiement", e.target.value)}
                        >
                          {MOYENS_PAIEMENT.map(mp => <option key={mp} value={mp}>{mp}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description :</label>
                        <input
                          type="text"
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                          value={d.description}
                          onChange={e => handleFieldChange(idx, "description", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Valeur TTC (€) :</label>
                        <input
                          type="number"
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                          value={d.valeurTTC}
                          min={0}
                          step="0.01"
                          required
                          onChange={e => handleFieldChange(idx, "valeurTTC", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">TVA :</label>
                        <select
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                          value={d.tva}
                          onChange={e => {
                            handleFieldChange(idx, "tva", e.target.value);
                            handleFieldChange(idx, "autreTaux", "");
                            handleFieldChange(idx, "multiTaux", [{ taux: "", montant: "" }]);
                          }}
                        >
                          {TVAS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    {d.tva === "autre taux" && (
                      <input
                        type="text"
                        placeholder="Taux personnalisé (%) (ex: 8.5)"
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                        value={d.autreTaux}
                        required
                        onChange={e => handleFieldChange(idx, "autreTaux", e.target.value)}
                      />
                    )}

                    {d.tva === "multi-taux" && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Taux multiples (%) – montants HT – valeur TVA :
                        </label>
                        {d.multiTaux.map((mt, tauxIdx) => {
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
                            <div key={tauxIdx} className="flex items-center gap-3">
                              <select
                                className="block w-20 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                                value={mt.taux}
                                required
                                onChange={e => handleMultiTauxChange(idx, tauxIdx, "taux", e.target.value)}
                              >
                                <option value="">Taux</option>
                                {MULTI_TVA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}%</option>)}
                              </select>
                              <input
                                type="number"
                                placeholder="Montant HT"
                                min={0}
                                step="0.01"
                                className="block w-28 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                                value={mt.montant}
                                required
                                onChange={e => handleMultiTauxChange(idx, tauxIdx, "montant", e.target.value)}
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
                              {d.multiTaux.length > 1 && (
                                <button type="button" onClick={() => removeMultiTauxField(idx, tauxIdx)}
                                  className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                                  title="Supprimer ce taux"><X size={16} /></button>
                              )}
                              {tauxIdx === d.multiTaux.length - 1 && d.multiTaux.length < 3 && (
                                <button type="button" onClick={() => addMultiTauxField(idx)}
                                  className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                                  title="Ajouter un taux"><Plus size={16} /></button>
                              )}
                            </div>
                          );
                        })}
                        <div className="flex flex-col gap-1 mt-3 text-sm text-gray-700">
                          <div>
                            <span className="font-medium">Total HT : </span>
                            <span>{auto.totalHTMulti?.toFixed(2)} €</span>
                          </div>
                          <div>
                            <span className="font-medium">Total TVA : </span>
                            <span>{auto.totalTVA?.toFixed(2)} €</span>
                          </div>
                          <div>
                            <span className="font-medium">Total TTC attendu : </span>
                            <span>{((auto.totalHTMulti || 0) + (auto.totalTVA || 0)).toFixed(2)} €</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {d.tva !== "multi-taux" && (
                      <div className="flex gap-4 items-end mt-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Montant HT (€) :</label>
                          <input
                            type="number"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                            value={auto.montant}
                            min={0}
                            step="0.01"
                            required
                            readOnly
                            tabIndex={-1}
                            title="Montant HT calculé automatiquement à partir du TTC"
                          />
                        </div>
                        <div className="w-48">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Valeur TVA (€) :</label>
                          <input
                            type="text"
                            className="block w-full border border-gray-200 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-800"
                            value={auto.valeurTvaMono}
                            readOnly
                            tabIndex={-1}
                            title="Valeur TVA calculée automatiquement"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Client :</label>
                        <select
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                          value={d.selectedClient}
                          onChange={e => handleFieldChange(idx, "selectedClient", e.target.value)}
                          required
                        >
                          <option value="">Sélectionner un client</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.nom_client}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Projet :</label>
                        <select
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white"
                          value={d.selectedProjet}
                          onChange={e => handleFieldChange(idx, "selectedProjet", e.target.value)}
                          required
                        >
                          <option value="">Sélectionner un projet</option>
                          {projets.map(p => <option key={p.id || p.uuid} value={p.id || p.uuid}>{p.nom}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Justificatif :</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-gray-500"
                        onChange={e => handleFileChange(idx, e.target.files[0])}
                      />
                    </div>
                  </div>
                );
              })}

              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm mb-4" role="alert">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-between pt-2 border-t border-gray-200 mt-2">
                <button
                  type="button"
                  className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300"
                  onClick={() => { setOpen(false); resetAll(); }}
                  disabled={loading}
                >Annuler</button>
                <div className="flex items-center gap-2">
                  {details.length < 5 && (
                    <button type="button"
                      className="inline-flex items-center px-5 py-2 bg-blue-100 text-blue-700 font-medium rounded-md hover:bg-blue-200"
                      onClick={addForm}
                      disabled={loading}
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Ajouter une ligne
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-5 py-2 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700"
                  >
                    {loading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <Plus className="mr-2 h-5 w-5" />
                    )}
                    {loading ? "Ajout..." : "Ajouter toutes les dépenses"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}