#!/bin/bash

echo "🎨 フロントエンド簡易起動中..."

# 依存関係を確実にインストール
npm install react@19.1.0 react-dom@19.1.0 --force

# Viteキャッシュクリア
rm -rf node_modules/.vite* .vite*

# Vite起動
npx --yes vite@latest --port 3001 --host --force