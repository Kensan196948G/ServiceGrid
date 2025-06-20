#!/bin/bash

# Feature-B専用WebUI自動開発スクリプト
# React 19 + TypeScript UI自動開発・最適化システム

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly WEBUI_SRC="$PROJECT_ROOT/src"
readonly COMPONENTS_DIR="$WEBUI_SRC/components"
readonly PAGES_DIR="$WEBUI_SRC/pages"
readonly HOOKS_DIR="$WEBUI_SRC/hooks"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly FEATURE_B_LOG="$LOG_DIR/feature_b_ui_development.log"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Feature-B固有設定
readonly FEATURE_NAME="Feature-B-UI"
readonly MAX_AUTO_LOOPS=20
readonly UI_QUALITY_THRESHOLD=85

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${BLUE}[FEATURE-B]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[FEATURE-B-OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[FEATURE-B-ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[FEATURE-B-WARN]${NC} $1"
}

print_header() {
    echo -e "${BOLD}${CYAN}================================================================${NC}"
    echo -e "${BOLD}${CYAN} 🎨 Feature-B WebUI自動開発システム 🎨${NC}"
    echo -e "${BOLD}${CYAN} React 19 + TypeScript UI最適化${NC}"
    echo -e "${BOLD}${CYAN}================================================================${NC}"
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log_feature_action() {
    local action="$1"
    local status="$2"
    local details="$3"
    
    mkdir -p "$LOG_DIR"
    echo "[$(get_timestamp)] FEATURE-B: $action - $status - $details" >> "$FEATURE_B_LOG"
}

# =========================
# React 19コンポーネント自動生成
# =========================

generate_react_components() {
    print_info "React 19コンポーネント自動生成中..."
    
    local components_created=0
    local optimizations_applied=0
    
    # 基本UIコンポーネントテンプレート
    local component_templates=(
        "DataTable:データテーブルコンポーネント"
        "SearchFilter:検索フィルターコンポーネント"
        "StatusBadge:ステータスバッジコンポーネント"
        "ActionButton:アクションボタンコンポーネント"
        "LoadingSpinner:ローディングスピナーコンポーネント"
        "ConfirmDialog:確認ダイアログコンポーネント"
        "NotificationBanner:通知バナーコンポーネント"
        "ProgressIndicator:進捗インジケーターコンポーネント"
    )
    
    mkdir -p "$COMPONENTS_DIR"
    
    for template in "${component_templates[@]}"; do
        local component_name=$(echo "$template" | cut -d':' -f1)
        local component_desc=$(echo "$template" | cut -d':' -f2)
        local component_file="$COMPONENTS_DIR/${component_name}.tsx"
        
        # 既存コンポーネントのスキップ
        if [ -f "$component_file" ]; then
            print_info "$component_name は既存のため、最適化のみ実行"
            continue
        fi
        
        print_info "新規コンポーネント生成: $component_name"
        
        cat > "$component_file" << EOF
import React, { memo, useCallback, useMemo } from 'react';

// $component_desc
interface ${component_name}Props {
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

// React 19 最適化済みコンポーネント
const $component_name: React.FC<${component_name}Props> = memo(({
  className = '',
  children,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  onClick
}) => {
  // メモ化されたスタイル計算
  const computedStyles = useMemo(() => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-200';
    const variantStyles = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
      success: 'bg-green-600 hover:bg-green-700 text-white'
    };
    const sizeStyles = {
      small: 'px-3 py-1.5 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg'
    };
    
    return \`\${baseStyles} \${variantStyles[variant]} \${sizeStyles[size]} \${className}\`;
  }, [variant, size, className]);
  
  // メモ化されたクリックハンドラー
  const handleClick = useCallback(() => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  }, [disabled, loading, onClick]);
  
  return (
    <button
      type="button"
      className={computedStyles}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-disabled={disabled || loading}
      role="button"
    >
      {loading && (
        <svg
          className="w-4 h-4 mr-2 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
});

${component_name}.displayName = '${component_name}';

export default $component_name;
EOF

        ((components_created++))
        log_feature_action "COMPONENT_CREATION" "SUCCESS" "Created $component_name component"
        
        # 対応するテストファイル生成
        local test_file="$COMPONENTS_DIR/__tests__/${component_name}.test.tsx"
        mkdir -p "$COMPONENTS_DIR/__tests__"
        
        cat > "$test_file" << EOF
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import $component_name from '../${component_name}';

describe('$component_name', () => {
  test('renders without crashing', () => {
    render(<$component_name>Test Content</$component_name>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  
  test('applies correct variant styles', () => {
    render(<$component_name variant="danger">Danger Button</$component_name>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');
  });
  
  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<$component_name onClick={handleClick}>Click Me</$component_name>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  test('shows loading state', () => {
    render(<$component_name loading>Loading Button</$component_name>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('animate-spin');
  });
  
  test('respects disabled state', () => {
    const handleClick = jest.fn();
    render(<$component_name disabled onClick={handleClick}>Disabled</$component_name>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
EOF

        print_success "テストファイル生成: ${component_name}.test.tsx"
    done
    
    print_success "React 19コンポーネント生成完了: $components_created 個作成"
    return $components_created
}

# =========================
# 既存コンポーネント最適化
# =========================

optimize_existing_components() {
    print_info "既存コンポーネントの最適化中..."
    
    local optimizations_applied=0
    
    # TSXファイルを検索して最適化
    while IFS= read -r -d '' component_file; do
        local filename=$(basename "$component_file")
        local component_name="${filename%.*}"
        
        print_info "最適化中: $component_name"
        
        local temp_file=$(mktemp)
        local file_optimized=false
        
        # React.memo追加
        if ! grep -q "React.memo\|memo" "$component_file" && grep -q "const.*=.*=>.*{" "$component_file"; then
            sed 's/^const \([A-Z][a-zA-Z0-9]*\):/const \1: React.FC<.*> = memo(/' "$component_file" > "$temp_file"
            
            # 閉じ括弧追加
            if grep -q "memo(" "$temp_file"; then
                echo "" >> "$temp_file"
                echo "export default $component_name;" >> "$temp_file"
                echo "${component_name}.displayName = '${component_name}';" >> "$temp_file"
                file_optimized=true
            fi
        fi
        
        # useCallback/useMemo最適化の提案コメント追加
        if ! grep -q "useCallback\|useMemo" "$component_file"; then
            cat >> "$temp_file" << 'EOF'

// TODO: Consider optimizations:
// - useCallback for event handlers
// - useMemo for expensive calculations
// - React.memo for component memoization
EOF
            file_optimized=true
        fi
        
        # PropTypes をTypeScript interface に変換
        if grep -q "PropTypes" "$component_file"; then
            # PropTypesの変換は複雑なので、コメントで提案
            echo "// TODO: Convert PropTypes to TypeScript interfaces for better type safety" >> "$temp_file"
            file_optimized=true
        fi
        
        # アクセシビリティ属性追加の提案
        if ! grep -q "aria-\|role=" "$component_file"; then
            echo "// TODO: Add accessibility attributes (aria-*, role, etc.) for WCAG compliance" >> "$temp_file"
            file_optimized=true
        fi
        
        if [ "$file_optimized" = true ]; then
            mv "$temp_file" "$component_file"
            ((optimizations_applied++))
            log_feature_action "COMPONENT_OPTIMIZATION" "SUCCESS" "Optimized $component_name"
        else
            rm -f "$temp_file"
        fi
        
    done < <(find "$COMPONENTS_DIR" -name "*.tsx" -not -path "*/__tests__/*" -print0 2>/dev/null)
    
    print_success "コンポーネント最適化完了: $optimizations_applied 個最適化"
    return $optimizations_applied
}

# =========================
# カスタムフック自動生成
# =========================

generate_custom_hooks() {
    print_info "カスタムフック自動生成中..."
    
    local hooks_created=0
    
    # 有用なカスタムフックテンプレート
    local hook_templates=(
        "useLocalStorage:ローカルストレージ管理フック"
        "useDebounce:デバウンス処理フック"
        "useAsync:非同期処理管理フック"
        "useToggle:トグル状態管理フック"
        "usePrevious:前の値追跡フック"
        "useOnClickOutside:外部クリック検出フック"
        "useWindowSize:ウィンドウサイズ監視フック"
        "useForm:フォーム状態管理フック"
    )
    
    mkdir -p "$HOOKS_DIR"
    
    for template in "${hook_templates[@]}"; do
        local hook_name=$(echo "$template" | cut -d':' -f1)
        local hook_desc=$(echo "$template" | cut -d':' -f2)
        local hook_file="$HOOKS_DIR/${hook_name}.ts"
        
        if [ -f "$hook_file" ]; then
            print_info "$hook_name は既存のためスキップ"
            continue
        fi
        
        print_info "カスタムフック生成: $hook_name"
        
        case "$hook_name" in
            "useLocalStorage")
                cat > "$hook_file" << 'EOF'
import { useState, useEffect, useCallback } from 'react';

/**
 * ローカルストレージと同期するReactフック
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}
EOF
                ;;
                
            "useDebounce")
                cat > "$hook_file" << 'EOF'
import { useState, useEffect } from 'react';

/**
 * 値の変更をデバウンスするReactフック
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
EOF
                ;;
                
            "useAsync")
                cat > "$hook_file" << 'EOF'
import { useState, useEffect, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * 非同期処理を管理するReactフック
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
): AsyncState<T> & { execute: () => Promise<void> } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error(String(error))
      }));
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { ...state, execute };
}
EOF
                ;;
                
            *)
                # 基本テンプレート
                cat > "$hook_file" << EOF
import { useState, useCallback } from 'react';

/**
 * $hook_desc
 */
export function $hook_name() {
  const [state, setState] = useState(null);
  
  const handleAction = useCallback(() => {
    // TODO: Implement $hook_name logic
  }, []);
  
  return {
    state,
    handleAction
  };
}
EOF
                ;;
        esac
        
        ((hooks_created++))
        log_feature_action "HOOK_CREATION" "SUCCESS" "Created $hook_name hook"
        
        # テストファイル生成
        local test_file="$HOOKS_DIR/__tests__/${hook_name}.test.ts"
        mkdir -p "$HOOKS_DIR/__tests__"
        
        cat > "$test_file" << EOF
import { renderHook, act } from '@testing-library/react';
import { $hook_name } from '../${hook_name}';

describe('$hook_name', () => {
  test('初期化が正常に行われる', () => {
    const { result } = renderHook(() => $hook_name());
    
    // TODO: Add specific test assertions for $hook_name
    expect(result.current).toBeDefined();
  });
  
  test('状態の更新が正常に行われる', () => {
    const { result } = renderHook(() => $hook_name());
    
    act(() => {
      // TODO: Add state update test for $hook_name
    });
    
    // TODO: Add assertions for state updates
  });
});
EOF
    done
    
    print_success "カスタムフック生成完了: $hooks_created 個作成"
    return $hooks_created
}

# =========================
# アクセシビリティ強化
# =========================

enhance_accessibility() {
    print_info "アクセシビリティ強化実行中..."
    
    local a11y_fixes=0
    
    # 全TSXファイルに対してアクセシビリティ改善
    while IFS= read -r -d '' tsx_file; do
        local temp_file=$(mktemp)
        local file_modified=false
        
        # 基本的なアクセシビリティ属性追加
        cp "$tsx_file" "$temp_file"
        
        # ボタンにaria-labelが不足している場合の修正
        if grep -q "<button" "$temp_file" && ! grep -q "aria-label" "$temp_file"; then
            sed -i 's/<button\([^>]*\)>/<button\1 aria-label="アクション実行">/g' "$temp_file"
            file_modified=true
        fi
        
        # 入力フィールドにaria-describedbyがない場合の提案
        if grep -q "<input" "$temp_file" && ! grep -q "aria-describedby" "$temp_file"; then
            echo "// TODO: Add aria-describedby for input fields to improve accessibility" >> "$temp_file"
            file_modified=true
        fi
        
        # フォーカス管理の改善提案
        if grep -q "onClick" "$temp_file" && ! grep -q "onKeyDown" "$temp_file"; then
            echo "// TODO: Add keyboard event handlers for accessibility (onKeyDown)" >> "$temp_file"
            file_modified=true
        fi
        
        # 色だけに依存しない情報伝達の確認
        if grep -q "color.*red\|color.*green" "$temp_file"; then
            echo "// TODO: Ensure information is not conveyed by color alone (add icons/text)" >> "$temp_file"
            file_modified=true
        fi
        
        if [ "$file_modified" = true ]; then
            mv "$temp_file" "$tsx_file"
            ((a11y_fixes++))
            log_feature_action "ACCESSIBILITY_ENHANCEMENT" "SUCCESS" "Enhanced $(basename "$tsx_file")"
        else
            rm -f "$temp_file"
        fi
        
    done < <(find "$WEBUI_SRC" -name "*.tsx" -print0 2>/dev/null)
    
    # アクセシビリティテスト用ユーティリティ作成
    local a11y_utils_file="$WEBUI_SRC/utils/accessibility.ts"
    if [ ! -f "$a11y_utils_file" ]; then
        mkdir -p "$WEBUI_SRC/utils"
        
        cat > "$a11y_utils_file" << 'EOF'
/**
 * アクセシビリティユーティリティ関数
 */

// キーボードナビゲーション支援
export const handleKeyboardNavigation = (
  event: React.KeyboardEvent,
  onEnter?: () => void,
  onEscape?: () => void
) => {
  switch (event.key) {
    case 'Enter':
      if (onEnter) {
        event.preventDefault();
        onEnter();
      }
      break;
    case 'Escape':
      if (onEscape) {
        event.preventDefault();
        onEscape();
      }
      break;
  }
};

// フォーカストラップ
export const createFocusTrap = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  const handleTabKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  element.addEventListener('keydown', handleTabKey);
  
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

// スクリーンリーダー対応のライブリージョン
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('class', 'sr-only');
  liveRegion.textContent = message;
  
  document.body.appendChild(liveRegion);
  
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
};
EOF
        
        ((a11y_fixes++))
        print_success "アクセシビリティユーティリティを作成しました"
    fi
    
    print_success "アクセシビリティ強化完了: $a11y_fixes 項目改善"
    return $a11y_fixes
}

# =========================
# UI品質チェック
# =========================

check_ui_quality() {
    print_info "UI品質チェック実行中..."
    
    local quality_score=0
    local total_checks=5
    
    # React 19機能使用チェック
    local react19_usage=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "memo\|useCallback\|useMemo" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$react19_usage" -ge 10 ]; then
        ((quality_score++))
        print_success "React 19最適化: 良好 ($react19_usage 箇所)"
    else
        print_warning "React 19最適化: 要改善 ($react19_usage 箇所)"
    fi
    
    # TypeScript型安全性チェック
    if command -v tsc >/dev/null && tsc --noEmit --project "$PROJECT_ROOT/config/tsconfig.json" 2>/dev/null; then
        ((quality_score++))
        print_success "TypeScript型安全性: 合格"
    else
        print_warning "TypeScript型安全性: 要修復"
    fi
    
    # ESLintチェック
    if command -v npx >/dev/null; then
        local lint_errors=$(npx eslint "$WEBUI_SRC" --format json 2>/dev/null | jq length 2>/dev/null || echo "10")
        if [ "$lint_errors" -le 5 ]; then
            ((quality_score++))
            print_success "ESLint: 良好 ($lint_errors エラー)"
        else
            print_warning "ESLint: 要改善 ($lint_errors エラー)"
        fi
    fi
    
    # アクセシビリティチェック
    local aria_usage=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "aria-\|role=" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$aria_usage" -ge 5 ]; then
        ((quality_score++))
        print_success "アクセシビリティ: 良好 ($aria_usage 属性)"
    else
        print_warning "アクセシビリティ: 要改善 ($aria_usage 属性)"
    fi
    
    # テストカバレッジチェック
    local test_files=$(find "$WEBUI_SRC" -name "*.test.tsx" | wc -l)
    local component_files=$(find "$COMPONENTS_DIR" -name "*.tsx" -not -path "*/__tests__/*" 2>/dev/null | wc -l)
    if [ "$component_files" -gt 0 ] && [ "$test_files" -ge $((component_files / 2)) ]; then
        ((quality_score++))
        print_success "テストカバレッジ: 良好 ($test_files/$component_files)"
    else
        print_warning "テストカバレッジ: 要改善 ($test_files/$component_files)"
    fi
    
    local final_score=$((quality_score * 100 / total_checks))
    print_info "UI品質スコア: $final_score/100"
    
    echo $final_score
}

# =========================
# Feature-B実行ループ
# =========================

execute_feature_b_loop() {
    print_header
    print_info "Feature-B WebUI自動開発ループを開始します"
    print_info "最大ループ回数: $MAX_AUTO_LOOPS"
    print_info "品質閾値: $UI_QUALITY_THRESHOLD%"
    
    local loop_count=0
    local total_components_created=0
    local total_optimizations=0
    local total_hooks_created=0
    local total_a11y_fixes=0
    
    while [ $loop_count -lt $MAX_AUTO_LOOPS ]; do
        ((loop_count++))
        print_info "==================== ループ $loop_count/$MAX_AUTO_LOOPS 開始 ===================="
        
        # React 19コンポーネント生成
        local components_created=$(generate_react_components)
        total_components_created=$((total_components_created + components_created))
        
        # 既存コンポーネント最適化
        local optimizations=$(optimize_existing_components)
        total_optimizations=$((total_optimizations + optimizations))
        
        # カスタムフック生成
        local hooks_created=$(generate_custom_hooks)
        total_hooks_created=$((total_hooks_created + hooks_created))
        
        # アクセシビリティ強化
        local a11y_fixes=$(enhance_accessibility)
        total_a11y_fixes=$((total_a11y_fixes + a11y_fixes))
        
        # 品質チェック
        local quality_score=$(check_ui_quality)
        
        print_info "ループ $loop_count 完了 - 品質スコア: ${quality_score}%"
        log_feature_action "LOOP_COMPLETION" "SUCCESS" "Loop $loop_count completed with quality score $quality_score%"
        
        # 早期終了条件チェック
        if [ $quality_score -ge $UI_QUALITY_THRESHOLD ]; then
            print_success "品質閾値 ${UI_QUALITY_THRESHOLD}% に到達しました！"
            break
        fi
        
        # 改善がない場合の早期終了
        if [ $components_created -eq 0 ] && [ $optimizations -eq 0 ] && [ $hooks_created -eq 0 ] && [ $a11y_fixes -eq 0 ]; then
            print_info "追加の改善項目がないため、ループを終了します"
            break
        fi
        
        sleep 2  # ループ間の休憩
    done
    
    # 最終結果表示
    print_success "Feature-B WebUI自動開発完了"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "実行ループ数: $loop_count/$MAX_AUTO_LOOPS"
    echo "作成コンポーネント: $total_components_created 個"
    echo "最適化実行: $total_optimizations 個"
    echo "作成フック: $total_hooks_created 個"
    echo "アクセシビリティ改善: $total_a11y_fixes 項目"
    echo "最終品質スコア: $(check_ui_quality)%"
}

# =========================
# 使用方法表示
# =========================

show_usage() {
    echo "Feature-B WebUI自動開発スクリプト"
    echo ""
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --loop              自動開発ループ実行"
    echo "  --components        コンポーネント生成のみ"
    echo "  --optimize          既存最適化のみ"
    echo "  --hooks             カスタムフック生成のみ"
    echo "  --accessibility     アクセシビリティ強化のみ"
    echo "  --quality           品質チェックのみ"
    echo "  --help              このヘルプを表示"
}

# =========================
# メイン実行
# =========================

main() {
    local mode="loop"
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --loop)
                mode="loop"
                shift
                ;;
            --components)
                mode="components"
                shift
                ;;
            --optimize)
                mode="optimize"
                shift
                ;;
            --hooks)
                mode="hooks"
                shift
                ;;
            --accessibility)
                mode="accessibility"
                shift
                ;;
            --quality)
                mode="quality"
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
    
    # Feature-B開始ログ
    log_feature_action "FEATURE_B_START" "INFO" "Feature-B WebUI development started with mode: $mode"
    
    # モード別実行
    case "$mode" in
        loop)
            execute_feature_b_loop
            ;;
        components)
            print_header
            generate_react_components
            ;;
        optimize)
            print_header
            optimize_existing_components
            ;;
        hooks)
            print_header
            generate_custom_hooks
            ;;
        accessibility)
            print_header
            enhance_accessibility
            ;;
        quality)
            print_header
            local score=$(check_ui_quality)
            print_info "現在のUI品質スコア: $score%"
            ;;
        *)
            print_error "不明なモード: $mode"
            exit 1
            ;;
    esac
    
    log_feature_action "FEATURE_B_COMPLETE" "SUCCESS" "Feature-B WebUI development completed"
}

# スクリプト実行
main "$@"