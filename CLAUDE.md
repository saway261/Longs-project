# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start development server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Prisma (database)
npx prisma generate   # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>  # Create and apply a new migration
npx prisma studio     # Open Prisma Studio GUI
```

Package manager is **pnpm**. Path alias `@/` maps to the project root.

## Development Environment

The project is set up for **VS Code Dev Containers** via `.devcontainer/` backed by `docker-compose.yml`. The Compose stack includes:
- `app` service: Node 20 running `pnpm dev`
- `db` service: PostgreSQL 15 (`apparel_db`, user/password credentials in `.env.example`)

`DATABASE_URL` in `.env` must point to the correct host — `localhost` for local, `db` inside Docker Compose.

## Architecture Overview

**Next.js 16 App Router** application for apparel business management (アパレル管理システム). All UI text is in **Japanese**.

### Routing & Layout

- `app/layout.tsx` — root layout, sets `lang="ja"`, loads Geist font, wraps Vercel Analytics
- `app/page.tsx` — renders `<HomeClient />` inside a `<Suspense>` boundary
- `app/login/page.tsx` — standalone login page (hardcoded demo credentials: `owner@apparel.jp` / `demopass`)
- `app/settings/page.tsx` — standalone settings page (category deadlines, fixed costs, reserves); state is local only

### Single-Page App Pattern (HomeClient)

The authenticated app is effectively a **single-page application routed via URL search params**. `components/home-client.tsx` is the main shell:
- It renders `<Sidebar />` for navigation and a `<Header />`.
- The active section/subsection is read from the URL and determines which domain component to render.
- All domain components are client components (`"use client"`).

### Domain Components (in `components/`)

| Component | File | Description |
|-----------|------|-------------|
| Design Studio | `design-studio.tsx` | POP/poster creation with style, color, text, aspect ratio, and design history |
| Inventory AI | `inventory-ai.tsx` | Procurement recommendations and product catalog |
| Finance Flow | `finance-flow.tsx` | Cash flow dashboard, payment schedules, Gantt chart |
| Data Hub | `data-hub.tsx` | Multi-dataset table view (sales, payables, receivables, gross profit) |
| Data Registration | `data-registration.tsx` | New data entry and CSV import |
| Inventory Planning | `inventory-planning.tsx` | Early-reference planning table |
| Procurement List | `procurement-list.tsx` | Purchase order management |

### State & Data Persistence

**All data is currently client-side only — no backend API or database calls exist yet.**

- `hooks/use-data-store.ts` — manages the four dataset types via `localStorage`. Initial data comes from `lib/data-sets.ts`.
- `hooks/use-procurement-list.ts` — manages procurement items via `localStorage`.
- Most domain components also use local `useState` for draft/edit state.
- `lib/data-sets.ts` defines the column schemas and sample rows for all four datasets. Data is "paginated" by repeating sample rows up to ~1200 entries.

### UI Layer

- **shadcn/ui** (`components/ui/`, 50+ components) with `new-york` style. Add new components via `npx shadcn add <component>`.
- **Tailwind CSS v4** — configured via `@tailwindcss/postcss` in `postcss.config.mjs`. There is no `tailwind.config.*` file; theme tokens (colors, radius, fonts) are defined as CSS variables in `styles/globals.css` using `oklch()` color space.
- Icons: **Lucide React**.
- Charts: **Recharts**.
- Utility: `lib/utils.ts` exports `cn()` (clsx + tailwind-merge).

### Database (Prisma)

- **スキーマ定義**: `prisma/schema.prisma` — 24テーブル + 6 Enum（UNIFIED_DB_DESIGN.md に基づく）
- **クライアント**: `src/lib/prisma.ts` — PrismaClient シングルトン。`globalThis` パターンで HMR 時の多重接続を防止。Server Actions やサービス層から `import { prisma } from "@/src/lib/prisma"` で使用する
- **マイグレーション**: `prisma/migrations/` — 初期マイグレーション適用済み。CHECK制約（`reserve_policy.percent`, `finance_schedule.due_day`）は手動追加
- **DB管理ドキュメント**: `docs/DATABASE.md` — 接続方法、マイグレーション手順、psqlコマンド、トラブルシューティング
- **設計ドキュメント**: `yamadadocs/UNIFIED_DB_DESIGN.md` — 全テーブルのSQL定義とER図
- **バックエンド層**: `src/actions/`（Server Actions）, `src/services/`（ビジネスロジック）, `src/lib/`（共通ユーティリティ）はスキャフォールド済み・実装待ち

## Key Conventions

- **No API routes exist yet.** When adding backend functionality, use Next.js **Server Actions** in `src/actions/` rather than `app/api/` routes.
- **`next.config.mjs`** has `typescript.ignoreBuildErrors: true` — TypeScript errors will not break the build.
- **Images are unoptimized** (`images: { unoptimized: true }`) — static assets in `public/` are used as-is.
- Component files in `components/` use default exports. Domain-specific components are large single-file modules.

## Git Operations

**Allowed**: Read-only git commands for status checking
- `git log` — View commit history
- `git status` — Check current state
- `git diff` — View changes

**Prohibited**: Destructive git operations
- `git add` — Do NOT stage changes
- `git commit` — Do NOT create commits
- `git push` — Do NOT push to remote
- Any force operations (`--force`, `--hard`, etc.)

The user will handle all git staging and commit operations.

## Docker Environment & Memory Files

**Important**: This project runs inside Docker Compose (`docker-compose.yml`). The following volumes are mounted:
- `.:/app` — Host directory mounted to container `/app`
- `claude_data:/claude` — Named volume for Claude's persistent storage

**Memory File Location**:
- If local memory files are not found, check the Docker volume at `/claude/projects/-app/memory/`
- This location persists across container restarts
- All Claude session data, plans, and project memory are stored here
- Access via: `ls -la /claude/projects/-app/memory/`

**Implementation Plans**:
- Latest plans are stored in `/claude/plans/` (e.g., `goofy-questing-rocket.md`)
- These documents contain detailed implementation strategies and should be checked before starting work

## Deployment

### Production Environments

The application supports deployment to:
- **Railway** — Platform-as-a-Service (currently deployed)
- **Amazon EC2** — Docker Compose + AWS RDS PostgreSQL

### EC2 Deployment

**Architecture**: Nginx (reverse proxy) + Next.js container + AWS RDS PostgreSQL

**Key Files**:
- `Dockerfile` — Multi-stage build with `runner` stage for production
- `docker-compose.prod.yml` — Production compose configuration
- `nginx/nginx.conf` — Reverse proxy, SSL termination, health checks
- `.env.production.example` — Production environment variables template
- `app/api/health/route.ts` — Health check endpoint for container orchestration

**Documentation**: See `docs/DEPLOY_EC2.md` for complete deployment instructions including:
- AWS RDS PostgreSQL setup
- EC2 instance configuration
- SSL certificate installation (Let's Encrypt)
- Zero-downtime deployment strategy
- Monitoring and maintenance

**Port Configuration**:
- Development (`docker-compose.yml`): Port 3000
- Production (`docker-compose.prod.yml`): Port 8080 (Nginx on 80/443)
