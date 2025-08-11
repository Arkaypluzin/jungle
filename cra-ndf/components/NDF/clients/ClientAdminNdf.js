"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import CreateNdfModal from "@/components/NDF/NDF_ACTIONS/CreateNdfModal";
import BtnRetour from "@/components/BtnRetour";
import EditNdfModal from "@/components/NDF/NDF_ACTIONS/EditNdfModal";
import DeleteNdfButton from "@/components/NDF/NDF_ACTIONS/DeleteNdfButton";
import ValidateNdfButton from "@/components/NDF/NDF_ACTIONS/ValidateNdfButton";
import RefuseNdfButton from "@/components/NDF/NDF_ACTIONS/RefuseNdfButton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** ================= MultiMonthSelect ================= **/
function MultiMonthSelect({ label, options, selected, setSelected }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMonth = (month) => {
    setSelected((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <button
        type="button"
        className="flex justify-between items-center w-full border border-gray-300 rounded-lg py-2 px-3 bg-white text-gray-900 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">
          {selected.length === 0 ? <span className="text-gray-500">Tous</span> : selected.join(", ")}
        </span>
        <svg className="ml-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full max-h-60 overflow-auto bg-white border border-gray-300 rounded-lg shadow-xl p-2 animate-fadein">
          <label className="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-gray-50 font-semibold">
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={() => setSelected([])}
              className="accent-blue-600 mr-2"
            />
            <span>Tous</span>
          </label>
          {options.map((m) => (
            <label
              key={m}
              className={`flex items-center px-2 py-1 rounded cursor-pointer hover:bg-blue-50 ${selected.includes(m) ? "font-bold text-blue-600" : "text-gray-800"
                }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(m)}
                onChange={() => toggleMonth(m)}
                className="accent-blue-600 mr-2"
              />
              {m}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
/** ==================================================== **/

export default function ClientAdminNdf() {
  const { data: session } = useSession();
  const [tab, setTab] = useState("mes");

  // Filtres
  const [ndfList, setNdfList] = useState([]);
  const [allNdfs, setAllNdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);

  // Perso
  const [filterYearPerso, setFilterYearPerso] = useState("");
  const [sortYearPerso, setSortYearPerso] = useState("desc");
  const [filterMonthsPerso, setFilterMonthsPerso] = useState([]);
  const [sortMonthPerso, setSortMonthPerso] = useState("asc");
  const [filterStatutPerso, setFilterStatutPerso] = useState("");

  // Admin
  const [filterYear, setFilterYear] = useState("");
  const [sortYear, setSortYear] = useState("desc");
  const [filterMonths, setFilterMonths] = useState([]);
  const [sortMonth, setSortMonth] = useState("asc");
  const [filterUser, setFilterUser] = useState("");
  const [filterStatut, setFilterStatut] = useState("");

  // Totaux
  const [totaux, setTotaux] = useState({});
  const [totauxPerso, setTotauxPerso] = useState({});
  const [indemnitesPerso, setIndemnitesPerso] = useState({});

  // Fetches
  useEffect(() => {
    fetchNdfs();
    fetchAllNdfs();
  }, []);
  async function fetchNdfs() {
    setLoading(true);
    try {
      const res = await fetch("/api/ndf", { cache: "no-store" });
      const data = await res.ok ? await res.json() : [];
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
      const data = await res.ok ? await res.json() : [];
      setAllNdfs(Array.isArray(data) ? data : []);
    } catch {
      setAllNdfs([]);
    } finally {
      setLoadingAll(false);
    }
  }

  // Filtres dynamiques
  const yearOptionsPerso = Array.from(new Set(ndfList.map((n) => n.year))).sort((a, b) => b - a);
  const monthOptionsPerso = MONTHS.filter((m) => ndfList.some((ndf) => ndf.month === m));
  const statutOptionsPerso = ["Provisoire", "Déclaré", "Validé", "Remboursé"];
  const yearOptions = Array.from(new Set(allNdfs.map((n) => n.year))).sort((a, b) => b - a);
  const monthOptions = MONTHS.filter((m) => allNdfs.some((ndf) => ndf.month === m));
  const userOptions = Array.from(new Set(allNdfs.map((n) => n.name || n.user_id))).filter(Boolean).sort();
  const statutOptions = ["Déclaré", "Validé", "Remboursé"];

  // Filtrage multi-mois (perso)
  const filteredNdfList = useMemo(() => {
    return ndfList
      .filter((ndf) => !filterYearPerso || String(ndf.year) === String(filterYearPerso))
      .filter((ndf) => filterMonthsPerso.length === 0 || filterMonthsPerso.includes(ndf.month))
      .filter((ndf) => !filterStatutPerso || ndf.statut === filterStatutPerso)
      .sort((a, b) => {
        if (sortYearPerso === "asc") return a.year - b.year;
        if (a.year !== b.year) return b.year - a.year;
        const idxA = MONTHS.indexOf(a.month);
        const idxB = MONTHS.indexOf(b.month);
        return sortMonthPerso === "asc" ? idxA - idxB : idxB - idxA;
      });
  }, [ndfList, filterYearPerso, filterMonthsPerso, filterStatutPerso, sortYearPerso, sortMonthPerso]);

  // Filtrage (admin)
  const filteredNdfs = useMemo(() => {
    return allNdfs
      .filter((ndf) => !filterYear || String(ndf.year) === String(filterYear))
      .filter((ndf) => filterMonths.length === 0 || filterMonths.includes(ndf.month))
      .filter((ndf) => !filterUser || ndf.name === filterUser || ndf.user_id === filterUser)
      .filter((ndf) => !filterStatut || ndf.statut === filterStatut)
      .sort((a, b) => {
        if (sortYear === "asc") return a.year - b.year;
        if (a.year !== b.year) return b.year - a.year;
        const idxA = MONTHS.indexOf(a.month);
        const idxB = MONTHS.indexOf(b.month);
        return sortMonth === "asc" ? idxA - idxB : idxB - idxA;
      });
  }, [allNdfs, filterYear, filterMonths, filterUser, filterStatut, sortYear, sortMonth]);

  /** ================ Totaux (DRY) ================= */
  useEffect(() => {
    let isMounted = true;
    async function getTotalsFor(list, setter) {
      const t = {};
      for (const ndf of list) {
        const res = await fetch(`/api/ndf_details?ndf=${ndf.uuid}`);
        if (!res.ok) continue;
        const details = await res.json();
        const ttc = details.reduce((sum, d) => {
          const base = parseFloat(d.montant) || 0;
          let arr = [];
          if (!d.tva || d.tva === "0%") arr = [];
          else if (Array.isArray(d.tva)) arr = d.tva;
          else if (typeof d.tva === "string" && d.tva.includes("/")) {
            const montantNum = parseFloat(d.montant) || 0;
            arr = d.tva.split("/").map((t) => {
              const tauxNum = parseFloat(t.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
              const valeur_tva = Math.ceil(montantNum * tauxNum) / 100;
              return { taux: tauxNum, valeur_tva };
            });
          } else if (typeof d.tva === "string") {
            const tauxNum = parseFloat(d.tva.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
            const montantNum = parseFloat(d.montant) || 0;
            const valeur_tva = Math.ceil(montantNum * tauxNum) / 100;
            arr = [{ taux: tauxNum, valeur_tva }];
          }
          const totalTva = arr.reduce((s, tvaObj) => s + (parseFloat(tvaObj.valeur_tva) || 0), 0);
          return sum + Math.round((base + totalTva) * 100) / 100;
        }, 0);
        t[ndf.uuid] = ttc;
      }
      if (isMounted) setter(t);
    }
    getTotalsFor(filteredNdfs, setTotaux);
  }, [JSON.stringify(filteredNdfs.map((ndf) => ndf.uuid))]);

  useEffect(() => {
    let isMounted = true;
    async function getTotalsForPerso() {
      const t = {};
      for (const ndf of filteredNdfList) {
        const res = await fetch(`/api/ndf_details?ndf=${ndf.uuid}`);
        if (!res.ok) continue;
        const details = await res.json();
        const ttc = details.reduce((sum, d) => {
          const base = parseFloat(d.montant) || 0;
          let arr = [];
          if (!d.tva || d.tva === "0%") arr = [];
          else if (Array.isArray(d.tva)) arr = d.tva;
          else if (typeof d.tva === "string" && d.tva.includes("/")) {
            const montantNum = parseFloat(d.montant) || 0;
            arr = d.tva.split("/").map((t) => {
              const tauxNum = parseFloat(t.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
              const valeur_tva = Math.ceil(montantNum * tauxNum) / 100;
              return { taux: tauxNum, valeur_tva };
            });
          } else if (typeof d.tva === "string") {
            const tauxNum = parseFloat(d.tva.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
            const montantNum = parseFloat(d.montant) || 0;
            const valeur_tva = Math.ceil(montantNum * tauxNum) / 100;
            arr = [{ taux: tauxNum, valeur_tva }];
          }
          const totalTva = arr.reduce((s, tvaObj) => s + (parseFloat(tvaObj.valeur_tva) || 0), 0);
          return sum + Math.round((base + totalTva) * 100) / 100;
        }, 0);
        t[ndf.uuid] = ttc;
      }
      if (isMounted) setTotauxPerso(t);
    }
    getTotalsForPerso();
  }, [JSON.stringify(filteredNdfList.map((ndf) => ndf.uuid))]);

  useEffect(() => {
    let isMounted = true;
    async function getIndemnites() {
      const ind = {};
      for (const ndf of filteredNdfList) {
        const res = await fetch(`/api/ndf_kilo?id_ndf=${ndf.uuid}`);
        if (!res.ok) continue;
        const rows = await res.json();

        function calcIndemniteVoiture(cv, total) {
          total = parseFloat(total);
          if (isNaN(total) || !cv) return 0;
          let bar = null;
          if (cv === "3-") bar = 3;
          if (cv === "4") bar = 4;
          if (cv === "5") bar = 5;
          if (cv === "6") bar = 6;
          if (cv === "7+") bar = 7;
          if (!bar) return 0;
          if (bar === 3) { if (total <= 5000) return total * 0.529; if (total <= 20000) return total * 0.316 + 1061; return total * 0.369; }
          if (bar === 4) { if (total <= 5000) return total * 0.606; if (total <= 20000) return total * 0.340 + 1330; return total * 0.408; }
          if (bar === 5) { if (total <= 5000) return total * 0.636; if (total <= 20000) return total * 0.356 + 1391; return total * 0.427; }
          if (bar === 6) { if (total <= 5000) return total * 0.665; if (total <= 20000) return total * 0.374 + 1457; return total * 0.448; }
          if (bar === 7) { if (total <= 5000) return total * 0.697; if (total <= 20000) return total * 0.394 + 1512; return total * 0.470; }
          return 0;
        }
        function calcIndemniteMoto(cv, total) {
          total = parseFloat(total);
          if (isNaN(total) || !cv) return 0;
          if (cv === "1") { if (total <= 3000) return total * 0.395; if (total <= 6000) return total * 0.099 + 891; return total * 0.248; }
          if (cv === "2-3-4-5") { if (total <= 3000) return total * 0.468; if (total <= 6000) return total * 0.082 + 1158; return total * 0.275; }
          if (cv === "plus5") { if (total <= 3000) return total * 0.606; if (total <= 6000) return total * 0.079 + 1583; return total * 0.343; }
          return 0;
        }
        function calcIndemnite(type_vehicule, cv, total) {
          if (type_vehicule === "voiture") return calcIndemniteVoiture(cv, total);
          if (type_vehicule === "moto") return calcIndemniteMoto(cv, total);
          return 0;
        }

        const totalIndemnites = rows.reduce(
          (acc, r) => acc + (parseFloat(calcIndemnite(r.type_vehicule, r.cv, r.total_euro)) || 0),
          0
        );
        ind[ndf.uuid] = totalIndemnites;
      }
      if (isMounted) setIndemnitesPerso(ind);
    }
    getIndemnites();
  }, [JSON.stringify(filteredNdfList.map((ndf) => ndf.uuid))]);

  /** ------------ Export PDF (ONGLET MES) ------------ **/
  function exportMesPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    const title = `Mes notes de frais — ${session?.user?.name || ""}`.trim();
    const filtersLabelParts = [];
    if (filterYearPerso) filtersLabelParts.push(`Année: ${filterYearPerso}`);
    if (filterMonthsPerso.length) filtersLabelParts.push(`Mois: ${filterMonthsPerso.join(", ")}`);
    if (filterStatutPerso) filtersLabelParts.push(`Statut: ${filterStatutPerso}`);
    const sub = filtersLabelParts.join(" — ") || "Tous les filtres";

    // Header
    doc.setFontSize(16);
    doc.text(title, 12, 16);
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(sub, 12, 22);
    doc.setTextColor(0);

    // Table
    const head = [["Mois", "Statut", "NDF TTC (€)", "Indemnités (€)", "Total à rembourser (€)"]];
    const rows = filteredNdfList.map((ndf) => {
      const ttc = totauxPerso[ndf.uuid];
      const indem = indemnitesPerso[ndf.uuid];
      const total = (ttc || 0) + (indem || 0);
      return [
        `${ndf.month} ${ndf.year}`,
        ndf.statut || "-",
        typeof ttc === "number" ? ttc.toFixed(2) : "N/A",
        typeof indem === "number" ? indem.toFixed(2) : "N/A",
        total.toFixed(2),
      ];
    });

    const totalGeneral = filteredNdfList.reduce(
      (acc, ndf) => acc + ((totauxPerso[ndf.uuid] || 0) + (indemnitesPerso[ndf.uuid] || 0)),
      0
    );

    autoTable(doc, {
      head,
      body: rows,
      startY: 30,
      styles: { fontSize: 10, cellPadding: 3, valign: "middle" },
      headStyles: { fillColor: [30, 144, 255], textColor: 255, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { cellWidth: 45, halign: "left" },
        1: { cellWidth: 28, halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold" },
      },
      didDrawPage: (data) => {
        const str = `Page ${data.pageNumber}`;
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(str, doc.internal.pageSize.getWidth() - 24, doc.internal.pageSize.getHeight() - 8);
        doc.setTextColor(0);
      },
      margin: { left: 10, right: 10 },
    });

    // Totaux
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      body: [
        [
          { content: "Total général à rembourser", styles: { fontStyle: "bold" } },
          { content: `${totalGeneral.toFixed(2)} €`, styles: { halign: "right", fontStyle: "bold" } },
        ],
        [
          { content: `Nombre de notes exportées`, styles: { fontStyle: "italic" } },
          { content: `${filteredNdfList.length}`, styles: { halign: "right", fontStyle: "italic" } },
        ],
      ],
      theme: "plain",
      styles: { fontSize: 11, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 40 } },
      margin: { left: 10, right: 10 },
    });

    const filename = `mes-notes-de-frais_${filterYearPerso || "toutes-annees"}.pdf`;
    doc.save(filename);
  }

  // Tabs visuel
  function renderTabs() {
    return (
      <div className="flex justify-center mb-8 mt-2 gap-2">
        <button
          className={`px-7 py-2 font-bold text-lg border-b-4 rounded-t-xl transition-all duration-150 ${tab === "mes"
              ? "border-blue-600 text-blue-700 bg-white shadow"
              : "border-transparent text-gray-500 bg-gray-100 hover:bg-blue-50"
            }`}
          onClick={() => setTab("mes")}
        >
          Mes notes de frais
        </button>
        <button
          className={`px-7 py-2 font-bold text-lg border-b-4 rounded-t-xl transition-all duration-150 ${tab === "all"
              ? "border-blue-600 text-blue-700 bg-white shadow"
              : "border-transparent text-gray-500 bg-gray-100 hover:bg-blue-50"
            }`}
          onClick={() => setTab("all")}
        >
          Recherche notes de frais
        </button>
      </div>
    );
  }

  // Total admin
  const totalARembourserSomme = useMemo(() => {
    return filteredNdfs.reduce(
      (acc, ndf) => acc + ((totaux[ndf.uuid] || 0) + (indemnitesPerso[ndf.uuid] || 0)),
      0
    );
  }, [filteredNdfs, totaux, indemnitesPerso]);

  /** ====================== Rendu ====================== **/
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 to-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto bg-white p-7 rounded-3xl shadow-xl border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5">
          <span className="font-bold text-xl mb-2 sm:mb-0 text-gray-800">
            Bienvenue, {session?.user?.name || "utilisateur"}
          </span>
          <BtnRetour fallback="/dashboard" />
        </div>

        <h1 className="text-4xl font-black text-blue-700 mb-8 text-center tracking-tight">
          Gestionnaire Note de Frais
        </h1>

        {renderTabs()}

        {/* =================== ONGLET MES =================== */}
        {tab === "mes" && (
          <>
            {/* Filtres perso */}
            <div className="mb-4 flex flex-wrap items-end gap-4 p-5 bg-blue-50 rounded-2xl border border-blue-200">
              <div className="flex-grow min-w-[160px]">
                <label htmlFor="filterYearPerso" className="block text-sm font-semibold text-gray-700 mb-1">
                  Année
                </label>
                <div className="flex items-center gap-1">
                  <select
                    id="filterYearPerso"
                    className="block w-full border border-gray-300 rounded-lg shadow py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={filterYearPerso}
                    onChange={(e) => setFilterYearPerso(e.target.value)}
                  >
                    <option value="">Toutes</option>
                    {yearOptionsPerso.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button
                    className={`ml-2 p-2 rounded-full transition-colors ${sortYearPerso === "asc" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortYearPerso("asc")}
                    title="Tri année croissant"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
                    </svg>
                  </button>
                  <button
                    className={`ml-1 p-2 rounded-full transition-colors ${sortYearPerso === "desc" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortYearPerso("desc")}
                    title="Tri année décroissant"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-grow min-w-[160px]">
                <MultiMonthSelect
                  label="Mois"
                  options={monthOptionsPerso}
                  selected={filterMonthsPerso}
                  setSelected={setFilterMonthsPerso}
                />
              </div>

              <div className="flex-grow min-w-[160px]">
                <label htmlFor="filterStatutPerso" className="block text-sm font-semibold text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  id="filterStatutPerso"
                  className="block w-full border border-gray-300 rounded-lg shadow py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filterStatutPerso}
                  onChange={(e) => setFilterStatutPerso(e.target.value)}
                >
                  <option value="">Tous</option>
                  {statutOptionsPerso.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md shadow hover:bg-gray-400 transition-colors duration-200 self-end"
                onClick={() => {
                  setFilterYearPerso("");
                  setSortYearPerso("desc");
                  setFilterMonthsPerso([]);
                  setSortMonthPerso("asc");
                  setFilterStatutPerso("");
                }}
              >
                Réinitialiser
              </button>
            </div>

            {/* Toolbar : Create (gauche) + Export (droite) */}
            <div className="mb-6 flex items-center gap-3">
              <div>
                <CreateNdfModal onNdfCreated={fetchNdfs} />
              </div>
              <div className="ml-auto">
                <button
                  onClick={exportMesPdf}
                  disabled={loading || filteredNdfList.length === 0}
                  className={`px-4 py-2 rounded-md shadow transition-colors duration-200
                    ${loading || filteredNdfList.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    }`}
                  title={filteredNdfList.length === 0 ? "Aucune note à exporter avec ces filtres" : "Exporter les notes affichées en PDF"}
                >
                  Exporter PDF
                </button>
              </div>
            </div>

            {/* Liste perso */}
            {loading ? (
              <div className="text-center py-6">
                <p className="text-gray-600">Chargement de vos notes de frais...</p>
              </div>
            ) : filteredNdfList.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-600">Aucune note de frais trouvée avec ces critères.</p>
              </div>
            ) : (
              <ul className="space-y-4 mt-4">
                {filteredNdfList.map((ndf) => (
                  <li
                    key={ndf.uuid}
                    className="bg-white p-5 rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-xl transition"
                  >
                    <div className="flex-grow">
                      <span className="font-bold text-lg text-gray-900 flex items-center gap-1">
                        {ndf.month} {ndf.year}
                        {ndf.refus_comment && (
                          <svg
                            title="Motif de refus présent"
                            className="w-5 h-5 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405C18.37 15.052 18 14.552 18 14V11c0-3.07-1.64-5.64-5-5.96V5a1 1 0 10-2 0v.04C7.64 5.36 6 7.92 6 11v3c0 .552-.37 1.052-.595 1.595L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`ml-3 px-3 py-1 rounded-full text-sm font-semibold ${ndf.statut === "Provisoire"
                            ? "bg-blue-100 text-blue-800"
                            : ndf.statut === "Déclaré"
                              ? "bg-yellow-100 text-yellow-800"
                              : ndf.statut === "Validé"
                                ? "bg-green-100 text-green-800"
                                : "bg-purple-100 text-purple-800"
                          }`}
                      >
                        {ndf.statut}
                      </span>
                      <div className="flex flex-col gap-1 mt-2 ml-1">
                        <span className="text-sm text-blue-700 font-bold">
                          {typeof totauxPerso[ndf.uuid] === "number" || typeof indemnitesPerso[ndf.uuid] === "number"
                            ? `Total à rembourser : ${((totauxPerso[ndf.uuid] || 0) + (indemnitesPerso[ndf.uuid] || 0)).toFixed(2)} €`
                            : ""}
                        </span>
                        <span className="text-sm text-blue-700 font-semibold">
                          NDF TTC : {totauxPerso[ndf.uuid] ? `${totauxPerso[ndf.uuid].toFixed(2)} €` : "N/A"}
                        </span>
                        <span className="text-sm text-blue-700 font-semibold">
                          {typeof indemnitesPerso[ndf.uuid] === "number"
                            ? `Indemnités kilométriques : ${indemnitesPerso[ndf.uuid].toFixed(2)} €`
                            : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap justify-end">
                      <a
                        href={`/note-de-frais/${ndf.uuid}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition"
                      >
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
            )}
          </>
        )}

        {/* =================== ONGLET ALL =================== */}
        {tab === "all" && (
          <>
            <div className="mb-7 flex flex-wrap items-end gap-4 p-5 bg-blue-50 rounded-2xl border border-blue-200">
              <div className="flex-grow min-w-[160px]">
                <label htmlFor="filterYear" className="block text-sm font-semibold text-gray-700 mb-1">
                  Année
                </label>
                <div className="flex items-center gap-1">
                  <select
                    id="filterYear"
                    className="block w-full border border-gray-300 rounded-lg shadow py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                  >
                    <option value="">Toutes</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button
                    className={`ml-2 p-2 rounded-full transition-colors ${sortYear === "asc" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortYear("asc")}
                    title="Tri année croissant"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
                    </svg>
                  </button>
                  <button
                    className={`ml-1 p-2 rounded-full transition-colors ${sortYear === "desc" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    onClick={() => setSortYear("desc")}
                    title="Tri année décroissant"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-grow min-w-[160px]">
                <MultiMonthSelect
                  label="Mois"
                  options={monthOptions}
                  selected={filterMonths}
                  setSelected={setFilterMonths}
                />
              </div>

              <div className="flex-grow min-w-[160px]">
                <label htmlFor="filterUser" className="block text-sm font-semibold text-gray-700 mb-1">
                  Utilisateur
                </label>
                <select
                  id="filterUser"
                  className="block w-full border border-gray-300 rounded-lg shadow py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                >
                  <option value="">Tous</option>
                  {userOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="flex-grow min-w-[160px]">
                <label htmlFor="filterStatut" className="block text-sm font-semibold text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  id="filterStatut"
                  className="block w-full border border-gray-300 rounded-lg shadow py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                >
                  <option value="">Tous</option>
                  {statutOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md shadow hover:bg-gray-400 transition-colors duration-200 self-end"
                onClick={() => {
                  setFilterYear("");
                  setSortYear("desc");
                  setFilterMonths([]);
                  setSortMonth("asc");
                  setFilterUser("");
                  setFilterStatut("");
                }}
              >
                Réinitialiser
              </button>
            </div>

            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-base text-gray-800">Total à rembourser affiché :</span>
              <span className="text-lg font-bold text-blue-800">{totalARembourserSomme.toFixed(2)} €</span>
            </div>

            {loadingAll ? (
              <div className="text-center py-6">
                <p className="text-gray-600">Chargement de toutes les notes de frais...</p>
              </div>
            ) : filteredNdfs.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-600">Aucune note de frais trouvée avec ces critères.</p>
              </div>
            ) : (
              <ul className="space-y-4 mt-8">
                {filteredNdfs.map((ndf) => (
                  <li
                    key={ndf.uuid}
                    className="bg-white p-5 rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-xl transition"
                  >
                    <div className="flex-grow">
                      <span className="font-bold text-lg text-gray-900">
                        {ndf.month} {ndf.year}
                      </span>
                      <span
                        className={`ml-3 px-3 py-1 rounded-full text-sm font-semibold ${ndf.statut === "Déclaré"
                            ? "bg-yellow-100 text-yellow-800"
                            : ndf.statut === "Validé"
                              ? "bg-green-100 text-green-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                      >
                        {ndf.statut}
                      </span>
                      <span className="ml-3 text-sm text-gray-600">
                        par <b className="text-gray-800">{ndf.name || ndf.user_id}</b>
                      </span>
                      <div className="flex flex-col gap-1 mt-2 ml-1">
                        <span className="ml-3 text-sm text-blue-700 font-bold">
                          {typeof totauxPerso[ndf.uuid] === "number" || typeof indemnitesPerso[ndf.uuid] === "number"
                            ? `Total à rembourser ${((totauxPerso[ndf.uuid] || 0) + (indemnitesPerso[ndf.uuid] || 0)).toFixed(2)}€`
                            : ""}
                        </span>
                        <span className="ml-3 text-sm text-blue-700 font-bold">
                          NDF TTC : {totauxPerso[ndf.uuid] ? `${totauxPerso[ndf.uuid].toFixed(2)} €` : "N/A"}
                        </span>
                        <span className="ml-3 text-sm text-blue-700 font-bold">
                          {typeof indemnitesPerso[ndf.uuid] === "number"
                            ? `Indemnités : ${indemnitesPerso[ndf.uuid].toFixed(2)}€`
                            : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap justify-end">
                      <a
                        href={`/note-de-frais/${ndf.uuid}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition"
                      >
                        Voir
                      </a>
                      <ValidateNdfButton
                        ndfId={ndf.uuid}
                        ndfStatut={ndf.statut}
                        onValidated={() => {
                          fetchAllNdfs();
                          fetchNdfs();
                        }}
                      />
                      {ndf.statut === "Déclaré" && (
                        <RefuseNdfButton
                          ndfId={ndf.uuid}
                          onRefused={() => {
                            fetchAllNdfs();
                            fetchNdfs();
                          }}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}