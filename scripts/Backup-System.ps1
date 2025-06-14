# PowerShell自動バックアップシステム
# ITSM準拠IT運用システムプラットフォーム

param(
    [string]$BackupPath = "C:\ServiceGrid\Backup",
    [int]$RetentionDays = 30,
    [switch]$FullBackup
)

$ErrorActionPreference = "Stop"

# 設定
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = Join-Path $BackupPath "logs\backup_$Timestamp.log"

# ログ関数
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry -ErrorAction SilentlyContinue
}

# ディレクトリ作成
try {
    $BackupDirs = @("database", "logs", "config", "full", "logs")
    foreach ($dir in $BackupDirs) {
        $path = Join-Path $BackupPath $dir
        if (-not (Test-Path $path)) {
            New-Item -ItemType Directory -Path $path -Force | Out-Null
        }
    }
} catch {
    Write-Error "バックアップディレクトリの作成に失敗: $_"
    exit 1
}

Write-Log "バックアップ開始: $Timestamp"

# データベースバックアップ
function Backup-Database {
    Write-Log "データベースバックアップ開始"
    
    $DbBackupDir = Join-Path $BackupPath "database"
    $DbFile = "C:\ServiceGrid\backend\db\itsm.sqlite"
    
    if (Test-Path $DbFile) {
        try {
            # SQLiteコピー
            $BackupFile = Join-Path $DbBackupDir "itsm_backup_$Timestamp.sqlite"
            Copy-Item $DbFile $BackupFile
            
            # SQLダンプ（sqlite3.exeが利用可能な場合）
            $SqliteExe = Get-Command sqlite3.exe -ErrorAction SilentlyContinue
            if ($SqliteExe) {
                $DumpFile = Join-Path $DbBackupDir "itsm_dump_$Timestamp.sql"
                & sqlite3.exe $DbFile ".dump" | Out-File $DumpFile -Encoding UTF8
                
                # 圧縮
                Compress-Archive -Path $DumpFile -DestinationPath "$DumpFile.zip" -Force
                Remove-Item $DumpFile
            }
            
            Write-Log "データベースバックアップ完了"
        } catch {
            Write-Log "データベースバックアップエラー: $_" "ERROR"
        }
    } else {
        Write-Log "データベースファイルが見つかりません: $DbFile" "WARNING"
    }
}

# ログファイルバックアップ
function Backup-Logs {
    Write-Log "ログファイルバックアップ開始"
    
    $LogBackupDir = Join-Path $BackupPath "logs"
    $LogSourceDir = "C:\ServiceGrid\logs"
    
    if (Test-Path $LogSourceDir) {
        try {
            $LogArchive = Join-Path $LogBackupDir "logs_backup_$Timestamp.zip"
            Compress-Archive -Path "$LogSourceDir\*" -DestinationPath $LogArchive -Force
            Write-Log "ログファイルバックアップ完了"
        } catch {
            Write-Log "ログファイルバックアップエラー: $_" "ERROR"
        }
    } else {
        Write-Log "ログディレクトリが見つかりません: $LogSourceDir" "WARNING"
    }
}

# 設定ファイルバックアップ
function Backup-Config {
    Write-Log "設定ファイルバックアップ開始"
    
    $ConfigBackupDir = Join-Path $BackupPath "config"
    $ConfigFiles = @(
        "C:\ServiceGrid\package.json",
        "C:\ServiceGrid\backend\package.json",
        "C:\ServiceGrid\docker-compose.yml",
        "C:\ServiceGrid\.env"
    )
    
    foreach ($file in $ConfigFiles) {
        if (Test-Path $file) {
            try {
                $fileName = [System.IO.Path]::GetFileName($file)
                $backupFile = Join-Path $ConfigBackupDir "$fileName`_$Timestamp"
                Copy-Item $file $backupFile
            } catch {
                Write-Log "設定ファイルバックアップエラー ($file): $_" "ERROR"
            }
        }
    }
    
    Write-Log "設定ファイルバックアップ完了"
}

# フルバックアップ（週次または手動）
function Backup-Full {
    $DayOfWeek = (Get-Date).DayOfWeek
    
    if ($FullBackup -or $DayOfWeek -eq "Sunday") {
        Write-Log "フルバックアップ開始"
        
        $FullBackupDir = Join-Path $BackupPath "full"
        $SourceDir = "C:\ServiceGrid"
        
        if (Test-Path $SourceDir) {
            try {
                $FullArchive = Join-Path $FullBackupDir "full_backup_$Timestamp.zip"
                
                # 除外パターン
                $ExcludePatterns = @("node_modules", ".git", "*.log", "tmp", "cache", "dist", "build")
                
                # PowerShell 5.0以降の場合
                if ($PSVersionTable.PSVersion.Major -ge 5) {
                    $Files = Get-ChildItem -Path $SourceDir -Recurse | Where-Object {
                        $exclude = $false
                        foreach ($pattern in $ExcludePatterns) {
                            if ($_.FullName -like "*$pattern*") {
                                $exclude = $true
                                break
                            }
                        }
                        -not $exclude
                    }
                    
                    Compress-Archive -Path $Files.FullName -DestinationPath $FullArchive -Force
                }
                
                Write-Log "フルバックアップ完了"
            } catch {
                Write-Log "フルバックアップエラー: $_" "ERROR"
            }
        }
    }
}

# 古いバックアップの削除
function Remove-OldBackups {
    Write-Log "古いバックアップの削除開始"
    
    $Dirs = @("database", "logs", "config", "full")
    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    
    foreach ($dir in $Dirs) {
        $BackupDir = Join-Path $BackupPath $dir
        if (Test-Path $BackupDir) {
            try {
                Get-ChildItem -Path $BackupDir -File | Where-Object {
                    $_.LastWriteTime -lt $CutoffDate
                } | Remove-Item -Force
            } catch {
                Write-Log "古いバックアップ削除エラー ($dir): $_" "ERROR"
            }
        }
    }
    
    Write-Log "古いバックアップの削除完了"
}

# バックアップ検証
function Test-Backup {
    Write-Log "バックアップ検証開始"
    
    $DbBackupDir = Join-Path $BackupPath "database"
    $LatestBackup = Get-ChildItem -Path $DbBackupDir -Filter "itsm_backup_*.sqlite" | 
                   Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($LatestBackup) {
        try {
            # SQLiteファイルの存在確認（基本的な検証）
            if ((Get-Item $LatestBackup.FullName).Length -gt 0) {
                Write-Log "データベースバックアップの検証完了"
            } else {
                Write-Log "データベースバックアップファイルが空です" "ERROR"
            }
        } catch {
            Write-Log "バックアップ検証エラー: $_" "ERROR"
        }
    }
}

# バックアップ統計の生成
function New-BackupStats {
    Write-Log "バックアップ統計生成開始"
    
    $StatsFile = Join-Path $BackupPath "backup_stats.json"
    
    try {
        $Stats = @{
            timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
            backup_session = $Timestamp
            database_backups = (Get-ChildItem -Path (Join-Path $BackupPath "database") -Filter "*.sqlite" -ErrorAction SilentlyContinue).Count
            log_backups = (Get-ChildItem -Path (Join-Path $BackupPath "logs") -Filter "*.zip" -ErrorAction SilentlyContinue).Count
            config_backups = (Get-ChildItem -Path (Join-Path $BackupPath "config") -File -ErrorAction SilentlyContinue).Count
            full_backups = (Get-ChildItem -Path (Join-Path $BackupPath "full") -Filter "*.zip" -ErrorAction SilentlyContinue).Count
            total_size_mb = [math]::Round((Get-ChildItem -Path $BackupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
        }
        
        $Stats | ConvertTo-Json -Depth 3 | Out-File $StatsFile -Encoding UTF8
        Write-Log "バックアップ統計生成完了"
    } catch {
        Write-Log "バックアップ統計生成エラー: $_" "ERROR"
    }
}

# メイン処理
try {
    Backup-Database
    Backup-Logs
    Backup-Config
    Backup-Full
    Remove-OldBackups
    Test-Backup
    New-BackupStats
    
    Write-Log "全バックアップ処理完了: $Timestamp"
} catch {
    Write-Log "バックアップ処理でエラーが発生: $_" "ERROR"
    exit 1
}