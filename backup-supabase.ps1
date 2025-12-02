# backup-supabase.ps1
# Supabase CLI が使える環境で実行すること（supabase db dump）

#=== 設定ここから ============================================
# バックアップを保存する基準ディレクトリ
# 例: プロジェクト直下の supabase/backup
$backupDir  = "supabase/backup"
$historyDir = Join-Path $backupDir "history"

# ローカル環境をバックアップする場合は $useLocal = $true
# リモート(SaaS)プロジェクトをバックアップする場合は $false
$useLocal = $true

#=== 設定ここまで ============================================

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# ディレクトリ作成
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
if (!(Test-Path $historyDir)) {
    New-Item -ItemType Directory -Path $historyDir | Out-Null
}

# 既存 .backup をアーカイブして history へ退避
$existingBackups = Get-ChildItem -Path $backupDir -Filter "*.backup" -File
if ($existingBackups.Count -gt 0) {
    $archiveName = Join-Path $historyDir "$timestamp-backup_archive.zip"
    Compress-Archive -Path $existingBackups.FullName -DestinationPath $archiveName -Force
    Remove-Item -Path $existingBackups.FullName -Force
}

# supabase db dump コマンド用の共通オプション
$localOpt = ""
if ($useLocal) {
    $localOpt = "--local"
}

try {
    Write-Host "Supabase バックアップ開始: $timestamp"

    # ロール（権限など）
    $rolesFile = Join-Path $backupDir "$timestamp-roles.backup"
    supabase db dump $localOpt -f $rolesFile --role-only
    if ($LASTEXITCODE -ne 0) { throw "roles backup failed (exit $LASTEXITCODE)" }

    # スキーマ
    $schemaFile = Join-Path $backupDir "$timestamp-schema.backup"
    supabase db dump $localOpt -f $schemaFile
    if ($LASTEXITCODE -ne 0) { throw "schema backup failed (exit $LASTEXITCODE)" }

    # データ（COPY 形式）
    $dataFile = Join-Path $backupDir "$timestamp-data.backup"
    supabase db dump $localOpt -f $dataFile --use-copy --data-only
    if ($LASTEXITCODE -ne 0) { throw "data backup failed (exit $LASTEXITCODE)" }

    Write-Host ""
    Write-Host "バックアップ完了:"
    Write-Host "  Roles : $rolesFile"
    Write-Host "  Schema: $schemaFile"
    Write-Host "  Data  : $dataFile"
}
catch {
    Write-Host "バックアップ中にエラーが発生しました:"
    Write-Host $_
    exit 1
}
