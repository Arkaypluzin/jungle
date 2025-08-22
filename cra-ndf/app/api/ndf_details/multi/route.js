import { v4 as uuidv4 } from "uuid";
import { createDetail } from "../model";
import { getNdfById } from "@/app/api/ndf/model";
import { auth } from "@/auth";

function buildTvaArray({ tva, montant, multiTaux }) {
    if (Array.isArray(tva)) return tva;
    if (multiTaux && Array.isArray(multiTaux) && multiTaux.length > 1) {
        return multiTaux.map(mt => {
            const tauxNum = parseFloat(mt.taux) || 0;
            const montantNum = parseFloat(mt.montant) || 0;
            const brut = montantNum * tauxNum / 100;
            const brutStr = (brut * 1000).toFixed(0);
            const intPart = Math.floor(brut * 100);
            const third = +brutStr % 10;
            let arrondi = intPart / 100;
            if (third >= 5) arrondi = (intPart + 1) / 100;
            return { taux: tauxNum, valeur_tva: arrondi };
        });
    }
    let tauxNum = 0;
    if (tva && typeof tva === "string") {
        tauxNum = parseFloat(tva);
        if (isNaN(tauxNum)) tauxNum = parseFloat(multiTaux?.[0]?.taux) || 0;
    }
    const montantNum = parseFloat(montant) || 0;
    const brut = montantNum * tauxNum / 100;
    const brutStr = (brut * 1000).toFixed(0);
    const intPart = Math.floor(brut * 100);
    const third = +brutStr % 10;
    let arrondi = intPart / 100;
    if (third >= 5) arrondi = (intPart + 1) / 100;
    return [{ taux: tauxNum, valeur_tva: arrondi }];
}

export async function POST(req) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const details = await req.json();
    if (!Array.isArray(details) || details.length === 0)
        return Response.json({ error: "Aucune ligne à ajouter." }, { status: 400 });

    const ndfId = details[0].id_ndf;
    const ndf = await getNdfById(ndfId);
    if (!ndf) return Response.json({ error: "NDF Not found" }, { status: 404 });
    if (ndf.user_id !== userId) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (ndf.statut !== "Provisoire") {
        return Response.json({ error: "Impossible de modifier une dépense sur une NDF non Provisoire" }, { status: 403 });
    }

    const created = [];
    for (const detail of details) {
        
        const tvaArr = buildTvaArray({
            tva: detail.tva,
            montant: detail.montant,
            multiTaux: detail.multiTaux,
        });

        const newDetail = {
            uuid: uuidv4(),
            id_ndf: detail.id_ndf,
            date_str: detail.date_str,
            nature: detail.nature,
            description: detail.description,
            tva: tvaArr,
            montant: detail.montant,
            valeur_ttc: detail.valeur_ttc,
            img_url: detail.img_url || null,
            img_base64: detail.img_base64 || null,
            client_id: detail.client_id,
            projet_id: detail.projet_id,
            moyen_paiement: detail.moyen_paiement,
            type_repas: detail.type_repas,
            inviter: detail.inviter,
        };
        await createDetail(newDetail);
        created.push(newDetail);
    }

    return Response.json({ ok: true, created }, { status: 201 });
}