import {
  getCraDetailByIdController,
  updateCraDetailController,
  deleteCraDetailController,
} from "../controller";

export async function GET(request, { params }) {
  const { id } = params;
  return getCraDetailByIdController(id);
}

export async function PUT(request, { params }) {
  const { id } = params;
  const updateData = await request.json();
  return updateCraDetailController(id, updateData);
}

export async function DELETE(request, { params }) {
  const { id } = params;
  return deleteCraDetailController(id);
}