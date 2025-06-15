#!/bin/bash
# Feature-A統合リーダー連携デモ

SESSION="itsm-requirement"

echo "🎯 Feature-A統合リーダー連携デモ開始"
echo "========================================"

echo "1. 全ペインに開発開始指示..."
sleep 2
./send-to-all.sh "新機能「ユーザーダッシュボード」開発を開始してください"

echo ""
echo "2. 各Feature専門指示..."
sleep 2

echo "  Feature-B (UI/テスト) への指示..."
./send-to-feature-b.sh "ユーザーダッシュボードのReactコンポーネントを設計・実装してください"

sleep 1
echo "  Feature-C (API開発) への指示..."
./send-to-feature-c.sh "ダッシュボード用のデータ取得APIエンドポイントを実装してください"

sleep 1  
echo "  Feature-D (PowerShell) への指示..."
./send-to-feature-d.sh "Windows環境でのダッシュボードデータ収集スクリプトを作成してください"

sleep 1
echo "  Feature-E (非機能要件) への指示..."
./send-to-feature-e.sh "ダッシュボード機能のセキュリティ・パフォーマンステストを実施してください"

echo ""
echo "✅ Feature-A統合リーダー連携デモ完了"
echo "各ペインで作業が開始されました！"
