#!/bin/bash
# create-admin.sh
# adminロールのユーザーをDBに直接作成するスクリプト
#
# 使い方:
#   ./scripts/create-admin.sh <email> <password> [name]
#
# 例:
#   ./scripts/create-admin.sh admin@example.com mypassword "管理者"
#   ./scripts/create-admin.sh admin@example.com mypassword

set -e

EMAIL="$1"
PASSWORD="$2"
NAME="${3:-管理者}"

# 引数チェック
if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "使い方: $0 <email> <password> [name]"
  echo "例:    $0 admin@example.com mypassword \"管理者\""
  exit 1
fi

# DATABASE_URL が未設定の場合はデフォルト値を使用
if [ -z "$DATABASE_URL" ]; then
  DATABASE_URL="postgresql://user:password@db:5432/apparel_db"
fi

echo "ユーザーを作成しています..."
echo "  Email: $EMAIL"
echo "  Name:  $NAME"
echo "  Role:  admin"

# Node.js でパスワードハッシュを生成し、SQLを実行
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('$PASSWORD', 10).then(hash => {
  const sql = \`
INSERT INTO user_account (email, name, password_hash, role)
VALUES ('\${process.env.EMAIL || '$EMAIL'}', '\${process.env.NAME || '$NAME'}', '\` + hash + \`', 'admin')
ON CONFLICT (email) DO UPDATE
  SET name          = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      role          = 'admin',
      updated_at    = NOW()
RETURNING id, email, name, role, created_at;
\`;
  process.stdout.write(sql);
}).catch(err => { console.error(err); process.exit(1); });
" | psql "$DATABASE_URL"

echo ""
echo "完了しました。"