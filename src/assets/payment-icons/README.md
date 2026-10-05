# Payment Icons

This folder is the code registry for payment method and payout network icons.

The copyable raw SVG files live under:

- `packages/webapp/public/payment-icons/payment`
- `packages/webapp/public/payment-icons/crypto`
- `packages/webapp/public/payment-icons/network`

Frontend clients can copy those public folders directly, or reuse the registry keys from `registry.ts`.

Current registry keys:

- `payment:bank`
- `payment:paypal`
- `payment:manual`
- `crypto:usdt`
- `crypto:usdc`
- `network:tron`
- `network:trc20`
- `network:ethereum`
- `network:erc20`
- `network:bnb-smart-chain`
- `network:bep20`

Admin payout settings can either select a registry key, provide a public URL, or store an uploaded S3 URL in `iconUrl`.
