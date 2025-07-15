"use client";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export default function ViewNdfDetailModal({ detail }) {
    const [open, setOpen] = useState(false);
    const [client, setClient] = useState(null);

    useEffect(() => {
        if (open && detail?.client_id) {
            fetch(`/api/client/${detail.client_id}`)
                .then((res) => res.json())
                .then((data) => setClient(data))
                .catch(() => setClient(null));
        }
    }, [open, detail]);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-black"
                title="Voir les détails"
                type="button"
            >
                <Search size={18} />
            </button>
            {open && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-2">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8 relative text-black">
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-bold mb-4 ">Détail de la dépense</h2>
                        <div className="space-y-3">
                            <div><b>Date :</b> {detail.date_str}</div>
                            <div><b>Nature :</b> {detail.nature}</div>
                            <div><b>Description :</b> {detail.description}</div>
                            <div><b>Montant HT :</b> {parseFloat(detail.montant).toFixed(2)} €</div>
                            <div><b>TVA :</b> {detail.tva}</div>
                            <div><b>Montant TTC :</b>
                                {detail.montant && detail.tva
                                    ? (
                                        Math.ceil((parseFloat(detail.montant) +
                                            (parseFloat(detail.montant) * (
                                                detail.tva
                                                    .split("/")
                                                    .map(t => parseFloat(t.replace(/[^\d.,]/g, "").replace(",", ".")) || 0)
                                                    .reduce((a, b) => a + b, 0)
                                            ) / 100)) * 100) / 100
                                    ).toFixed(2)
                                    : "N/A"} €
                            </div>
                            <div>
                                <b>Client :</b>{" "}
                                {detail.client_id ? (
                                    client?.nom_client ? (
                                        client.nom_client
                                    ) : (
                                        <span className="italic text-gray-400">Chargement...</span>
                                    )
                                ) : (
                                    <span className="italic text-gray-400">Non renseigné</span>
                                )}
                            </div>
                            <div>
                                <b>Justificatif :</b>
                                {detail.img_url ? (
                                    <a href={detail.img_url} target="_blank" rel="noopener noreferrer">
                                        <img
                                            src={detail.img_url}
                                            alt="Justificatif"
                                            className="mt-2 max-h-32 rounded shadow border"
                                        />
                                    </a>
                                ) : (
                                    <span className="italic text-gray-400">Aucun</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
