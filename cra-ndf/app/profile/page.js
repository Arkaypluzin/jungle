import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";
import BtnRetour from "@/components/BtnRetour";
import Image from "next/image";
import { User } from "lucide-react"; // pour l’icône fallback

export default async function Profile() {
  const session = await auth();
  const initials = session?.user?.name
    ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="bg-white rounded-3xl shadow-2xl px-8 py-10 flex flex-col items-center w-full max-w-md relative">
        {/* Avatar */}
        <div className="mb-4">
          {session?.user?.image ? (
            <Image
              width={96}
              height={96}
              alt={session?.user?.name || ""}
              src={session?.user?.image}
              className="rounded-full border-4 border-yellow-400 shadow-md object-cover w-24 h-24"
              priority
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-300 via-green-300 to-blue-200 border-4 border-yellow-400 shadow-md flex items-center justify-center">
              {initials ? (
                <span className="text-3xl font-bold text-gray-800">{initials}</span>
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
          )}
        </div>
        {/* Infos utilisateur */}
        <div className="text-center w-full mb-5">
          <h2 className="text-2xl font-bold text-gray-800">{session?.user?.name}</h2>
          <div className="mt-1 text-gray-500 text-sm">{session?.user?.email}</div>
          <div className="w-16 border-b-2 border-gray-200 mx-auto mt-3 mb-1"></div>
          {/* Rôle éventuel */}
          {session?.user?.roles && session.user.roles.length > 0 && (
            <div className="mt-1 text-xs text-gray-400">
              {session.user.roles.join(", ")}
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="flex flex-col gap-3 w-full mt-3">
          <LogoutButton />
          <BtnRetour fallback="/dashboard" />
        </div>
      </div>
    </div>
  );
}