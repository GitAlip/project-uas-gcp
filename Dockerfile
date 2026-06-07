# ==========================================
# 1. BUILD STAGE (Production Dependencies)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Salin package.json dan package-lock.json dari folder backend
COPY backend/package*.json ./backend/

# Install dependensi produksi saja untuk meminimalkan ukuran image
WORKDIR /app/backend
RUN npm ci --only=production

# ==========================================
# 2. RUNNER STAGE (Production Runner)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Atur environment produksi
ENV NODE_ENV=production
ENV PORT=8080

# Salin modul produksi dari builder
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Salin kode backend
COPY backend/ ./backend/

# Salin berkas statis frontend (karena backend menyajikan file statis dari folder induk '..')
COPY admin/ ./admin/
COPY login/ ./login/
COPY image/ ./image/
COPY img/ ./img/
COPY index.html ./
COPY mybooks.html ./
COPY script.js ./
COPY toast.js ./
COPY style.css ./

# Expose port yang digunakan oleh Cloud Run (default: 8080)
EXPOSE 8080

# Jalankan server
WORKDIR /app/backend
CMD ["node", "server.js"]
