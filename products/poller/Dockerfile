# --- Build stage ---
FROM golang:1.23-alpine AS builder
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o poller ./cmd/poller
RUN ls -la

# --- Runtime stage ---
FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=builder /src/poller /poller
ENTRYPOINT ["/poller"]