import { getNdfKiloByIdController, updateNdfKiloController, deleteNdfKiloController } from "../controller";

export async function GET(req, { params }) {
    return getNdfKiloByIdController(params.id);
}

export async function PUT(req, { params }) {
    const data = await req.json();
    return updateNdfKiloController(params.id, data);
}

export async function DELETE(req, { params }) {
    return deleteNdfKiloController(params.id);
}