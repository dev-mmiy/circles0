# Disease Community Platform - Makefile
# 開発・ビルド・デプロイの自動化

.PHONY: help install dev test lint format build clean deploy test-local test-production

# デフォルトターゲット
help: ## 利用可能なコマンドを表示
	@echo "Disease Community Platform - 利用可能なコマンド:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# 依存関係のインストール
install: ## 全依存関係をインストール
	@echo "📦 Installing dependencies..."
	cd backend && pip install -r requirements.txt
	cd frontend && npm ci
	@echo "✅ Dependencies installed successfully!"

# データベース関連
db-create: ## データベースを作成
	@echo "🗄️ Creating databases..."
	./scripts/create_databases.sh all
	@echo "✅ Databases created successfully!"

db-create-dev: ## 開発用データベースを作成
	@echo "🗄️ Creating development database..."
	./scripts/create_databases.sh dev
	@echo "✅ Development database created successfully!"

db-create-prod: ## 本番用データベースを作成
	@echo "🗄️ Creating production database..."
	./scripts/create_databases.sh prod
	@echo "✅ Production database created successfully!"

db-create-test: ## テスト用データベースを作成
	@echo "🗄️ Creating test database..."
	./scripts/create_databases.sh test
	@echo "✅ Test database created successfully!"

db-migrate: ## マイグレーションを実行
	@echo "🔄 Running migrations..."
	./scripts/migrate.sh dev upgrade
	@echo "✅ Migrations completed successfully!"

db-migrate-prod: ## 本番環境のマイグレーションを実行
	@echo "🔄 Running production migrations..."
	./scripts/migrate.sh prod upgrade
	@echo "✅ Production migrations completed successfully!"

db-migrate-test: ## テスト環境のマイグレーションを実行
	@echo "🔄 Running test migrations..."
	./scripts/migrate.sh test upgrade
	@echo "✅ Test migrations completed successfully!"

db-revision: ## 新しいマイグレーションを作成
	@echo "📝 Creating new migration..."
	@read -p "Enter migration message: " message; \
	./scripts/migrate.sh dev revision "$$message"
	@echo "✅ Migration created successfully!"

db-history: ## マイグレーション履歴を表示
	@echo "📋 Migration history:"
	./scripts/migrate.sh dev history

db-current: ## 現在のマイグレーション状態を表示
	@echo "📍 Current migration status:"
	./scripts/migrate.sh dev current

# 開発環境の起動
dev: ## 開発環境を起動
	@echo "🚀 Starting development environment..."
	docker compose up -d
	@echo "✅ Development environment started!"
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "🌐 Backend: http://localhost:8000"
	@echo "🌐 API Docs: http://localhost:8000/docs"

# 開発環境の停止
stop: ## 開発環境を停止
	@echo "🛑 Stopping development environment..."
	docker compose down
	@echo "✅ Development environment stopped!"

# テスト実行
test: ## 全テストを実行
	@echo "🧪 Running tests..."
	cd backend && python -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term
	cd frontend && npm run test
	@echo "✅ All tests completed!"

# バックエンドテスト
test-backend: ## バックエンドテストを実行
	@echo "🧪 Running backend tests..."
	cd backend && python -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term

# フロントエンドテスト
test-frontend: ## フロントエンドテストを実行
	@echo "🧪 Running frontend tests..."
	cd frontend && npm run test

# リント実行
lint: ## 全リントを実行
	@echo "🔍 Running linters..."
	cd backend && flake8 app/ && isort --check-only app/
	cd frontend && npm run lint
	@echo "✅ Linting completed!"

# フォーマット実行
format: ## コードをフォーマット
	@echo "🎨 Formatting code..."
	cd backend && isort app/
	cd frontend && npm run format
	@echo "✅ Code formatted!"

# ビルド実行
build: ## 全アプリケーションをビルド
	@echo "🔨 Building applications..."
	docker compose -f docker-compose.prod.yml build
	@echo "✅ Build completed!"

# 本番環境起動
prod: ## 本番環境を起動
	@echo "🚀 Starting production environment..."
	docker compose -f docker-compose.prod.yml up -d
	@echo "✅ Production environment started!"

# クリーンアップ
clean: ## 不要なファイルを削除
	@echo "🧹 Cleaning up..."
	docker compose down -v
	docker system prune -f
	cd backend && find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	cd backend && find . -type f -name "*.pyc" -delete
	cd frontend && rm -rf .next node_modules/.cache
	@echo "✅ Cleanup completed!"

# セキュリティスキャン
security: ## セキュリティスキャンを実行
	@echo "🔒 Running security scan..."
	docker run --rm -v $(PWD):/app aquasec/trivy fs /app
	@echo "✅ Security scan completed!"

# データベースマイグレーション
migrate: ## データベースマイグレーションを実行
	@echo "🗄️ Running database migrations..."
	cd backend && alembic upgrade head
	@echo "✅ Database migration completed!"

# データベース初期化
init-db: ## データベースを初期化
	@echo "🗄️ Initializing database..."
	docker compose up -d postgres
	sleep 10
	psql -h localhost -U postgres -d disease_community -f database_schema.sql
	@echo "✅ Database initialized!"

# ローカルテスト（簡易版）
test-local-simple: ## ローカル環境で簡易テストを実行
	@echo "🧪 Running simple local tests..."
	@echo "📋 Backend linting..."
	docker compose exec backend flake8 app/ --max-line-length=88 --extend-ignore=E203,W503
	docker compose exec backend isort --check-only app/
	@echo "📋 Backend tests..."
	docker compose exec backend python -m pytest tests/ -v --cov=app --cov-report=html
	@echo "📋 Frontend tests..."
	docker compose exec frontend npm run type-check
	docker compose exec frontend npm run lint
	docker compose exec frontend npm run format:check
	@echo "📋 Integration tests..."
	docker compose -f docker-compose.ci.yml up --build -d
	sleep 10
	docker compose exec backend python -m pytest tests/integration/ -v
	docker compose -f docker-compose.ci.yml down
	@echo "✅ Local tests completed successfully!"

# プロダクションテスト
test-production: ## プロダクション環境でテストを実行
	@echo "🏭 Running production tests..."
	@echo "📋 Building production images..."
	docker compose build
	@echo "📋 Testing production environment..."
	ENVIRONMENT=production docker compose up -d
	sleep 15
	@echo "📋 Health check..."
	curl -f http://localhost:8000/health || (echo "❌ Backend health check failed" && exit 1)
	curl -f http://localhost:3000/ || (echo "❌ Frontend health check failed" && exit 1)
	@echo "📋 Market detection test..."
	curl -f "http://localhost:8000/?market=ja-jp" | grep -q "ja-jp" || (echo "❌ Market detection failed" && exit 1)
	@echo "✅ Production tests completed successfully!"

# ヘルスチェック
health: ## アプリケーションのヘルスチェック
	@echo "🏥 Checking application health..."
	curl -f http://localhost:8000/health || echo "❌ Backend health check failed"
	curl -f http://localhost:3000 || echo "❌ Frontend health check failed"
	@echo "✅ Health check completed!"

# 開発環境の完全リセット
reset: clean install dev ## 開発環境を完全リセット
	@echo "🔄 Development environment reset completed!"

# デプロイ（開発環境）
deploy-dev: ## 開発環境にデプロイ
	@echo "🚀 Deploying to development environment..."
	./scripts/deploy.sh dev all
	@echo "✅ Development deployment completed!"

# デプロイ（本番環境）
deploy-prod: ## 本番環境にデプロイ
	@echo "🚀 Deploying to production environment..."
	./scripts/deploy.sh prod all
	@echo "✅ Production deployment completed!"

# ログ表示
logs: ## アプリケーションログを表示
	@echo "📋 Showing application logs..."
	docker compose logs -f

# バックエンドログ
logs-backend: ## バックエンドログを表示
	@echo "📋 Showing backend logs..."
	docker compose logs -f backend

# フロントエンドログ
logs-frontend: ## フロントエンドログを表示
	@echo "📋 Showing frontend logs..."
	docker compose logs -f frontend

# データベースログ
logs-db: ## データベースログを表示
	@echo "📋 Showing database logs..."
	docker compose logs -f postgres

# ローカルテスト
test-local: ## シンプルなローカルテストを実行（バックエンドのみ）
	@echo "🧪 Running simple local tests..."
	@chmod +x scripts/local-test.sh
	@./scripts/local-test.sh

# フルローカルテスト
test-local-full: ## フルローカルテストを実行（フロントエンド含む）
	@echo "🧪 Running full local tests..."
	@chmod +x scripts/local-test-full.sh
	@./scripts/local-test-full.sh

# バックエンドのみのテスト
test-local-backend: ## バックエンドのみのローカルテストを実行
	@echo "🧪 Running backend-only local tests..."
	@chmod +x scripts/local-test-backend.sh
	@./scripts/local-test-backend.sh

# 旧式の簡易テスト（非推奨）
test-local-simple-old: ## 旧式の簡易テストを実行（非推奨）
	@echo "🧪 Running old simple local tests..."
	@echo "📋 Backend tests..."
	docker compose exec backend python -m pytest tests/ -v --cov=app --cov-report=html
	@echo "📋 Frontend tests..."
	docker compose exec frontend npm run type-check
	docker compose exec frontend npm run lint
	docker compose exec frontend npm run format:check
	@echo "📋 Integration tests..."
	docker compose -f docker-compose.ci.yml up --build -d
	sleep 10
	docker compose exec backend python -m pytest tests/integration/ -v
	docker compose -f docker-compose.ci.yml down
	@echo "✅ Local tests completed successfully!"

# デプロイメント前のチェック
pre-deploy: ## デプロイメント前のチェック
	@echo "🔍 Running pre-deployment checks..."
	@echo "1. Code quality checks..."
	make lint
	@echo "2. Running tests..."
	make test
	@echo "3. Security scans..."
	cd backend && safety check -r requirements.txt
	cd frontend && npm audit --audit-level moderate
	@echo "✅ Pre-deployment checks completed!"

# デプロイメント用のブランチ作成
create-release-branch: ## リリース用ブランチを作成
	@echo "🌿 Creating release branch..."
	git checkout -b release/$(shell date +%Y%m%d-%H%M%S)
	@echo "✅ Release branch created!"

# デプロイメント用のコミット
commit-for-deploy: ## デプロイメント用のコミット
	@echo "📝 Committing changes for deployment..."
	git add .
	git commit -m "feat: prepare for deployment $(shell date +%Y%m%d-%H%M%S)"
	@echo "✅ Changes committed!"

# デプロイメント用のプッシュ
push-for-deploy: ## デプロイメント用のプッシュ
	@echo "🚀 Pushing changes for deployment..."
	git push origin develop
	@echo "✅ Changes pushed!"

# 完全なデプロイメントフロー
deploy-flow: ## 完全なデプロイメントフローを実行
	@echo "🚀 Starting complete deployment flow..."
	@echo "1. Running pre-deployment checks..."
	make pre-deploy
	@echo "2. Creating release branch..."
	make create-release-branch
	@echo "3. Committing changes..."
	make commit-for-deploy
	@echo "4. Pushing to repository..."
	make push-for-deploy
	@echo "✅ Deployment flow completed!"
	@echo "🌐 Check GitHub Actions for deployment status"
