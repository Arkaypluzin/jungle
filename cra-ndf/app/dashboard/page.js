"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function Dashboard() {
    const { data: session } = useSession();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <p className="text-xl font-semibold">Dashboard Page</p>
            <p>User email: {session?.user?.email}</p>

            <div className="flex gap-4 mt-4">
                <Link
                    href="/profile"
                    className="bg-green-700 text-white px-4 py-2 rounded-md hover:opacity-80"
                >
                    Go to Profile
                </Link>
                <LogoutButton />
            </div>
        </div>
    );
}