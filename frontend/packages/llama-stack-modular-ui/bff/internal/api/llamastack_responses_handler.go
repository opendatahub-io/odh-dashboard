package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
)

// CreateResponseRequest represents the request body for creating a response
type CreateResponseRequest struct {
	// === REQUIRED PARAMETERS ===
	Input string `json:"input"`
	Model string `json:"model"`

	// === CORE PARAMETERS ===
	VectorStoreIDs     []string `json:"vector_store_ids,omitempty"`
	PreviousResponseID string   `json:"previous_response_id,omitempty"`
	Store              *bool    `json:"store,omitempty"`

	// === GENERATION PARAMETERS ===
	Temperature     *float64 `json:"temperature,omitempty"`
	TopP            *float64 `json:"top_p,omitempty"`
	MaxOutputTokens *int64   `json:"max_output_tokens,omitempty"`
	TopLogprobs     *int64   `json:"top_logprobs,omitempty"`

	// === TOOL PARAMETERS ===
	MaxToolCalls      *int64 `json:"max_tool_calls,omitempty"`
	ParallelToolCalls *bool  `json:"parallel_tool_calls,omitempty"`

	// === ADVANCED PARAMETERS ===
	Instructions string `json:"instructions,omitempty"`
	Background   *bool  `json:"background,omitempty"`
	ServiceTier  string `json:"service_tier,omitempty"`
	Truncation   string `json:"truncation,omitempty"`

	// === STREAMING PARAMETERS ===
	Stream        *bool                  `json:"stream,omitempty"`
	StreamOptions map[string]interface{} `json:"stream_options,omitempty"`

	// === IDENTIFICATION PARAMETERS ===
	User             string `json:"user,omitempty"`
	SafetyIdentifier string `json:"safety_identifier,omitempty"`
	PromptCacheKey   string `json:"prompt_cache_key,omitempty"`

	// === RESPONSE FORMAT PARAMETERS ===
	ResponseFormat map[string]interface{} `json:"response_format,omitempty"`
	Include        []string               `json:"include,omitempty"`
	Metadata       map[string]string      `json:"metadata,omitempty"`

	// === LLAMA STACK EXTENSIONS ===
	MaxInferIters *int `json:"max_infer_iters,omitempty"`
}

type ResponseData struct {
	Data *responses.Response `json:"data"`
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

	// Convert to client params
	params := clients.CreateResponseParams{
		Input:              createRequest.Input,
		Model:              createRequest.Model,
		VectorStoreIDs:     createRequest.VectorStoreIDs,
		PreviousResponseID: createRequest.PreviousResponseID,
		Store:              createRequest.Store,
		Temperature:        createRequest.Temperature,
		TopP:               createRequest.TopP,
		MaxOutputTokens:    createRequest.MaxOutputTokens,
		TopLogprobs:        createRequest.TopLogprobs,
		MaxToolCalls:       createRequest.MaxToolCalls,
		ParallelToolCalls:  createRequest.ParallelToolCalls,
		Instructions:       createRequest.Instructions,
		Background:         createRequest.Background,
		ServiceTier:        createRequest.ServiceTier,
		Truncation:         createRequest.Truncation,
		Stream:             createRequest.Stream,
		StreamOptions:      createRequest.StreamOptions,
		User:               createRequest.User,
		SafetyIdentifier:   createRequest.SafetyIdentifier,
		PromptCacheKey:     createRequest.PromptCacheKey,
		ResponseFormat:     createRequest.ResponseFormat,
		Include:            createRequest.Include,
		Metadata:           createRequest.Metadata,
		MaxInferIters:      createRequest.MaxInferIters,
	}

	response, err := app.repositories.LlamaStackResponses.CreateResponse(ctx, params)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseData := ResponseData{
		Data: response,
	}

	err = app.WriteJSON(w, http.StatusCreated, responseData, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// LlamaStackGetResponseHandler handles GET /genai/v1/responses/{id}
func (app *App) LlamaStackGetResponseHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	responseID := params.ByName("id")

	if responseID == "" {
		app.badRequestResponse(w, r, errors.New("response id is required"))
		return
	}

	response, err := app.repositories.LlamaStackResponses.GetResponse(ctx, responseID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseData := ResponseData{
		Data: response,
	}

	err = app.WriteJSON(w, http.StatusOK, responseData, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
