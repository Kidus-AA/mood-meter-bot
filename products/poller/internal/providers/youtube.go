package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"os"
	"time"
)

type YouTubeProvider struct {
    http   *http.Client
    apiKey string
    region string
}

func NewYouTubeProvider() *YouTubeProvider {
    return &YouTubeProvider{
        http:   &http.Client{Timeout: 8 * time.Second},
        apiKey: os.Getenv("YOUTUBE_API_KEY"),
        region: getenvDefault("YOUTUBE_REGION", "US"),
    }
}

func (y *YouTubeProvider) Name() string { return "youtube" }

func (y *YouTubeProvider) Fetch(ctx context.Context, limit int) ([]TrendItem, error) {
    if y.apiKey == "" {
        return nil, fmt.Errorf("youtube: YOUTUBE_API_KEY not set")
    }
    if limit <= 0 || limit > 50 { // API max 50
        limit = 50
    }

    u, _ := url.Parse("https://www.googleapis.com/youtube/v3/videos")
    q := u.Query()
    q.Set("part", "snippet,statistics")
    q.Set("chart", "mostPopular")
    q.Set("regionCode", y.region)
    q.Set("maxResults", fmt.Sprintf("%d", limit))
    q.Set("key", y.apiKey)
    u.RawQuery = q.Encode()

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
    if err != nil {
        return nil, err
    }

    resp, err := y.http.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("youtube: non-200 status %d", resp.StatusCode)
    }

    var ytResp struct {
        Items []struct {
            ID      string `json:"id"`
            Snippet struct {
                Title      string `json:"title"`
                Thumbnails struct {
                    Medium struct {
                        URL string `json:"url"`
                    } `json:"medium"`
                } `json:"thumbnails"`
            } `json:"snippet"`
            Statistics struct {
                ViewCount string `json:"viewCount"`
            } `json:"statistics"`
        } `json:"items"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&ytResp); err != nil {
        return nil, err
    }

    var items []TrendItem
    now := time.Now()
    for _, v := range ytResp.Items {
        if v.ID == "" {
            continue
        }
        views := parseInt64(v.Statistics.ViewCount)
        score := normaliseYouTubeViews(views)
        items = append(items, TrendItem{
            ID:       v.ID,
            Title:    v.Snippet.Title,
            URL:      "https://www.youtube.com/watch?v=" + v.ID,
            ImageURL: v.Snippet.Thumbnails.Medium.URL,
            Score:    score,
            SeenAt:   now,
        })
    }
    return items, nil
}

func normaliseYouTubeViews(v int64) float64 {
    if v < 0 {
        v = 0
    }
    return math.Log10(float64(v)+1) / 9 * 100
}

func parseInt64(s string) int64 {
    var n int64
    for i := 0; i < len(s); i++ {
        c := s[i]
        if c < '0' || c > '9' {
            break
        }
        n = n*10 + int64(c-'0')
    }
    return n
}