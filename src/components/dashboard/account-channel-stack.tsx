"use client";

import { ChannelAvatar } from "@/components/channels";
import { cn } from "@/lib/utils";
import type { MtAccountSubscribedChannel } from "@/lib/api-client";

type AccountChannelStackProps = {
  channels?: Array<MtAccountSubscribedChannel> | null;
  className?: string;
  maxVisible?: number;
};

const normalizeChannels = (
  channels?: Array<MtAccountSubscribedChannel> | null
): Array<MtAccountSubscribedChannel> =>
  Array.isArray(channels)
    ? channels.filter(
        (channel) =>
          Boolean(channel?.subscriptionId || channel?.channelId || channel?.channelTitle || channel?.photoUrl)
      )
    : [];

export function AccountChannelStack({
  channels,
  className,
  maxVisible = 4,
}: AccountChannelStackProps) {
  const normalizedChannels = normalizeChannels(channels);
  if (normalizedChannels.length === 0) {
    return null;
  }

  const visibleChannels = normalizedChannels.slice(0, maxVisible);
  const remainingCount = normalizedChannels.length - visibleChannels.length;

  return (
    <div className={cn("dashboard-account-channel-stack", className)}>
      <div className="dashboard-account-channel-stack-avatars" aria-hidden="true">
        {visibleChannels.map((channel, index) => (
          <span
            key={channel.subscriptionId ?? channel.channelId ?? `channel-${index}`}
            className="dashboard-account-channel-stack-avatar"
            style={{ zIndex: visibleChannels.length - index }}
            title={channel.channelTitle ?? channel.channelUsername ?? undefined}
          >
            <ChannelAvatar
              imageUrl={channel.photoUrl}
              className="dashboard-account-channel-avatar"
              imgClassName="dashboard-account-channel-avatar-img"
            />
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="dashboard-account-channel-stack-more">+{remainingCount}</span>
        )}
      </div>
    </div>
  );
}
