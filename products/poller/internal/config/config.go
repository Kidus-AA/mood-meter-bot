package config

import (
    "os"
    "strconv"
    "time"
)

type Config struct {
    PollInterval time.Duration
    RedisURL     string
    FetchLimit   int
}

func Load() Config {
    pollInterval := 60 * time.Second
    if v := os.Getenv("POLL_INTERVAL"); v != "" {
        if d, err := time.ParseDuration(v); err == nil {
            pollInterval = d
        }
    }

    redisURL := os.Getenv("REDIS_URL")
    if redisURL == "" {
        redisURL = "redis://localhost:6379"
    }

    fetchLimit := 100
    if v := os.Getenv("FETCH_LIMIT"); v != "" {
        if n, err := strconv.Atoi(v); err == nil {
            fetchLimit = n
        }
    }

    return Config{
        PollInterval: pollInterval,
        RedisURL:     redisURL,
        FetchLimit:   fetchLimit,
    }
}