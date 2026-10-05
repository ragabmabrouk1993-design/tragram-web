"use client";

import { MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getApiSupportCrispIdentity } from "@/lib/api-client";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import {
  closeCrispMobile,
  dismissCrispMobile,
  openCrispMobile,
} from "@/store/uiSlice";
import styles from "./crisp-chat.module.css";
import { shouldShowCrispLauncher } from "./crisp-chat-route";

type CrispCommand = [string, ...unknown[]];

declare global {
  interface Window {
    $crisp?: CrispCommand[];
    CRISP_WEBSITE_ID?: string;
  }
}

const CRISP_SCRIPT_ID = "crisp-chatbox-script";
const CRISP_SCRIPT_SRC = "https://client.crisp.chat/l.js";
const MOBILE_QUERY = "(max-width: 767px)";

const getCrispWebsiteId = () => {
  if (typeof document === "undefined") {
    return process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID?.trim() || "";
  }

  const metaValue = document
    .querySelector('meta[name="tragram-crisp-website-id"]')
    ?.getAttribute("content")
    ?.trim();

  return metaValue || process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID?.trim() || "";
};

const ensureCrispLoaded = (websiteId: string) => {
  window.$crisp = window.$crisp ?? [];
  window.CRISP_WEBSITE_ID = websiteId;

  if (document.getElementById(CRISP_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = CRISP_SCRIPT_ID;
  script.src = CRISP_SCRIPT_SRC;
  script.async = true;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
};

const pushCrisp = (command: CrispCommand) => {
  window.$crisp = window.$crisp ?? [];
  window.$crisp.push(command);
};

const compactName = (...parts: Array<string | null | undefined>) =>
  parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

const useIsMobileViewport = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isMobile;
};

export function CrispChat() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const isMobile = useIsMobileViewport();
  const canShowCrisp = shouldShowCrispLauncher(pathname);
  const authStatus = useAppSelector((state) => state.auth.status);
  const user = useAppSelector((state) => state.auth.user);
  const mobileDismissed = useAppSelector((state) => state.ui.crispMobileDismissed);
  const mobileChatOpen = useAppSelector((state) => state.ui.crispMobileChatOpen);
  const identifiedUserIdRef = useRef<string | null>(null);
  const listenersRegisteredRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canShowCrisp) return;

    const websiteId = getCrispWebsiteId();
    if (!websiteId) return;

    ensureCrispLoaded(websiteId);

    if (!listenersRegisteredRef.current) {
      pushCrisp(["on", "chat:closed", () => dispatch(closeCrispMobile())]);
      pushCrisp(["on", "chat:opened", () => trackAnalyticsEvent("live_chat_opened")]);
      listenersRegisteredRef.current = true;
    }
  }, [canShowCrisp, dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!canShowCrisp) {
      if (window.$crisp) {
        pushCrisp(["do", "chat:close"]);
        pushCrisp(["do", "chat:hide"]);
      }
      if (mobileChatOpen) {
        dispatch(closeCrispMobile());
      }
      return;
    }

    const websiteId = getCrispWebsiteId();
    if (!websiteId) return;

    ensureCrispLoaded(websiteId);

    if (!isMobile) {
      pushCrisp(["do", "chat:show"]);
      if (mobileChatOpen) {
        dispatch(closeCrispMobile());
      }
      return;
    }

    if (mobileDismissed || !mobileChatOpen) {
      pushCrisp(["do", "chat:close"]);
      pushCrisp(["do", "chat:hide"]);
      return;
    }

    pushCrisp(["do", "chat:show"]);
    pushCrisp(["do", "chat:open"]);
  }, [canShowCrisp, dispatch, isMobile, mobileChatOpen, mobileDismissed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canShowCrisp) return;

    const websiteId = getCrispWebsiteId();
    if (!websiteId) return;

    ensureCrispLoaded(websiteId);

    if (authStatus === "checking") {
      return;
    }

    if (!user) {
      if (identifiedUserIdRef.current) {
        pushCrisp(["do", "session:reset"]);
        identifiedUserIdRef.current = null;
      }
      return;
    }

    const email = user.email?.trim();
    const phone = user.phoneNumber?.trim();
    const nickname = compactName(user.firstName, user.lastName) || email;

    if (email) {
      pushCrisp(["set", "user:email", [email]]);
      void getApiSupportCrispIdentity({ throwOnError: true })
        .then((response) => {
          const verifiedEmail = response.data.email?.trim();
          const signature = response.data.signature?.trim();
          if (verifiedEmail && signature) {
            pushCrisp(["set", "user:email", [verifiedEmail, signature]]);
          }
        })
        .catch(() => {
          // Crisp can still prefill the email without verification.
        });
    }
    if (phone) {
      pushCrisp(["set", "user:phone", [phone]]);
    }
    if (nickname) {
      pushCrisp(["set", "user:nickname", [nickname]]);
    }

    const sessionData: Array<[string, string | boolean | number]> = [
      ["app", "webapp"],
    ];

    if (user.id) {
      sessionData.push(["user_id", user.id]);
    }
    if (user.role) {
      sessionData.push(["role", user.role]);
    }
    if (typeof user.emailVerified === "boolean") {
      sessionData.push(["email_verified", user.emailVerified]);
    }

    pushCrisp(["set", "session:data", [sessionData]]);
    pushCrisp(["set", "session:segments", [["webapp", "logged-in"]]]);
    identifiedUserIdRef.current = user.id ?? email ?? "logged-in";
  }, [authStatus, canShowCrisp, user]);

  if (!canShowCrisp || !isMobile || mobileDismissed || mobileChatOpen || !getCrispWebsiteId()) {
    return null;
  }

  return (
    <div className={styles.mobileLauncher} aria-label="Support chat">
      <button
        type="button"
        className={styles.openButton}
        onClick={() => dispatch(openCrispMobile())}
      >
        <MessageCircle aria-hidden="true" size={20} />
        <span>Support</span>
      </button>
      <button
        type="button"
        className={styles.dismissButton}
        aria-label="Dismiss support chat"
        onClick={() => dispatch(dismissCrispMobile())}
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
