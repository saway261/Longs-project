# データベース管理ガイド

## 概要

| 項目 | 値 |
|------|-----|
| データベース | PostgreSQL 15 |
| ORM | Prisma |
| 実行環境 | Docker Compose（Dev Container） |
| スキーマ定義 | `prisma/schema.prisma` |
| 設計ドキュメント | `yamadadocs/UNIFIED_DB_DESIGN.md` |

---

## 接続情報

### コンテナ内（appサービスから）

```
DATABASE_URL=postgresql://user:password@db:5432/apparel_db
```

この値は `docker-compose.yml` の `app` サービスの `environment` で自動設定されます。

### ホストマシンから

```
DATABASE_URL=postgresql://user:password@localhost:5432/apparel_db
```

`.env` ファイルに記載されています。ホストからの接続は `localhost:5432` を使用します。

### 認証情報

| 項目 | 値 |
|------|-----|
| ユーザー名 | `user` |
| パスワード | `password` |
| データベース名 | `apparel_db` |
| ポート | `5432` |

> **注意**: これは開発環境用の認証情報です。本番環境では必ず変更してください。

---

## マイグレーション手順

### 基本コマンド

```bash
# 開発環境: マイグレーション作成 + 適用 + クライアント再生成
npx prisma migrate dev --name <マイグレーション名>

# SQL生成のみ（適用前にレビューしたい場合）
npx prisma migrate dev --create-only --name <マイグレーション名>

# 本番環境: 未適用のマイグレーションを適用
npx prisma migrate deploy

# マイグレーション状態の確認
npx prisma migrate status

# データベースリセット（全データ削除 + 全マイグレーション再適用）
npx prisma migrate reset

# Prismaクライアント再生成（スキーマ変更後）
npx prisma generate
```

### 新しいマイグレーションの作成手順

1. `prisma/schema.prisma` を編集する
2. マイグレーションを作成・適用する:
   ```bash
   npx prisma migrate dev --name add_new_table
   ```
3. 生成されたSQLを確認したい場合:
   ```bash
   npx prisma migrate dev --create-only --name add_new_table
   # prisma/migrations/<タイムスタンプ>_add_new_table/migration.sql を確認
   # 問題なければ適用:
   npx prisma migrate dev
   ```

### CHECK制約などPrisma非対応のSQL

PrismaはCHECK制約をサポートしていません。`--create-only` でSQLを生成後、手動で追記してから適用してください。

現在設定済みのCHECK制約:
- `reserve_policy.percent`: 0〜100の範囲
- `finance_schedule.due_day`: 1〜31の範囲

---

## psqlでのDB確認方法

### dbコンテナに接続

ホストマシンのターミナルから:

```bash
docker compose exec db psql -U user -d apparel_db
```

### よく使うpsqlコマンド

| コマンド | 説明 |
|---------|------|
| `\dt` | 全テーブル一覧 |
| `\d テーブル名` | テーブル構造の詳細（カラム、型、制約） |
| `\dT+` | 全Enum型の一覧と値 |
| `\di` | 全インデックス一覧 |
| `\l` | 全データベース一覧 |
| `\dn` | スキーマ一覧 |
| `\q` | psql終了 |

### よく使う確認クエリ

```sql
-- テーブル数の確認（24テーブル + _prisma_migrations）
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

-- 特定テーブルのレコード数
SELECT count(*) FROM user_account;

-- テーブルとカラム数の一覧
SELECT table_name, count(column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
```

---

## Prisma Studio（GUI）

ブラウザベースのDBビューアを起動:

```bash
npx prisma studio
```

デフォルトで `http://localhost:5555` が開きます。テーブルの閲覧・編集が可能です。

---

## スキーマ概要（24テーブル）

### 認証・ユーザー（1）
- `user_account` — ユーザーアカウント

### 設定（2）
- `product_category` — カテゴリマスタ
- `reserve_policy` — 内部留保構成

### 商品・在庫（5）
- `product_brand` — ブランドマスタ
- `product` — 商品（JANコードがPK）
- `product_variant` — 商品バリアント（色・サイズ）
- `warehouse` — 倉庫
- `inventory_stock` — 在庫（倉庫 x バリアント）

### 仕入（2）
- `procurement_list` — 仕入リスト
- `procurement_item` — 仕入項目

### 在庫計画（2）
- `inventory_plan_year` — 年度計画
- `inventory_plan_month` — 月次計画

### 財務（5）
- `counterparty` — 取引先マスタ
- `finance_schedule` — 支払スケジュール
- `finance_schedule_tag` — タグマスタ
- `finance_schedule_tag_map` — スケジュール x タグ
- `finance_event` — 財務イベント（実績）

### データインポート（3）
- `data_import` — インポート履歴
- `data_import_row` — 生データ（JSONB）
- `data_import_issue` — エラー・警告

### ファクト表（4）
- `sales_fact` — 売上
- `payables_fact` — 仕入・支払
- `receivables_fact` — 請求・入金
- `gross_profit_fact` — 粗利

### デザイン・AI（2）
- `design_asset` — デザインアセット
- `ai_insight` — AIインサイト

---

## データベース管理手順

### テーブルの追加

1. `prisma/schema.prisma` に新しいモデルを追加
2. `npx prisma migrate dev --name add_テーブル名`

### カラムの変更

1. `prisma/schema.prisma` のモデルを編集
2. `npx prisma migrate dev --name update_テーブル名_カラム名`

### インデックスの追加

1. モデルに `@@index([フィールド名])` を追加
2. `npx prisma migrate dev --name add_index_テーブル名`

### バックアップ

```bash
# データベース全体のダンプ
docker compose exec db pg_dump -U user apparel_db > backup.sql

# 特定テーブルのダンプ
docker compose exec db pg_dump -U user -t テーブル名 apparel_db > table_backup.sql
```

### リストア

```bash
docker compose exec -T db psql -U user -d apparel_db < backup.sql
```

### 開発DBの完全リセット

```bash
# 方法1: Prismaでリセット（マイグレーション再適用）
npx prisma migrate reset

# 方法2: Dockerボリュームごとリセット（完全初期化）
docker compose down -v
docker compose up -d db
npx prisma migrate dev
```

---

## トラブルシューティング

### "Can't reach database server"

- `docker compose up -d db` でdbサービスが起動しているか確認
- `DATABASE_URL` のホスト名を確認:
  - appコンテナ内: `db`
  - ホストマシン: `localhost`

### マイグレーション失敗

```bash
# 状態を確認
npx prisma migrate status

# 開発環境ではリセットが最も簡単
npx prisma migrate reset
```

### Prismaクライアントの型が古い

```bash
npx prisma generate
```

スキーマ変更後にクライアントの型が更新されない場合に実行してください。

### "User" テーブルが残っている

初期マイグレーション（`20260210142304_init`）で旧 `User` モデルは `user_account` に置き換え済みです。もし旧テーブルが残っている場合は `npx prisma migrate reset` でリセットしてください。
