import { getActivityTypeByIdController, updateActivityTypeController, deleteActivityTypeController } from "../controller";

export async function GET(request, context) {
  const id = context?.params?.id;
  return getActivityTypeByIdController(id);
}

export async function PUT(request, context) {
  const id = context?.params?.id;
  const data = await request.json();
  return updateActivityTypeController(id, data);
}

export async function DELETE(request, context) {
  const id = context?.params?.id;
  return deleteActivityTypeController(id);
}