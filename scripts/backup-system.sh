#!/bin/bash

# 自動バックアップシステム
# ITSM準拠IT運用システムプラットフォーム

set -euo pipefail

# 設定
BACKUP_BASE_DIR="/mnt/e/ServiceGrid/data/backup"
LOG_FILE="/mnt/e/ServiceGrid/data/logs/backup.log"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# エラーハンドリング
error_exit() {
    log "ERROR: $1"
    exit 1
}

# ディレクトリ作成
mkdir -p "$BACKUP_BASE_DIR"/{database,logs,config,full}
mkdir -p "$(dirname "$LOG_FILE")"

log "バックアップ開始: $TIMESTAMP"

# 1. データベースバックアップ
backup_database() {
    log "データベースバックアップ開始"
    
    local db_backup_dir="$BACKUP_BASE_DIR/database"
    local db_file="/mnt/e/ServiceGrid/backend/db/itsm.sqlite"
    
    if [[ -f "$db_file" ]]; then
        # SQLiteダンプ
        sqlite3 "$db_file" ".backup $db_backup_dir/itsm_backup_$TIMESTAMP.sqlite"
        
        # SQL形式でもバックアップ
        sqlite3 "$db_file" ".dump" > "$db_backup_dir/itsm_dump_$TIMESTAMP.sql"
        
        # 圧縮
        gzip "$db_backup_dir/itsm_dump_$TIMESTAMP.sql"
        
        log "データベースバックアップ完了"
    else
        log "WARNING: データベースファイルが見つかりません: $db_file"
    fi
}

# 2. ログファイルバックアップ
backup_logs() {
    log "ログファイルバックアップ開始"
    
    local log_backup_dir="$BACKUP_BASE_DIR/logs"
    local log_source_dir="/mnt/e/ServiceGrid/logs"
    
    if [[ -d "$log_source_dir" ]]; then
        tar -czf "$log_backup_dir/logs_backup_$TIMESTAMP.tar.gz" -C "$log_source_dir" .
        log "ログファイルバックアップ完了"
    else
        log "WARNING: ログディレクトリが見つかりません: $log_source_dir"
    fi
}

# 3. 設定ファイルバックアップ
backup_config() {
    log "設定ファイルバックアップ開始"
    
    local config_backup_dir="$BACKUP_BASE_DIR/config"
    local config_files=(
        "/mnt/e/ServiceGrid/package.json"
        "/mnt/e/ServiceGrid/backend/package.json"
        "/mnt/e/ServiceGrid/docker-compose.yml"
        "/mnt/e/ServiceGrid/docker-compose.dev.yml"
        "/mnt/e/ServiceGrid/.env"
    )
    
    for file in "${config_files[@]}"; do
        if [[ -f "$file" ]]; then
            cp "$file" "$config_backup_dir/$(basename "$file")_$TIMESTAMP"
        fi
    done
    
    log "設定ファイルバックアップ完了"
}

# 4. フルバックアップ（週次）
backup_full() {
    local day_of_week=$(date +%u)  # 1=月曜日, 7=日曜日
    
    if [[ "$day_of_week" == "7" ]]; then  # 日曜日のみフルバックアップ
        log "フルバックアップ開始"
        
        local full_backup_dir="$BACKUP_BASE_DIR/full"
        local exclude_patterns=(
            "node_modules"
            ".git"
            "*.log"
            "tmp"
            "cache"
            "dist"
            "build"
        )
        
        local exclude_args=""
        for pattern in "${exclude_patterns[@]}"; do
            exclude_args="$exclude_args --exclude=$pattern"
        done
        
        tar -czf "$full_backup_dir/full_backup_$TIMESTAMP.tar.gz" \
            $exclude_args \
            -C /mnt/e/ServiceGrid \
            .
        
        log "フルバックアップ完了"
    fi
}

# 5. 古いバックアップの削除
cleanup_old_backups() {
    log "古いバックアップの削除開始"
    
    local dirs=("database" "logs" "config" "full")
    
    for dir in "${dirs[@]}"; do
        local backup_dir="$BACKUP_BASE_DIR/$dir"
        if [[ -d "$backup_dir" ]]; then
            find "$backup_dir" -type f -mtime +$RETENTION_DAYS -delete
        fi
    done
    
    log "古いバックアップの削除完了"
}

# 6. バックアップ検証
verify_backup() {
    log "バックアップ検証開始"
    
    local db_backup_dir="$BACKUP_BASE_DIR/database"
    local latest_backup=$(ls -t "$db_backup_dir"/itsm_backup_*.sqlite 2>/dev/null | head -1)
    
    if [[ -n "$latest_backup" ]]; then
        # SQLiteファイルの整合性チェック
        if sqlite3 "$latest_backup" "PRAGMA integrity_check;" | grep -q "ok"; then
            log "データベースバックアップの整合性確認完了"
        else
            error_exit "データベースバックアップの整合性エラー"
        fi
    fi
}

# 7. バックアップ統計の生成
generate_backup_stats() {
    log "バックアップ統計生成開始"
    
    local stats_file="$BACKUP_BASE_DIR/backup_stats.json"
    local current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$stats_file" << EOF
{
  "timestamp": "$current_time",
  "backup_session": "$TIMESTAMP",
  "database_backups": $(ls -1 "$BACKUP_BASE_DIR/database"/*.sqlite 2>/dev/null | wc -l),
  "log_backups": $(ls -1 "$BACKUP_BASE_DIR/logs"/*.tar.gz 2>/dev/null | wc -l),
  "config_backups": $(ls -1 "$BACKUP_BASE_DIR/config"/* 2>/dev/null | wc -l),
  "full_backups": $(ls -1 "$BACKUP_BASE_DIR/full"/*.tar.gz 2>/dev/null | wc -l),
  "total_size_mb": $(du -sm "$BACKUP_BASE_DIR" 2>/dev/null | cut -f1)
}
EOF
    
    log "バックアップ統計生成完了"
}

# メイン処理
main() {
    backup_database
    backup_logs
    backup_config
    backup_full
    cleanup_old_backups
    verify_backup
    generate_backup_stats
    
    log "全バックアップ処理完了: $TIMESTAMP"
}

# 実行
main "$@"