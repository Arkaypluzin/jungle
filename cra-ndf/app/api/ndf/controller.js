import { v4 as uuidv4 } from "uuid";
import { getAllNdf, getNdfById, createNdf, updateNdf, deleteNdf } from "./model";
import { auth } from "@/auth";

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
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { month, year } = await req.json();

    const newNdf = await createNdf({
        uuid: uuidv4(),
        month,
        year,
        user_id: userId,
        statut: "Provisoire",
    });

    return Response.json(newNdf, { status: 201 });
}

export async function handlePut(req, { params }) {
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

    const { month, year, statut } = await req.json();
    const updated = await updateNdf(params.id, {
        month: month ?? ndf.month,
        year: year ?? ndf.year,
        statut: statut ?? ndf.statut,
    });
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

    const deleted = await deleteNdf(params.id);
    return Response.json(deleted);
}