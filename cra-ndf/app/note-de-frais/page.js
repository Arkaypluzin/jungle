import { auth } from "@/auth";
import { getAllNdf } from "@/app/api/ndf/model";
import BtnRetour from "@/components/BtnRetour";

export default async function NoteDeFraisPage() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return <p>Vous devez être connecté.</p>;
    }

    // Va directement lire les ndf de l'utilisateur connecté
    const ndfList = await getAllNdf(userId);

    return (
        <div className="max-w-2xl mx-auto mt-10">
            <h1 className="text-xl font-bold mb-4">Mes notes de frais</h1>
            {ndfList.length === 0 && <p>Aucune note de frais créée.</p>}
            <ul>
                {ndfList.map(ndf => (
                    <li key={ndf.uuid} className="mb-4 p-4 border rounded flex items-center justify-between">
                        <span>{ndf.month} {ndf.year} — <span className="italic">{ndf.statut}</span></span>
                        <a
                            href={`/note-de-frais/${ndf.uuid}`}
                            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                        >
                            Détails
                        </a>
                    </li>
                ))}
            </ul>
            <BtnRetour />
        </div>
    );
}
