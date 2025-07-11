import { auth } from "@/auth";
import { getAllDetailsByNdf } from "@/app/api/ndf_details/model";
import { getNdfById } from "@/app/api/ndf/model";
import BtnRetour from "@/components/BtnRetour";
import AddNdfDetailModal from "@/components/AddNdfDetailModal";
import NdfDetailTable from "@/components/NdfDetailTable";
import DeclareNdfButton from "@/components/DeclareNdfButton";

export default async function NdfDetailsPage({ params }) {
    const { ndfId } = await params;
    const session = await auth();
    const userId = session?.user?.id;
    const isAdmin = session?.user?.roles?.includes("Admin");
    if (!userId) return <p>Vous devez être connecté.</p>;

    const ndf = await getNdfById(ndfId);
    if (!ndf || (!isAdmin && ndf.user_id !== userId)) {
        return <p className="text-red-600">Accès interdit ou note de frais inconnue.</p>;
    }
    const details = await getAllDetailsByNdf(ndfId);

    return (
        <div className="max-w-4xl mx-auto mt-10">
            <h1 className="text-xl font-bold mb-4">Détails de la note de frais</h1>
            {ndf.refus_comment && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-800 rounded flex items-center gap-2">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 17h0m0-8V7m0 2a9 9 0 110 18 9 9 0 010-18z" />
                    </svg>
                    <div>
                        <strong>Motif de refus :</strong>
                        <div className="mt-1 whitespace-pre-line">{ndf.refus_comment}</div>
                    </div>
                </div>
            )}
            <DeclareNdfButton ndfId={ndfId} currentStatut={ndf.statut} />
            <AddNdfDetailModal ndfId={ndfId} ndfStatut={ndf.statut} />
            <NdfDetailTable
                details={details}
                ndfStatut={ndf.statut}
                month={ndf.month}
                year={ndf.year}
                name={ndf.name}
            />
            <BtnRetour />
        </div>
    );
}