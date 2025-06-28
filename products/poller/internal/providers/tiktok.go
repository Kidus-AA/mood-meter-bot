package providers

import "context"

type TikTokProvider struct{}

func NewTikTokProvider() *TikTokProvider { return &TikTokProvider{} }

func (t *TikTokProvider) Name() string { return "tiktok" }

func (t *TikTokProvider) Fetch(ctx context.Context, limit int) ([]TrendItem, error) {
    // TODO: Implement TikTok API fetching.
    return nil, nil
}