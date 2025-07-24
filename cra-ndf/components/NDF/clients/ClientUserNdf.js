"use client";
import { useEffect, useState } from "react";
import CreateNdfModal from "@/components/NDF/NDF_ACTIONS/CreateNdfModal";
import BtnRetour from "@/components/BtnRetour";
import EditNdfModal from "@/components/NDF/NDF_ACTIONS/EditNdfModal";
import DeleteNdfButton from "@/components/NDF/NDF_ACTIONS/DeleteNdfButton";

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function ClientUserNdf() {
    const [ndfList, setNdfList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterYear, setFilterYear] = useState("");
    const [sortYear, setSortYear] = useState("desc");
    const [filterMonth, setFilterMonth] = useState("");
    const [sortMonth, setSortMonth] = useState("asc");
    const [filterStatut, setFilterStatut] = useState("");
    const [totaux, setTotaux] = useState({});

    async function fetchNdfs() {
        setLoading(true);
        try {
            const res = await fetch("/api/ndf", { cache: "no-store" });
            const data = await res.json();
            setNdfList(Array.isArray(data) ? data : []);
        } catch {
            setNdfList([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchNdfs(); }, []);

    // Calcul des totaux TTC par NDF
    useEffect(() => {
        let isMounted = true;
        async function getTotals() {
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
            if (isMounted) setTotaux(t);
        }
        getTotals();
        return () => { isMounted = false; };
        // eslint-disable-next-line
    }, [JSON.stringify(ndfList.map(ndf => ndf.uuid))]);

    const yearOptions = Array.from(new Set(ndfList.map(n => n.year))).sort((a, b) => b - a);
    const monthOptions = MONTHS.filter(m => ndfList.some(ndf => ndf.month === m));
    const statutOptions = ["Provisoire", "Déclaré", "Validé", "Remboursé"];

    let filteredNdfList = ndfList
        .filter(ndf => !filterYear || String(ndf.year) === String(filterYear))
        .filter(ndf => !filterMonth || ndf.month === filterMonth)
        .filter(ndf => !filterStatut || ndf.statut === filterStatut);

    filteredNdfList = filteredNdfList.sort((a, b) => {
        if (sortYear === "asc") {
            if (a.year !== b.year) return a.year - b.year;
        } else {
            if (a.year !== b.year) return b.year - a.year;
        }
        const idxA = MONTHS.indexOf(a.month);
        const idxB = MONTHS.indexOf(b.month);
        return sortMonth === "asc" ? idxA - idxB : idxB - idxA;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                    <span className="font-bold text-lg mb-2 sm:mb-0 text-black">
                        Mes notes de frais
                    </span>
                    <BtnRetour fallback="/dashboard" />
                </div>

                <div className="mb-6 flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <div className="flex-grow">
                        <label htmlFor="filterYear" className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                        <div className="flex items-center">
                            <select
                                id="filterYear"
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={filterYear}
                                onChange={e => setFilterYear(e.target.value)}
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
                                onChange={e => setFilterMonth(e.target.value)}
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
                        <label htmlFor="filterStatut" className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                        <select
                            id="filterStatut"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={filterStatut}
                            onChange={e => setFilterStatut(e.target.value)}
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
                            setFilterYear(""); setSortYear("desc");
                            setFilterMonth(""); setSortMonth("asc");
                            setFilterStatut("");
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
                    {filteredNdfList.map(ndf => (
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
                                    {typeof totaux[ndf.uuid] === "number" ? `${totaux[ndf.uuid].toFixed(2)} € TTC` : ""}
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
            </div>
        </div>
    );
}