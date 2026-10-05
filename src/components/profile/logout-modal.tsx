"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { useAppDispatch } from "@/store/hooks";
import { clearAuth } from "@/store/authSlice";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import styles from "./logout-modal.module.css";

type LogoutModalProps = {
    open: boolean;
    onClose: () => void;
};

function LogoutArtwork() {
    return (
        <svg
            className={styles.artwork}
            viewBox="0 0 132 144"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path d="M81.5161 55.6051C72.9286 55.6051 64.1871 55.2579 56.01 52.9915C47.9868 50.776 40.6202 46.4779 34.0538 41.5059C29.7549 38.2695 25.8459 35.6967 20.2645 36.0847C14.7996 36.3824 9.57618 38.4228 5.36716 41.9041C-1.73268 48.0297 -0.665654 59.4949 2.17634 67.5501C6.44445 79.6788 19.4335 88.0812 30.4731 93.5738C43.2262 99.9138 57.2412 103.589 71.287 105.713C83.5989 107.571 99.4196 108.929 110.09 100.925C119.888 93.5738 122.576 76.7896 120.175 65.4571C119.593 62.1063 117.802 59.0822 115.138 56.9527C108.253 51.9501 97.9832 55.2886 90.2473 55.4621C87.3745 55.5234 84.4504 55.5949 81.5161 55.6051Z" fill="#0F387F" />
            <path d="M82.0331 23.9082L22.488 31.6457C18.6286 32.1472 15.9108 35.6497 16.4176 39.4688L25.4936 107.865C26.0004 111.684 29.5398 114.373 33.3992 113.872L92.9442 106.134C96.8036 105.633 99.5214 102.13 99.0147 98.3112L89.9387 29.9153C89.4319 26.0961 85.8924 23.4067 82.0331 23.9082Z" fill="#7FAEFF" />
            <path d="M98.4206 34H39.4237C35.5998 34 32.5 37.1251 32.5 40.9802V110.02C32.5 113.875 35.5998 117 39.4237 117H98.4206C102.244 117 105.344 113.875 105.344 110.02V40.9802C105.344 37.1251 102.244 34 98.4206 34Z" fill="#1A69F1" />
            <path d="M71.8333 62.667L77.6667 62.667C82.7629 62.667 82.6667 69.3337 82.6667 76.0003C82.6667 82.667 82.7629 89.3337 77.6667 89.3337H71.8333M53.5 76.0003L73.5 76.0003M53.5 76.0003L60.1667 69.3337M53.5 76.0003L60.1667 82.667" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M65.5 130.006C86.2107 130.006 103 128.886 103 127.503C103 126.121 86.2107 125 65.5 125C44.7893 125 28 126.121 28 127.503C28 128.886 44.7893 130.006 65.5 130.006Z" fill="#0F387F" />
        </svg>
    );
}

export function LogoutModal({ open, onClose }: LogoutModalProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, isSubmitting, onClose]);

    if (!open) return null;

    const handleLogout = async () => {
        setIsSubmitting(true);
        try {
            await authService.logout();
        } catch {
            // swallow error
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            trackAnalyticsEvent("logout");
            dispatch(clearAuth());
            onClose();
            router.push(localizePath(lang, "/"));
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className={styles.backdrop}
            onClick={() => {
                if (!isSubmitting) {
                    onClose();
                }
            }}
        >
            <div
                className={styles.sheet}
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-logout-modal-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className={styles.sheetHandle} aria-hidden="true" />
                <div className={styles.illustration}>
                    <LogoutArtwork />
                </div>
                <p id="profile-logout-modal-title" className={styles.title}>
                    {intlMessages.profilePages.logout.question}
                </p>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={`${styles.button} ${styles.cancelButton}`}
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        {intlMessages.profilePages.logout.cancel}
                    </button>
                    <button
                        type="button"
                        className={`${styles.button} ${styles.dangerButton}`}
                        onClick={handleLogout}
                        disabled={isSubmitting}
                    >
                        {intlMessages.profilePages.logout.confirm}
                    </button>
                </div>
            </div>
        </div>
    );
}
