$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

$dockerCommand = Get-Command docker.exe -ErrorAction SilentlyContinue
$dockerCli = if ($dockerCommand) { $dockerCommand.Source } else { Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\bin\docker.exe" }
if (-not (Test-Path -LiteralPath $dockerCli)) { throw "Docker CLI not found. Is Docker Desktop installed?" }

& $dockerCli compose stop
if ($LASTEXITCODE -ne 0) { throw "Docker Compose could not stop the project." }
Write-Host "Project stopped. Its containers and persistent SQLite volume are preserved. Run .\start-project.ps1 to start it again."
