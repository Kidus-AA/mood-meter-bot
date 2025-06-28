package redis

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// New returns a ready-to-use Redis client after a health check.
func New(ctx context.Context, url string) (*redis.Client, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	rdb := redis.NewClient(opt)

	c, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := rdb.Ping(c).Err(); err != nil {
		return nil, err
	}
	return rdb, nil
}