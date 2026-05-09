FROM python:3.13-slim
WORKDIR /app
RUN pip install --no-cache-dir \
    "fastapi==0.115.6" \
    "uvicorn[standard]==0.34.0" \
    "docker==7.1.0" \
    "pydantic==2.10.4"
COPY webhook/app.py .
EXPOSE 8090
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090"]
