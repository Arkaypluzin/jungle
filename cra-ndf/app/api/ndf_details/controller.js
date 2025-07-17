import { v4 as uuidv4 } from "uuid";
import { getAllDetailsByNdf, getDetailById, createDetail, updateDetail, deleteDetail } from "./model";
import { getNdfById } from "@/app/api/ndf/model";
import { auth } from "@/auth";
import { promises as fs } from "fs";
import path from "path";

export async function handleGetAll(req) {
    const session = await auth();
    const userId = session?.user?.id;
    const userRoles = session?.user?.roles || [];
    const isAdmin = userRoles.includes("Admin");
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ndfId = searchParams.get("ndf");
    if (!ndfId) return Response.json({ error: "Missing NDF ID" }, { status: 400 });

    const ndf = await getNdfById(ndfId);
    if (!ndf) return Response.json({ error: "NDF Not found" }, { status: 404 });
    if (!isAdmin && ndf.user_id !== userId) return Response.json({ error: "Forbidden" }, { status: 403 });

    const data = await getAllDetailsByNdf(ndfId);
    return Response.json(data);
}

export async function handleGetById(req, { params }) {
    const session = await auth();
    const userId = session?.user?.id;
    const userRoles = session?.user?.roles || [];
    const isAdmin = userRoles.includes("Admin");
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const detail = await getDetailById(params.id);
    if (!detail) return Response.json({ error: "Not found" }, { status: 404 });

    const ndf = await getNdfById(detail.id_ndf);
    if (!ndf || (!isAdmin && ndf.user_id !== userId)) return Response.json({ error: "Forbidden" }, { status: 403 });

    return Response.json(detail);
}

export async function handlePost(req) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id_ndf, date_str, nature, description, tva, montant, img_url, client_id, projet_id, valeur_ttc } = await req.json();

    const ndf = await getNdfById(id_ndf);
    if (!ndf) return Response.json({ error: "NDF Not found" }, { status: 404 });
    if (ndf.user_id !== userId) return Response.json({ error: "Forbidden" }, { status: 403 });

    if (ndf.statut !== "Provisoire") {
        return Response.json({ error: "Impossible de modifier une dépense sur une NDF non Provisoire" }, { status: 403 });
    }

    const newDetail = {
        uuid: uuidv4(),
        id_ndf,
        date_str,
        nature,
        description,
        tva,
        montant,
        valeur_ttc,
        img_url: img_url || null,
        client_id,
        projet_id
    };
    await createDetail(newDetail);

    return Response.json(newDetail, { status: 201 });
}

export async function handlePut(req, { params }) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const detail = await getDetailById(params.id);
    if (!detail) return Response.json({ error: "Not found" }, { status: 404 });

    const ndf = await getNdfById(detail.id_ndf);
    if (!ndf || ndf.user_id !== userId) return Response.json({ error: "Forbidden" }, { status: 403 });

    if (ndf.statut !== "Provisoire") {
        return Response.json({ error: "Impossible de modifier une dépense sur une NDF non Provisoire" }, { status: 403 });
    }

    const { date_str, nature, description, tva, montant, img_url, client_id, projet_id, valeur_ttc } = await req.json();

    if (img_url && detail.img_url && img_url !== detail.img_url) {
        const oldImgPath = path.join(process.cwd(), "public", detail.img_url);
        try {
            await fs.unlink(oldImgPath);
        } catch (e) {
            console.error("Error deleting old image:", e);
            return Response.json({ error: "Failed to delete old image" }, { status: 500 });
        }
    }

    const updated = await updateDetail(params.id, {
        date_str,
        nature,
        description,
        tva,
        montant,
        valeur_ttc,
        img_url: img_url || null,
        client_id,
        projet_id
    });
    return Response.json(updated);
}

export async function handleDelete(req, { params }) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const detail = await getDetailById(params.id);
    if (!detail) return Response.json({ error: "Not found" }, { status: 404 });

    const ndf = await getNdfById(detail.id_ndf);
    if (!ndf || ndf.user_id !== userId) return Response.json({ error: "Forbidden" }, { status: 403 });

    if (ndf.statut !== "Provisoire") {
        return Response.json({ error: "Impossible de modifier une dépense sur une NDF non Provisoire" }, { status: 403 });
    }

    if (detail.img_url) {
        const imgPath = path.join(process.cwd(), "public", detail.img_url);
        try {
            await fs.unlink(imgPath);
        } catch (e) {
        }
    }

    const deleted = await deleteDetail(params.id);
    return Response.json(deleted);
}