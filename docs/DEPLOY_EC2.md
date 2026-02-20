# Amazon EC2 デプロイ手順

このガイドでは、AWS RDS PostgreSQL + EC2 (Docker Compose) 構成でアプリをデプロイする手順を説明します。

## アーキテクチャ概要

```
Internet
    │
    ├─→ EC2インスタンス
    │   ├─ Nginxコンテナ (80/443)
    │   │   └─→ Next.jsコンテナ (8080)
    │   └─ Docker Compose
    │
    └─→ AWS RDS PostgreSQL
```

---

## 前提条件

- AWS アカウント
- ドメイン（オプション: SSL証明書用）
- ローカルにDockerとDocker Composeがインストール済み

---

## ステップ1: AWS RDS PostgreSQL のセットアップ

### 1.1 RDSインスタンスの作成

1. **AWS Management Console** → **RDS** → **データベースの作成**
2. 以下の設定を選択:
   - **エンジン**: PostgreSQL 15.x
   - **テンプレート**: 本番稼働用（または開発/テスト用）
   - **DB インスタンスクラス**: `db.t4g.micro` (無料枠対象) または要件に応じて選択
   - **ストレージ**: 20GB（オートスケーリング有効化推奨）
   - **DB インスタンス識別子**: `apparel-db`
   - **マスターユーザー名**: `dbadmin`（任意）
   - **マスターパスワード**: 強力なパスワードを設定
   - **VPC**: EC2と同じVPCを選択
   - **パブリックアクセス**: いいえ（EC2からのみアクセス）
   - **VPC セキュリティグループ**: 新規作成または既存を選択

3. **作成**をクリック（起動に5〜10分かかります）

### 1.2 セキュリティグループの設定

1. RDSインスタンスのセキュリティグループを開く
2. **インバウンドルール**を編集:
   - **タイプ**: PostgreSQL (5432)
   - **ソース**: EC2インスタンスのセキュリティグループ
   - **説明**: Allow from EC2

### 1.3 接続文字列の取得

```
postgresql://dbadmin:your_password@apparel-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com:5432/postgres?sslmode=require
```

RDSのエンドポイントは **RDS ダッシュボード** → **接続とセキュリティ** から確認できます。

---

## ステップ2: EC2インスタンスのセットアップ

### 2.1 EC2インスタンスの作成

1. **AWS Management Console** → **EC2** → **インスタンスを起動**
2. 以下の設定を選択:
   - **AMI**: Ubuntu Server 22.04 LTS (HVM)
   - **インスタンスタイプ**: `t3.small` 以上（メモリ2GB以上推奨）
   - **キーペア**: 新規作成または既存を選択
   - **ネットワーク設定**:
     - **VPC**: RDSと同じVPC
     - **パブリック IP の自動割り当て**: 有効化
     - **セキュリティグループ**:
       - SSH (22): 自分のIPからのみ許可
       - HTTP (80): 0.0.0.0/0
       - HTTPS (443): 0.0.0.0/0
       - カスタムTCP (8080): 0.0.0.0/0（デバッグ用、後で削除可）
   - **ストレージ**: 20GB (gp3)

3. **インスタンスを起動**

### 2.2 Elastic IPの割り当て（推奨）

1. **EC2** → **Elastic IP** → **Elastic IP アドレスの割り当て**
2. 作成したEIPをEC2インスタンスに関連付け

---

## ステップ3: EC2インスタンスへの接続と環境構築

### 3.1 SSHで接続

```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

### 3.2 システムアップデート

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.3 Docker と Docker Compose のインストール

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Docker Compose
sudo apt install -y docker-compose-plugin

# 再ログイン（dockerグループ適用のため）
exit
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>

# 確認
docker --version
docker compose version
```

### 3.4 Git のインストール

```bash
sudo apt install -y git
```

---

## ステップ4: アプリケーションのデプロイ

### 4.1 リポジトリのクローン

```bash
cd ~
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 4.2 環境変数の設定

```bash
cp .env.production.example .env.production
nano .env.production
```

以下の値を設定:

```env
DATABASE_URL="postgresql://dbadmin:your_password@apparel-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com:5432/postgres?sslmode=require"
GEMINI_API_KEY="your_gemini_api_key"
SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_key"
SUPABASE_BUCKET_NAME="design-assets"
IMAGE_STORAGE_TYPE="supabase"
NODE_ENV="production"
PORT=8080
```

保存: `Ctrl + X` → `Y` → `Enter`

### 4.3 初回デプロイ

```bash
# 環境変数を読み込む
export $(cat .env.production | xargs)

# ビルドと起動
docker compose -f docker-compose.prod.yml up -d --build
```

### 4.4 ログ確認

```bash
# 全コンテナのログ
docker compose -f docker-compose.prod.yml logs -f

# アプリケーションのみ
docker compose -f docker-compose.prod.yml logs -f app

# Nginxのみ
docker compose -f docker-compose.prod.yml logs -f nginx
```

### 4.5 動作確認

```bash
# ヘルスチェック
curl http://localhost:8080/api/health

# Nginx経由
curl http://localhost/api/health

# 外部から
curl http://<EC2-PUBLIC-IP>/api/health
```

---

## ステップ5: ドメインとSSL証明書の設定（オプション）

### 5.1 ドメインのDNS設定

Route 53 または他のDNSプロバイダーで以下を設定:

```
A レコード: your-domain.com → <EC2-ELASTIC-IP>
```

### 5.2 Let's Encrypt SSL証明書の取得

```bash
# Certbotのインストール
sudo apt install -y certbot

# SSL証明書の取得（スタンドアロンモード）
# ※ Nginxコンテナを一時停止
docker compose -f docker-compose.prod.yml stop nginx

sudo certbot certonly --standalone -d your-domain.com
# メールアドレスと利用規約同意を入力

# 証明書の配置
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/*.pem
```

### 5.3 Nginx設定の更新

```bash
nano nginx/nginx.conf
```

以下の箇所をコメント解除し、`your-domain.com` を実際のドメインに変更:

```nginx
# HTTP → HTTPS リダイレクト
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPSサーバー
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    # ... 以下の設定
}
```

### 5.4 Nginxの再起動

```bash
docker compose -f docker-compose.prod.yml up -d nginx
```

### 5.5 自動更新の設定

```bash
# Cron設定
sudo crontab -e

# 以下を追加（毎月1日の午前3時に証明書を更新）
0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /home/ubuntu/your-repo/nginx/ssl/ && cp /etc/letsencrypt/live/your-domain.com/privkey.pem /home/ubuntu/your-repo/nginx/ssl/ && docker compose -f /home/ubuntu/your-repo/docker-compose.prod.yml restart nginx
```

---

## ステップ6: アプリケーションの更新

### 6.1 新しいコードのデプロイ

```bash
cd ~/your-repo

# 最新コードを取得
git pull origin main

# 再ビルド＆再起動
docker compose -f docker-compose.prod.yml up -d --build

# ログ確認
docker compose -f docker-compose.prod.yml logs -f app
```

### 6.2 ゼロダウンタイムデプロイ（推奨）

```bash
# 新しいイメージをビルド
docker compose -f docker-compose.prod.yml build

# ローリングアップデート
docker compose -f docker-compose.prod.yml up -d --no-deps --build app
```

---

## トラブルシューティング

### コンテナが起動しない

```bash
# コンテナの状態確認
docker compose -f docker-compose.prod.yml ps

# 詳細ログ
docker compose -f docker-compose.prod.yml logs app

# コンテナ内に入って確認
docker compose -f docker-compose.prod.yml exec app sh
```

### データベース接続エラー

```bash
# RDSへの接続確認
docker compose -f docker-compose.prod.yml exec app sh -c 'apt update && apt install -y postgresql-client && psql $DATABASE_URL'

# セキュリティグループ確認
# EC2のSGがRDSのSGに許可されているか確認
```

### Nginx 502 Bad Gateway

```bash
# アプリケーションが起動しているか確認
docker compose -f docker-compose.prod.yml ps app

# ポート8080が開いているか確認
docker compose -f docker-compose.prod.yml exec app netstat -tlnp | grep 8080

# Nginxの設定確認
docker compose -f docker-compose.prod.yml exec nginx nginx -t
```

---

## 運用Tips

### ログ管理

```bash
# ログローテーション設定済み（docker-compose.prod.yml）
# 最大10MB × 3ファイル = 30MB/コンテナ

# ログ確認
docker compose -f docker-compose.prod.yml logs --tail=100 -f
```

### バックアップ

```bash
# RDSの自動バックアップ有効化（AWSコンソール）
# スナップショット作成間隔: 1日
# 保持期間: 7日間（推奨）
```

### モニタリング

- **CloudWatch Logs**: コンテナログを転送（推奨）
- **CloudWatch Alarms**: CPU/メモリ使用率の監視
- **RDS Performance Insights**: データベースパフォーマンス監視

### セキュリティ

```bash
# 定期的なシステムアップデート
sudo apt update && sudo apt upgrade -y

# 不要なポートの閉鎖（セキュリティグループ）
# 8080ポートは削除（Nginx経由のみアクセス許可）

# SSH鍵ベース認証のみ許可
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
sudo systemctl restart sshd
```

---

## コスト最適化

- **EC2**: Reserved Instances（1年契約で最大40%割引）
- **RDS**: Reserved Instances（1年契約で最大42%割引）
- **t4g.micro** (ARM) は t3.micro より約10%安価
- **CloudWatch Logs**: 不要なログは無効化
- **Elastic IP**: 使用中は無料、未使用は課金されるため注意

---

## まとめ

この構成で以下が実現できます:

- ✅ AWS RDS PostgreSQL（マネージド、自動バックアップ）
- ✅ EC2上のDocker Compose（Nginx + Next.js）
- ✅ SSL/TLS対応（Let's Encrypt）
- ✅ ヘルスチェック・ログ管理
- ✅ ゼロダウンタイムデプロイ

問題が発生した場合は、ログを確認し、必要に応じてGitHub Issuesで報告してください。
