import path from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { resolveChannelPhotoRemoteHostnames } from "./src/lib/channel-photo-hosts";
import { buildFingerprintCspHeader } from "./src/lib/fingerprint-csp";

const nonEmpty = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const s3Region =
  nonEmpty(process.env.NEXT_PUBLIC_CHANNEL_PHOTOS_AWS_REGION) ??
  nonEmpty(process.env.AWS_REGION) ??
  "eu-central-1";

const remoteHostnames = resolveChannelPhotoRemoteHostnames({
  awsRegion: s3Region,
  bucketNames: [
    nonEmpty(process.env.NEXT_PUBLIC_CHANNEL_PHOTOS_BUCKETS),
    nonEmpty(process.env.AWS_S3_BUCKET_NAME),
  ].filter((value): value is string => Boolean(value)),
  remoteHosts: [process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS].filter(
    (value): value is string => Boolean(value)
  ),
});

const fingerprintCspHeader = buildFingerprintCspHeader({
  enabled: process.env.NEXT_PUBLIC_TRIAL_FINGERPRINT_ENABLED?.trim().toLowerCase() === "true",
  mode: process.env.NEXT_PUBLIC_FINGERPRINT_CSP_MODE,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  endpoint: process.env.NEXT_PUBLIC_FINGERPRINT_ENDPOINT,
  mixpanelApiHost: process.env.MIXPANEL_API_HOST,
  mixpanelEnabled: process.env.MIXPANEL_ENABLED?.trim().toLowerCase() === "true",
});

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  images: {
    remotePatterns: remoteHostnames.map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/**",
    })),
  },
  async headers() {
    const headers = [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          {
            key: "Content-Type",
            value: "application/json",
          },
        ],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/json",
          },
        ],
      },
    ];

    if (fingerprintCspHeader) {
      headers.push({
        source: "/(.*)",
        headers: [fingerprintCspHeader],
      });
    }

    return headers;
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
