FROM node:25-alpine@sha256:636c5bc8fa6a7a542bc99f25367777b0b3dd0db7d1ca3959d14137a1ac80bde2 AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/stdio/package.json packages/stdio/
RUN npm ci

COPY packages/core/ packages/core/
COPY packages/stdio/ packages/stdio/
RUN npm run build

FROM node:25-alpine@sha256:636c5bc8fa6a7a542bc99f25367777b0b3dd0db7d1ca3959d14137a1ac80bde2

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/stdio/package.json packages/stdio/
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/packages/stdio/dist packages/stdio/dist
RUN apk upgrade --no-cache && npm ci --omit=dev && npm cache clean --force

COPY LICENSE ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

ENTRYPOINT ["node", "packages/stdio/dist/index.js"]
