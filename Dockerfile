
FROM node:22-alpine AS pruner
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=npm-cache-webapp,target=/root/.npm,sharing=locked \
    TURBO_VERSION="$(node -p 'require("./package-lock.json").packages["node_modules/turbo"].version')" \
    && npm exec --yes --package="turbo@${TURBO_VERSION}" -- turbo prune --scope=@tragram/webapp --docker

FROM node:22-alpine AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=npm-cache-webapp,target=/root/.npm npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_TRIAL_FINGERPRINT_ENABLED
ARG NEXT_PUBLIC_FINGERPRINT_PUBLIC_API_KEY
ARG NEXT_PUBLIC_FINGERPRINT_REGION
ARG NEXT_PUBLIC_FINGERPRINT_ENDPOINT
ARG NEXT_PUBLIC_FINGERPRINT_CSP_MODE
ARG AWS_REGION
ARG AWS_S3_BUCKET_NAME
ARG NEXT_PUBLIC_CHANNEL_PHOTOS_AWS_REGION
ARG NEXT_PUBLIC_CHANNEL_PHOTOS_BUCKETS
ARG NEXT_PUBLIC_IMAGE_REMOTE_HOSTS
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_TRIAL_FINGERPRINT_ENABLED=${NEXT_PUBLIC_TRIAL_FINGERPRINT_ENABLED}
ENV NEXT_PUBLIC_FINGERPRINT_PUBLIC_API_KEY=${NEXT_PUBLIC_FINGERPRINT_PUBLIC_API_KEY}
ENV NEXT_PUBLIC_FINGERPRINT_REGION=${NEXT_PUBLIC_FINGERPRINT_REGION}
ENV NEXT_PUBLIC_FINGERPRINT_ENDPOINT=${NEXT_PUBLIC_FINGERPRINT_ENDPOINT}
ENV NEXT_PUBLIC_FINGERPRINT_CSP_MODE=${NEXT_PUBLIC_FINGERPRINT_CSP_MODE}
ENV AWS_REGION=${AWS_REGION}
ENV AWS_S3_BUCKET_NAME=${AWS_S3_BUCKET_NAME}
ENV NEXT_PUBLIC_CHANNEL_PHOTOS_AWS_REGION=${NEXT_PUBLIC_CHANNEL_PHOTOS_AWS_REGION}
ENV NEXT_PUBLIC_CHANNEL_PHOTOS_BUCKETS=${NEXT_PUBLIC_CHANNEL_PHOTOS_BUCKETS}
ENV NEXT_PUBLIC_IMAGE_REMOTE_HOSTS=${NEXT_PUBLIC_IMAGE_REMOTE_HOSTS}
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.base.json /app/tsconfig.paths.json ./
RUN rm -rf packages/webapp/node_modules \
 && npm run build --workspace=packages/shared/types \
 && npm run build --workspace=packages/webapp \
 && npm prune --omit=dev \
 && npm cache clean --force \
 && find packages -type d -name src -prune -exec rm -rf '{}' +

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=build --chown=nodejs:nodejs /app/packages/webapp/.next/standalone ./
COPY --from=build --chown=nodejs:nodejs /app/packages/webapp/.next/static ./packages/webapp/.next/static
COPY --from=build --chown=nodejs:nodejs /app/packages/webapp/public ./packages/webapp/public

ENV NODE_ENV=production
USER nodejs

WORKDIR /app

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/webapp/server.js"]
