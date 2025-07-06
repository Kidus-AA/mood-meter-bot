FROM golang:1.22-alpine AS builder

WORKDIR /src

COPY products/poller/ ./products/poller/
RUN cd products/poller && go mod download

RUN cd products/poller && CGO_ENABLED=0 go build -o poller ./cmd/poller

# ------------------------------------------------------------

FROM alpine:3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /src/products/poller/poller ./poller

CMD ["./poller"]