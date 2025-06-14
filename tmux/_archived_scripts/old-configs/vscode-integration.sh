#!/bin/bash

# Feature-A統合リーダー: VSCode統合環境構築

print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_info "Feature-A統合リーダー環境を構築中..."

# プロジェクトルート確認
PROJECT_ROOT="/mnt/e/ServiceGrid"
cd "$PROJECT_ROOT"

# VSCode設定ディレクトリ作成
mkdir -p .vscode

# VSCode設定: tasks.json（tmuxペイン操作用）
print_info "VSCode tasks設定を作成中..."

cat > .vscode/tasks.json << 'EOF'
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Feature-A: 全ペイン統合指示",
            "type": "shell",
            "command": "tmux",
            "args": [
                "send-keys", "-t", "itsm-dev-4pane:0", 
                "echo 'Feature-A統合指示: ${input:instruction}'", "C-m"
            ],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            },
            "options": {
                "cwd": "${workspaceFolder}"
            }
        },
        {
            "label": "Feature-B: UI/テスト指示送信",
            "type": "shell",
            "command": "tmux",
            "args": [
                "send-keys", "-t", "itsm-dev-4pane:0",
                "${input:featureBInstruction}", "C-m"
            ],
            "group": "build"
        },
        {
            "label": "Feature-C: API開発指示送信", 
            "type": "shell",
            "command": "tmux",
            "args": [
                "send-keys", "-t", "itsm-dev-4pane:0.3",
                "${input:featureCInstruction}", "C-m"
            ],
            "group": "build"
        },
        {
            "label": "Feature-D: PowerShell指示送信",
            "type": "shell", 
            "command": "tmux",
            "args": [
                "send-keys", "-t", "itsm-dev-4pane:0.1",
                "${input:featureDInstruction}", "C-m"
            ],
            "group": "build"
        },
        {
            "label": "Feature-E: 非機能要件指示送信",
            "type": "shell",
            "command": "tmux", 
            "args": [
                "send-keys", "-t", "itsm-dev-4pane:0.2",
                "${input:featureEInstruction}", "C-m"
            ],
            "group": "build"
        },
        {
            "label": "全ペイン同時指示送信",
            "type": "shell",
            "command": "bash",
            "args": [
                "-c",
                "tmux send-keys -t itsm-dev-4pane:0 '${input:globalInstruction}' C-m && tmux send-keys -t itsm-dev-4pane:0.3 '${input:globalInstruction}' C-m && tmux send-keys -t itsm-dev-4pane:0.1 '${input:globalInstruction}' C-m && tmux send-keys -t itsm-dev-4pane:0.2 '${input:globalInstruction}' C-m"
            ],
            "group": "build"
        }
    ],
    "inputs": [
        {
            "id": "instruction", 
            "description": "統合指示を入力",
            "default": "新機能開発を開始してください",
            "type": "promptString"
        },
        {
            "id": "featureBInstruction",
            "description": "Feature-B UI/テスト指示",
            "default": "React コンポーネント開発を開始",
            "type": "promptString"
        },
        {
            "id": "featureCInstruction", 
            "description": "Feature-C API開発指示",
            "default": "REST API実装を開始",
            "type": "promptString"
        },
        {
            "id": "featureDInstruction",
            "description": "Feature-D PowerShell指示", 
            "default": "PowerShell スクリプト開発を開始",
            "type": "promptString"
        },
        {
            "id": "featureEInstruction",
            "description": "Feature-E 非機能要件指示",
            "default": "セキュリティ・パフォーマンステストを開始", 
            "type": "promptString"
        },
        {
            "id": "globalInstruction",
            "description": "全ペイン共通指示",
            "default": "品質チェックを実行してください",
            "type": "promptString"
        }
    ]
}
EOF

# VSCode設定: launch.json（デバッグ設定）
print_info "VSCode launch設定を作成中..."

cat > .vscode/launch.json << 'EOF'
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Feature-A: 統合リーダーモード",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/backend/start-server.js",
            "env": {
                "NODE_ENV": "development",
                "FEATURE_MODE": "INTEGRATION_LEADER"
            },
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen"
        }
    ]
}
EOF

# VSCode設定: settings.json
print_info "VSCode設定ファイルを作成中..."

cat > .vscode/settings.json << 'EOF'
{
    "terminal.integrated.defaultProfile.linux": "bash",
    "terminal.integrated.cwd": "${workspaceFolder}",
    "files.associations": {
        "*.sh": "shellscript"
    },
    "editor.formatOnSave": true,
    "typescript.preferences.importModuleSpecifier": "relative",
    "eslint.workingDirectories": ["${workspaceFolder}"],
    "feature-a.tmuxSession": "itsm-dev-4pane",
    "feature-a.integrationMode": true
}
EOF

# 統合ワークスペース設定
print_info "マルチルートワークスペース設定を作成中..."

cat > ServiceGrid-Integration.code-workspace << 'EOF'
{
    "folders": [
        {
            "name": "🎯 Feature-A 統合リーダー",
            "path": "."
        },
        {
            "name": "🎨 Feature-B UI/テスト", 
            "path": "./src"
        },
        {
            "name": "🔧 Feature-C API開発",
            "path": "./backend"
        },
        {
            "name": "💻 Feature-D PowerShell",
            "path": "./backend/modules"
        },
        {
            "name": "🔒 Feature-E 非機能要件",
            "path": "./docs"
        },
        {
            "name": "🎛️ Tmux管理",
            "path": "./tmux"
        }
    ],
    "settings": {
        "terminal.integrated.defaultProfile.linux": "bash",
        "feature-a.integration.enabled": true,
        "feature-a.tmux.session": "itsm-dev-4pane"
    },
    "tasks": {
        "version": "2.0.0",
        "tasks": []
    },
    "extensions": {
        "recommendations": [
            "ms-vscode.vscode-typescript-next",
            "bradlc.vscode-tailwindcss",
            "esbenp.prettier-vscode",
            "ms-vscode.powershell"
        ]
    }
}
EOF

print_success "Feature-A統合リーダー環境構築完了！"

echo ""
echo "🎯 Feature-A統合リーダー環境:"
echo ""
echo "  📁 VSCode設定:"
echo "    - .vscode/tasks.json: tmuxペイン操作タスク"
echo "    - .vscode/launch.json: デバッグ設定"
echo "    - .vscode/settings.json: 統合設定"
echo "    - ServiceGrid-Integration.code-workspace: マルチルートワークスペース"
echo ""
echo "  ⌨️ VSCodeタスク操作:"
echo "    Ctrl+Shift+P → 'Tasks: Run Task' → 選択:"
echo "    - Feature-B: UI/テスト指示送信"
echo "    - Feature-C: API開発指示送信"
echo "    - Feature-D: PowerShell指示送信"
echo "    - Feature-E: 非機能要件指示送信"
echo "    - 全ペイン同時指示送信"
echo ""
echo "  🚀 使用方法:"
echo "    1. code ServiceGrid-Integration.code-workspace"
echo "    2. Ctrl+Shift+P → Tasks: Run Task"
echo "    3. 各Featureペインに指示を送信"
echo ""
echo "  🎛️ tmux 4ペイン状況:"
echo "    tmux attach-session -t itsm-dev-4pane"
echo ""
echo "✅ 統合リーダー環境完成！"
echo ""