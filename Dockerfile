# Image de la régie NodeCG KB SERIES (Railway, Render, Fly.io, VPS…)

# ---- Étape 1 : installation des dépendances (avec les outils de compilation) ----
FROM node:24-bookworm-slim AS deps
WORKDIR /app
# Outils de compilation au cas où better-sqlite3 / msgpackr-extract n'ont pas de binaire précompilé
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
	&& rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Script postinstall : corrige hasha pour Node 24 (tools/patch-deps.js)
COPY tools/patch-deps.js tools/patch-deps.js
# Sans les outils de développement (eslint, playwright, sharp) : l'export du stinger se fait depuis la régie locale
# (npm rebuild : garantit que les modules natifs sont compilés même si npm n'a pas lancé leur script d'installation)
RUN npm ci --omit=dev --no-audit --no-fund && npm rebuild better-sqlite3 msgpackr-extract

# ---- Étape 2 : image finale, sans outils de compilation ----
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
	DATA_DIR=/data \
	NODECG_HOST=0.0.0.0
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Reste en root : le volume persistant (Railway, Docker) est monté en root sur /data, et
# tools/docker-start.sh doit pouvoir y créer db/ et assets/.
# Pas de VOLUME ici (refusé par Railway) : le volume se déclare chez l'hébergeur ou dans docker-compose.yml.
EXPOSE 9090
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 9090) + '/login').then((r) => process.exit(r.status < 500 ? 0 : 1), () => process.exit(1))"
CMD ["sh", "tools/docker-start.sh"]
