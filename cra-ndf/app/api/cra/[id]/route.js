import {
  getCRAByIdController,
  updateCRAController,
  deleteCRAController,
} from "../controller";

export async function GET(request, { params }) {
  const { id } = params;
  return getCRAByIdController(id);
}

export async function PUT(request, { params }) {
  const { id } = params;
  const data = await request.json();
  return updateCRAController(id, data);
}

export async function DELETE(request, { params }) {
  const { id } = params;
  return deleteCRAController(id);
}