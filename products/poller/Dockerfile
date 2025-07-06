# --- Build stage ---
FROM golang:1.23-alpine AS builder
WORKDIR /src

COPY go.* ./
RUN go mod download

COPY . .

ARG TARGETOS=linux
ARG TARGETARCH=amd64
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /poller ./cmd/poller

# --- Runtime stage ---
FROM alpine:latest

LABEL org.opencontainers.image.source=https://github.com/kidus-aa/mood-meter-bot
LABEL org.opencontainers.image.description="Mood Meter Twitch Extension Backend"

RUN apk add --no-cache ca-certificates

COPY --from=builder /poller /usr/bin/poller
ENTRYPOINT ["/usr/bin/poller"]