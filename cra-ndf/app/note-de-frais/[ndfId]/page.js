import { auth } from "@/auth";
import { getAllDetailsByNdf } from "@/app/api/ndf_details/model";
import { getNdfById } from "@/app/api/ndf/model";
import BtnRetour from "@/components/BtnRetour";
import AddNdfDetailModal from "@/components/AddNdfDetailModal";
import NdfDetailTable from "@/components/NdfDetailTable";

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
            <AddNdfDetailModal ndfId={ndfId} />
            <NdfDetailTable details={details} />
            <BtnRetour />
        </div>
    );
}