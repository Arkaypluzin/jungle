"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CraManagerEntry() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace("/login"); // ajuste cette route si besoin
      return;
    }

    const role = session?.user?.roles?.[0] || "user";
    router.replace(role === "admin" ? "/cra-manager/admin" : "/cra-manager/user");
  }, [status, session, router]);

  return (
    <div className="flex justify-center items-center h-[50vh] text-gray-600">
      Redirection…
    </div>
  );
}