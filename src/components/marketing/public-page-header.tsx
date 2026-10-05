import Link from "next/link";
import { cn } from "@/lib/utils";

type PublicPageHeaderBreadcrumb = {
  label: string;
  href?: string;
};

type PublicPageHeaderProps = {
  title: string;
  breadcrumbs: PublicPageHeaderBreadcrumb[];
  lang?: string;
  animateTitle?: boolean;
};

const arabicCharacterRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

function shouldAnimateTitleText(title: string, lang?: string): boolean {
  if (arabicCharacterRegex.test(title)) {
    return false;
  }

  const normalizedLang = (lang ?? "").toLowerCase();
  if (normalizedLang.startsWith("ar")) {
    return false;
  }

  return true;
}

export function PublicPageHeader({
  title,
  breadcrumbs,
  lang,
  animateTitle = true,
}: PublicPageHeaderProps) {
  const shouldAnimateTitle = animateTitle && shouldAnimateTitleText(title, lang);
  const lastIndex = breadcrumbs.length - 1;

  return (
    <div className="page-header bg-section dark-section">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="page-header-box">
              <h1
                className={cn(shouldAnimateTitle && "text-anime-style-3")}
                data-cursor={shouldAnimateTitle ? "-opaque" : undefined}
                data-no-split-text={!shouldAnimateTitle ? "true" : undefined}
                lang={lang}
              >
                {title}
              </h1>
              <nav className="wow fadeInUp">
                <ol className="breadcrumb">
                  {breadcrumbs.map((breadcrumb, index) => {
                    const isActive = index === lastIndex;
                    return (
                      <li
                        key={`${breadcrumb.label}-${index}`}
                        className={cn("breadcrumb-item", isActive && "active")}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {!isActive && breadcrumb.href ? (
                          <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                        ) : (
                          breadcrumb.label
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
