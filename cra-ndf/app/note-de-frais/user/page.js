import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ClientUserNdf from "@/components/NDF/clients/ClientUserNdf";

export default async function UserNdfPage() {
    const session = await auth();
    
    if (session?.user?.roles?.includes("Admin")) {
        return redirect("/note-de-frais/admin");
    }
    return <ClientUserNdf />;
}