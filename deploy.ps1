# Packages the Trinitas site for free static hosting (Netlify Drop, Cloudflare Pages, GitHub Pages)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$deploy = Join-Path $root "deploy"
$zip = Join-Path $root "trinitas-site.zip"

$siteFiles = @(
    "index.html", "about.html", "careers.html", "assessment.html", "admin.html",
    "404.html", "thank-you.html",
    "styles.css", "careers.css", "main.js", "api.js", "careers.js",
    "assessment.js", "assessment-data.js", "admin.js",
    "logo-icon.png", "logo-full.png", "logo-wordmark.png"
)

if (Test-Path $deploy) {
    Get-ChildItem $deploy -Exclude ".git" | Remove-Item -Recurse -Force
}
else {
    New-Item -ItemType Directory -Path $deploy | Out-Null
}

foreach ($f in $siteFiles) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $deploy $f)
    }
}



$utf8NoBom = New-Object System.Text.UTF8Encoding $false
function Write-NetlifyToml {
    param([string]$Path, [string]$PublishDir)
    $functionsLine = if ($PublishDir -eq "deploy") { "`n  functions = `"netlify/functions`"" } else { "" }
    $content = @"
[build]
  publish = "$PublishDir"$functionsLine

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
"@
    [System.IO.File]::WriteAllText($Path, "$content`n", $utf8NoBom)
}
Write-NetlifyToml -Path (Join-Path $deploy "netlify.toml") -PublishDir "."
Write-NetlifyToml -Path (Join-Path $root "netlify.toml") -PublishDir "deploy"

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $deploy "*") -DestinationPath $zip -Force

Write-Host "Deploy folder: $deploy"
Write-Host "Zip package:   $zip"
Write-Host "Files:"
Get-ChildItem $deploy | ForEach-Object { Write-Host "  $($_.Name) ($([math]::Round($_.Length/1KB,1)) KB)" }
Write-Host ""
Write-Host "FREE hosting options (0 cost):"
Write-Host "  1. Netlify Drop  -> https://app.netlify.com/drop  (drag trinitas-site.zip)"
Write-Host "  2. Cloudflare    -> Pages > Upload assets > upload zip"
Write-Host "  3. GitHub Pages  -> push deploy/ folder to a public repo, enable Pages"
Write-Host ""
Write-Host "Done."