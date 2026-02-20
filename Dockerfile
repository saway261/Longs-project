# --- 1. ベース設定 (軽量なOS環境) ---
FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

# --- 2. 開発用 (Development) ---
FROM base AS development
# 開発時のみ Git や Claude を入れる
RUN apt-get update && apt-get install -y git curl locales \
    && locale-gen en_US.UTF-8
RUN curl -fsSL https://claude.ai/install.sh | bash && ln -sf /root/.local/bin/claude /usr/local/bin/claude
COPY . .
RUN pnpm install
CMD ["pnpm", "dev"]

# --- 3. ビルド用 (Builder) ---
FROM base AS builder
# ビルド時のみ Git が必要な場合がある（GitHub経由のライブラリなど）
RUN apt-get update && apt-get install -y git
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# --- 4. 本番実行用 (Runner) ---
FROM base AS runner
ENV NODE_ENV=production
# Gitなどは入っておらず、OpenSSLだけがある状態
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]