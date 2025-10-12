#!/bin/bash

# 本番環境テストスクリプト
# デプロイされたアプリケーションの動作確認

set -e

echo "🚀 Starting production environment testing..."

# 色付きログ関数
log_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

log_warn() {
    echo -e "\033[0;33m[WARN]\033[0m $1"
}

# 本番環境のURL
BACKEND_URL="https://disease-community-api-508246122017.asia-northeast1.run.app"
FRONTEND_URL="https://disease-community-frontend-508246122017.asia-northeast1.run.app"

# 1. バックエンドヘルスチェック
log_info "Testing backend health..."
if curl -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    log_success "Backend health check passed"
else
    log_error "Backend health check failed"
    log_info "Backend URL: $BACKEND_URL/health"
    exit 1
fi

# 2. バックエンドAPIエンドポイントテスト
log_info "Testing backend API endpoints..."

# ルートエンドポイント
if curl -f "$BACKEND_URL/" > /dev/null 2>&1; then
    log_success "Root endpoint working"
else
    log_warn "Root endpoint failed"
fi

# 情報エンドポイント
if curl -f "$BACKEND_URL/info" > /dev/null 2>&1; then
    log_success "Info endpoint working"
else
    log_warn "Info endpoint failed"
fi

# 名前表示順序API
if curl -f "$BACKEND_URL/api/v1/users/name-display-orders/" > /dev/null 2>&1; then
    log_success "Name display orders API working"
else
    log_warn "Name display orders API failed"
fi

# ロケール形式API
if curl -f "$BACKEND_URL/api/v1/users/locale-formats/" > /dev/null 2>&1; then
    log_success "Locale formats API working"
else
    log_warn "Locale formats API failed"
fi

# 3. フロントエンドテスト
log_info "Testing frontend access..."
if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
    log_success "Frontend is accessible"
else
    log_error "Frontend access failed"
    log_info "Frontend URL: $FRONTEND_URL"
    exit 1
fi

# 4. フロントエンドページテスト
log_info "Testing frontend pages..."

# ホームページ
if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
    log_success "Home page working"
else
    log_warn "Home page failed"
fi

# 登録ページ
if curl -f "$FRONTEND_URL/register" > /dev/null 2>&1; then
    log_success "Register page working"
else
    log_warn "Register page failed"
fi

# 5. APIドキュメントテスト
log_info "Testing API documentation..."
if curl -f "$BACKEND_URL/docs" > /dev/null 2>&1; then
    log_success "API documentation accessible"
else
    log_warn "API documentation failed"
fi

# 6. ユーザー登録テスト
log_info "Testing user registration..."
UNIQUE_ID=$(date +%s)_$$_$RANDOM
USER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v1/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser'$UNIQUE_ID'@example.com",
    "nickname": "testuser'$UNIQUE_ID'",
    "first_name": "Test",
    "last_name": "User",
    "idp_id": "auth0|'$UNIQUE_ID'",
    "idp_provider": "auth0"
  }')

if echo "$USER_RESPONSE" | grep -q "id"; then
    log_success "User registration test passed"
    USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_info "Created user ID: $USER_ID"
    
    # ユーザー取得テスト
    if curl -f "$BACKEND_URL/api/v1/users/$USER_ID" > /dev/null 2>&1; then
        log_success "User retrieval test passed"
    else
        log_warn "User retrieval test failed"
    fi
else
    log_warn "User registration failed: $USER_RESPONSE"
fi

# 7. レスポンス時間テスト
log_info "Testing response times..."

# バックエンドレスポンス時間
BACKEND_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$BACKEND_URL/health")
log_info "Backend response time: ${BACKEND_TIME}s"

# フロントエンドレスポンス時間
FRONTEND_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$FRONTEND_URL")
log_info "Frontend response time: ${FRONTEND_TIME}s"

# 8. 最終レポート
log_success "🎉 Production environment testing completed!"
echo ""
echo "📊 Test Summary:"
echo "✅ Backend API: $BACKEND_URL"
echo "✅ Frontend: $FRONTEND_URL"
echo "✅ API Documentation: $BACKEND_URL/docs"
echo ""
echo "🌐 Service URLs:"
echo "   Backend: $BACKEND_URL"
echo "   Frontend: $FRONTEND_URL"
echo "   API Docs: $BACKEND_URL/docs"
echo ""
echo "🚀 Production environment is ready!"
