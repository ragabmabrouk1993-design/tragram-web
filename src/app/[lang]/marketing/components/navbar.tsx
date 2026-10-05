"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Home2Copy } from "../marketing-copy";
import { localizePath, type Locale } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/i18n/language-switch";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { authService } from "@/services/auth.service";
import { clearAuth } from "@/store/authSlice";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { AppzenCta } from "@/components/ui/appzen-cta";
import { TragramBrand } from "@/components/branding/tragram-brand";
import {
  isBillingDisabledInCurrentEnv,
  isVisualParityModeClientEnv,
} from "@/lib/runtime-environment";

type Home2NavbarProps = {
  copy: Home2Copy["nav"];
  locale?: Locale;
};

export default function Home2Navbar({ copy, locale }: Home2NavbarProps) {
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { status, accessToken } = useAppSelector((state) => state.auth);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const billingDisabled = isBillingDisabledInCurrentEnv();
  const isAuthenticated = status === "authenticated" && Boolean(accessToken);
  const visualParityMode = isVisualParityModeClientEnv();
  const showAuthenticatedActions = isAuthenticated && !visualParityMode;

  useEffect(() => {
    const authenticatedBodyClass = "tragram-marketing-authenticated";
    document.body.classList.toggle(authenticatedBodyClass, showAuthenticatedActions);

    return () => {
      document.body.classList.remove(authenticatedBodyClass);
    };
  }, [showAuthenticatedActions]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // ignore logout failures
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      trackAnalyticsEvent("logout");
      dispatch(clearAuth());
      setMobileMenuOpen(false);
      router.push(withLocale("/"));
      setIsLoggingOut(false);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="header-sticky bg-section">
      <nav className="navbar navbar-expand-lg">
        <div className="container">
          <Link className="navbar-brand" href={withLocale("/")}>
            <TragramBrand />
          </Link>

          <button
            type="button"
            className="navbar-toggler tragram-mobile-toggler"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation"
            aria-controls="public-mobile-main-menu"
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            <span className="tragram-mobile-toggler-bar"></span>
            <span className="tragram-mobile-toggler-bar"></span>
            <span className="tragram-mobile-toggler-bar"></span>
          </button>

          <div
            id="public-mobile-main-menu"
            className={`collapse navbar-collapse main-menu${mobileMenuOpen ? " show" : ""}`}
          >
            <div className="nav-menu-wrapper">
              <ul className="navbar-nav mr-auto">
                <li className="nav-item">
                  <Link className="nav-link" href={withLocale("/")} onClick={closeMobileMenu}>
                    {copy.home}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" href={withLocale("/about")} onClick={closeMobileMenu}>
                    {copy.about}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" href={withLocale("/features")} onClick={closeMobileMenu}>
                    {copy.features}
                  </Link>
                </li>
                {!billingDisabled && (
                  <li className="nav-item">
                    <Link className="nav-link" href={withLocale("/pricing")} onClick={closeMobileMenu}>
                      {copy.pricing}
                    </Link>
                  </li>
                )}
                <li className="nav-item">
                  <Link className="nav-link" href={withLocale("/blog")} onClick={closeMobileMenu}>
                    {copy.blog}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" href={withLocale("/contact")} onClick={closeMobileMenu}>
                    {copy.contact}
                  </Link>
                </li>
                {showAuthenticatedActions ? (
                  <>
                    <li className="nav-item d-lg-none nav-mobile-auth-only nav-mobile-emphasis">
                      <Link className="nav-link" href={withLocale("/dashboard")} onClick={closeMobileMenu}>
                        {copy.dashboard}
                      </Link>
                    </li>
                    <li className="nav-item d-lg-none nav-mobile-auth-only nav-mobile-danger">
                      <button
                        className="nav-link nav-link-button"
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                      >
                        {copy.logout}
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="nav-item d-lg-none nav-mobile-guest-only">
                      <Link className="nav-link" href={withLocale("/auth/login")} onClick={closeMobileMenu}>
                        {copy.login}
                      </Link>
                    </li>
                    <li className="nav-item d-lg-none nav-mobile-guest-only nav-mobile-emphasis">
                      <Link className="nav-link" href={withLocale("/auth/signup")} onClick={closeMobileMenu}>
                        {copy.downloadApp}
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
            <div className="header-actions">
              <div className="header-btn flex items-center gap-3">
                {showAuthenticatedActions ? (
                  <>
                    <AppzenCta
                      href={withLocale("/dashboard")}
                      variant="secondary"
                      className="header-action-cta"
                    >
                      {copy.dashboard}
                    </AppzenCta>
                    <AppzenCta
                      variant="primary"
                      className="header-action-cta"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                      {copy.logout}
                    </AppzenCta>
                  </>
                ) : (
                  <>
                    <AppzenCta
                      href={withLocale("/auth/login")}
                      variant="secondary"
                      className="header-action-cta"
                    >
                      {copy.login}
                    </AppzenCta>
                    <AppzenCta
                      href={withLocale("/auth/signup")}
                      variant="primary"
                      className="header-action-cta"
                    >
                      {copy.downloadApp}
                    </AppzenCta>
                  </>
                )}
              </div>
              <LanguageSwitch className="appzen-lang-switch" variant="dropdown" />
            </div>
          </div>
        </div>
      </nav>
      {mobileMenuOpen && <div className="tragram-mobile-backdrop d-lg-none" onClick={closeMobileMenu} />}
      <style jsx global>{`
        @media only screen and (max-width: 991px) {
          #public-route-root header.main-header .header-sticky {
            isolation: isolate;
          }

          #public-route-root header.main-header .tragram-mobile-toggler {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: linear-gradient(140deg, rgba(15, 107, 255, 0.95), rgba(27, 163, 255, 0.9));
            box-shadow: 0 10px 24px rgba(8, 25, 56, 0.32);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 5px;
            z-index: 13;
            position: relative;
          }

          #public-route-root header.main-header .tragram-mobile-toggler:hover,
          #public-route-root header.main-header .tragram-mobile-toggler:focus {
            transform: translateY(-1px);
            box-shadow: 0 12px 30px rgba(8, 25, 56, 0.4);
          }

          #public-route-root header.main-header .tragram-mobile-toggler-bar {
            width: 20px;
            height: 2px;
            margin: 0 auto;
            border-radius: 999px;
            background: #ffffff;
          }

          #public-route-root header.main-header .main-menu {
            position: absolute;
            top: calc(100% + 10px);
            left: 0;
            right: 0;
            margin: 0;
            z-index: 12;
            padding: 0 12px;
            border: 0;
            background: transparent;
            box-shadow: none;
            max-height: none;
            overflow: visible;
          }

          #public-route-root header.main-header .main-menu .nav-menu-wrapper {
            margin: 0;
            padding: 10px;
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: linear-gradient(155deg, rgba(17, 26, 43, 1), rgba(9, 15, 27, 1));
            box-shadow: 0 20px 45px rgba(2, 8, 23, 0.45);
            backdrop-filter: blur(2px);
            max-height: calc(100vh - 120px);
            overflow-y: auto;
          }

          #public-route-root header.main-header .main-menu .navbar-nav {
            display: flex;
            flex-direction: column;
            width: 100%;
            align-items: stretch;
            margin-left: 0;
          }

          #public-route-root header.main-header .main-menu .navbar-nav .nav-item {
            display: block;
            width: 100%;
            margin: 0;
          }

          #public-route-root header.main-header .main-menu .navbar-nav .nav-item + .nav-item {
            margin-top: 6px;
          }

          #public-route-root header.main-header .main-menu .navbar-nav .nav-link,
          #public-route-root header.main-header .main-menu .navbar-nav .nav-link-button {
            width: 100%;
            min-height: 46px;
            display: flex;
            align-items: center;
            border-radius: 12px !important;
            border: 1px solid transparent;
            margin: 0;
            padding: 12px 14px;
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 0.01em;
            line-height: 1.2;
            text-transform: none;
            color: rgba(238, 244, 255, 0.94);
            background: rgba(255, 255, 255, 0.08);
            transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
          }

          #public-route-root header.main-header .main-menu .navbar-nav .nav-link-button {
            text-align: left;
          }

          #public-route-root header.main-header .main-menu .navbar-nav .nav-link:hover,
          #public-route-root header.main-header .main-menu .navbar-nav .nav-link:focus,
          #public-route-root header.main-header .main-menu .navbar-nav .nav-link-button:hover,
          #public-route-root header.main-header .main-menu .navbar-nav .nav-link-button:focus {
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.2);
            background: rgba(15, 107, 255, 0.28);
            transform: translateX(2px);
          }

          #public-route-root header.main-header .main-menu .navbar-nav .nav-mobile-emphasis > .nav-link,
          #public-route-root header.main-header .main-menu .navbar-nav .nav-mobile-emphasis > .nav-link-button {
            border-color: rgba(15, 107, 255, 0.45);
            background: linear-gradient(135deg, rgba(15, 107, 255, 0.35), rgba(27, 163, 255, 0.2));
            color: #ffffff;
          }

          #public-route-root header.main-header .main-menu .navbar-nav .nav-mobile-danger > .nav-link,
          #public-route-root header.main-header .main-menu .navbar-nav .nav-mobile-danger > .nav-link-button {
            border-color: rgba(248, 113, 113, 0.38);
            background: linear-gradient(135deg, rgba(248, 113, 113, 0.18), rgba(239, 68, 68, 0.08));
            color: #ffd4d4;
          }

          #public-route-root header.main-header .main-menu .header-actions {
            margin-top: 12px;
          }

          #public-route-root header.main-header .main-menu .header-btn,
          #public-route-root header.main-header .main-menu .appzen-lang-switch {
            display: none;
          }

          #public-route-root header.main-header .tragram-mobile-backdrop {
            position: fixed;
            inset: 0;
            z-index: 11;
            background: rgba(2, 8, 23, 0.45);
          }
        }

        body.tragram-marketing-authenticated .nav-mobile-guest-only {
          display: none !important;
        }

        body:not(.tragram-marketing-authenticated) .nav-mobile-auth-only {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
