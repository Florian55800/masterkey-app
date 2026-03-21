# ── Stage 1 : build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Dépendances
COPY package*.json ./
RUN npm ci

# Code source
COPY . .

# Génère le client Prisma + build Next.js
# (migrate-turso.js saute s'il n'y a pas de TURSO_DATABASE_URL — c'est voulu)
RUN npx prisma generate && next build

# ── Stage 2 : runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Uniquement les fichiers nécessaires au runtime
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/@libsql ./node_modules/@libsql
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

# Script d'entrée : migrations → démarrage
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
