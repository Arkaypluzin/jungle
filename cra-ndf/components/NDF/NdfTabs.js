"use client";
import { useState, useEffect } from "react";
import NdfDetailTable from "@/components/NDF/NdfDetailTable";
import NdfKiloTable from "@/components/NDF/NDF_kilometrique/NdfKiloTable";
import AddNdfKiloModal from "@/components/NDF/NDF_kilometrique/AddNdfKiloModal";

export default function NdfTabs({ details, ndfId, ndfStatut, month, year, name }) {
    const [tab, setTab] = useState("ndf");

    // ---- Gère la liste des lignes kilométriques ici ----
    const [kiloRows, setKiloRows] = useState([]);
    const [loadingKiloRows, setLoadingKiloRows] = useState(true);

    const reloadKiloRows = async () => {
        if (!ndfId) return;
        setLoadingKiloRows(true);
        const res = await fetch(`/api/ndf_kilo?id_ndf=${ndfId}`);
        const data = await res.json();
        setKiloRows(Array.isArray(data) ? data : []);
        setLoadingKiloRows(false);
    };

    useEffect(() => {
        if (tab === "kilo") reloadKiloRows();
    }, [ndfId, tab]);

    return (
        <div>
            <div className="flex gap-1 mb-6">
                <button
                    className={`px-5 py-2 rounded-t-lg font-medium border-b-2 ${tab === "ndf"
                        ? "border-blue-600 bg-white text-blue-600"
                        : "border-transparent bg-gray-100 text-gray-500"
                        }`}
                    onClick={() => setTab("ndf")}
                >
                    Détails NDF
                </button>
                <button
                    className={`px-5 py-2 rounded-t-lg font-medium border-b-2 ${tab === "kilo"
                        ? "border-blue-600 bg-white text-blue-600"
                        : "border-transparent bg-gray-100 text-gray-500"
                        }`}
                    onClick={() => setTab("kilo")}
                >
                    NDF kilométriques
                </button>
            </div>

            {tab === "ndf" ? (
                <NdfDetailTable
                    details={details}
                    ndfStatut={ndfStatut}
                    month={month}
                    year={year}
                    name={name}
                />
            ) : (
                <>
                    <AddNdfKiloModal
                        ndfId={ndfId}
                        ndfStatut={ndfStatut}
                        onAdded={reloadKiloRows}
                    />
                    <NdfKiloTable
                        ndfId={ndfId}
                        ndfStatut={ndfStatut}
                        rows={kiloRows}
                        loading={loadingKiloRows}
                        reloadRows={reloadKiloRows}
                    />
                </>
            )}
        </div>
    );
}