package providers

import (
	"context"
	"time"
)

type TwitchProvider struct{}

func NewTwitchProvider() *TwitchProvider {
	return &TwitchProvider{}
}

func (t *TwitchProvider) Name() string { return "twitch" }

func (t *TwitchProvider) Fetch(ctx context.Context, limit int) ([]TrendItem, error) {
	// TODO: Implement real Twitch API fetching.
	return []TrendItem{
		{
			ID:    "example_twitch",
			Title: "Example Twitch Clip",
			URL:   "https://twitch.tv",
			Score: 1.0,
			SeenAt: time.Now(),
		},
	}, nil
}