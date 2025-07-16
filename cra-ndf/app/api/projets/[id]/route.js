import { getProjetByIdController, updateProjetController, deleteProjetController } from "../controller";

export async function GET(req, { params }) {
    return getProjetByIdController(params.id);
}

export async function PUT(req, { params }) {
    const data = await req.json();
    return updateProjetController(params.id, data);
}

export async function DELETE(req, { params }) {
    return deleteProjetController(params.id);
}