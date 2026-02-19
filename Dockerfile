FROM node:20-slim

WORKDIR /app

# Install OS packages
# - openssl, git: 開発/ビルドで必要
# - locales: # 開発用（git log の日本語文字化け対策など）
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends \
      openssl git locales curl ca-certificates \
 && sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
 && locale-gen \
 && update-locale LANG=en_US.UTF-8 \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# # 開発用: UTF-8 ロケールを強制（ターミナル/git出力の文字化け対策）
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Install pnpm
RUN npm install -g pnpm

# Claude Code (公式インストーラ)
RUN curl -fsSL https://claude.ai/install.sh | bash
RUN ln -sf /root/.local/bin/claude /usr/local/bin/claude

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

CMD ["pnpm", "dev"]
