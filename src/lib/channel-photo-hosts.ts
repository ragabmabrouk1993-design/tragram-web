const DEFAULT_CHANNEL_PHOTO_BUCKETS = [
  "tragram-channel-photos-local",
  "tragram-channel-photos-staging",
  "tragram-channel-photos-staging-265742305340",
  "tragram-channel-photos-production",
];

const splitCsv = (value?: string): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const unique = <T,>(values: T[]): T[] => [...new Set(values)];

const nonEmpty = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const toHostname = (value: string): string | null => {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.includes("://")) {
    try {
      return new URL(normalizedValue).hostname;
    } catch {
      return null;
    }
  }

  return normalizedValue;
};

export const resolveChannelPhotoRemoteHostnames = ({
  awsRegion,
  bucketNames,
  remoteHosts,
}: {
  awsRegion?: string;
  bucketNames?: string[];
  remoteHosts?: string[];
} = {}): string[] => {
  const s3Region = nonEmpty(awsRegion) ?? "eu-central-1";
  const resolvedBucketNames = unique([
    ...DEFAULT_CHANNEL_PHOTO_BUCKETS,
    ...(bucketNames ?? []).flatMap((value) => splitCsv(value)),
  ]);

  return unique([
    ...resolvedBucketNames.map((bucketName) => `${bucketName}.s3.${s3Region}.amazonaws.com`),
    ...(remoteHosts ?? [])
      .flatMap((value) => splitCsv(value))
      .map(toHostname)
      .filter((hostname): hostname is string => Boolean(hostname)),
  ]);
};
