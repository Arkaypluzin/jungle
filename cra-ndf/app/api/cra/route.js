import { getAllCRAsController, createCRAController } from "./controller";

export async function GET() {
  return getAllCRAsController();
}

export async function POST(request) {
  const data = await request.json();
  return createCRAController(data);
}