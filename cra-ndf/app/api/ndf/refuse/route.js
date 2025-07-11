import { updateNdfRefus } from "@/app/api/ndf/model";
import { auth } from "@/auth";

export async function POST(req) {
    const session = await auth();
    if (!session?.user?.roles?.includes("Admin")) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { ndfId, refus_comment } = await req.json();
    if (!ndfId) return Response.json({ error: "Missing ndfId" }, { status: 400 });
    await updateNdfRefus(ndfId, refus_comment || "");
    return Response.json({ ok: true });
}