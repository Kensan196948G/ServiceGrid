#!/bin/bash

echo "🔧 React依存関係完全修正中..."

# プロセス終了
pkill -f vite 2>/dev/null || true
pkill -f npm 2>/dev/null || true

# 古いファイル削除
rm -rf node_modules package-lock.json .vite* dist 2>/dev/null || true

# npm キャッシュクリア
npm cache clean --force 2>/dev/null || true

# React 18.3.1専用インストール
echo "📦 React 18.3.1インストール中..."
npm install react@18.3.1 react-dom@18.3.1 --save --no-package-lock

# 型定義インストール
npm install @types/react@18.3.12 @types/react-dom@18.3.1 --save-dev --no-package-lock

# その他依存関係
npm install --no-package-lock

echo "✅ React 18修正完了!"
echo "🚀 フロントエンド起動: npm run dev"