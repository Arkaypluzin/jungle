"use client";
import { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash } from "lucide-react";

const NATURES = ["carburant", "parking", "peage", "repas", "achat divers"];
const TVAS = ["autre taux", "multi-taux", "0%", "5.5%", "10%", "20%"];
const MULTI_TVA_OPTIONS = ["0", "5.5", "10", "20"];
const MOYENS_PAIEMENT = [
  "Carte Bancaire", "Espèce", "PAYPAL", "Prélèvement Automatique", "TÉLÉPEAGE", "Chèque"
];
const TYPE_REPAS = [
  "Petit-déjeuner",
  "Déjeuner",
  "Dîner"
];
const MONTHS_MAP = {
  Janvier: 0,
  Février: 1,
  Mars: 2,
  Avril: 3,
  Mai: 4,
  Juin: 5,
  Juillet: 6,
  Août: 7,
  Septembre: 8,
  Octobre: 9,
  Novembre: 10,
  Décembre: 11,
};

export default function AddNdfDetailModal({
  ndfId,
  ndfStatut,
  parentNdfMonth,
  parentNdfYear,
}) {
  const [open, setOpen] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [nature, setNature] = useState(NATURES[0]);
  const [description, setDescription] = useState("");
  const [tva, setTva] = useState("0%");
  const [montant, setMontant] = useState("");
  const [valeurTTC, setValeurTTC] = useState("");
  const [autreTaux, setAutreTaux] = useState("");
  const [multiTaux, setMultiTaux] = useState([{ taux: "", montant: "" }]);
  const [imgFile, setImgFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [projets, setProjets] = useState([]);
  const [selectedProjet, setSelectedProjet] = useState("");
  const [moyenPaiement, setMoyenPaiement] = useState(MOYENS_PAIEMENT[0]);

  const [typeRepas, setTypeRepas] = useState(TYPE_REPAS[0]);
  const [invite, setInvite] = useState("");
  const [inviter, setInviter] = useState([]);

  useEffect(() => {
    if (open) {
      fetch("/api/client")
        .then((res) => res.json())
        .then((data) => setClients(Array.isArray(data) ? data : []));
      fetch("/api/projets")
        .then((res) => res.json())
        .then((data) => setProjets(Array.isArray(data) ? data : []));
    }
  }, [open]);

  const monthIndex = parentNdfMonth ? MONTHS_MAP[parentNdfMonth] : null;
  const yearValue = parentNdfYear || new Date().getFullYear();

  const minDate = useMemo(() => {
    if (monthIndex !== null) {
      const firstDay = new Date(yearValue, monthIndex, 1);
      return firstDay.toISOString().split("T")[0];
    }
    return "";
  }, [monthIndex, yearValue]);

  const maxDate = useMemo(() => {
    if (monthIndex !== null) {
      const lastDay = new Date(yearValue, monthIndex + 1, 0);
      return lastDay.toISOString().split("T")[0];
    }
    return "";
  }, [monthIndex, yearValue]);

  useEffect(() => {
    if (open && minDate && !dateStr) {
      setDateStr(minDate);
    }
  }, [open, minDate, dateStr]);

  function resetForm() {
    setDateStr(minDate || "");
    setNature(NATURES[0]);
    setDescription("");
    setTva("0%");
    setMontant("");
    setValeurTTC("");
    setAutreTaux("");
    setMultiTaux([{ taux: "", montant: "" }]);
    setImgFile(null);
    setError("");
    setSelectedClient("");
    setSelectedProjet("");
    setMoyenPaiement(MOYENS_PAIEMENT[0]);
    setTypeRepas(TYPE_REPAS[0]);
    setInvite("");
    setInviter([]);
  }

  const tauxMono = useMemo(() => {
    if (tva === "autre taux" && autreTaux) {
      return parseFloat(autreTaux.replace("%", "").replace(",", ".")) || 0;
    }
    if (TVAS.includes(tva) && tva !== "multi-taux" && tva !== "autre taux") {
      return parseFloat(tva.replace("%", "").replace(",", ".")) || 0;
    }
    return 0;
  }, [tva, autreTaux]);

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

  useEffect(() => {
    if (tva === "multi-taux") {
      setMontant(totalHTMulti.toFixed(2));
    }
  }, [totalHTMulti, tva]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (ndfStatut !== "Provisoire") {
      setError("Impossible d’ajouter une dépense sur une note de frais qui n'est pas au statut 'Provisoire'.");
      setLoading(false);
      return;
    }
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
          `Le total TTC (${ttc.toFixed(2)}€) doit être égal à la somme du Total HT (${totalHT.toFixed(2)}€) + Total TVA (${tvaTotal.toFixed(2)}€).`
        );
        setLoading(false);
        return;
      }
    }

    let img_url = null;
    if (imgFile) {
      const formData = new FormData();
      formData.append("file", imgFile);
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Erreur lors de l'upload de l'image.");
        }
        const data = await res.json();
        img_url = data.url;
      } catch (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }
    }

    let tvaValue = tva;
    let montantValue = tva === "multi-taux" ? parseFloat(totalHTMulti) : parseFloat(montant);
    let extra = {};

    if (tva === "autre taux") {
      tvaValue = autreTaux;
    } else if (tva === "multi-taux") {
      tvaValue = multiTaux.map((mt) => `${parseFloat(mt.taux) || 0}%`).join(" / ");
      extra = { multiTaux: multiTaux.map(mt => ({ taux: mt.taux, montant: mt.montant })) };
    }

    const body = {
      id_ndf: ndfId,
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
    if (nature === "repas") {
      body.type_repas = typeRepas;
      body.inviter = inviter;
    }

    try {
      const res = await fetch("/api/ndf_details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'ajout de la dépense.");
      }
      setOpen(false);
      resetForm();
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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

  function handleAddInvite(e) {
    e.preventDefault();
    if (invite && invite.trim().length > 0) {
      setInviter(prev => [...prev, invite.trim()]);
      setInvite("");
    }
  }
  function handleRemoveInvite(idx) {
    setInviter(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <>
      {ndfStatut === "Provisoire" && (
        <button
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
          onClick={() => setOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Ajouter une dépense
        </button>
      )}

      {open && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg relative transform transition-all scale-100 opacity-100 duration-300 ease-out overflow-y-auto max-h-[90vh]">
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              disabled={loading}
              aria-label="Fermer la modale"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
              Nouvelle dépense
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="date-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Date :
                </label>
                <input
                  type="date"
                  id="date-input"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                  value={dateStr}
                  required
                  onChange={(e) => setDateStr(e.target.value)}
                  min={minDate}
                  max={maxDate}
                />
              </div>

              <div>
                <label htmlFor="nature-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Nature :
                </label>
                <select
                  id="nature-select"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                  value={nature}
                  onChange={(e) => setNature(e.target.value)}
                >
                  {NATURES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              {nature === "repas" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de repas :
                    </label>
                    <select
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                      value={typeRepas}
                      onChange={e => setTypeRepas(e.target.value)}
                    >
                      {TYPE_REPAS.map(tp => (
                        <option key={tp} value={tp}>{tp}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invité(s) :
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                        value={invite}
                        onChange={e => setInvite(e.target.value)}
                        placeholder="Nom de l'invité"
                        onKeyDown={e => {
                          if (e.key === "Enter") handleAddInvite(e);
                        }}
                      />
                      <button
                        type="button"
                        className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 flex items-center"
                        onClick={handleAddInvite}
                        tabIndex={0}
                        title="Ajouter l'invité"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    {inviter.length > 0 && (
                      <ul className="pl-2 space-y-1">
                        {inviter.map((nom, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-800">
                            <span className="flex-1">{nom}</span>
                            <button
                              type="button"
                              className="text-red-600 hover:bg-red-100 rounded-full p-1"
                              onClick={() => handleRemoveInvite(idx)}
                              title="Retirer"
                            >
                              <Trash size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moyen de paiement :
                </label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
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
                <label htmlFor="description-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Description :
                </label>
                <input
                  type="text"
                  id="description-input"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                  value={tva}
                  onChange={e => {
                    setTva(e.target.value);
                    setAutreTaux("");
                    setMultiTaux([{ taux: "", montant: "" }]);
                  }}
                >
                  {TVAS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {tva === "autre taux" && (
                <div>
                  <input
                    type="text"
                    placeholder="Taux personnalisé (%) (ex: 8.5)"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                    value={autreTaux}
                    required
                    onChange={(e) => setAutreTaux(e.target.value)}
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
                          {MULTI_TVA_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}%
                            </option>
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
                      onChange={(e) => setMontant(e.target.value)}
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

              <div className="pt-4 border-t border-gray-200 mt-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">ANALYTIQUES</h3>
                <div className="mb-4">
                  <label htmlFor="client-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Client :
                  </label>
                  <select
                    id="client-select"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    required
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom_client}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="projet-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Projet :
                  </label>
                  <select
                    id="projet-select"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                    value={selectedProjet}
                    onChange={(e) => setSelectedProjet(e.target.value)}
                    required
                  >
                    <option value="">Sélectionner un projet</option>
                    {projets.map((p) => (
                      <option key={p.id || p.uuid} value={p.id || p.uuid}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="justificatif-file" className="block text-sm font-medium text-gray-700 mb-2">
                  Justificatif :
                </label>
                <input
                  type="file"
                  id="justificatif-file"
                  accept="image/*"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => setImgFile(e.target.files[0])}
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
                  className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors duration-200"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
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