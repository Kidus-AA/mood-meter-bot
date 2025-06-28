package providers

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "math"
    "net/http"
    "net/url"
    "os"
    "strings"
    "sync"
    "time"
)

type RedditProvider struct {
    http       *http.Client
    clientID   string
    secret     string
    username   string
    password   string
    subreddits string // joined by '+'

    mu          sync.Mutex
    token       string
    tokenExpiry time.Time
}

func NewRedditProvider() *RedditProvider {
    return &RedditProvider{
        http: &http.Client{Timeout: 10 * time.Second},
        clientID:   os.Getenv("REDDIT_CLIENT_ID"),
        secret:     os.Getenv("REDDIT_SECRET"),
        username:   os.Getenv("REDDIT_USERNAME"),
        password:   os.Getenv("REDDIT_PASSWORD"),
        subreddits: getenvDefault("REDDIT_SUBS", "gaming+games+livestreamfail"),
    }
}

func getenvDefault(key, def string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return def
}

func (r *RedditProvider) Name() string { return "reddit" }

func (r *RedditProvider) Fetch(ctx context.Context, limit int) ([]TrendItem, error) {
    if limit <= 0 || limit > 100 {
        limit = 100
    }
    tok, err := r.getToken(ctx)
    if err != nil {
        return nil, err
    }

    endpoint := fmt.Sprintf("https://oauth.reddit.com/r/%s/hot?limit=%d", r.subreddits, limit)

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
    if err != nil {
        return nil, err
    }
    req.Header.Set("Authorization", "bearer "+tok)
    req.Header.Set("User-Agent", "vibe-check-poller/0.1 (by u:"+r.username+")")

    resp, err := r.http.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("reddit: non-200 status %d", resp.StatusCode)
    }

    var root redditListing
    if err := json.NewDecoder(resp.Body).Decode(&root); err != nil {
        return nil, err
    }

    var items []TrendItem
    for _, child := range root.Data.Children {
        d := child.Data
        if d.ID == "" {
            continue
        }
        score := normaliseRedditScore(d.Ups)
        items = append(items, TrendItem{
            ID:       d.ID,
            Title:    d.Title,
            URL:      d.URL,
            ImageURL: d.Thumbnail,
            Score:    score,
            SeenAt:   time.Now(),
        })
    }

    return items, nil
}

// -------- internal helpers --------

type redditListing struct {
    Data struct {
        Children []struct {
            Data struct {
                ID        string  `json:"id"`
                Title     string  `json:"title"`
                URL       string  `json:"url"`
                Thumbnail string  `json:"thumbnail"`
                Ups       int     `json:"ups"`
            } `json:"data"`
        } `json:"children"`
    } `json:"data"`
}

// normaliseRedditScore converts raw upvotes into 0–100 log scale.
// Formula: score = log10(ups+1) / 6 * 100  (where 1M upvotes → ~100)
func normaliseRedditScore(ups int) float64 {
    if ups < 0 {
        ups = 0
    }
    return math.Log10(float64(ups)+1) / 6 * 100
}

// getToken lazily refreshes the OAuth token if needed.
func (r *RedditProvider) getToken(ctx context.Context) (string, error) {
    r.mu.Lock()
    if r.token != "" && time.Until(r.tokenExpiry) > 30*time.Second {
        tok := r.token
        r.mu.Unlock()
        return tok, nil
    }
    r.mu.Unlock()

    // Refresh path – outside critical section for network call.
    form := url.Values{}
    form.Set("grant_type", "password")
    form.Set("username", r.username)
    form.Set("password", r.password)

    req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://www.reddit.com/api/v1/access_token", strings.NewReader(form.Encode()))
    if err != nil {
        return "", err
    }
    req.Header.Set("User-Agent", "vibe-check-poller/0.1")
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
    req.SetBasicAuth(r.clientID, r.secret)

    resp, err := r.http.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("reddit token: status %d", resp.StatusCode)
    }

    var tr struct {
        AccessToken string `json:"access_token"`
        ExpiresIn   int    `json:"expires_in"`
        TokenType   string `json:"token_type"`
        Scope       string `json:"scope"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
        return "", err
    }
    if tr.AccessToken == "" {
        return "", errors.New("reddit token: empty access_token")
    }

    r.mu.Lock()
    r.token = tr.AccessToken
    r.tokenExpiry = time.Now().Add(time.Duration(tr.ExpiresIn-60) * time.Second) // 60 s safety margin
    tok := r.token
    r.mu.Unlock()
    return tok, nil
}