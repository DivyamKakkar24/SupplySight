# SupplySight Services Startup Script
# This script starts all services needed for the SupplySight project

Write-Host "🚀 Starting SupplySight Services..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

# Function to start a service in a new window
function Start-ServiceInNewWindow {
    param(
        [string]$ServiceName,
        [string]$Command,
        [string]$Directory
    )
    
    Write-Host "Starting $ServiceName..." -ForegroundColor Yellow
    
    # Create the full command
    $fullCommand = "cd '$Directory'; $Command"
    
    # Start in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $fullCommand -WindowStyle Normal
    
    Write-Host "✅ $ServiceName started in new window" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

# Get the current directory
$projectRoot = Get-Location

Write-Host "📁 Project Root: $projectRoot" -ForegroundColor Cyan

# Start Backend Service
Start-ServiceInNewWindow -ServiceName "Backend (Node.js)" -Command "npm run dev" -Directory "$projectRoot\backend"

# Start ML Service
Start-ServiceInNewWindow -ServiceName "ML Service (Python)" -Command "python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000" -Directory "$projectRoot\ml-service"

# Start Frontend Service
Start-ServiceInNewWindow -ServiceName "Frontend (React)" -Command "npm run dev" -Directory "$projectRoot\frontend"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 All services are starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Service URLs:" -ForegroundColor Yellow
Write-Host "   🌐 Frontend (Landing Page): http://localhost:5173" -ForegroundColor White
Write-Host "   🔧 Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "   🤖 ML Service: http://127.0.0.1:8000" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Demo Accounts:" -ForegroundColor Yellow
Write-Host "   👨‍💼 Manager: manager1@test.com / password123" -ForegroundColor White
Write-Host "   👤 Customer: customer1@test.com / password123" -ForegroundColor White
Write-Host ""
Write-Host "💡 How to access the landing page:" -ForegroundColor Yellow
Write-Host "   1. Open your browser" -ForegroundColor White
Write-Host "   2. Go to: http://localhost:5173" -ForegroundColor White
Write-Host "   3. You'll see the SupplySight landing page" -ForegroundColor White
Write-Host "   4. Click 'Get Started' to access the login page" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Services will be ready in about 30-60 seconds..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
