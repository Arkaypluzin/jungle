import { getMongoDb } from "@/lib/mongo";

function cleanMongo(obj) {
    if (Array.isArray(obj)) {
        return obj.map(cleanMongo);
    }
    if (!obj || typeof obj !== "object") return obj;
    const { _id, ...rest } = obj;
    return rest;
}

export async function getAllDetailsByNdf(ndfId) {
    const db = await getMongoDb();
    const results = await db.collection("ndf_details").find({ id_ndf: ndfId }).toArray();
    return cleanMongo(results);
}

export async function getDetailById(uuid) {
    const db = await getMongoDb();
    const result = await db.collection("ndf_details").findOne({ uuid });
    return cleanMongo(result);
}

export async function createDetail(detail) {
    const db = await getMongoDb();
    const { uuid, id_ndf, date_str, nature, description, tva, montant, img_url, img_base64, client_id, projet_id, valeur_ttc, moyen_paiement, type_repas, inviter } = detail;
    await db.collection("ndf_details").insertOne({
        uuid,
        id_ndf,
        date_str,
        nature,
        description,
        tva,
        montant,
        valeur_ttc,
        img_url,
        img_base64,
        client_id,
        projet_id,
        moyen_paiement,
        type_repas,
        inviter
    });
    return detail;
}

export async function updateDetail(uuid, update) {
    const db = await getMongoDb();
    const { date_str, nature, description, tva, montant, img_url, img_base64, client_id, projet_id, valeur_ttc, moyen_paiement, type_repas, inviter } = update;
    await db.collection("ndf_details").updateOne(
        { uuid },
        {
            $set: {
                date_str,
                nature,
                description,
                tva,
                montant,
                valeur_ttc,
                img_url,
                img_base64,
                client_id,
                projet_id,
                moyen_paiement,
                type_repas,
                inviter
            }
        }
    );
    return { uuid, ...update };
}

export async function deleteDetail(uuid) {
    const db = await getMongoDb();
    await db.collection("ndf_details").deleteOne({ uuid });
    return { deleted: true };
}