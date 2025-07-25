import { useState } from "react";

export default function RefuseNdfButton({ ndfId, onRefused }) {
    const [open, setOpen] = useState(false);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleRefuse() {
        setLoading(true);
        await fetch("/api/ndf/refuse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ndfId, refus_comment: comment }),
        });
        setLoading(false);
        setOpen(false);
        setComment("");
        if (onRefused) onRefused();
    }

    return (
        <>
            <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => setOpen(true)}
            >
                Refuser
            </button>
            {open && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 text-black">
                    <div className="bg-white p-6 rounded shadow max-w-sm w-full">
                        <h3 className="font-semibold mb-2">Commentaire de refus</h3>
                        <textarea
                            rows={3}
                            className="w-full border rounded p-2 mb-2 text-black"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Motif du refus"
                        />
                        <div className="flex gap-2 justify-end">
                            <button className="px-4 py-2" onClick={() => setOpen(false)}>Annuler</button>
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded"
                                onClick={handleRefuse}
                                disabled={loading}
                            >
                                {loading ? "Envoi..." : "Refuser"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}