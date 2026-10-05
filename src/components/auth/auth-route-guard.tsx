'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { useAppSelector } from '@/store/hooks';
import { localizePath, stripLocaleFromPathname, type Locale } from '@/lib/i18n';
import styles from './auth-route-guard.module.css';

type AuthRouteGuardProps = {
  children: ReactNode;
  locale: Locale;
};

const protectedPrefixes = ['/profile', '/onboarding', '/dashboard', '/channels', '/reports', '/referrals'];
const authPrefixes = ['/auth'];

type ProtectedRouteKind = 'profile' | 'dashboard' | 'channel';

function ProtectedRouteLoadingShell({
  kind,
  locale,
}: {
  kind: ProtectedRouteKind;
  locale: Locale;
}) {
  const isRtl = locale.toLowerCase().startsWith('ar');
  const navOrder = isRtl
    ? ['more', 'reports', 'channels', 'home']
    : ['home', 'channels', 'reports', 'more'];
  const activeKey = kind === 'profile' ? 'more' : kind === 'channel' ? 'channels' : 'home';

  return (
    <div className={styles.shell} aria-busy="true" aria-live="polite">
      <div className={styles.inner}>
        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-hidden="true">
            <div className={styles.sidebarCard}>
              <div className={styles.brandRow}>
                <span className={`${styles.circle}`} />
                <span className={`${styles.line} ${styles.lineMedium}`} />
              </div>

              <div className={styles.sidebarNav}>
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={`auth-route-guard-nav-${index}`}
                    className={`${styles.navItem} ${index === 1 ? styles.navItemActive : ''}`}
                  >
                    <span className={styles.navIcon} />
                    <span
                      className={`${styles.line} ${index % 3 === 0 ? styles.lineLong : styles.lineMedium}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className={styles.content}>
            <div className={styles.mobileHeader} aria-hidden="true">
              <span className={styles.backCircle} />
              <span className={`${styles.line} ${styles.lineLong}`} />
              <span className={styles.backCircle} />
            </div>

            {kind === 'profile' ? (
              <div className={styles.profileGrid} aria-hidden="true">
                <div className={styles.profileStack}>
                  <div className={styles.profileHero}>
                    <span className={`${styles.line} ${styles.lineShort}`} />
                    <span className={`${styles.line} ${styles.lineWide}`} />
                    <span className={`${styles.line} ${styles.lineLong}`} />
                  </div>

                  <div className={styles.profilePanel}>
                    <div className={styles.profileOverview}>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={`auth-route-guard-profile-summary-${index}`}
                          className={styles.metricRow}
                        >
                          <span className={`${styles.line} ${styles.lineShort}`} />
                          <span className={`${styles.line} ${styles.lineMedium}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.profileStack}>
                  <div className={styles.profilePanel}>
                    <span className={`${styles.line} ${styles.lineShort}`} />
                    <span className={`${styles.line} ${styles.lineLong}`} />
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`auth-route-guard-profile-form-${index}`}
                        className={styles.formRow}
                      >
                        <span className={`${styles.line} ${styles.lineShort}`} />
                        <span className={`${styles.line} ${styles.lineFill}`} />
                      </div>
                    ))}
                  </div>

                  <div className={styles.profilePanel}>
                    <span className={`${styles.line} ${styles.lineShort}`} />
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`auth-route-guard-profile-panel-${index}`}
                        className={styles.formRow}
                      >
                        <span className={`${styles.line} ${styles.lineLong}`} />
                        <span className={styles.navIcon} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : kind === 'channel' ? (
              <div className={styles.channelStack} aria-hidden="true">
                <div className={styles.channelHeader}>
                  <span className={styles.backCircle} />
                  <div className={styles.channelMeta}>
                    <span className={styles.avatar} />
                    <div className={styles.channelTitle}>
                      <span className={`${styles.line} ${styles.lineLong}`} />
                      <span className={`${styles.line} ${styles.lineMedium}`} />
                    </div>
                  </div>
                  <span className={styles.backCircle} />
                </div>

                <div className={styles.channelMetricGrid}>
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div
                      key={`auth-route-guard-channel-metric-${index}`}
                      className={styles.channelCard}
                    >
                      <span className={`${styles.line} ${styles.lineShort}`} />
                      <span className={`${styles.line} ${styles.lineMedium}`} />
                    </div>
                  ))}
                </div>

                <div className={styles.channelSelector}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={`auth-route-guard-channel-range-${index}`}
                      className={styles.channelPill}
                    />
                  ))}
                </div>

                <div className={styles.channelCard}>
                  <div className={styles.channelChartCopy}>
                    <span className={`${styles.line} ${styles.lineShort}`} />
                    <span className={`${styles.line} ${styles.lineWide}`} />
                  </div>
                  <div className={styles.channelChartSurface} />
                  <span className={`${styles.line} ${styles.lineMedium}`} />
                </div>

                <div className={styles.channelOrdersCard}>
                  <div className={styles.channelOrderTabs}>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <span
                        key={`auth-route-guard-channel-tab-${index}`}
                        className={styles.channelPill}
                      />
                    ))}
                  </div>
                  <div className={styles.channelOrders}>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`auth-route-guard-channel-order-${index}`}
                        className={styles.channelOrderCard}
                      >
                        <div className={styles.channelOrderIdentity}>
                          <span className={styles.circle} />
                          <div className={styles.orderCopy}>
                            <span className={`${styles.line} ${styles.lineMedium}`} />
                            <span className={`${styles.line} ${styles.lineShort}`} />
                            <span className={`${styles.line} ${styles.lineLong}`} />
                          </div>
                        </div>
                        <div className={styles.channelOrderSummary}>
                          <span className={`${styles.line} ${styles.lineShort}`} />
                          <span className={`${styles.line} ${styles.lineMedium}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <DashboardSkeleton />
            )}
          </main>
        </div>
      </div>

      <nav className={styles.mobileNav} aria-hidden="true">
        {navOrder.map((key) => (
          <div key={key} className={styles.mobileNavItem}>
            <span className={styles.mobileNavIcon} />
            <span
              className={`${styles.line} ${key === activeKey ? styles.lineMedium : styles.lineShort}`}
            />
          </div>
        ))}
      </nav>
    </div>
  );
}

export function AuthRouteGuard({ children, locale }: AuthRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, accessToken } = useAppSelector((state) => state.auth);
  const normalizedPath = stripLocaleFromPathname(pathname ?? '/');
  const isAuthenticated = status === 'authenticated' && Boolean(accessToken);
  const isProtectedRoute = protectedPrefixes.some((prefix) => normalizedPath.startsWith(prefix));
  const isAuthRoute = authPrefixes.some((prefix) => normalizedPath.startsWith(prefix));
  const protectedRouteKind: ProtectedRouteKind = normalizedPath.startsWith('/profile')
    ? 'profile'
    : normalizedPath.startsWith('/channels')
      ? 'channel'
      : 'dashboard';

  useEffect(() => {
    if (status === 'checking') return;
    if (!isAuthenticated && isProtectedRoute) {
      router.replace(localizePath(locale, '/auth/login'));
      return;
    }
    if (isAuthenticated && isAuthRoute) {
      router.replace(localizePath(locale, '/dashboard'));
    }
  }, [status, isAuthenticated, isProtectedRoute, isAuthRoute, locale, router]);

  if (isProtectedRoute && (status === 'checking' || !isAuthenticated)) {
    return <ProtectedRouteLoadingShell kind={protectedRouteKind} locale={locale} />;
  }

  return <>{children}</>;
}
