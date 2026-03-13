package externalmodels

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
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

const (
	// maxResponseBodySize limits response body reads to 10MB to prevent memory exhaustion
	maxResponseBodySize = 10 * 1024 * 1024 // 10MB
)

// ExternalModelsClient handles communication with external model endpoints
type ExternalModelsClient struct {
	logger             *slog.Logger
	httpClient         *http.Client
	baseURL            string
	apiKey             string
	modelType          models.ModelTypeEnum
	skipSSRFValidation bool // For testing only - allows localhost/private IPs
}

// isPrivateIP checks if an IP is a loopback, RFC1918, or unique-local address
// This prevents SSRF attacks targeting internal resources
func isPrivateIP(ip net.IP) bool {
	// Loopback addresses (127.0.0.0/8, ::1)
	if ip.IsLoopback() {
		return true
	}

	// Link-local addresses (169.254.0.0/16, fe80::/10)
	if ip.IsLinkLocalUnicast() {
		return true
	}

	// Check for RFC1918 private IPv4 ranges
	if ip4 := ip.To4(); ip4 != nil {
		// 10.0.0.0/8
		if ip4[0] == 10 {
			return true
		}
		// 172.16.0.0/12
		if ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31 {
			return true
		}
		// 192.168.0.0/16
		if ip4[0] == 192 && ip4[1] == 168 {
			return true
		}
	}

	// Check for unique-local IPv6 addresses (fc00::/7)
	if len(ip) == net.IPv6len && ip[0] >= 0xfc && ip[0] <= 0xfd {
		return true
	}

	return false
}

// validateBaseURL performs security checks on the base URL to prevent SSRF
func validateBaseURL(baseURL string, skipSSRFCheck bool) error {
	// Parse the URL
	parsedURL, err := url.Parse(baseURL)
	if err != nil {
		return fmt.Errorf("invalid base URL: %w", err)
	}

	// Require HTTPS or HTTP (for testing with mock servers)
	if parsedURL.Scheme != "https" && parsedURL.Scheme != "http" {
		return fmt.Errorf("base URL must use HTTP or HTTPS scheme, got: %s", parsedURL.Scheme)
	}

	// Always require HTTPS in production (only allow HTTP if SSRF check is skipped for testing)
	if parsedURL.Scheme != "https" && !skipSSRFCheck {
		return fmt.Errorf("base URL must use HTTPS scheme in production, got: %s", parsedURL.Scheme)
	}

	// Extract hostname (without port)
	hostname := parsedURL.Hostname()
	if hostname == "" {
		return fmt.Errorf("base URL must contain a valid hostname")
	}

	// Skip SSRF validation if requested (for testing only)
	if skipSSRFCheck {
		return nil
	}

	// Resolve hostname to IP addresses
	ips, err := net.LookupIP(hostname)
	if err != nil {
		return fmt.Errorf("failed to resolve hostname %s: %w", hostname, err)
	}

	if len(ips) == 0 {
		return fmt.Errorf("hostname %s resolved to no IP addresses", hostname)
	}

	// Check all resolved IPs - reject if ANY are private
	for _, ip := range ips {
		if isPrivateIP(ip) {
			return fmt.Errorf("base URL resolves to private IP address %s (SSRF protection)", ip.String())
		}
	}

	return nil
}

// NewExternalModelsClient creates a new client for verifying external model endpoints
// Uses system certificate pool for TLS verification
func NewExternalModelsClient(
	logger *slog.Logger,
	baseURL string,
	apiKey string,
	modelType models.ModelTypeEnum,
) (*ExternalModelsClient, error) {
	// Use system cert pool by default
	rootCAs, err := x509.SystemCertPool()
	if err != nil {
		return nil, fmt.Errorf("failed to load system certificate pool: %w", err)
	}
	return NewExternalModelsClientWithTLS(logger, baseURL, apiKey, modelType, rootCAs)
}

// NewExternalModelsClientWithTLS creates a new client with custom TLS configuration
// Requires rootCAs to be provided for secure TLS verification
func NewExternalModelsClientWithTLS(
	logger *slog.Logger,
	baseURL string,
	apiKey string,
	modelType models.ModelTypeEnum,
	rootCAs *x509.CertPool,
) (*ExternalModelsClient, error) {
	// Validate rootCAs is provided
	if rootCAs == nil {
		return nil, errors.New("rootCAs certificate pool is required for secure TLS verification")
	}

	// Validate base URL to prevent SSRF
	if err := validateBaseURL(baseURL, false); err != nil {
		return nil, fmt.Errorf("base URL validation failed: %w", err)
	}

	// Configure TLS with provided root CAs - never skip verification
	tlsConfig := &tls.Config{
		RootCAs:    rootCAs,
		MinVersion: tls.VersionTLS12, // Enforce minimum TLS 1.2
	}

	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
		Timeout: 35 * time.Second, // Slightly longer than context timeout
		// Prevent redirects to avoid SSRF via redirect chains
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Don't follow redirects
		},
	}

	return &ExternalModelsClient{
		logger:             logger,
		httpClient:         httpClient,
		baseURL:            baseURL,
		apiKey:             apiKey,
		modelType:          modelType,
		skipSSRFValidation: false,
	}, nil
}

// NewExternalModelsClientForTesting creates a client for testing that allows localhost/HTTP
// WARNING: Only use this in tests - it bypasses SSRF protection
func NewExternalModelsClientForTesting(
	logger *slog.Logger,
	baseURL string,
	apiKey string,
	modelType models.ModelTypeEnum,
) (*ExternalModelsClient, error) {
	// Validate base URL (allows HTTP and localhost for testing)
	if err := validateBaseURL(baseURL, true); err != nil {
		return nil, fmt.Errorf("base URL validation failed: %w", err)
	}

	// Simple HTTP client for testing - no TLS requirements
	httpClient := &http.Client{
		Timeout: 35 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Still prevent redirects in tests
		},
	}

	return &ExternalModelsClient{
		logger:             logger,
		httpClient:         httpClient,
		baseURL:            baseURL,
		apiKey:             apiKey,
		modelType:          modelType,
		skipSSRFValidation: true,
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

	// CRITICAL: Re-validate destination IPs right before making request to prevent DNS rebinding attacks
	// This is the last line of defense against SSRF - validates at request time, not just construction time
	if !c.skipSSRFValidation {
		parsedURL, err := url.Parse(fullURL)
		if err != nil {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to parse request URL: %v", err))
		}

		hostname := parsedURL.Hostname()
		if hostname == "" {
			return nil, NewConnectionError(c.baseURL, "Request URL has no hostname")
		}

		// Resolve hostname to IP addresses at request time (prevents DNS rebinding)
		ips, err := net.LookupIP(hostname)
		if err != nil {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to resolve hostname %s: %v", hostname, err))
		}

		if len(ips) == 0 {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Hostname %s resolved to no IP addresses", hostname))
		}

		// Check all resolved IPs - reject if ANY target private/internal resources
		for _, ip := range ips {
			if isPrivateIP(ip) {
				return nil, NewConnectionError(c.baseURL,
					fmt.Sprintf("Request blocked: destination %s resolves to private IP %s (SSRF protection)", hostname, ip.String()))
			}
		}

		c.logger.Debug("SSRF validation passed", "hostname", hostname, "ips", ips)
	}

	// Execute request (redirects are blocked via CheckRedirect in client config)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		// Check for timeout
		if ctx.Err() == context.DeadlineExceeded {
			return nil, NewTimeoutError(c.baseURL)
		}
		return nil, NewConnectionError(c.baseURL, err.Error())
	}
	defer resp.Body.Close()

	// Read response body with size limit to prevent memory exhaustion
	limitedReader := io.LimitReader(resp.Body, maxResponseBodySize)
	responseBody, err := io.ReadAll(limitedReader)
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to read response: %v", err))
	}

	// Check if response exceeded size limit
	if int64(len(responseBody)) == maxResponseBodySize {
		// Try to read one more byte to see if there's more data
		extraByte := make([]byte, 1)
		n, _ := resp.Body.Read(extraByte)
		if n > 0 {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Response body exceeded maximum size of %d bytes", maxResponseBodySize))
		}
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
