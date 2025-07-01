import {
  getCraActivityByIdController,
  updateCraActivityController,
  deleteCraActivityController,
} from "../controller";

export async function GET(request, { params }) {
  const { id } = params;
  return getCraActivityByIdController(id);
}

export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json();
  return updateCraActivityController(id, body);
}

export async function DELETE(request, { params }) {
  const { id } = params;
  return deleteCraActivityController(id);
}