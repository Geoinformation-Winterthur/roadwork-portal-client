# ---- Basislayer -------------------------------------------------
FROM node:16-alpine AS base
WORKDIR /workspace

# ---- Abhängigkeits-Layer (cached) -------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# ---- Dev-Layer --------------------------------------------------
FROM base AS dev
# *Kopiert nur den Node-Cache* – nicht die Quellen
COPY --from=deps /workspace/node_modules ./node_modules
# Live-Reload funktioniert nur, wenn der Quell­baum gemountet wird
EXPOSE 4200
ENV CHOKIDAR_USEPOLLING=true
CMD ["npx","ng","serve","--host","0.0.0.0","--poll","500"]
