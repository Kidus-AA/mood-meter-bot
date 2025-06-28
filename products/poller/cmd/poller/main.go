package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os/signal"
	"syscall"
	"time"

	"poller/internal/config"
	"poller/internal/providers"
	redisclient "poller/internal/redis"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/errgroup"
)

func main() {
    // Load .env in local development; ignored if file does not exist
    _ = godotenv.Load()

    cfg := config.Load()

    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    rdb, err := redisclient.New(ctx, cfg.RedisURL)
    if err != nil {
        log.Fatalf("redis: %v", err)
    }
    log.Printf("connected to redis %s", cfg.RedisURL)

    // Instantiate providers (stubs for now)
    provs := []providers.Provider{
        providers.NewTwitchProvider(),
        providers.NewRedditProvider(),
        providers.NewYouTubeProvider(),
        providers.NewTikTokProvider(),
    }

    // Run immediately once, then every interval
    runPoll(ctx, rdb, provs, cfg)

    ticker := time.NewTicker(cfg.PollInterval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            log.Println("shutting down poller")
            return
        case <-ticker.C:
            runPoll(ctx, rdb, provs, cfg)
        }
    }
}

func runPoll(ctx context.Context, rdb *redis.Client, provs []providers.Provider, cfg config.Config) {
    g, ctx := errgroup.WithContext(ctx)

    for _, p := range provs {
        p := p // capture
        g.Go(func() error {
            items, err := p.Fetch(ctx, cfg.FetchLimit)
            if err != nil {
                log.Printf("provider %s: %v", p.Name(), err)
                // continue with others
                return nil
            }
            if len(items) == 0 {
                return nil
            }

            key := fmt.Sprintf("trends:external:%s", p.Name())
            var zs []redis.Z
            for _, it := range items {
                zs = append(zs, redis.Z{Score: it.Score, Member: it.ID})
            }

            // Replace existing set entirely to avoid stale posts
            if err := rdb.Del(ctx, key).Err(); err != nil {
                log.Printf("redis DEL %s: %v", key, err)
            }
            if _, err := rdb.ZAdd(ctx, key, zs...).Result(); err != nil {
                log.Printf("redis ZAdd %s: %v", key, err)
            }
            if _, err := rdb.Expire(ctx, key, 10*time.Minute).Result(); err != nil {
                log.Printf("redis Expire %s: %v", key, err)
            }

            // Store item details for frontend consumption.
            for _, it := range items {
                detailsKey := fmt.Sprintf("trends:external:%s:details:%s", p.Name(), it.ID)
                // Minimal JSON with title, url, image.
                if buf, err := json.Marshal(map[string]any{
                    "id":       it.ID,
                    "title":    it.Title,
                    "url":      it.URL,
                    "imageUrl": it.ImageURL,
                }); err == nil {
                    if err := rdb.Set(ctx, detailsKey, buf, 10*time.Minute).Err(); err != nil {
                        log.Printf("redis SET %s: %v", detailsKey, err)
                    }
                }
            }

            // Publish simplified update message
            payload, _ := json.Marshal(map[string]any{
                "provider": p.Name(),
                "count":    len(items),
            })
            if err := rdb.Publish(ctx, "trends:update", payload).Err(); err != nil {
                log.Printf("redis publish: %v", err)
            }
            return nil
        })
    }

    _ = g.Wait()
}