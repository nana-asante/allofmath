"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthCheck() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code");

    useEffect(() => {
        if (code) {
            router.replace(`/auth/callback?code=${code}`);
        }
    }, [code, router, searchParams]);

    return null;
}
