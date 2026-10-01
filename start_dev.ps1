# start_dev.ps1 - PressWire Development Server Runner (PowerShell for Windows)
$ErrorActionPreference = "Stop"

Write-Host "=== Starting PressWire Services (Windows) ===" -ForegroundColor Cyan

# 0. Ensure .env exists
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "-> Creating .env from .env.example" -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
    }
}

# 1. Locate Python executable in virtual environment
$pythonExe = $null
if (Test-Path "backend\venv\Scripts\python.exe") {
    $pythonExe = (Resolve-Path "backend\venv\Scripts\python.exe").Path
} elseif (Test-Path ".venv\Scripts\python.exe") {
    $pythonExe = (Resolve-Path ".venv\Scripts\python.exe").Path
} elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    $pythonExe = (Get-Command "python").Source
} else {
    Write-Error "Python executable not found. Please create a virtual environment: python -m venv backend/venv"
    exit 1
}

Write-Host "-> Using Python: $pythonExe" -ForegroundColor DarkGray

# 2. Check node_modules in frontend
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "-> Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
}

# 3. Start FastAPI backend process
Write-Host "-> Starting Backend on http://127.0.0.1:8000" -ForegroundColor Green
$backendProc = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload", "--app-dir", "backend" `
    -PassThru -NoNewWindow

# 4. Start Vite frontend dev server in foreground
Write-Host "-> Starting Newsroom Desk Frontend on http://localhost:5173" -ForegroundColor Green
Push-Location frontend
try {
    npm run dev
} finally {
    Pop-Location
    if ($backendProc -and -not $backendProc.HasExited) {
        Write-Host "`n-> Stopping Backend service (PID: $($backendProc.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "-> PressWire services stopped." -ForegroundColor Cyan
}
