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
        <div className="max-w-5xl mx-auto mt-10">
            <h1 className="text-xl font-bold mb-4">Détails de la note de frais</h1>
            {ndf.refus_comment && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-800 rounded flex items-center gap-2">
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