package api

import (
	"encoding/json"
	"net/http"
)

// NewRouter creates the HTTP router with all endpoints
func NewRouter() http.Handler {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /healthcheck", healthHandler)

	// Chat endpoint - TODO: implement LLM + MCP integration
	mux.HandleFunc("POST /api/chat", chatHandler)

	// Context endpoint - returns page context info
	mux.HandleFunc("GET /api/context", contextHandler)

	// Quick actions - returns suggested prompts based on context
	mux.HandleFunc("GET /api/quick-actions", quickActionsHandler)

	return corsMiddleware(mux)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// ChatRequest is the request body for /api/chat
type ChatRequest struct {
	Message string            `json:"message"`
	Context map[string]string `json:"context,omitempty"`
}

// ChatResponse is the response from /api/chat
type ChatResponse struct {
	Response  string   `json:"response"`
	ToolCalls []string `json:"toolCalls,omitempty"`
}

func chatHandler(w http.ResponseWriter, r *http.Request) {
	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// TODO: Replace with actual LLM call via Llama Stack
	// TODO: Integrate MCP client for tool calling
	response := ChatResponse{
		Response: "I'm the RHOAI Assistant. This is a stub response - wire me up to Llama Stack and MCP!",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func contextHandler(w http.ResponseWriter, r *http.Request) {
	// Returns current page context for the assistant
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"page":    r.URL.Query().Get("page"),
		"project": r.URL.Query().Get("project"),
	})
}

// QuickAction represents a suggested prompt
type QuickAction struct {
	Label  string `json:"label"`
	Prompt string `json:"prompt"`
}

func quickActionsHandler(w http.ResponseWriter, r *http.Request) {
	page := r.URL.Query().Get("page")

	actions := []QuickAction{
		{Label: "How do I create a workbench?", Prompt: "How do I create a workbench?"},
		{Label: "How do I deploy a model?", Prompt: "How do I deploy a model?"},
		{Label: "Tell me about Gen AI features", Prompt: "Tell me about Gen AI features"},
	}

	// Context-aware actions
	switch page {
	case "projects":
		actions = append([]QuickAction{
			{Label: "Create a new project", Prompt: "Help me create a new data science project"},
		}, actions...)
	case "workbenches":
		actions = append([]QuickAction{
			{Label: "Start a Jupyter notebook", Prompt: "How do I start a Jupyter notebook?"},
		}, actions...)
	case "model-serving":
		actions = append([]QuickAction{
			{Label: "Deploy my model", Prompt: "Help me deploy a model to production"},
		}, actions...)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(actions)
}
