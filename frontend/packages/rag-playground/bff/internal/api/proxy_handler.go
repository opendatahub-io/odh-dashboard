package api

import (
	"io"
	"log/slog"
	"net/http"

	helper "github.com/opendatahub-io/rag-playground/internal/helpers"
)

// HandleLlamaStackProxy handles proxying requests to the Llama Stack server
func (app *App) HandleLlamaStackProxy(w http.ResponseWriter, r *http.Request) {
	logger := helper.GetContextLoggerFromReq(r)

	if app.config.LlamaStackURL == "" {
		logger.Error("Llama Stack URL not configured")
		http.Error(w, "Llama Stack URL not configured", http.StatusInternalServerError)
		return
	}

	// Remove '/llama-stack' prefix and proxy the rest of the path
	proxyPath := r.URL.Path[len("/llama-stack"):]
	proxyURL := app.config.LlamaStackURL + proxyPath
	if r.URL.RawQuery != "" {
		proxyURL += "?" + r.URL.RawQuery
	}

	// Log the proxied call
	logger.Info("Proxying llama-stack call (unprotected)",
		slog.String("method", r.Method),
		slog.String("original_path", r.URL.Path),
		slog.String("proxy_url", proxyURL))

	// Create new request
	req, err := http.NewRequest(r.Method, proxyURL, r.Body)
	if err != nil {
		logger.Error("Failed to create proxy request", slog.String("error", err.Error()))
		http.Error(w, "Failed to create proxy request: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Copy all headers
	for k, v := range r.Header {
		req.Header[k] = v
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		logger.Error("Proxy request failed", slog.String("error", err.Error()), slog.String("proxy_url", proxyURL))
		http.Error(w, "Proxy error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			logger.Error("Failed to close response body", slog.String("error", err.Error()))
		}
	}()

	// Log the response status
	logger.Info("Llama-stack response",
		slog.String("proxy_url", proxyURL),
		slog.Int("status_code", resp.StatusCode))

	// Copy response headers
	for k, v := range resp.Header {
		w.Header()[k] = v
	}
	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		logger.Error("Failed to copy response body", slog.String("error", err.Error()))
	}
}
