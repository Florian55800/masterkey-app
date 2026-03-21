#!/bin/sh
set -e

echo "[entrypoint] Initialisation du schéma..."
node scripts/setup-db.js

echo "[entrypoint] Démarrage de l'application..."
exec node server.js
