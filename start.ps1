param([switch]$Production)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$memoryNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$memoryNode = if ($memoryNodeCommand) { $memoryNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $memoryNode)) { throw 'Node.js 22.13+ is required.' }
$env:PATH = (Split-Path $memoryNode) + ';' + $env:PATH
if (-not (Test-Path -LiteralPath 'node_modules/next')) { throw 'Install dependencies with pnpm install first.' }
if (-not (Test-Path -LiteralPath '.env.local')) {
  & $memoryNode -e "require('fs').writeFileSync('.env.local','RESEARCH_PASSWORD='+require('crypto').randomBytes(24).toString('hex')+'\n')"
}
if ($Production) {
  & $memoryNode node_modules/next/dist/bin/next build
  if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
  & $memoryNode node_modules/next/dist/bin/next start --hostname 0.0.0.0
} else {
  & $memoryNode node_modules/next/dist/bin/next dev --hostname 0.0.0.0
}
