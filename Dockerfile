# ── Stage 1: Build React frontend ──
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend + built frontend ──
FROM python:3.11-slim
WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
# Copy only the production build output from Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

# Cloud Run injects PORT env var (default 8080); fall back to 8000 for local dev
ENV PORT=8000
EXPOSE ${PORT}

CMD uvicorn main:app --host 0.0.0.0 --port $PORT
