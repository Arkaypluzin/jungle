import { v4 as uuidv4 } from "uuid";
import {
    getAllNdf,
    getNdfById,
    createNdf,
    updateNdf,
    deleteNdf,
    getNdfByMonthYearUser,
} from "./model";
import { getAllDetailsByNdf, deleteDetail } from "@/app/api/ndf_details/model";
import { auth } from "@/auth";
import { promises as fs } from "fs";
import path from "path";

export async function handleGetAll(req) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const data = await getAllNdf(userId);
    return Response.json(data);
}

export async function handleGetById(req, { params }) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const data = await getNdfById(params.id);
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    if (data.user_id !== userId) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(data);
}

export async function handlePost(req) {
    const session = await auth();
    const userId = session?.user?.id;
    const userName = session?.user?.name;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { month, year } = await req.json();
    const existing = await getNdfByMonthYearUser(month, year, userId);
    if (existing) {
        return Response.json(
            { error: "Une note de frais pour ce mois et cette année existe déjà." },
            { status: 409 }
        );
    }
    const newNdf = await createNdf({
        uuid: uuidv4(),
        month,
        year,
        user_id: userId,
        name: userName,
        statut: "Provisoire",
    });
    return Response.json(newNdf, { status: 201 });
}

export async function handlePut(req, { params }) {
    const session = await auth();
    const userId = session?.user?.id;
    const userRoles = session?.user?.roles || [];
    const ndf = await getNdfById(params.id);
    if (!ndf) {
        return Response.json({ error: "Not found" }, { status: 404 });
    }
    const isOwner = ndf.user_id === userId;
    const isAdmin = userRoles.includes("Admin");
    const body = await req.json();

    if (!isOwner && !isAdmin) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData = {
        month: body.month ?? ndf.month,
        year: body.year ?? ndf.year,
        statut: body.statut ?? ndf.statut,
        motif_refus: body.motif_refus ?? ndf.motif_refus,
    };

    const updated = await updateNdf(params.id, updateData);
    return Response.json(updated);
}

export async function handleDelete(req, { params }) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ndf = await getNdfById(params.id);
    if (!ndf) {
        return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (ndf.user_id !== userId) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (ndf.statut !== "Provisoire") {
        return Response.json(
            { error: "Impossible de supprimer une note de frais non Provisoire" },
            { status: 403 }
        );
    }
    const details = await getAllDetailsByNdf(params.id);
    for (const detail of details) {
        if (detail.img_url) {
            const imgPath = path.join(process.cwd(), "public", detail.img_url);
            try {
                await fs.unlink(imgPath);
            } catch (e) { }
        }
        await deleteDetail(detail.uuid);
    }
    const deleted = await deleteNdf(params.id);
    return Response.json(deleted);

}