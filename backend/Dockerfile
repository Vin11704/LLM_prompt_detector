FROM python:3.11-slim
WORKDIR /app

COPY ./requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

# Cloud Run injects PORT env var (default 8080); fall back to 8000 for local dev
ENV PORT=8080
EXPOSE ${PORT}

CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT
