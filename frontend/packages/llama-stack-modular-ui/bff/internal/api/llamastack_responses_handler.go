package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
)

// SimplifiedResponseData contains only the essential response information
type SimplifiedResponseData struct {
	ID        string           `json:"id"`
	Model     string           `json:"model"`
	Status    string           `json:"status"`
	CreatedAt float64          `json:"created_at"`
	Content   string           `json:"content"`
	Usage     *SimplifiedUsage `json:"usage,omitempty"`
}

// SimplifiedUsage contains only populated token usage information
type SimplifiedUsage struct {
	InputTokens  int64 `json:"input_tokens,omitempty"`
	OutputTokens int64 `json:"output_tokens,omitempty"`
	TotalTokens  int64 `json:"total_tokens,omitempty"`
}

// ChatContextMessage represents a message in chat context history
type ChatContextMessage struct {
	Role    string `json:"role"`    // "user" or "assistant"
	Content string `json:"content"` // Message content
}

// CreateResponseRequest represents the request body for creating a response
type CreateResponseRequest struct {
	// === REQUIRED PARAMETERS ===
	Input string `json:"input"`
	Model string `json:"model"`

	// === CORE PARAMETERS ===
	// === WORKING PARAMETERS (tested and confirmed) ===
	VectorStoreIDs []string             `json:"vector_store_ids,omitempty"` // ✅ Enables RAG
	ChatContext    []ChatContextMessage `json:"chatcontext,omitempty"`      // ✅ Conversation history
	Temperature    *float64             `json:"temperature,omitempty"`      // ✅ Controls creativity (0.0-2.0)
	TopP           *float64             `json:"top_p,omitempty"`            // ✅ Controls randomness (0.0-1.0)
	Instructions   string               `json:"instructions,omitempty"`     // ✅ System message/behavior

	// Note: store, metadata, user, max_output_tokens, service_tier, and 20+ other
	// parameters are not working with Llama Stack's OpenAI-compatible API - removed
}

type ResponseData struct {
	Data interface{} `json:"data"`
}

// LlamaStackCreateResponseHandler handles POST /genai/v1/responses
func (app *App) LlamaStackCreateResponseHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Parse the request body
	var createRequest CreateResponseRequest
	if err := json.NewDecoder(r.Body).Decode(&createRequest); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate required fields
	if createRequest.Input == "" {
		app.badRequestResponse(w, r, errors.New("input is required"))
		return
	}
	if createRequest.Model == "" {
		app.badRequestResponse(w, r, errors.New("model is required"))
		return
	}

	// ChatContext validation (no conflicts with previous_response_id anymore)

	// Convert chat context format
	var chatContext []clients.ChatContextMessage
	for _, msg := range createRequest.ChatContext {
		chatContext = append(chatContext, clients.ChatContextMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Convert to client params (only working parameters)
	params := clients.CreateResponseParams{
		Input:          createRequest.Input,
		Model:          createRequest.Model,
		VectorStoreIDs: createRequest.VectorStoreIDs,
		ChatContext:    chatContext,
		Temperature:    createRequest.Temperature,
		TopP:           createRequest.TopP,
		Instructions:   createRequest.Instructions,
	}

	llamaResponse, err := app.repositories.LlamaStack.CreateResponse(ctx, params)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Extract the actual content from the response
	content := ""
	if len(llamaResponse.Output) > 0 {
		for _, output := range llamaResponse.Output {
			if output.Type == "message" && len(output.Content) > 0 {
				for _, contentPart := range output.Content {
					if contentPart.Type == "output_text" {
						content = contentPart.Text
						break
					}
				}
				if content != "" {
					break
				}
			}
		}
	}

	// Create simplified response
	simplified := SimplifiedResponseData{
		ID:        llamaResponse.ID,
		Model:     llamaResponse.Model,
		Status:    string(llamaResponse.Status),
		CreatedAt: llamaResponse.CreatedAt,
		Content:   content,
	}

	// Add usage if tokens are populated
	if llamaResponse.Usage.InputTokens > 0 || llamaResponse.Usage.OutputTokens > 0 || llamaResponse.Usage.TotalTokens > 0 {
		simplified.Usage = &SimplifiedUsage{
			InputTokens:  llamaResponse.Usage.InputTokens,
			OutputTokens: llamaResponse.Usage.OutputTokens,
			TotalTokens:  llamaResponse.Usage.TotalTokens,
		}
	}

	responseData := ResponseData{
		Data: simplified,
	}

	err = app.WriteJSON(w, http.StatusCreated, responseData, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
