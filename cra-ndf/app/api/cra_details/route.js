import { getCraDetailsController, createCraDetailController } from "./controller";

export async function GET() {
  return getCraDetailsController();
}

export async function POST(request) {
  const body = await request.json();
  return createCraDetailController(body);
}