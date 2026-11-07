$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

$dockerCommand = Get-Command docker.exe -ErrorAction SilentlyContinue
$dockerCli = if ($dockerCommand) { $dockerCommand.Source } else { Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\bin\docker.exe" }
$dockerDesktop = Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\Docker Desktop.exe"

if (-not (Test-Path -LiteralPath $dockerCli)) {
    throw "Docker CLI not found. Install Docker Desktop first."
}

if (-not (Test-Path -LiteralPath $dockerDesktop)) {
    $dockerDesktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
}

& $dockerCli info *> $null
if ($LASTEXITCODE -ne 0) {
    if (-not (Test-Path -LiteralPath $dockerDesktop)) {
        throw "Docker Desktop is installed but its app could not be found. Start Docker Desktop, then run this script again."
    }
    Start-Process -FilePath $dockerDesktop

    $ready = $false
    for ($attempt = 0; $attempt -lt 90; $attempt++) {
        Start-Sleep -Seconds 2
        & $dockerCli info *> $null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
    }
    if (-not $ready) {
        throw "Docker Engine did not become ready within three minutes. Check Docker Desktop for setup or virtualization prompts."
    }
}

& $dockerCli compose up -d --build
if ($LASTEXITCODE -ne 0) { throw "Docker Compose could not start the project." }
& $dockerCli compose ps
Write-Host "Project is running: http://localhost:3000 (web), http://localhost:8000/docs (API), http://localhost:8501 (Streamlit fallback)"
