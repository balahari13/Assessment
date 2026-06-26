# Free GitHub Pages hosting ($0/month)
# Prerequisite: GitHub account + repo named trinitas (or any name)
param(
    [string]$RepoUrl = ""
)

$ErrorActionPreference = "Stop"
$git = "C:\Program Files\Git\bin\git.exe"
if (-not (Test-Path $git)) { $git = "git" }

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $root "deploy.ps1") | Out-Null

$deploy = Join-Path $root "deploy"
Set-Location $deploy

if (-not (Test-Path ".git")) {
    & $git init
    & $git branch -M main
}

if ($RepoUrl) {
    $remote = & $git remote get-url origin 2>$null
    if (-not $remote) { & $git remote add origin $RepoUrl }
    & $git add -A
    & $git -c user.email="info@trinitasnxt.in" -c user.name="Trinitas" commit -m "Deploy site" 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Host "No changes to commit." }
    & $git push -u origin main
    Write-Host ""
    Write-Host "Enable GitHub Pages:"
    Write-Host "  Repo > Settings > Pages > Source: Deploy from branch > main > / (root)"
    Write-Host "  Live at: https://YOUR_USERNAME.github.io/trinitas/"
}
else {
    Write-Host "Usage:"
    Write-Host '  .\host-github.ps1 -RepoUrl "https://github.com/YOUR_USER/trinitas.git"'
    Write-Host ""
    Write-Host "Steps:"
    Write-Host "  1. Create empty repo at https://github.com/new"
    Write-Host "  2. Run this script with -RepoUrl"
    Write-Host "  3. Enable Pages on main branch (free forever)"
}