# Run this script from any PowerShell location:
#   powershell -ExecutionPolicy Bypass -File .\setup-local-env.ps1
# It creates local-only .env files from the committed safe templates.
# Existing .env files are backed up first. Firebase private JSON is never copied.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "hardware-react"

$copies = @(
    @{
        Source = Join-Path $backendDir ".env.local.example"
        Target = Join-Path $backendDir ".env"
        Label = "Backend (XAMPP)"
    },
    @{
        Source = Join-Path $frontendDir ".env.example"
        Target = Join-Path $frontendDir ".env"
        Label = "Frontend (localhost API)"
    }
)

foreach ($item in $copies) {
    if (-not (Test-Path $item.Source)) {
        throw "Missing template: $($item.Source)"
    }

    if (Test-Path $item.Target) {
        $backup = "$($item.Target).backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item -LiteralPath $item.Target -Destination $backup
        Write-Host "Backed up existing $($item.Label) .env to $backup" -ForegroundColor Yellow
    }

    Copy-Item -LiteralPath $item.Source -Destination $item.Target -Force
    Write-Host "Created $($item.Label) .env" -ForegroundColor Green
}

$serviceAccount = Join-Path $backendDir "firebase-service-account.json"
if (Test-Path $serviceAccount) {
    Write-Host "Firebase service-account JSON found in backend folder." -ForegroundColor Green
} else {
    Write-Warning "Missing backend/firebase-service-account.json. Add your private Firebase Admin service-account JSON there. Do not commit or upload it."
}

Write-Host ""
Write-Host "Local environment files are ready. Backend DB target: hardware_inventory_local" -ForegroundColor Cyan
Write-Host "These .env files are local-only and must not be committed."
