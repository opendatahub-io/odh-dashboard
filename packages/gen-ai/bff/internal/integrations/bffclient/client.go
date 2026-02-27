package bffclient

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// BFFClientInterface defines the interface for inter-BFF communication
type BFFClientInterface interface {
	// Call makes a request to the target BFF
	// method: HTTP method (GET, POST, PUT, DELETE, etc.)
	// path: API path (e.g., "/tokens")
	// body: request body (will be JSON encoded, nil for no body)
	// response: pointer to response struct (will be JSON decoded)
	Call(ctx context.Context, method, path string, body interface{}, response interface{}) error

	// IsAvailable checks if the target BFF is reachable (best effort health check)
	IsAvailable(ctx context.Context) bool

	// GetBaseURL returns the target BFF's base URL
	GetBaseURL() string

	// GetTarget returns the target BFF identifier
	GetTarget() BFFTarget
}

// HTTPBFFClient implements BFFClientInterface using HTTP requests
type HTTPBFFClient struct {
	baseURL         string
	target          BFFTarget
	httpClient      *http.Client
	authToken       string
	customHeaders   map[string]string
	authTokenHeader string // Header to send auth token in (e.g., "x-forwarded-access-token")
	authTokenPrefix string // Prefix for auth token (e.g., "" or "Bearer ")
}

// NewHTTPBFFClient creates a new HTTP-based BFF client
func NewHTTPBFFClient(baseURL string, target BFFTarget, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) *HTTPBFFClient {
	return NewHTTPBFFClientWithConfig(baseURL, target, authToken, nil, "", "", insecureSkipVerify, rootCAs)
}

// NewHTTPBFFClientWithHeaders creates a new HTTP-based BFF client with custom headers
func NewHTTPBFFClientWithHeaders(baseURL string, target BFFTarget, authToken string, customHeaders map[string]string, insecureSkipVerify bool, rootCAs *x509.CertPool) *HTTPBFFClient {
	return NewHTTPBFFClientWithConfig(baseURL, target, authToken, customHeaders, "", "", insecureSkipVerify, rootCAs)
}

// NewHTTPBFFClientWithConfig creates a new HTTP-based BFF client with full auth configuration
func NewHTTPBFFClientWithConfig(baseURL string, target BFFTarget, authToken string, customHeaders map[string]string, authTokenHeader string, authTokenPrefix string, insecureSkipVerify bool, rootCAs *x509.CertPool) *HTTPBFFClient {
	tlsConfig := &tls.Config{InsecureSkipVerify: insecureSkipVerify}
	if rootCAs != nil {
		tlsConfig.RootCAs = rootCAs
	}

	return &HTTPBFFClient{
		baseURL:         baseURL,
		target:          target,
		authToken:       authToken,
		customHeaders:   customHeaders,
		authTokenHeader: authTokenHeader,
		authTokenPrefix: authTokenPrefix,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: tlsConfig,
			},
		},
	}
}

// Call makes a request to the target BFF
func (c *HTTPBFFClient) Call(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	url := c.baseURL + path

	var bodyReader io.Reader
	if body != nil {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return NewBFFClientErrorWithTarget(ErrCodeInternalError, fmt.Sprintf("failed to marshal request body: %v", err), c.target, 500)
		}
		bodyReader = bytes.NewBuffer(bodyBytes)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return NewBFFClientErrorWithTarget(ErrCodeInternalError, fmt.Sprintf("failed to create request: %v", err), c.target, 500)
	}

	// Set headers
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")

	// Forward auth token using configured header and prefix
	if c.authToken != "" {
		header := c.authTokenHeader
		if header == "" {
			header = "x-forwarded-access-token" // Default for ODH
		}
		req.Header.Set(header, c.authTokenPrefix+c.authToken)
	}

	// Set custom headers (e.g., kubeflow-userid for MaaS BFF)
	for key, value := range c.customHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return NewConnectionError(c.target, fmt.Sprintf("failed to connect to %s BFF: %v", c.target, err))
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return NewInvalidResponseError(c.target, fmt.Sprintf("failed to read response body: %v", err))
	}

	// Handle error status codes
	if resp.StatusCode >= 400 {
		return c.handleErrorResponse(resp.StatusCode, respBody)
	}

	// Decode response body if response pointer provided
	if response != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, response); err != nil {
			return NewInvalidResponseError(c.target, fmt.Sprintf("failed to unmarshal response: %v", err))
		}
	}

	return nil
}

// handleErrorResponse maps HTTP error codes to BFF client errors
func (c *HTTPBFFClient) handleErrorResponse(statusCode int, body []byte) error {
	message := string(body)
	if message == "" {
		message = http.StatusText(statusCode)
	}

	switch statusCode {
	case http.StatusBadRequest:
		return NewBadRequestError(c.target, message)
	case http.StatusUnauthorized:
		return NewUnauthorizedError(c.target, message)
	case http.StatusForbidden:
		return NewForbiddenError(c.target, message)
	case http.StatusNotFound:
		return NewNotFoundError(c.target, message)
	case http.StatusServiceUnavailable:
		return NewServerUnavailableError(c.target)
	default:
		if statusCode >= 500 {
			return NewServerUnavailableError(c.target)
		}
		return NewBFFClientErrorWithTarget(ErrCodeInternalError, message, c.target, statusCode)
	}
}

// IsAvailable performs a best-effort health check to the target BFF
func (c *HTTPBFFClient) IsAvailable(ctx context.Context) bool {
	// Create a context with a short timeout for health check
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Try to reach the health endpoint
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/healthcheck", nil)
	if err != nil {
		return false
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

// GetBaseURL returns the target BFF's base URL
func (c *HTTPBFFClient) GetBaseURL() string {
	return c.baseURL
}

// GetTarget returns the target BFF identifier
func (c *HTTPBFFClient) GetTarget() BFFTarget {
	return c.target
}
