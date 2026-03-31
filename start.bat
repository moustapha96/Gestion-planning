@echo off
setlocal enabledelayedexpansion

echo 🚀 Demarrage de l'application Gestion Planning...
echo.

REM Verifier Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo Erreur: Node.js n'est pas installe.
    pause
    exit /b 1
)

echo ✅ Node.js trouvé:
node --version
echo.

REM Demarrer le backend
echo 🔧 Demarrage du backend...
cd backend

if not exist "node_modules" (
    echo Installation des dependances...
    call npm install
)

if not exist "prisma\dev.db" (
    echo 📦 Initialisation de la base de donnees...
    call npx prisma db push
    call node prisma\seed.js
)

start "Backend Gestion Planning" cmd /k npm run dev
echo ✅ Backend demarré
echo.

REM Attendre un peu le backend
timeout /t 3 /nobreak

REM Demarrer le frontend
echo ⚛️  Demarrage du frontend...
cd ..\frontend

if not exist "node_modules" (
    echo Installation des dependances...
    call npm install
)

start "Frontend Gestion Planning" cmd /k npm run dev
echo ✅ Frontend demarré
echo.

REM Afficher les informations
echo ════════════════════════════════════════
echo 🌐 Application prete!
echo ════════════════════════════════════════
echo.
echo Frontend:  http://localhost:5173
echo Backend:   http://localhost:3001
echo.
echo Identifiants de test:
echo - Admin: admin@example.com / Admin123!
echo - Responsable: responsable1@example.com / User123!
echo.
echo Les fenetres des serveurs se fermeront a la fermeture du terminal.
echo.
pause
