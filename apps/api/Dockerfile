# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS deps
WORKDIR /app

# NPM hardening (reduz falhas tipo EINTEGRITY / rede instável)
RUN npm config set registry https://registry.npmjs.org/ \
 && npm config set fetch-retries 8 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set maxsockets 50 \
 && npm cache clean --force

COPY package*.json ./

# cache do npm entre builds (BuildKit)
RUN --mount=type=cache,target=/root/.npm \
    sh -lc 'for i in 1 2 3; do npm ci --no-audit --no-fund --prefer-online && break || (echo "npm ci failed, retry ..." && sleep 5); done'

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build || echo "no build step"

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app ./
COPY entrypoint.sh /app/entrypoint.sh

# Corrige CRLF + dá permissão no entrypoint (Windows -> Linux)
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/app/entrypoint.sh"]