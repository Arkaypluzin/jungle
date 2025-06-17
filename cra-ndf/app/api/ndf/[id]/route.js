import {
    handleGetById,
    handlePut,
    handleDelete,
} from "@/app/api/ndf/controller";

export async function GET(req, context) {
    const params = await context.params;
    return handleGetById(req, { params });
}

export async function PUT(req, context) {
    const params = await context.params;
    return handlePut(req, { params });
}

export async function DELETE(req, context) {
    const params = await context.params;
    return handleDelete(req, { params });
}