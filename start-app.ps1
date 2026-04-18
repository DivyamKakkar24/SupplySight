# Fast-Commerce Inventory Heatmap Lite - Start Script
Write-Host "🚀 Starting Fast-Commerce Inventory Heatmap Lite..." -ForegroundColor Green

# Check if MongoDB is running
Write-Host "📊 Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoResponse = Invoke-RestMethod -Uri "http://localhost:27017" -Method GET -TimeoutSec 5
    Write-Host "✅ MongoDB is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  MongoDB might not be running. Please start MongoDB first." -ForegroundColor Yellow
    Write-Host "   You can download MongoDB from: https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
}

# Start Backend
Write-Host "🔧 Starting Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start ML Service
Write-Host "🤖 Starting ML Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ml-service; python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000" -WindowStyle Normal

# Wait a moment for ML service to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "🎨 Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access your application:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "   ML Service: http://127.0.0.1:8000" -ForegroundColor White
Write-Host ""
Write-Host "📝 Default login credentials:" -ForegroundColor Cyan
Write-Host "   Manager: manager1@test.com / password123" -ForegroundColor White
Write-Host "   Customer: customer1@test.com / password123" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this script (services will continue running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 