import { createNdfKiloController } from "../controller";

export async function POST(req) {
    const dataArr = await req.json();
    if (!Array.isArray(dataArr) || !dataArr.length) {
        return Response.json({ message: "Aucune ligne à ajouter." }, { status: 400 });
    }
    const results = [];
    for (const data of dataArr) {
        const res = await createNdfKiloController(data);
        results.push(res);
    }
    return Response.json({ ok: true, results });
}