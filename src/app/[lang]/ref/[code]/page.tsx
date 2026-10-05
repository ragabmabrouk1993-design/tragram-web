"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { localizePath } from "@/lib/i18n";
import { useAppDispatch } from "@/store/hooks";
import { setReferralCode } from "@/store/uiSlice";

export default function ReferralCapturePage() {
    const router = useRouter();
    const params = useParams<{ code?: string }>();
    const lang = useLocale();
    const dispatch = useAppDispatch();

    useEffect(() => {
        const code = typeof params.code === "string" ? params.code : "";
        if (code) {
            dispatch(setReferralCode(code));
        }
        router.replace(`${localizePath(lang, "/auth/signup")}${code ? `?ref=${encodeURIComponent(code)}` : ""}`);
    }, [dispatch, lang, params.code, router]);

    return null;
}
