import {
  getActivityTypeByIdController,
  updateActivityTypeController,
  deleteActivityTypeController,
} from "../controller";

export async function GET(request, { params }) {
  const { id } = params;
  return getActivityTypeByIdController(id);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const data = await request.json();
  return updateActivityTypeController(id, data);
}

export async function DELETE(request, { params }) {
  const { id } = params;
  return deleteActivityTypeController(id);
}