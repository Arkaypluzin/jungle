import { getClientByIdController, updateClientController, deleteClientController } from "../controller";

export async function GET(req, { params }) {
    return getClientByIdController(params.id);
}

export async function PUT(req, { params }) {
    const data = await req.json();
    return updateClientController(params.id, data);
}

export async function DELETE(req, { params }) {
    return deleteClientController(params.id);
}