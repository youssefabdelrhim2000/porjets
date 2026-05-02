FROM golang:1.26-alpine AS builder

WORKDIR /app

# تنزيل الاعتماديات
COPY go.mod go.sum ./
RUN go mod download

# نسخ الكود وبناءه
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Final image صغيرة
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 3000

CMD ["./main"]