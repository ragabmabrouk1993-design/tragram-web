import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries();
}
