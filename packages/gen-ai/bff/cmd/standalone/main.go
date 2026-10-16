package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type contextKey string

const identityKey contextKey = "portal-identity"

type identity struct {
	UserID   string
	TenantID string
}

type model struct {
	ID           string   `json:"id"`
	DisplayName  string   `json:"displayName"`
	Description  string   `json:"description,omitempty"`
	Endpoint     string   `json:"endpoint"`
	Capabilities []string `json:"capabilities"`
	Ready        bool     `json:"ready"`
}

type subscription struct {
	Name       string   `json:"name"`
	ModelIDs   []string `json:"modelIds"`
	TokenLimit int64    `json:"tokenLimit"`
	UsedTokens int64    `json:"usedTokens"`
}

type apiKey struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Subscription string    `json:"subscription"`
	CreatedAt    time.Time `json:"createdAt"`
	ExpiresAt    time.Time `json:"expiresAt"`
	Revoked      bool      `json:"revoked"`
	hash         string
}

type usage struct {
	Requests     int64 `json:"requests"`
	InputTokens  int64 `json:"inputTokens"`
	OutputTokens int64 `json:"outputTokens"`
}

type store struct {
	mu            sync.RWMutex
	models        []model
	subscriptions map[string][]subscription
	keys          map[string][]apiKey
	usage         map[string]usage
}

func newStore() *store {
	modelID := env("PORTAL_MODEL_ID", "demo-model")
	return &store{
		models: []model{{
			ID: modelID, DisplayName: env("PORTAL_MODEL_NAME", "Demo model"),
			Description: "Configured through the standalone provider adapter.",
			Endpoint:    env("MODEL_GATEWAY_URL", ""), Capabilities: []string{"text-generation"}, Ready: true,
		}},
		subscriptions: map[string][]subscription{}, keys: map[string][]apiKey{}, usage: map[string]usage{},
	}
}

func (s *store) modelsFor(_ identity) []model {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]model, len(s.models))
	copy(result, s.models)
	return result
}

func (s *store) subscriptionsFor(id identity) []subscription {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.subscriptions[id.TenantID]) == 0 {
		s.subscriptions[id.TenantID] = []subscription{{Name: "default", ModelIDs: []string{s.models[0].ID}, TokenLimit: 100000}}
	}
	result := make([]subscription, len(s.subscriptions[id.TenantID]))
	copy(result, s.subscriptions[id.TenantID])
	return result
}

func (s *store) createKey(id identity, name, sub string, ttl time.Duration) (apiKey, string, error) {
	if strings.TrimSpace(name) == "" || strings.TrimSpace(sub) == "" {
		return apiKey{}, "", errors.New("name and subscription are required")
	}
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return apiKey{}, "", fmt.Errorf("generate API key: %w", err)
	}
	secret := "maas_" + hex.EncodeToString(raw)
	hash := sha256.Sum256([]byte(secret))
	item := apiKey{ID: hex.EncodeToString(raw[:8]), Name: name, Subscription: sub, CreatedAt: time.Now().UTC(), ExpiresAt: time.Now().UTC().Add(ttl), hash: hex.EncodeToString(hash[:])}
	s.mu.Lock()
	s.keys[id.TenantID] = append(s.keys[id.TenantID], item)
	s.mu.Unlock()
	return item, secret, nil
}

func (s *store) listKeys(id identity) []apiKey {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := make([]apiKey, len(s.keys[id.TenantID]))
	copy(items, s.keys[id.TenantID])
	return items
}

func (s *store) revokeKey(id identity, keyID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.keys[id.TenantID] {
		if s.keys[id.TenantID][i].ID == keyID {
			s.keys[id.TenantID][i].Revoked = true
			return true
		}
	}
	return false
}

func (s *store) recordUsage(tenant string, input, output int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	item := s.usage[tenant]
	item.Requests++
	item.InputTokens += input
	item.OutputTokens += output
	s.usage[tenant] = item
}

func (s *store) getUsage(tenant string) usage {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.usage[tenant]
}

type app struct {
	store  *store
	client *http.Client
	logger *slog.Logger
}

func (a *app) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthcheck", a.health)
	mux.HandleFunc("GET /api/v1/config", a.config)
	mux.HandleFunc("GET /api/v1/user", a.user)
	mux.HandleFunc("GET /api/v1/namespaces", a.namespaces)
	mux.HandleFunc("GET /api/v1/models", a.models)
	mux.HandleFunc("GET /api/v1/aaa/models", a.assetModels)
	mux.HandleFunc("GET /api/v1/subscriptions", a.subscriptions)
	mux.HandleFunc("GET /api/v1/api-keys", a.apiKeys)
	mux.HandleFunc("POST /api/v1/api-keys", a.createAPIKey)
	mux.HandleFunc("DELETE /api/v1/api-keys/{id}", a.revokeAPIKey)
	mux.HandleFunc("GET /api/v1/usage", a.usage)
	mux.HandleFunc("POST /api/v1/responses", a.responses)
	// Match the Gen AI frontend's response path when requests are routed through
	// the MaaS Portal Grid proxy.
	mux.HandleFunc("POST /api/v1/lsd/responses", a.responses)
	return a.authenticate(mux)
}

func (a *app) authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthcheck" {
			next.ServeHTTP(w, r)
			return
		}
		user := firstHeader(r, "X-User-ID", "Kubeflow-Userid", "X-Forwarded-User")
		tenant := firstHeader(r, "X-Tenant-ID", "X-Forwarded-Tenant")
		if user == "" || tenant == "" {
			bearer := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
			if bearer == "" {
				bearer = strings.TrimSpace(r.Header.Get("X-Forwarded-Access-Token"))
			}
			parts := strings.SplitN(bearer, ":", 2)
			if len(parts) == 2 {
				user, tenant = parts[0], parts[1]
			} else if bearer != "" {
				// The local adapter does not validate OIDC tokens. That remains the
				// responsibility of the authenticated proxy forwarding the request.
				// Keep identity selection explicit and tenant-scoped for local use.
				if user == "" {
					user = env("PORTAL_USER_ID", "authenticated-user")
				}
				if tenant == "" {
					tenant = env("PORTAL_TENANT_ID", "default")
				}
			}
		}
		if user == "" || tenant == "" {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), identityKey, identity{UserID: user, TenantID: tenant})))
	})
}

func firstHeader(r *http.Request, names ...string) string {
	for _, name := range names {
		if value := strings.TrimSpace(r.Header.Get(name)); value != "" {
			return value
		}
	}
	return ""
}

func currentIdentity(r *http.Request) identity { return r.Context().Value(identityKey).(identity) }

func (a *app) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *app) config(w http.ResponseWriter, _ *http.Request) {
	// Grid mode does not have an LSD or Agent Sandbox deployment. Returning the
	// normal BFF contract keeps the existing frontend usable without asking it
	// to discover Kubernetes-backed capabilities.
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]bool{
			"isCustomLSD":        false,
			"sandboxesAvailable": false,
		},
	})
}

func (a *app) user(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]string{"userId": currentIdentity(r).UserID},
	})
}

func (a *app) namespaces(w http.ResponseWriter, _ *http.Request) {
	// Projects/namespaces are intentionally absent from the Grid tenant surface.
	writeJSON(w, http.StatusOK, map[string]any{"data": []any{}})
}

func (a *app) models(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"object": "list", "data": a.store.modelsFor(currentIdentity(r))})
}

func (a *app) assetModels(w http.ResponseWriter, r *http.Request) {
	models := a.store.modelsFor(currentIdentity(r))
	assets := make([]map[string]any, 0, len(models))
	for _, item := range models {
		assets = append(assets, map[string]any{
			"model_name":        item.ID,
			"model_id":          item.ID,
			"serving_runtime":   "maas",
			"api_protocol":      "openai",
			"version":           "",
			"usecase":           "text-generation",
			"description":       item.Description,
			"endpoints":         []string{item.Endpoint},
			"status":            "Running",
			"display_name":      item.DisplayName,
			"model_source_type": "maas",
			"capabilities":      item.Capabilities,
			"subscriptions": []map[string]string{
				{"name": "default", "displayName": "Default subscription"},
			},
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": assets})
}

func (a *app) subscriptions(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": a.store.subscriptionsFor(currentIdentity(r))})
}

func (a *app) apiKeys(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": a.store.listKeys(currentIdentity(r))})
}

func (a *app) createAPIKey(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Name         string `json:"name"`
		Subscription string `json:"subscription"`
		ExpiresIn    string `json:"expiresIn"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	ttl := 24 * time.Hour
	if request.ExpiresIn == "7d" {
		ttl = 7 * 24 * time.Hour
	}
	item, secret, err := a.store.createKey(currentIdentity(r), request.Name, request.Subscription, ttl)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": map[string]any{"id": item.ID, "name": item.Name, "subscription": item.Subscription, "createdAt": item.CreatedAt, "expiresAt": item.ExpiresAt, "key": secret}})
}

func (a *app) revokeAPIKey(w http.ResponseWriter, r *http.Request) {
	if !a.store.revokeKey(currentIdentity(r), r.PathValue("id")) {
		writeError(w, http.StatusNotFound, "API key not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *app) usage(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": a.store.getUsage(currentIdentity(r).TenantID)})
}

func (a *app) responses(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Model    string            `json:"model"`
		Stream   bool              `json:"stream"`
		Messages []json.RawMessage `json:"messages"`
		Input    json.RawMessage   `json:"input"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 10<<20)).Decode(&request); err != nil || request.Model == "" || (len(request.Messages) == 0 && len(request.Input) == 0) {
		writeError(w, http.StatusBadRequest, "model and messages are required")
		return
	}
	if env("MOCK_PROVIDER", "false") == "true" {
		content := ""
		if len(request.Messages) > 0 {
			var last struct {
				Content string `json:"content"`
			}
			_ = json.Unmarshal(request.Messages[len(request.Messages)-1], &last)
			content = last.Content
		} else {
			content = string(request.Input)
		}
		answer := "Echo: " + strings.Trim(content, `"`)
		a.store.recordUsage(currentIdentity(r).TenantID, int64(len(content)), int64(len(answer)))
		response := map[string]any{
			"id": "response-standalone", "model": request.Model, "status": "completed", "created_at": time.Now().UnixMilli(),
			"output": []any{map[string]any{"type": "message", "role": "assistant", "content": []any{map[string]string{"type": "output_text", "text": answer}}}},
		}
		if request.Stream {
			w.Header().Set("Content-Type", "text/event-stream")
			w.WriteHeader(http.StatusOK)
			for _, event := range []map[string]any{
				{"type": "response.output_text.delta", "delta": answer},
				{"type": "response.completed", "response": response},
			} {
				payload, _ := json.Marshal(event)
				_, _ = fmt.Fprintf(w, "data: %s\n\n", payload)
			}
			if flusher, ok := w.(http.Flusher); ok {
				flusher.Flush()
			}
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": response})
		return
	}
	endpoint := strings.TrimRight(env("MODEL_GATEWAY_URL", ""), "/")
	if endpoint == "" {
		writeError(w, http.StatusServiceUnavailable, "MODEL_GATEWAY_URL is not configured")
		return
	}
	body, _ := json.Marshal(request)
	upstream, err := http.NewRequestWithContext(r.Context(), http.MethodPost, endpoint+"/chat/completions", strings.NewReader(string(body)))
	if err != nil {
		writeError(w, http.StatusBadGateway, "invalid provider URL")
		return
	}
	upstream.Header.Set("Content-Type", "application/json")
	response, err := a.client.Do(upstream)
	if err != nil {
		writeError(w, http.StatusBadGateway, "model provider unavailable")
		return
	}
	defer response.Body.Close()
	w.WriteHeader(response.StatusCode)
	_, _ = io.Copy(w, io.LimitReader(response.Body, 10<<20))
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"error": map[string]string{"code": fmt.Sprint(status), "message": message}})
}
func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	a := &app{store: newStore(), client: &http.Client{Timeout: 3 * time.Minute}, logger: logger}
	server := &http.Server{Addr: ":" + env("PORT", "8090"), Handler: a.routes(), ReadHeaderTimeout: 10 * time.Second}
	logger.Info("starting standalone MaaS Consumer Portal service", "addr", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
