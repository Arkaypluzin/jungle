"use client";
import { useEffect, useState, useMemo } from "react";
import CreateNdfModal from "@/components/CreateNdfModal";
import BtnRetour from "@/components/BtnRetour";
import EditNdfModal from "@/components/EditNdfModal";
import DeleteNdfButton from "@/components/DeleteNdfButton";
import ValidateNdfButton from "@/components/ValidateNdfButton";
import RefuseNdfButton from "@/components/RefuseNdfButton";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function ClientAdminNdf() {
  const [tab, setTab] = useState("mes");
  const [ndfList, setNdfList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterYearPerso, setFilterYearPerso] = useState("");
  const [sortYearPerso, setSortYearPerso] = useState("desc");
  const [filterMonthPerso, setFilterMonthPerso] = useState("");
  const [sortMonthPerso, setSortMonthPerso] = useState("asc");
  const [filterStatutPerso, setFilterStatutPerso] = useState("");
  const [allNdfs, setAllNdfs] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [filterYear, setFilterYear] = useState("");
  const [sortYear, setSortYear] = useState("desc");
  const [filterMonth, setFilterMonth] = useState("");
  const [sortMonth, setSortMonth] = useState("asc");
  const [filterUser, setFilterUser] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [totaux, setTotaux] = useState({});
  const [totauxPerso, setTotauxPerso] = useState({});

  async function fetchNdfs() {
    setLoading(true);
    try {
      const res = await fetch("/api/ndf", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNdfList(Array.isArray(data) ? data : []);
    } catch {
      setNdfList([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllNdfs() {
    setLoadingAll(true);
    try {
      const res = await fetch("/api/ndf/all", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAllNdfs(Array.isArray(data) ? data : []);
    } catch {
      setAllNdfs([]);
    } finally {
      setLoadingAll(false);
    }
  }

  useEffect(() => {
    fetchNdfs();
    fetchAllNdfs();
  }, []);

  const yearOptionsPerso = Array.from(new Set(ndfList.map((n) => n.year))).sort((a, b) => b - a);
  const monthOptionsPerso = MONTHS.filter((m) => ndfList.some((ndf) => ndf.month === m));
  const statutOptionsPerso = ["Provisoire", "Déclaré", "Validé", "Remboursé"];
  let filteredNdfList = ndfList
    .filter((ndf) => !filterYearPerso || String(ndf.year) === String(filterYearPerso))
    .filter((ndf) => !filterMonthPerso || ndf.month === filterMonthPerso)
    .filter((ndf) => !filterStatutPerso || ndf.statut === filterStatutPerso);
  filteredNdfList = filteredNdfList.sort((a, b) => {
    if (sortYearPerso === "asc") {
      if (a.year !== b.year) return a.year - b.year;
    } else {
      if (a.year !== b.year) return b.year - a.year;
    }
    const idxA = MONTHS.indexOf(a.month);
    const idxB = MONTHS.indexOf(b.month);
    return sortMonthPerso === "asc" ? idxA - idxB : idxB - idxA;
  });

  const yearOptions = Array.from(new Set(allNdfs.map((n) => n.year))).sort((a, b) => b - a);
  const monthOptions = MONTHS.filter((m) => allNdfs.some((ndf) => ndf.month === m));
  const userOptions = Array.from(new Set(allNdfs.map((n) => n.name || n.user_id))).filter(Boolean).sort();
  const statutOptions = ["Déclaré", "Validé", "Remboursé"];
  let filteredNdfs = allNdfs
    .filter((ndf) => !filterYear || String(ndf.year) === String(filterYear))
    .filter((ndf) => !filterMonth || ndf.month === filterMonth)
    .filter((ndf) => !filterUser || ndf.name === filterUser || ndf.user_id === filterUser)
    .filter((ndf) => !filterStatut || ndf.statut === filterStatut);
  filteredNdfs = filteredNdfs.sort((a, b) => {
    if (sortYear === "asc") {
      if (a.year !== b.year) return a.year - b.year;
    } else {
      if (a.year !== b.year) return b.year - a.year;
    }
    const idxA = MONTHS.indexOf(a.month);
    const idxB = MONTHS.indexOf(b.month);
    return sortMonth === "asc" ? idxA - idxB : idxB - idxA;
  });

  const totalTTCSomme = useMemo(() => {
    return filteredNdfs.reduce((acc, ndf) => acc + (totaux[ndf.uuid] || 0), 0);
  }, [filteredNdfs, totaux]);

  useEffect(() => {
    let isMounted = true;
    async function getTotals() {
      const t = {};
      for (const ndf of filteredNdfs) {
        const res = await fetch(`/api/ndf_details?ndf=${ndf.uuid}`);
        if (!res.ok) continue;
        const details = await res.json();
        const ttc = details.reduce((sum, d) => {
          const montant = parseFloat(d.montant) || 0;
          let taux = 0;
          if (d.tva && d.tva !== "0%") {
            const tauxs = d.tva.split("/").map(e => parseFloat(e.replace(/[^\d.,]/g, "").replace(",", "."))).filter(Boolean);
            taux = tauxs.reduce((acc, t) => acc + (montant * t) / 100, 0);
          }
          return sum + montant + taux;
        }, 0);
        t[ndf.uuid] = ttc;
      }
      if (isMounted) setTotaux(t);
    }
    getTotals();
    return () => { isMounted = false; };
  }, [JSON.stringify(filteredNdfs.map(ndf => ndf.uuid))]);

  useEffect(() => {
    let isMounted = true;
    async function getTotalsPerso() {
      const t = {};
      for (const ndf of filteredNdfList) {
        const res = await fetch(`/api/ndf_details?ndf=${ndf.uuid}`);
        if (!res.ok) continue;
        const details = await res.json();
        const ttc = details.reduce((sum, d) => {
          const montant = parseFloat(d.montant) || 0;
          let taux = 0;
          if (d.tva && d.tva !== "0%") {
            const tauxs = d.tva.split("/").map(e => parseFloat(e.replace(/[^\d.,]/g, "").replace(",", "."))).filter(Boolean);
            taux = tauxs.reduce((acc, t) => acc + (montant * t) / 100, 0);
          }
          return sum + montant + taux;
        }, 0);
        t[ndf.uuid] = ttc;
      }
      if (isMounted) setTotauxPerso(t);
    }
    getTotalsPerso();
    return () => { isMounted = false; };
  }, [JSON.stringify(filteredNdfList.map(ndf => ndf.uuid))]);

  function renderTabs() {
    return (
      <div className="flex justify-center mb-8 mt-2 gap-1">
        <button
          className={`px-8 py-3 font-semibold text-lg rounded-t-xl border transition-all duration-150
            ${tab === "mes"
              ? "bg-blue-600 text-white border-blue-600 shadow"
              : "bg-gray-200 text-gray-700 border-gray-200 hover:bg-gray-300"
            }`}
          style={{ borderBottomLeftRadius: "10px", borderBottomRightRadius: tab === "mes" ? "10px" : "0px" }}
          onClick={() => setTab("mes")}
        >
          Mes notes de frais
        </button>
        <button
          className={`px-8 py-3 font-semibold text-lg rounded-t-xl border transition-all duration-150
            ${tab === "all"
              ? "bg-blue-600 text-white border-blue-600 shadow"
              : "bg-gray-200 text-gray-700 border-gray-200 hover:bg-gray-300"
            }`}
          style={{ borderBottomRightRadius: "10px", borderBottomLeftRadius: tab === "all" ? "10px" : "0px" }}
          onClick={() => setTab("all")}
        >
          Toutes les notes de frais
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <span className="font-bold text-lg mb-2 sm:mb-0 text-black">Bienvenue, Lucas TEAR</span>
          <BtnRetour fallback="/dashboard" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
          Gestionnaire Note de Frais
        </h1>
        {renderTabs()}

        {tab === "mes" && (
          <>
            <div className="mb-6 flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex-grow">
                <label htmlFor="filterYearPerso" className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                <div className="flex items-center">
                  <select
                    id="filterYearPerso"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={filterYearPerso}
                    onChange={(e) => setFilterYearPerso(e.target.value)}
                  >
                    <option value="">Toutes</option>
                    {yearOptionsPerso.map((y, idx) => (
                      <option key={`${y}-${idx}`} value={y}>{y}</option>
                    ))}
                  </select>
                  <button
                    className={`ml-2 p-2 rounded-full transition-colors duration-200 ${sortYearPerso === "asc"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortYearPerso("asc")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
                    </svg>
                  </button>
                  <button
                    className={`ml-1 p-2 rounded-full transition-colors duration-200 ${sortYearPerso === "desc"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortYearPerso("desc")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-grow">
                <label htmlFor="filterMonthPerso" className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                <div className="flex items-center">
                  <select
                    id="filterMonthPerso"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={filterMonthPerso}
                    onChange={(e) => setFilterMonthPerso(e.target.value)}
                  >
                    <option value="">Tous</option>
                    {monthOptionsPerso.map((m, idx) => (
                      <option key={`${m}-${idx}`} value={m}>{m}</option>
                    ))}
                  </select>
                  <button
                    className={`ml-2 p-2 rounded-full transition-colors duration-200 ${sortMonthPerso === "asc"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortMonthPerso("asc")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
                    </svg>
                  </button>
                  <button
                    className={`ml-1 p-2 rounded-full transition-colors duration-200 ${sortMonthPerso === "desc"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortMonthPerso("desc")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-grow">
                <label htmlFor="filterStatutPerso" className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  id="filterStatutPerso"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filterStatutPerso}
                  onChange={(e) => setFilterStatutPerso(e.target.value)}
                >
                  <option value="">Tous</option>
                  {statutOptionsPerso.map((s, idx) => (
                    <option key={`${s}-${idx}`} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md shadow-sm hover:bg-gray-400 transition-colors duration-200 self-end"
                onClick={() => {
                  setFilterYearPerso("");
                  setSortYearPerso("desc");
                  setFilterMonthPerso("");
                  setSortMonthPerso("asc");
                  setFilterStatutPerso("");
                }}
              >
                Réinitialiser
              </button>
            </div>
            <CreateNdfModal onNdfCreated={fetchNdfs} />
            {loading && (
              <div className="text-center py-4">
                <p className="text-gray-600">Chargement de vos notes de frais...</p>
              </div>
            )}
            {!loading && filteredNdfList.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-600">Aucune note de frais trouvée avec ces critères.</p>
              </div>
            )}
            <ul className="space-y-4 mt-6">
              {filteredNdfList.map((ndf) => (
                <li key={ndf.uuid} className="bg-gray-50 p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-grow">
                    <span className="font-semibold text-lg text-gray-900 flex items-center gap-1">
                      {ndf.month} {ndf.year}
                      {ndf.refus_comment && (
                        <svg
                          title="Motif de refus présent"
                          className="w-5 h-5 text-red-500 inline-block"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405C18.37 15.052 18 14.552 18 14V11c0-3.07-1.64-5.64-5-5.96V5a1 1 0 10-2 0v.04C7.64 5.36 6 7.92 6 11v3c0 .552-.37 1.052-.595 1.595L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      )}
                    </span>
                    <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${ndf.statut === "Provisoire"
                      ? "bg-blue-100 text-blue-800"
                      : ndf.statut === "Déclaré"
                        ? "bg-yellow-100 text-yellow-800"
                        : ndf.statut === "Validé"
                          ? "bg-green-100 text-green-800"
                          : "bg-purple-100 text-purple-800"
                      }`}>
                      {ndf.statut}
                    </span>
                    <span className="ml-3 text-sm text-blue-700 font-bold">
                      {typeof totauxPerso[ndf.uuid] === "number" ? `${totauxPerso[ndf.uuid].toFixed(2)} € TTC` : ""}
                    </span>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-end">
                    <a href={`/note-de-frais/${ndf.uuid}`} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200">
                      Détails
                    </a>
                    {ndf.statut === "Provisoire" && (
                      <>
                        <EditNdfModal ndf={ndf} onEdited={fetchNdfs} />
                        <DeleteNdfButton ndfId={ndf.uuid} ndfStatut={ndf.statut} onDeleted={fetchNdfs} />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === "all" && (
          <>
            <div className="mb-6 flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex-grow">
                <label htmlFor="filterYear" className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                <div className="flex items-center">
                  <select
                    id="filterYear"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                  >
                    <option value="">Toutes</option>
                    {yearOptions.map((y, idx) => (
                      <option key={`${y}-${idx}`} value={y}>{y}</option>
                    ))}
                  </select>
                  <button
                    className={`ml-2 p-2 rounded-full transition-colors duration-200 ${sortYear === "asc"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortYear("asc")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
                    </svg>
                  </button>
                  <button
                    className={`ml-1 p-2 rounded-full transition-colors duration-200 ${sortYear === "desc"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortYear("desc")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-grow">
                <label htmlFor="filterMonth" className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                <div className="flex items-center">
                  <select
                    id="filterMonth"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                  >
                    <option value="">Tous</option>
                    {monthOptions.map((m, idx) => (
                      <option key={`${m}-${idx}`} value={m}>{m}</option>
                    ))}
                  </select>
                  <button
                    className={`ml-2 p-2 rounded-full transition-colors duration-200 ${sortMonth === "asc"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortMonth("asc")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
                    </svg>
                  </button>
                  <button
                    className={`ml-1 p-2 rounded-full transition-colors duration-200 ${sortMonth === "desc"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortMonth("desc")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-grow">
                <label htmlFor="filterUser" className="block text-sm font-medium text-gray-700 mb-1">Utilisateur</label>
                <select
                  id="filterUser"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                >
                  <option value="">Tous</option>
                  {userOptions.map((n, idx) => (
                    <option key={`${n}-${idx}`} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex-grow">
                <label htmlFor="filterStatut" className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  id="filterStatut"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                >
                  <option value="">Tous</option>
                  {statutOptions.map((s, idx) => (
                    <option key={`${s}-${idx}`} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md shadow-sm hover:bg-gray-400 transition-colors duration-200 self-end"
                onClick={() => {
                  setFilterYear("");
                  setSortYear("desc");
                  setFilterMonth("");
                  setSortMonth("asc");
                  setFilterUser("");
                  setFilterStatut("");
                }}
              >
                Réinitialiser
              </button>
            </div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-base text-gray-800">Total TTC affiché :</span>
              <span className="text-lg font-bold text-blue-800">{totalTTCSomme.toFixed(2)} €</span>
            </div>
            {loadingAll && (
              <div className="text-center py-4">
                <p className="text-gray-600">Chargement de toutes les notes de frais...</p>
              </div>
            )}
            {!loadingAll && filteredNdfs.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-600">Aucune note de frais trouvée avec ces critères.</p>
              </div>
            )}
            <ul className="space-y-4 mt-6">
              {filteredNdfs.map((ndf) => (
                <li key={ndf.uuid} className="bg-gray-50 p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-grow">
                    <span className="font-semibold text-lg text-gray-900">
                      {ndf.month} {ndf.year}
                    </span>
                    <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${ndf.statut === "Déclaré"
                      ? "bg-yellow-100 text-yellow-800"
                      : ndf.statut === "Validé"
                        ? "bg-green-100 text-green-800"
                        : "bg-purple-100 text-purple-800"
                      }`}>
                      {ndf.statut}
                    </span>
                    <span className="ml-3 text-sm text-gray-600">
                      par <b className="text-gray-800">{ndf.name || ndf.user_id}</b>
                    </span>
                    <span className="ml-3 text-sm text-blue-700 font-bold">
                      {typeof totaux[ndf.uuid] === "number" ? `${totaux[ndf.uuid].toFixed(2)} € TTC` : ""}
                    </span>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-end">
                    <a href={`/note-de-frais/${ndf.uuid}`} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200">
                      Voir
                    </a>
                    <ValidateNdfButton ndfId={ndf.uuid} ndfStatut={ndf.statut} onValidated={() => { fetchAllNdfs(); fetchNdfs(); }} />
                    {ndf.statut === "Déclaré" && (
                      <RefuseNdfButton ndfId={ndf.uuid} onRefused={() => { fetchAllNdfs(); fetchNdfs(); }} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}