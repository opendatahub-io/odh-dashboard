package api

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
)

var chatProxyClient = &http.Client{Timeout: 30 * time.Second}

// ChatAgentHandler proxies a chat request to a running A2A agent.
// POST /api/v1/agents/runtimes/:ns/:name/chat
// The request body is forwarded as-is to the agent's service endpoint.
func (app *App) ChatAgentHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("ns")
	name := ps.ByName("name")
	if err := validateAgentPathParams(namespace, name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	logger := helper.GetContextLoggerFromReq(r)
	logger.Info("Chat request for agent",
		slog.String("namespace", namespace),
		slog.String("name", name))

	// Build the agent's in-cluster service URL
	agentURL := fmt.Sprintf("http://%s.%s.svc.cluster.local:8080/", name, namespace)

	// Forward the request body to the agent
	proxyReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, agentURL, r.Body)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create proxy request: %w", err))
		return
	}
	proxyReq.Header.Set("Content-Type", r.Header.Get("Content-Type"))

	resp, err := chatProxyClient.Do(proxyReq)
	if err != nil {
		logger.Error("Agent chat proxy failed",
			slog.String("url", agentURL),
			slog.Any("error", err))
		app.serverErrorResponse(w, r, fmt.Errorf("agent unreachable at %s: %w", agentURL, err))
		return
	}
	defer resp.Body.Close()

	// Forward the agent's response headers and body back to the client
	for key, values := range resp.Header {
		for _, v := range values {
			w.Header().Add(key, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)

	logger.Info("Chat response proxied",
		slog.String("name", name),
		slog.Int("status", resp.StatusCode))
}
