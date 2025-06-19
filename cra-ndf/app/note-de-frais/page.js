'use client';
import { useEffect, useState } from "react";
import CreateNdfModal from "@/components/CreateNdfModal";
import BtnRetour from "@/components/BtnRetour";
import EditNdfModal from "@/components/EditNdfModal";
import DeleteNdfButton from "@/components/DeleteNdfButton";

export default function NoteDeFraisPage() {
    const [ndfList, setNdfList] = useState([]);
    const [loading, setLoading] = useState(true);

    async function fetchNdfs() {
        setLoading(true);
        const res = await fetch("/api/ndf", { cache: "no-store" });
        const data = await res.json();
        setNdfList(Array.isArray(data) ? data : []);
        setLoading(false);
    }

    useEffect(() => { fetchNdfs(); }, []);

    return (
        <div className="max-w-2xl mx-auto mt-10">
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
                            {/* <DeleteNdfButton ndfId={ndf.uuid} onDeleted={fetchNdfs} /> */}
                        </div>
                    </li>
                ))}
            </ul>
            <BtnRetour fallback="/dashboard" />
        </div>
    );
}