package externalmodels

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// chatCompletionRequest represents an OpenAI-compatible chat completion request
type chatCompletionRequest struct {
	Model     string                  `json:"model"`
	Messages  []chatCompletionMessage `json:"messages"`
	MaxTokens int                     `json:"max_tokens,omitempty"`
}

// chatCompletionMessage represents a message in the chat completion request
type chatCompletionMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// embeddingRequest represents an OpenAI-compatible embeddings request
type embeddingRequest struct {
	Model      string `json:"model"`
	Input      string `json:"input"`
	Dimensions *int   `json:"dimensions,omitempty"`
}

// ExternalModelsClientInterface defines the interface for external models client operations
type ExternalModelsClientInterface interface {
	VerifyModel(ctx context.Context, modelID string, embeddingDimension *int) (*models.VerifyExternalModelResponse, error)
}

// ExternalModelsClient handles communication with external model endpoints
type ExternalModelsClient struct {
	logger     *slog.Logger
	httpClient *http.Client
	baseURL    string
	apiKey     string
	modelType  models.ModelTypeEnum
}

// NewExternalModelsClient creates a new client for verifying external model endpoints
func NewExternalModelsClient(
	logger *slog.Logger,
	baseURL string,
	apiKey string,
	modelType models.ModelTypeEnum,
) (*ExternalModelsClient, error) {
	return NewExternalModelsClientWithTLS(logger, baseURL, apiKey, modelType, false, nil)
}

// NewExternalModelsClientWithTLS creates a new client with custom TLS configuration
func NewExternalModelsClientWithTLS(
	logger *slog.Logger,
	baseURL string,
	apiKey string,
	modelType models.ModelTypeEnum,
	insecureSkipVerify bool,
	rootCAs *x509.CertPool,
) (*ExternalModelsClient, error) {
	tlsConfig := &tls.Config{InsecureSkipVerify: insecureSkipVerify}
	if rootCAs != nil {
		tlsConfig.RootCAs = rootCAs
	}

	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
		Timeout: 35 * time.Second, // Slightly longer than context timeout
	}

	return &ExternalModelsClient{
		logger:     logger,
		httpClient: httpClient,
		baseURL:    baseURL,
		apiKey:     apiKey,
		modelType:  modelType,
	}, nil
}

// VerifyModel tests the external model endpoint and validates OpenAI compatibility
func (c *ExternalModelsClient) VerifyModel(ctx context.Context, modelID string, embeddingDimension *int) (*models.VerifyExternalModelResponse, error) {
	startTime := time.Now()

	// Build test request based on model type using typed OpenAI-compatible structs
	var requestBody []byte
	var endpoint string
	var err error

	if c.modelType == models.ModelTypeLLM {
		// Chat completions test - send minimal request to validate endpoint compatibility
		endpoint = "/chat/completions"
		chatReq := chatCompletionRequest{
			Model: modelID,
			Messages: []chatCompletionMessage{
				{Role: "user", Content: "test"},
			},
			MaxTokens: 10,
		}
		requestBody, err = json.Marshal(chatReq)
		if err != nil {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to marshal chat request: %v", err))
		}
	} else {
		// Embeddings test - send minimal request to validate endpoint compatibility
		endpoint = "/embeddings"
		embeddingReq := embeddingRequest{
			Model:      modelID,
			Input:      "test",
			Dimensions: embeddingDimension,
		}
		requestBody, err = json.Marshal(embeddingReq)
		if err != nil {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to marshal embedding request: %v", err))
		}
	}

	// Make request with timeout
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Create HTTP request
	fullURL := strings.TrimSuffix(c.baseURL, "/") + endpoint
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, bytes.NewReader(requestBody))
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to create request: %v", err))
	}

	// Set headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
	req.Header.Set("Content-Type", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		// Check for timeout
		if ctx.Err() == context.DeadlineExceeded {
			return nil, NewTimeoutError(c.baseURL)
		}
		return nil, NewConnectionError(c.baseURL, err.Error())
	}
	defer resp.Body.Close()

	// Read response body
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to read response: %v", err))
	}

	// Check HTTP status code
	switch resp.StatusCode {
	case http.StatusOK, http.StatusCreated:
		// Success - continue to validate response format
	case http.StatusUnauthorized, http.StatusForbidden:
		return nil, NewUnauthorizedError(c.baseURL)
	default:
		// Other error status codes - provide detailed error message
		// Include the endpoint to help diagnose configuration issues
		errorMsg := fmt.Sprintf("Request to %s returned HTTP %d", fullURL, resp.StatusCode)

		// Include response body if present, otherwise provide helpful context
		responseStr := strings.TrimSpace(string(responseBody))
		if responseStr != "" {
			errorMsg += fmt.Sprintf(": %s", responseStr)
		} else {
			// Empty response body - provide context about what might be wrong
			if resp.StatusCode == http.StatusNotFound {
				errorMsg += ". The endpoint may not exist or the base URL may be incorrect. Verify the base URL points to an OpenAI-compatible API."
			}
		}

		return nil, NewConnectionError(c.baseURL, errorMsg)
	}

	// Validate response can be unmarshaled (basic JSON structure check)
	if c.modelType == models.ModelTypeLLM {
		var chatCompletion openai.ChatCompletion
		if err := json.Unmarshal(responseBody, &chatCompletion); err != nil {
			return nil, NewNotOpenAICompatibleError(c.baseURL,
				fmt.Sprintf("Response is not valid JSON: %v", err))
		}
	} else {
		var embeddingResponse openai.CreateEmbeddingResponse
		if err := json.Unmarshal(responseBody, &embeddingResponse); err != nil {
			return nil, NewNotOpenAICompatibleError(c.baseURL,
				fmt.Sprintf("Response is not valid JSON: %v", err))
		}
	}

	// Success!
	elapsed := int(time.Since(startTime).Milliseconds())
	return &models.VerifyExternalModelResponse{
		Success:      true,
		Message:      "External model verified successfully",
		ResponseTime: elapsed,
	}, nil
}
