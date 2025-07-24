import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ClientAdminNdf from "@/components/NDF/clients/ClientAdminNdf";

export default async function AdminNdfPage() {
    const session = await auth();

    if (!session?.user?.roles?.includes("Admin")) {
        return redirect("/note-de-frais/user");
    }
    return <ClientAdminNdf />;
}