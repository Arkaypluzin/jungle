import { getAllNdfsAdmin } from "@/app/api/ndf/model";
import { auth } from "@/auth";

export async function GET(req) {
    const session = await auth();
    if (!session?.user?.roles?.includes("Admin")) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const ndfs = await getAllNdfsAdmin();
    return Response.json(ndfs);
}