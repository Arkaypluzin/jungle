import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardRedirect() {
    const session = await auth();

    const roles = session?.user?.roles || [];

    if (roles.includes("Admin")) {
        return redirect("/cra-manager/admin");
    }

    return redirect("/cra-manager/user");
}