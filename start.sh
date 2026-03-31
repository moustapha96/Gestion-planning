#!/bin/bash

echo "🚀 Démarrage de l'application Gestion Planning..."
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé."
    exit 1
fi

echo "✅ Node.js trouvé: $(node --version)"
echo ""

# Démarrer le backend dans un nouveau terminal/processus
echo "🔧 Démarrage du backend..."
cd backend

if [ ! -d "node_modules" ]; then
    npm install
fi

if [ ! -f "prisma/dev.db" ]; then
    echo "📦 Initialisation de la base de données..."
    npx prisma db push
    node prisma/seed.js
fi

npm run dev &
BACKEND_PID=$!
echo "✅ Backend démarré (PID: $BACKEND_PID)"
echo ""

# Attendre que le backend soit prêt
sleep 3

# Démarrer le frontend
echo "⚛️  Démarrage du frontend..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend démarré (PID: $FRONTEND_PID)"
echo ""

# Afficher les URLs
echo "════════════════════════════════════════"
echo "🌐 Application prête!"
echo "════════════════════════════════════════"
echo ""
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:3001"
echo ""
echo "Identifiants de test:"
echo "- Admin: admin@example.com / Admin123!"
echo "- Responsable: responsable1@example.com / User123!"
echo ""
echo "Pour arrêter l'application: Ctrl+C"
echo ""

# Garder les processus actifs
wait
