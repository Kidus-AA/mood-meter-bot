package providers

import (
    "context"
    "time"
)

type TrendItem struct {
    ID       string
    Title    string
    URL      string
    ImageURL string
    Score    float64
    SeenAt   time.Time
}

type Provider interface {
    Name() string
    Fetch(ctx context.Context, limit int) ([]TrendItem, error)
}