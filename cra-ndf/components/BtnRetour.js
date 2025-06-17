"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BtnRetour({ fallback = "/" }) {
    const router = useRouter();

    return (
        <button
            type="button"
            onClick={() => {
                if (window.history.length > 1) {
                    router.back();
                } else {
                    router.push(fallback);
                }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition"
        >
            <ArrowLeft className="w-4 h-4" />
            Retour
        </button>
    );
}