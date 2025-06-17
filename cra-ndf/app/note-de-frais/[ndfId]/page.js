import { auth } from "@/auth";
import { getAllDetailsByNdf } from "@/app/api/ndf_details/model";
import { getNdfById } from "@/app/api/ndf/model";
import BtnRetour from "@/components/BtnRetour";

export default async function NdfDetailsPage({ params }) {
    const { ndfId } = await params;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return <p>Vous devez être connecté.</p>;
    }

    const ndf = await getNdfById(ndfId);
    if (!ndf || ndf.user_id !== userId) {
        return <p className="text-red-600">Accès interdit ou note de frais inconnue.</p>;
    }

    const details = await getAllDetailsByNdf(ndfId);

    return (
        <div className="max-w-4xl mx-auto mt-10">
            <h1 className="text-xl font-bold mb-4">Détails de la note de frais</h1>
            {details.length === 0 ? (
                <p>Aucun détail pour cette note de frais.</p>
            ) : (
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-2 px-4 border">Date</th>
                            <th className="py-2 px-4 border">Nature</th>
                            <th className="py-2 px-4 border">Description</th>
                            <th className="py-2 px-4 border">TVA</th>
                            <th className="py-2 px-4 border">Montant</th>
                            <th className="py-2 px-4 border">Justificatif</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map(detail => (
                            <tr key={detail.uuid}>
                                <td className="py-2 px-4 border">{detail.date_str}</td>
                                <td className="py-2 px-4 border">{detail.nature}</td>
                                <td className="py-2 px-4 border">{detail.description}</td>
                                <td className="py-2 px-4 border">{detail.tva}</td>
                                <td className="py-2 px-4 border">{detail.montant}€</td>
                                <td className="py-2 px-4 border text-center">
                                    {detail.img_url ? (
                                        <a href={detail.img_url} target="_blank" rel="noopener noreferrer">
                                            <img src={detail.img_url} alt="Justificatif" style={{ maxWidth: 80, maxHeight: 60, display: "inline-block" }} />
                                        </a>
                                    ) : (
                                        <span className="text-gray-400 italic">Aucun</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <BtnRetour />
        </div>
    );
}
