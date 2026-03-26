FROM node:25-alpine@sha256:cf38e1f3c28ac9d81cdc0c51d8220320b3b618780e44ef96a39f76f7dbfef023 AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/stdio/package.json packages/stdio/
RUN npm ci

COPY packages/core/ packages/core/
COPY packages/stdio/ packages/stdio/
RUN npm run build

FROM node:25-alpine@sha256:cf38e1f3c28ac9d81cdc0c51d8220320b3b618780e44ef96a39f76f7dbfef023

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
