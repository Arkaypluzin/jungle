import { getAllNdfKiloByNdfController, createNdfKiloController } from "./controller";

export async function GET(req) {
    const id_ndf = req.nextUrl.searchParams.get("id_ndf");
    if (!id_ndf) {
        return Response.json({ message: "id_ndf requis." }, { status: 400 });
    }
    return getAllNdfKiloByNdfController(id_ndf);
}

export async function POST(req) {
    const data = await req.json();
    return createNdfKiloController(data);
}