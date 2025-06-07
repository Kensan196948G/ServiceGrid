#!/bin/bash

echo "🔧 Dependencies完全リセット..."

# 全プロセス終了
pkill -f npm 2>/dev/null || true
pkill -f node 2>/dev/null || true
pkill -f vite 2>/dev/null || true

# 完全削除
rm -rf node_modules package-lock.json .npm .vite* dist

# 基本package.jsonのみでインストール
npm install --no-package-lock --force

echo "✅ Dependencies完全リセット完了!"