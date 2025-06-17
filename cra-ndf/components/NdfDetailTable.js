"use client";
import EditNdfDetailModal from "@/components/EditNdfDetailModal";
import DeleteNdfDetailButton from "@/components/DeleteNdfDetailButton";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

export default function NdfDetailTable({ details: initialDetails }) {
    const [details, setDetails] = useState(initialDetails);

    const refresh = async () => {
        window.location.reload();
    };

    function getTTC(montant, tvaStr) {
        if (!tvaStr) return montant;
        const tauxList = tvaStr
            .split("/")
            .map(t => t.replace(/[^\d.,]/g, "").replace(",", ".").trim())
            .map(str => parseFloat(str))
            .filter(x => !isNaN(x));
        if (tauxList.length === 0) return montant;
        let total = parseFloat(montant);
        tauxList.forEach(taux => {
            total += (total * taux) / 100;
        });
        return total;
    }

    if (!details?.length) {
        return <p>Aucun détail pour cette note de frais.</p>;
    }

    return (
        <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-black">
                <tr>
                    <th className="py-2 px-4 border">Date</th>
                    <th className="py-2 px-4 border">Nature</th>
                    <th className="py-2 px-4 border">Description</th>
                    <th className="py-2 px-4 border">TVA</th>
                    <th className="py-2 px-4 border">Montant HT</th>
                    <th className="py-2 px-4 border">Montant TTC</th>
                    <th className="py-2 px-4 border">Justificatif</th>
                    <th className="py-2 px-4 border">Actions</th>
                </tr>
            </thead>
            <tbody>
                {details.map(detail => {
                    const montantTTC = getTTC(detail.montant, detail.tva);
                    return (
                        <tr key={detail.uuid}>
                            <td className="py-2 px-4 border">{detail.date_str}</td>
                            <td className="py-2 px-4 border">{detail.nature}</td>
                            <td className="py-2 px-4 border">{detail.description}</td>
                            <td className="py-2 px-4 border">{detail.tva}</td>
                            <td className="py-2 px-4 border">{detail.montant}€</td>
                            <td className="py-2 px-4 border font-bold">
                                {montantTTC.toFixed(2)}€
                            </td>
                            <td className="py-2 px-4 border text-center">
                                {detail.img_url ? (
                                    <a href={detail.img_url} target="_blank" rel="noopener noreferrer">
                                        <img src={detail.img_url} alt="Justificatif" style={{ maxWidth: 80, maxHeight: 60, display: "inline-block" }} />
                                    </a>
                                ) : (
                                    <span className="text-gray-400 italic">Aucun</span>
                                )}
                            </td>
                            <td className="py-2 px-4 border text-center">
                                <EditNdfDetailModal detail={detail} onEdited={refresh} />
                                <DeleteNdfDetailButton detailId={detail.uuid} onDeleted={refresh} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}