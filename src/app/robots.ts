import type { MetadataRoute } from "next";
import { privateSeoPathPrefixes, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const robotsHost = (process.env.ROBOTS_HOST ?? siteUrl).replace(/\/+$/, "");

  if (process.env.ROBOTS_DISALLOW_ALL === "true") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      host: robotsHost,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privateSeoPathPrefixes.map((prefix) => `${prefix}/`),
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: robotsHost,
  };
}
