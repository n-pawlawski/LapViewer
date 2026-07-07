# Adds lapviewer.docker to the Windows hosts file (run as Administrator).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-docker-hosts.ps1

$ErrorActionPreference = "Stop"

$hostName = "lapviewer.docker"
$hostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
$entry = "127.0.0.1`t$hostName"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Re-run this script in an elevated PowerShell (Run as administrator)." -ForegroundColor Yellow
  exit 1
}

$content = Get-Content $hostsPath -Raw
if ($content -match [regex]::Escape($hostName)) {
  Write-Host "$hostName already present in hosts file."
  exit 0
}

Add-Content -Path $hostsPath -Value "`n# LapViewer Docker (side-by-side with npm run dev)`n$entry"
Write-Host "Added: $entry"
Write-Host "Docker app: http://${hostName}:3090"
Write-Host "Dev app:    http://localhost:5173"
