'use client';
import { useEffect, useState } from "react";
import CreateNdfModal from "@/components/CreateNdfModal";
import BtnRetour from "@/components/BtnRetour";
import EditNdfModal from "@/components/EditNdfModal";
import DeleteNdfButton from "@/components/DeleteNdfButton";
import ValidateNdfButton from "@/components/ValidateNdfButton";

export default function ClientAdminNdf() {
    const [ndfList, setNdfList] = useState([]);
    const [allNdfs, setAllNdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingAll, setLoadingAll] = useState(true);

    async function fetchNdfs() {
        setLoading(true);
        const res = await fetch("/api/ndf", { cache: "no-store" });
        const data = await res.json();
        setNdfList(Array.isArray(data) ? data : []);
        setLoading(false);
    }

    async function fetchAllNdfs() {
        setLoadingAll(true);
        const res = await fetch("/api/ndf/all", { cache: "no-store" });
        const data = await res.json();
        setAllNdfs(Array.isArray(data) ? data : []);
        setLoadingAll(false);
    }

    useEffect(() => {
        fetchNdfs();
        fetchAllNdfs();
    }, []);

    return (
        <div className="max-w-3xl mx-auto mt-10">
            <h1 className="text-xl font-bold mb-4">Mes notes de frais</h1>
            <CreateNdfModal onNdfCreated={fetchNdfs} />
            {loading && <p>Chargement…</p>}
            {!loading && ndfList.length === 0 && <p>Aucune note de frais créée.</p>}
            <ul>
                {ndfList.map(ndf => (
                    <li key={ndf.uuid} className="mb-4 p-4 border rounded flex items-center justify-between">
                        <span>
                            {ndf.month} {ndf.year} — <span className="italic">{ndf.statut}</span>
                        </span>
                        <div className="flex gap-2">
                            <a
                                href={`/note-de-frais/${ndf.uuid}`}
                                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                            >
                                Détails
                            </a>
                            {ndf.statut !== "Déclaré" && (
                                <EditNdfModal ndf={ndf} onEdited={fetchNdfs} />
                            )}
                            {ndf.statut !== "Déclaré" && (
                                <DeleteNdfButton ndfId={ndf.uuid} ndfStatut={ndf.statut} onDeleted={fetchNdfs} />
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            <h2 className="text-lg font-bold mb-2 mt-12">Toutes les notes de frais</h2>
            {loadingAll && <p>Chargement…</p>}
            {!loadingAll && allNdfs.length === 0 && (
                <p>Aucune note de frais Déclarée, Validée ou Remboursée.</p>
            )}
            <ul>
                {allNdfs.map(ndf => (
                    <li key={ndf.uuid} className="mb-3 p-4 border rounded flex flex-col md:flex-row md:items-center md:justify-between">
                        <span>
                            <b>{ndf.month} {ndf.year}</b> — <span className="italic">{ndf.statut}</span>
                            <span className="ml-2 text-white">par <b>{ndf.name || ndf.user_id}</b></span>
                        </span>
                        <div className="flex gap-2 mt-2 md:mt-0">
                            <a
                                href={`/note-de-frais/${ndf.uuid}`}
                                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                            >
                                Voir
                            </a>
                            <ValidateNdfButton
                                ndfId={ndf.uuid}
                                ndfStatut={ndf.statut}
                                onValidated={fetchAllNdfs}
                            />
                        </div>
                    </li>
                ))}
            </ul>
            <BtnRetour fallback="/dashboard" />
        </div>
    );
}