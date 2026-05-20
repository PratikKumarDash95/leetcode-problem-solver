param(
	[string]$OutputPath = "release/leetcode-solver-extension.zip"
)

$ErrorActionPreference = "Stop"

$frontendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$releasePath = Join-Path $frontendRoot $OutputPath
$releaseDir = Split-Path $releasePath -Parent
$stagingDir = Join-Path $frontendRoot "release/staging"

if (Test-Path $stagingDir) {
	Remove-Item -LiteralPath $stagingDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$files = @(
	"manifest.json",
	"background.js",
	"content.js",
	"contentScript.js",
	"index.html",
	"pacman.svg"
)

foreach ($file in $files) {
	Copy-Item -LiteralPath (Join-Path $frontendRoot $file) -Destination (Join-Path $stagingDir $file)
}

Copy-Item -LiteralPath (Join-Path $frontendRoot "dist") -Destination (Join-Path $stagingDir "dist") -Recurse

if (Test-Path $releasePath) {
	Remove-Item -LiteralPath $releasePath -Force
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $releasePath -Force
Remove-Item -LiteralPath $stagingDir -Recurse -Force

Write-Output "Created $releasePath"
