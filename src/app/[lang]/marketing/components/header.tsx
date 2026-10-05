import Home2Navbar from "./navbar";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { type Locale } from "@/lib/i18n";

type Home2HeaderProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2Header({ copy, locale }: Home2HeaderProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  return (
    <header className="main-header">
      <Home2Navbar copy={resolvedCopy.nav} locale={locale} />
    </header>
  );
}
