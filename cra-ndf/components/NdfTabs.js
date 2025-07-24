"use client";
import { useState } from "react";
import NdfDetailTable from "@/components/NdfDetailTable";
import NdfKiloTable from "@/components/NdfKiloTable";

export default function NdfTabs({ details, ndfId, ndfStatut, month, year, name }) {
    const [tab, setTab] = useState("ndf");

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
                    Frais kilométriques
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
                <NdfKiloTable ndfId={ndfId} ndfStatut={ndfStatut} />
            )}
        </div>
    );
}