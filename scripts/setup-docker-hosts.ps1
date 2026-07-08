# Adds deltaview.docker.com to the Windows hosts file (run as Administrator).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-docker-hosts.ps1

$ErrorActionPreference = "Stop"

$hostNames = @("deltaview.docker.com", "deltaview.docker")
$hostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Re-run this script in an elevated PowerShell (Run as administrator)." -ForegroundColor Yellow
  exit 1
}

$content = Get-Content $hostsPath -Raw
$added = @()

foreach ($hostName in $hostNames) {
  if ($content -match [regex]::Escape($hostName)) {
    Write-Host "$hostName already present in hosts file."
    continue
  }
  $entry = "127.0.0.1`t$hostName"
  Add-Content -Path $hostsPath -Value $entry
  $added += $entry
}

if ($added.Count -eq 0) {
  exit 0
}

Write-Host "Added hosts entries:"
$added | ForEach-Object { Write-Host "  $_" }
Write-Host "Docker app (OAuth): http://deltaview.docker.com:3090"
Write-Host "Dev app:            http://localhost:5173"
