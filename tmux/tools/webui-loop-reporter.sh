#!/bin/bash

# WebUIループ進捗・結果レポートシステム
# 開発・修復ループの詳細分析と包括的レポート生成

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly WEBUI_SRC="$PROJECT_ROOT/src"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly COMPREHENSIVE_REPORT="$LOG_DIR/comprehensive_loop_report.json"
readonly HTML_REPORT="$LOG_DIR/webui_report.html"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${BLUE}[REPORTER]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[REPORT-SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[REPORT-ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[REPORT-WARNING]${NC} $1"
}

print_section() {
    echo -e "${BOLD}${CYAN}[REPORT-SECTION]${NC} $1"
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# =========================
# レポートデータ収集
# =========================

collect_loop_status_data() {
    local status_file="$LOG_DIR/current_loop_status.json"
    
    if [ -f "$status_file" ]; then
        cat "$status_file"
    else
        echo '{
            "current_loop": 0,
            "max_loops": 20,
            "current_phase": "未開始",
            "quality_score": 0,
            "error_count": 0,
            "total_errors": 0,
            "total_fixes": 0,
            "start_time": "未開始",
            "elapsed_time": "00:00:00",
            "focus_area": "",
            "last_updated": "未開始"
        }'
    fi
}

collect_development_loop_data() {
    local dev_report="$LOG_DIR/development_loop_report.json"
    
    if [ -f "$dev_report" ]; then
        cat "$dev_report"
    else
        echo '{
            "execution_summary": {
                "start_time": "未実行",
                "end_time": "未実行",
                "total_elapsed": "00:00:00",
                "exit_reason": "未実行",
                "loops_completed": 0,
                "max_loops": 20,
                "final_quality_score": 0
            },
            "statistics": {
                "total_errors_found": 0,
                "total_fixes_applied": 0,
                "success_rate": 0,
                "focus_area": ""
            },
            "phase_results": []
        }'
    fi
}

collect_review_data() {
    local review_report="$LOG_DIR/auto_review_report.json"
    
    if [ -f "$review_report" ]; then
        cat "$review_report"
    else
        echo '{
            "review_summary": {
                "timestamp": "未実行",
                "total_score": 0,
                "total_issues": 0,
                "files_analyzed": 0,
                "grade": "F"
            },
            "detailed_scores": {
                "code_quality": {"score": 0, "weight": 25, "issues": 0},
                "security": {"score": 0, "weight": 20, "vulnerabilities": 0},
                "performance": {"score": 0, "weight": 20, "issues": 0},
                "accessibility": {"score": 0, "weight": 20, "issues": 0},
                "testing": {"score": 0, "weight": 15, "issues": 0}
            }
        }'
    fi
}

collect_error_extraction_data() {
    local error_report="$LOG_DIR/error_extraction_report.json"
    
    if [ -f "$error_report" ]; then
        cat "$error_report"
    else
        echo '{
            "extraction_summary": {
                "timestamp": "未実行",
                "total_errors": 0,
                "by_category": {
                    "syntax_errors": 0,
                    "type_errors": 0,
                    "test_errors": 0,
                    "dependency_errors": 0,
                    "eslint_errors": 0
                },
                "by_priority": {
                    "critical": 0,
                    "high": 0,
                    "medium": 0,
                    "low": 0
                }
            }
        }'
    fi
}

collect_fix_data() {
    local fix_report="$LOG_DIR/auto_fix_report.json"
    
    if [ -f "$fix_report" ]; then
        cat "$fix_report"
    else
        echo '{
            "fix_summary": {
                "timestamp": "未実行",
                "total_fixes": 0,
                "total_improvements": 0,
                "overall_success": false
            },
            "fix_categories": {
                "eslint_fixes": 0,
                "formatting_fixes": 0,
                "type_fixes": 0,
                "dependency_fixes": 0,
                "test_fixes": 0,
                "performance_fixes": 0
            }
        }'
    fi
}

collect_quality_history_data() {
    local quality_history="$LOG_DIR/quality_history.json"
    
    if [ -f "$quality_history" ]; then
        cat "$quality_history"
    else
        echo '{"history": []}'
    fi
}

# =========================
# 統計分析
# =========================

calculate_trends() {
    local quality_data="$1"
    
    # 品質トレンド分析
    local trend_analysis=$(echo "$quality_data" | jq '
        if (.history | length) > 1 then
            {
                "total_records": (.history | length),
                "latest_score": (.history[-1].quality_score // 0),
                "previous_score": (.history[-2].quality_score // 0),
                "score_change": ((.history[-1].quality_score // 0) - (.history[-2].quality_score // 0)),
                "average_score": ((.history | map(.quality_score) | add) / (.history | length) | floor),
                "max_score": (.history | map(.quality_score) | max),
                "min_score": (.history | map(.quality_score) | min),
                "error_trend": ((.history[-1].total_errors // 0) - (.history[-2].total_errors // 0))
            }
        else
            {
                "total_records": (.history | length),
                "latest_score": (.history[-1].quality_score // 0),
                "previous_score": 0,
                "score_change": 0,
                "average_score": (.history[-1].quality_score // 0),
                "max_score": (.history[-1].quality_score // 0),
                "min_score": (.history[-1].quality_score // 0),
                "error_trend": 0
            }
        end
    ')
    
    echo "$trend_analysis"
}

calculate_performance_metrics() {
    # 現在のパフォーマンス指標を計算
    local bundle_size=$(du -s "$WEBUI_SRC" 2>/dev/null | cut -f1 || echo "0")
    bundle_size=$((bundle_size / 1024))  # MB変換
    
    local file_count=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | wc -l)
    local component_count=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "export.*function\|export.*const.*=.*=>" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    local test_count=$(find "$WEBUI_SRC" -name "*.test.*" -o -name "*.spec.*" | wc -l)
    
    local test_coverage=0
    if [ "$file_count" -gt 0 ]; then
        test_coverage=$((test_count * 100 / file_count))
    fi
    
    echo "{
        \"bundle_size_mb\": $bundle_size,
        \"total_files\": $file_count,
        \"component_count\": $component_count,
        \"test_files\": $test_count,
        \"test_coverage_percent\": $test_coverage
    }"
}

# =========================
# 包括的レポート生成
# =========================

generate_comprehensive_report() {
    print_section "包括的レポート生成中..."
    
    # 各種データ収集
    local loop_status=$(collect_loop_status_data)
    local dev_loop_data=$(collect_development_loop_data)
    local review_data=$(collect_review_data)
    local error_data=$(collect_error_extraction_data)
    local fix_data=$(collect_fix_data)
    local quality_history=$(collect_quality_history_data)
    local performance_metrics=$(calculate_performance_metrics)
    local trends=$(calculate_trends "$quality_history")
    
    mkdir -p "$LOG_DIR"
    
    # 統合レポート生成
    cat > "$COMPREHENSIVE_REPORT" << EOF
{
    "report_metadata": {
        "generated_at": "$(get_timestamp)",
        "report_version": "1.0",
        "webui_source_path": "$WEBUI_SRC",
        "total_analysis_files": $(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | wc -l)
    },
    "executive_summary": {
        "current_quality_score": $(echo "$loop_status" | jq '.quality_score'),
        "total_loops_completed": $(echo "$dev_loop_data" | jq '.execution_summary.loops_completed'),
        "total_errors_found": $(echo "$error_data" | jq '.extraction_summary.total_errors'),
        "total_fixes_applied": $(echo "$fix_data" | jq '.fix_summary.total_fixes'),
        "overall_grade": $(echo "$review_data" | jq -r '.review_summary.grade'),
        "project_status": "$(if [ $(echo "$loop_status" | jq '.quality_score') -ge 80 ]; then echo "健全"; elif [ $(echo "$loop_status" | jq '.quality_score') -ge 60 ]; then echo "改善中"; else echo "要対応"; fi)"
    },
    "current_loop_status": $loop_status,
    "development_loops": $dev_loop_data,
    "code_review_results": $review_data,
    "error_analysis": $error_data,
    "fix_operations": $fix_data,
    "performance_metrics": $performance_metrics,
    "quality_trends": $trends,
    "quality_history": $quality_history,
    "recommendations": [
        $(if [ $(echo "$loop_status" | jq '.quality_score') -lt 70 ]; then echo "\"品質スコアの向上が急務です\""; fi)
        $(if [ $(echo "$error_data" | jq '.extraction_summary.by_priority.critical') -gt 0 ]; then echo ",\"重要エラーの即座な修復が必要です\""; fi)
        $(if [ $(echo "$performance_metrics" | jq '.test_coverage_percent') -lt 50 ]; then echo ",\"テストカバレッジの向上が必要です\""; fi)
        $(if [ $(echo "$performance_metrics" | jq '.bundle_size_mb') -gt 10 ]; then echo ",\"バンドルサイズの最適化を検討してください\""; fi)
        $(if [ $(echo "$trends" | jq '.score_change') -lt 0 ]; then echo ",\"品質スコアが低下傾向にあります\""; fi)
    ],
    "action_items": {
        "immediate": [
            $(if [ $(echo "$error_data" | jq '.extraction_summary.by_priority.critical') -gt 0 ]; then echo "\"重要エラーの修復\""; fi)
            $(if [ $(echo "$loop_status" | jq '.quality_score') -lt 60 ]; then echo ",\"品質改善の実行\""; fi)
        ],
        "short_term": [
            $(if [ $(echo "$performance_metrics" | jq '.test_coverage_percent') -lt 70 ]; then echo "\"テストカバレッジ向上\""; fi)
            $(if [ $(echo "$review_data" | jq '.detailed_scores.security.score') -lt 80 ]; then echo ",\"セキュリティ強化\""; fi)
        ],
        "long_term": [
            "\"継続的品質監視の実装\"",
            "\"自動化プロセスの改善\"",
            "\"パフォーマンス最適化\""
        ]
    }
}
EOF

    print_success "包括的レポートを生成しました: $COMPREHENSIVE_REPORT"
}

# =========================
# HTMLレポート生成
# =========================

generate_html_report() {
    print_section "HTMLレポート生成中..."
    
    if [ ! -f "$COMPREHENSIVE_REPORT" ]; then
        print_error "包括的レポートが見つかりません。先に生成してください"
        return 1
    fi
    
    local report_data=$(cat "$COMPREHENSIVE_REPORT")
    
    cat > "$HTML_REPORT" << 'EOF'
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebUI開発・修復ループ レポート</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: #f8f9fa;
            border-left: 4px solid #3498db;
            padding: 20px;
            border-radius: 4px;
        }
        .metric-card h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }
        .status-excellent { color: #27ae60; }
        .status-good { color: #3498db; }
        .status-warning { color: #f39c12; }
        .status-danger { color: #e74c3c; }
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #ecf0f1;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            transition: width 0.3s ease;
        }
        .error-breakdown {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .error-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 15px;
            text-align: center;
        }
        .recommendations {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 20px;
        }
        .recommendations h3 {
            color: #856404;
            margin-top: 0;
        }
        .recommendations ul {
            margin: 0;
            padding-left: 20px;
        }
        .trend-indicator {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .trend-up { background: #d4edda; color: #155724; }
        .trend-down { background: #f8d7da; color: #721c24; }
        .trend-stable { background: #d1ecf1; color: #0c5460; }
        .footer {
            background: #2c3e50;
            color: white;
            text-align: center;
            padding: 20px;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 WebUI開発・修復ループ レポート</h1>
            <p>自動開発・品質監視・修復システム 包括分析結果</p>
            <p id="generated-time"></p>
        </div>
        
        <div class="content">
            <!-- エグゼクティブサマリー -->
            <div class="section">
                <h2>📊 エグゼクティブサマリー</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>品質スコア</h3>
                        <div class="metric-value" id="quality-score">0</div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="quality-progress"></div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <h3>完了ループ数</h3>
                        <div class="metric-value" id="completed-loops">0</div>
                        <div>/ <span id="max-loops">20</span> ループ</div>
                    </div>
                    <div class="metric-card">
                        <h3>検出エラー数</h3>
                        <div class="metric-value" id="total-errors">0</div>
                        <div>総エラー</div>
                    </div>
                    <div class="metric-card">
                        <h3>適用修復数</h3>
                        <div class="metric-value" id="total-fixes">0</div>
                        <div>自動修復</div>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <div style="font-size: 1.5em; margin-bottom: 10px;">
                        プロジェクト総合グレード: <span id="overall-grade" class="metric-value">F</span>
                    </div>
                    <div style="font-size: 1.2em;">
                        ステータス: <span id="project-status">要対応</span>
                    </div>
                </div>
            </div>
            
            <!-- エラー分析 -->
            <div class="section">
                <h2>🔍 エラー分析</h2>
                <div class="error-breakdown" id="error-breakdown">
                    <!-- JavaScriptで動的生成 -->
                </div>
            </div>
            
            <!-- パフォーマンス指標 -->
            <div class="section">
                <h2>⚡ パフォーマンス指標</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>バンドルサイズ</h3>
                        <div class="metric-value" id="bundle-size">0</div>
                        <div>MB</div>
                    </div>
                    <div class="metric-card">
                        <h3>総ファイル数</h3>
                        <div class="metric-value" id="file-count">0</div>
                        <div>ファイル</div>
                    </div>
                    <div class="metric-card">
                        <h3>コンポーネント数</h3>
                        <div class="metric-value" id="component-count">0</div>
                        <div>コンポーネント</div>
                    </div>
                    <div class="metric-card">
                        <h3>テストカバレッジ</h3>
                        <div class="metric-value" id="test-coverage">0</div>
                        <div>%</div>
                    </div>
                </div>
            </div>
            
            <!-- 品質トレンド -->
            <div class="section">
                <h2>📈 品質トレンド</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>最新スコア</h3>
                        <div class="metric-value" id="latest-score">0</div>
                        <div>前回から <span id="score-change" class="trend-indicator">0</span></div>
                    </div>
                    <div class="metric-card">
                        <h3>平均スコア</h3>
                        <div class="metric-value" id="average-score">0</div>
                        <div>全期間平均</div>
                    </div>
                    <div class="metric-card">
                        <h3>最高スコア</h3>
                        <div class="metric-value" id="max-score">0</div>
                        <div>過去最高</div>
                    </div>
                    <div class="metric-card">
                        <h3>監視記録数</h3>
                        <div class="metric-value" id="total-records">0</div>
                        <div>記録</div>
                    </div>
                </div>
            </div>
            
            <!-- 推奨事項 -->
            <div class="section">
                <h2>💡 推奨事項</h2>
                <div class="recommendations">
                    <h3>即座に対応が必要な項目</h3>
                    <ul id="immediate-actions">
                        <!-- JavaScriptで動的生成 -->
                    </ul>
                    
                    <h3>短期的な改善項目</h3>
                    <ul id="short-term-actions">
                        <!-- JavaScriptで動的生成 -->
                    </ul>
                    
                    <h3>長期的な改善項目</h3>
                    <ul id="long-term-actions">
                        <!-- JavaScriptで動的生成 -->
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>🤖 WebUI自動開発・修復システム by Claude Code</p>
            <p>Generated by ITSM準拠IT運用システムプラットフォーム</p>
        </div>
    </div>

    <script>
        // レポートデータ（PHPスタイルで後で置換）
        const reportData = __REPORT_DATA__;
        
        // データ表示関数
        function displayData() {
            // 生成時刻
            document.getElementById('generated-time').textContent = 
                'Generated: ' + reportData.report_metadata.generated_at;
            
            // エグゼクティブサマリー
            const summary = reportData.executive_summary;
            document.getElementById('quality-score').textContent = summary.current_quality_score;
            document.getElementById('completed-loops').textContent = summary.total_loops_completed;
            document.getElementById('max-loops').textContent = reportData.development_loops.execution_summary.max_loops;
            document.getElementById('total-errors').textContent = summary.total_errors_found;
            document.getElementById('total-fixes').textContent = summary.total_fixes_applied;
            document.getElementById('overall-grade').textContent = summary.overall_grade;
            document.getElementById('project-status').textContent = summary.project_status;
            
            // 品質スコアプログレスバー
            const qualityProgress = document.getElementById('quality-progress');
            qualityProgress.style.width = summary.current_quality_score + '%';
            
            // 品質スコア色分け
            const qualityScoreElement = document.getElementById('quality-score');
            if (summary.current_quality_score >= 90) {
                qualityScoreElement.className = 'metric-value status-excellent';
            } else if (summary.current_quality_score >= 80) {
                qualityScoreElement.className = 'metric-value status-good';
            } else if (summary.current_quality_score >= 60) {
                qualityScoreElement.className = 'metric-value status-warning';
            } else {
                qualityScoreElement.className = 'metric-value status-danger';
            }
            
            // エラー分析
            const errorBreakdown = document.getElementById('error-breakdown');
            const errorCategories = reportData.error_analysis.extraction_summary.by_category;
            
            Object.entries(errorCategories).forEach(([category, count]) => {
                const errorItem = document.createElement('div');
                errorItem.className = 'error-item';
                errorItem.innerHTML = `
                    <h4>${category}</h4>
                    <div class="metric-value ${count > 0 ? 'status-danger' : 'status-excellent'}">${count}</div>
                `;
                errorBreakdown.appendChild(errorItem);
            });
            
            // パフォーマンス指標
            const performance = reportData.performance_metrics;
            document.getElementById('bundle-size').textContent = performance.bundle_size_mb;
            document.getElementById('file-count').textContent = performance.total_files;
            document.getElementById('component-count').textContent = performance.component_count;
            document.getElementById('test-coverage').textContent = performance.test_coverage_percent;
            
            // 品質トレンド
            const trends = reportData.quality_trends;
            document.getElementById('latest-score').textContent = trends.latest_score;
            document.getElementById('average-score').textContent = trends.average_score;
            document.getElementById('max-score').textContent = trends.max_score;
            document.getElementById('total-records').textContent = trends.total_records;
            
            // スコア変化表示
            const scoreChangeElement = document.getElementById('score-change');
            const change = trends.score_change;
            if (change > 0) {
                scoreChangeElement.textContent = '+' + change;
                scoreChangeElement.className = 'trend-indicator trend-up';
            } else if (change < 0) {
                scoreChangeElement.textContent = change;
                scoreChangeElement.className = 'trend-indicator trend-down';
            } else {
                scoreChangeElement.textContent = '±0';
                scoreChangeElement.className = 'trend-indicator trend-stable';
            }
            
            // 推奨事項
            const actionItems = reportData.action_items;
            
            // 即座の対応
            const immediateList = document.getElementById('immediate-actions');
            actionItems.immediate.forEach(action => {
                const li = document.createElement('li');
                li.textContent = action;
                immediateList.appendChild(li);
            });
            
            // 短期的な改善
            const shortTermList = document.getElementById('short-term-actions');
            actionItems.short_term.forEach(action => {
                const li = document.createElement('li');
                li.textContent = action;
                shortTermList.appendChild(li);
            });
            
            // 長期的な改善
            const longTermList = document.getElementById('long-term-actions');
            actionItems.long_term.forEach(action => {
                const li = document.createElement('li');
                li.textContent = action;
                longTermList.appendChild(li);
            });
        }
        
        // ページ読み込み時にデータ表示
        document.addEventListener('DOMContentLoaded', displayData);
    </script>
</body>
</html>
EOF

    # レポートデータをHTMLに埋め込み
    local escaped_data=$(echo "$report_data" | sed 's/"/\\"/g' | tr -d '\n')
    sed -i "s|__REPORT_DATA__|$report_data|g" "$HTML_REPORT"
    
    print_success "HTMLレポートを生成しました: $HTML_REPORT"
}

# =========================
# 進捗表示
# =========================

show_loop_progress() {
    print_section "現在のループ進捗表示"
    
    local status_data=$(collect_loop_status_data)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BOLD}WebUI自動開発・修復ループ 進捗状況${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local current_loop=$(echo "$status_data" | jq -r '.current_loop')
    local max_loops=$(echo "$status_data" | jq -r '.max_loops')
    local current_phase=$(echo "$status_data" | jq -r '.current_phase')
    local quality_score=$(echo "$status_data" | jq -r '.quality_score')
    local error_count=$(echo "$status_data" | jq -r '.error_count')
    local start_time=$(echo "$status_data" | jq -r '.start_time')
    local elapsed_time=$(echo "$status_data" | jq -r '.elapsed_time')
    
    echo "ループ進行: $current_loop / $max_loops ループ"
    echo "現在フェーズ: $current_phase"
    echo "品質スコア: $quality_score / 100"
    echo "エラー数: $error_count"
    echo "開始時刻: $start_time"
    echo "経過時間: $elapsed_time"
    
    # 進捗バー表示
    local progress_percent=$((current_loop * 100 / max_loops))
    local progress_bar=""
    for ((i=1; i<=50; i++)); do
        if [ $((i * 2)) -le $progress_percent ]; then
            progress_bar="${progress_bar}█"
        else
            progress_bar="${progress_bar}░"
        fi
    done
    
    echo ""
    echo "進捗: [$progress_bar] $progress_percent%"
    
    # 品質スコアバー表示
    local quality_bar=""
    for ((i=1; i<=50; i++)); do
        if [ $((i * 2)) -le $quality_score ]; then
            quality_bar="${quality_bar}█"
        else
            quality_bar="${quality_bar}░"
        fi
    done
    
    echo "品質: [$quality_bar] $quality_score%"
}

# =========================
# 使用方法表示
# =========================

show_usage() {
    echo "WebUIループ進捗・結果レポートシステム"
    echo ""
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --progress              現在のループ進捗表示"
    echo "  --comprehensive         包括的レポート生成"
    echo "  --html                  HTMLレポート生成"
    echo "  --all                   全レポート生成"
    echo "  --help                  このヘルプを表示"
}

# =========================
# メイン実行
# =========================

main() {
    local mode="progress"
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --progress)
                mode="progress"
                shift
                ;;
            --comprehensive)
                mode="comprehensive"
                shift
                ;;
            --html)
                mode="html"
                shift
                ;;
            --all)
                mode="all"
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_warning "不明なオプション: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # 環境チェック
    if [ ! -d "$WEBUI_SRC" ]; then
        print_error "WebUIソースディレクトリが見つかりません: $WEBUI_SRC"
        exit 1
    fi
    
    # ログディレクトリ作成
    mkdir -p "$LOG_DIR"
    
    # モード別実行
    case "$mode" in
        progress)
            show_loop_progress
            ;;
        comprehensive)
            generate_comprehensive_report
            ;;
        html)
            generate_html_report
            ;;
        all)
            print_info "全レポートを生成します"
            generate_comprehensive_report
            generate_html_report
            show_loop_progress
            print_success "全レポートの生成が完了しました"
            ;;
        *)
            print_error "不明なモード: $mode"
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"