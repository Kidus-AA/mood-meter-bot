# syntax=docker/dockerfile:1

# --- Build stage ---
FROM --platform=$BUILDPLATFORM golang:1.22-alpine AS builder
WORKDIR /src
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o poller ./cmd/poller

# --- Runtime stage ---
FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=builder /src/poller /poller
ENTRYPOINT ["/poller"]