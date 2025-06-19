'use client';
import { useEffect, useState } from "react";
import CreateNdfModal from "@/components/CreateNdfModal";
import BtnRetour from "@/components/BtnRetour";
import EditNdfModal from "@/components/EditNdfModal";
import DeleteNdfButton from "@/components/DeleteNdfButton";

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

    async function fetchNdfs() {
        setLoading(true);
        const res = await fetch("/api/ndf", { cache: "no-store" });
        const data = await res.json();
        setNdfList(Array.isArray(data) ? data : []);
        setLoading(false);
    }
    useEffect(() => { fetchNdfs(); }, []);

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
        <div className="max-w-2xl mx-auto mt-10">
            <h1 className="text-xl font-bold mb-4">Mes notes de frais</h1>
            <div className="mb-6 flex flex-wrap gap-4">
                <div>
                    <label className="block text-xs font-semibold">Année</label>
                    <select className="border px-2 py-1 rounded" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                        <option className="text-black" value="">Toutes</option>
                        {yearOptions.map(y => <option className="text-black" key={y} value={y}>{y}</option>)}
                    </select>
                    <button className={`ml-1 text-xs text-black px-2 py-1 rounded ${sortYear === "asc" ? "bg-blue-400 text-white" : "bg-gray-200"}`}
                        onClick={() => setSortYear("asc")}>↑</button>
                    <button className={`ml-1 text-xs text-black px-2 py-1 rounded ${sortYear === "desc" ? "bg-blue-400 text-white" : "bg-gray-200"}`}
                        onClick={() => setSortYear("desc")}>↓</button>
                </div>
                <div>
                    <label className="block text-xs font-semibold">Mois</label>
                    <select className="border px-2 py-1 rounded" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                        <option className="text-black" value="">Tous</option>
                        {monthOptions.map(m => <option className="text-black" key={m} value={m}>{m}</option>)}
                    </select>
                    <button className={`ml-1 text-xs text-black px-2 py-1 rounded ${sortMonth === "asc" ? "bg-blue-400 text-white" : "bg-gray-200"}`}
                        onClick={() => setSortMonth("asc")}>↑</button>
                    <button className={`ml-1 text-xs text-black px-2 py-1 rounded ${sortMonth === "desc" ? "bg-blue-400 text-white" : "bg-gray-200"}`}
                        onClick={() => setSortMonth("desc")}>↓</button>
                </div>
                <div>
                    <label className="block text-xs font-semibold">Statut</label>
                    <select className="border px-2 py-1 rounded" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                        <option className="text-black" value="">Tous</option>
                        {statutOptions.map(s => <option className="text-black" key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <button className="ml-2 px-3 py-1 rounded bg-gray-300 text-black"
                    onClick={() => {
                        setFilterYear(""); setSortYear("desc");
                        setFilterMonth(""); setSortMonth("asc");
                        setFilterStatut("");
                    }}>
                    Réinitialiser
                </button>
            </div>
            <CreateNdfModal onNdfCreated={fetchNdfs} />
            {loading && <p>Chargement…</p>}
            {!loading && filteredNdfList.length === 0 && <p>Aucune note de frais créée.</p>}
            <ul>
                {filteredNdfList.map(ndf => (
                    <li key={ndf.uuid} className="mb-4 p-4 border rounded flex items-center justify-between">
                        <span>
                            {ndf.month} {ndf.year} — <span className="italic">{ndf.statut}</span>
                        </span>
                        <div className="flex gap-2">
                            <a href={`/note-de-frais/${ndf.uuid}`}
                                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">Détails</a>
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
            <BtnRetour fallback="/dashboard" />
        </div>
    );
}