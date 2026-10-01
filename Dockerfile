# Image de la régie NodeCG KB SERIES (Railway, Render, Fly.io, VPS…)
FROM node:24-bookworm-slim
WORKDIR /app

# Outils de compilation au cas où better-sqlite3 n'a pas de binaire précompilé
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY tools/patch-deps.js tools/patch-deps.js
RUN npm ci --no-audit --no-fund && npm rebuild better-sqlite3 msgpackr-extract

COPY . .

ENV NODE_ENV=production \
	DATA_DIR=/data
EXPOSE 9090
VOLUME ["/data"]
CMD ["sh", "tools/docker-start.sh"]
