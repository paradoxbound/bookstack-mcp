FROM node:25-alpine@sha256:18e02657e2a2cc3a87210ee421e9769ff28a1ac824865d64f74d6d2d59f74b6b AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/stdio/package.json packages/stdio/
RUN npm ci

COPY packages/core/ packages/core/
COPY packages/stdio/ packages/stdio/
RUN npm run build

FROM node:25-alpine@sha256:18e02657e2a2cc3a87210ee421e9769ff28a1ac824865d64f74d6d2d59f74b6b

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/stdio/package.json packages/stdio/
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/packages/stdio/dist packages/stdio/dist
RUN npm ci --omit=dev && npm cache clean --force

COPY LICENSE ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

ENTRYPOINT ["node", "packages/stdio/dist/index.js"]
