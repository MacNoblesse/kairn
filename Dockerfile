# syntax=docker/dockerfile:1
# Image unique : frontend Vite compilé + serveur Express (API IA + persistance des données).
ARG NODE_VERSION=22

# ---------- 1) build : frontend (vite) + serveur (esbuild) ----------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- 2) dépendances de production uniquement ----------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# ---------- 3) image finale ----------
FROM node:${NODE_VERSION}-alpine AS runtime
RUN apk add --no-cache tzdata
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
WORKDIR /app
COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-server ./dist-server
COPY --chown=node:node package.json ./package.json
# /data appartient à l'utilisateur `node` : un volume nommé neuf hérite de ces droits.
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist-server/index.js"]
