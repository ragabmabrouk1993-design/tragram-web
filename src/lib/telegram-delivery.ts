import type { VerificationDelivery } from "@/lib/api-client";

export type TelegramDelivery = Extract<VerificationDelivery, { channel: "telegram_gateway" }>;

export const isTelegramGatewayDelivery = (
    delivery?: VerificationDelivery | null
): delivery is TelegramDelivery =>
    Boolean(delivery && delivery.channel === "telegram_gateway");

export const isTelegramGatewayPending = (
    delivery?: VerificationDelivery | null
): delivery is TelegramDelivery & { status: "delivery_pending" } =>
    isTelegramGatewayDelivery(delivery) && delivery.status === "delivery_pending";
