import { getAllActivityTypesController, createActivityTypeController } from "./controller";

export async function GET() {
  return getAllActivityTypesController();
}

export async function POST(request) {
  const data = await request.json();
  return createActivityTypeController(data);
}