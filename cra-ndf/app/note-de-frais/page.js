import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardRedirect() {
    const session = await auth();

    const roles = session?.user?.roles || [];

    if (roles.includes("Admin")) {
        return redirect("/note-de-frais/admin");
    }

    return redirect("/note-de-frais/user");
}