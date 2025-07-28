// app/api/ndf_kilo/multi/route.js
import { createNdfKiloController } from "../controller";

export async function POST(req) {
    const dataArr = await req.json();
    if (!Array.isArray(dataArr) || !dataArr.length) {
        return Response.json({ message: "Aucune ligne à ajouter." }, { status: 400 });
    }
    const results = [];
    for (const data of dataArr) {
        // on envoie une par une (tu peux paralléliser)
        const res = await createNdfKiloController(data);
        results.push(res);
    }
    return Response.json({ ok: true, results });
}