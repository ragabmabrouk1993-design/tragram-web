export type PaymentIconKey =
    | "payment:bank"
    | "payment:paypal"
    | "payment:manual"
    | "crypto:usdt"
    | "crypto:usdc"
    | "network:tron"
    | "network:trc20"
    | "network:ethereum"
    | "network:erc20"
    | "network:bnb-smart-chain"
    | "network:bep20";

export type PaymentIconDescriptor = {
    key: PaymentIconKey;
    label: string;
    src: string;
};

export const paymentIconRegistry: Record<PaymentIconKey, PaymentIconDescriptor> = {
    "payment:bank": { key: "payment:bank", label: "Bank transfer", src: "/payment-icons/payment/bank.svg" },
    "payment:paypal": { key: "payment:paypal", label: "PayPal", src: "/payment-icons/payment/paypal.svg" },
    "payment:manual": { key: "payment:manual", label: "Manual payout", src: "/payment-icons/payment/manual.svg" },
    "crypto:usdt": { key: "crypto:usdt", label: "USDT", src: "/payment-icons/crypto/usdt.svg" },
    "crypto:usdc": { key: "crypto:usdc", label: "USDC", src: "/payment-icons/crypto/usdc.svg" },
    "network:tron": { key: "network:tron", label: "TRON", src: "/payment-icons/network/tron.svg" },
    "network:trc20": { key: "network:trc20", label: "TRC20", src: "/payment-icons/network/trc20.svg" },
    "network:ethereum": { key: "network:ethereum", label: "Ethereum", src: "/payment-icons/network/ethereum.svg" },
    "network:erc20": { key: "network:erc20", label: "ERC20", src: "/payment-icons/network/erc20.svg" },
    "network:bnb-smart-chain": {
        key: "network:bnb-smart-chain",
        label: "BNB Smart Chain",
        src: "/payment-icons/network/bnb-smart-chain.svg",
    },
    "network:bep20": { key: "network:bep20", label: "BEP20", src: "/payment-icons/network/bep20.svg" },
};

export const resolvePaymentIconSource = (icon?: {
    iconType?: string | null;
    iconKey?: string | null;
    iconUrl?: string | null;
}) => {
    if (!icon) return null;
    const type = icon.iconType?.toUpperCase();
    if ((type === "URL" || type === "UPLOAD") && icon.iconUrl) {
        return icon.iconUrl;
    }
    if (icon.iconKey && icon.iconKey in paymentIconRegistry) {
        return paymentIconRegistry[icon.iconKey as PaymentIconKey].src;
    }
    return icon.iconUrl || null;
};
