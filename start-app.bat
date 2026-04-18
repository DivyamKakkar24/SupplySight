@echo off
echo 🚀 Starting SupplySight Services...
echo ==========================================

echo Starting Backend...
start "Backend" powershell -NoExit -Command "cd backend; npm run dev"

echo Starting ML Service...
start "ML Service" powershell -NoExit -Command "cd ml-service; python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000"

echo Starting Frontend...
start "Frontend" powershell -NoExit -Command "cd frontend; npm run dev"

echo ==========================================
echo 🎉 All services are starting up!
echo.
echo 📋 Service URLs:
echo    🌐 Frontend (Landing Page): http://localhost:5173
echo    🔧 Backend API: http://localhost:5000
echo    🤖 ML Service: http://127.0.0.1:8000
echo.
echo 🔑 Demo Accounts:
echo    👨‍💼 Manager: manager1@test.com / password123
echo    👤 Customer: customer1@test.com / password123
echo.
echo 💡 How to access the landing page:
echo    1. Open your browser
echo    2. Go to: http://localhost:5173
echo    3. You'll see the SupplySight landing page
echo    4. Click 'Get Started' to access the login page
echo.
echo ⏳ Services will be ready in about 30-60 seconds...
echo ==========================================
pause
