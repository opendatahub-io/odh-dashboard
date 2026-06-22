// Package bffclient provides HTTP client implementations for inter-BFF communication.
package bffclient

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// BFFClientInterface defines the interface for inter-BFF communication
type BFFClientInterface interface {
	// Call makes a request to the target BFF
	// method: HTTP method (GET, POST, PUT, DELETE, etc.)
	// path: API path (e.g., "/tokens")
	// body: request body (will be JSON encoded, nil for no body)
	// response: pointer to response struct (will be JSON decoded)
	Call(ctx context.Context, method, path string, body any, response any) error

	// IsAvailable checks if the target BFF is reachable (best effort health check)
	IsAvailable(ctx context.Context) bool

	// GetBaseURL returns the target BFF's base URL
	GetBaseURL() string

	// GetTarget returns the target BFF identifier
	GetTarget() BFFTarget
}

// HTTPBFFClient implements BFFClientInterface using HTTP requests.
type HTTPBFFClient struct {
	baseURL         string
	target          BFFTarget
	httpClient      *http.Client
	authToken       string
	customHeaders   map[string]string
	authTokenHeader string // Header to send auth token in (e.g., "x-forwarded-access-token")
	authTokenPrefix string // Prefix for auth token (e.g., "" or "Bearer ")
}

type clientConfig struct {
	BaseURL            string
	Target             BFFTarget
	AuthToken          string
	CustomHeaders      map[string]string
	AuthTokenHeader    string
	AuthTokenPrefix    string
	InsecureSkipVerify bool
	RootCAs            *x509.CertPool
}

// NewHTTPBFFClient creates a new HTTP-based BFF client.
func NewHTTPBFFClient(baseURL string, target BFFTarget, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) *HTTPBFFClient {
	return newHTTPBFFClient(clientConfig{
		BaseURL:            baseURL,
		Target:             target,
		AuthToken:          authToken,
		InsecureSkipVerify: insecureSkipVerify,
		RootCAs:            rootCAs,
	})
}

// NewHTTPBFFClientWithHeaders creates a new HTTP-based BFF client with custom headers.
func NewHTTPBFFClientWithHeaders(baseURL string, target BFFTarget, authToken string, customHeaders map[string]string, insecureSkipVerify bool, rootCAs *x509.CertPool) *HTTPBFFClient {
	return newHTTPBFFClient(clientConfig{
		BaseURL:            baseURL,
		Target:             target,
		AuthToken:          authToken,
		CustomHeaders:      customHeaders,
		InsecureSkipVerify: insecureSkipVerify,
		RootCAs:            rootCAs,
	})
}

func newHTTPBFFClient(cfg clientConfig) *HTTPBFFClient {
	tlsConfig := &tls.Config{
		MinVersion:         tls.VersionTLS12,
		InsecureSkipVerify: cfg.InsecureSkipVerify, //nolint:gosec // G402: controlled by CLI flag, dev-only
	}
	if cfg.RootCAs != nil {
		tlsConfig.RootCAs = cfg.RootCAs
	}

	return &HTTPBFFClient{
		baseURL:         cfg.BaseURL,
		target:          cfg.Target,
		authToken:       cfg.AuthToken,
		customHeaders:   cfg.CustomHeaders,
		authTokenHeader: cfg.AuthTokenHeader,
		authTokenPrefix: cfg.AuthTokenPrefix,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: tlsConfig,
			},
		},
	}
}

// Call makes a request to the target BFF.
func (c *HTTPBFFClient) Call(ctx context.Context, method, path string, body any, response any) error {
	req, err := c.buildRequest(ctx, method, path, body)
	if err != nil {
		return err
	}

	statusCode, respBody, err := c.executeRequest(req)
	if err != nil {
		return err
	}

	if statusCode >= 400 {
		return c.handleErrorResponse(statusCode, respBody)
	}

	if response != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, response); err != nil {
			bodyPreview := string(respBody)
			if len(bodyPreview) > 200 {
				bodyPreview = bodyPreview[:200] + "..."
			}
			return NewInvalidResponseError(c.target, fmt.Sprintf("failed to unmarshal response: %v (body: %q)", err, bodyPreview))
		}
	}

	return nil
}

func (c *HTTPBFFClient) buildRequest(ctx context.Context, method, path string, body any) (*http.Request, error) {
	url := c.baseURL + path

	var bodyReader io.Reader
	if body != nil {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return nil, NewBFFClientErrorWithTarget(ErrCodeInternalError, fmt.Sprintf("failed to marshal request body: %v", err), c.target, 500)
		}
		bodyReader = bytes.NewBuffer(bodyBytes)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, NewBFFClientErrorWithTarget(ErrCodeInternalError, fmt.Sprintf("failed to create request: %v", err), c.target, 500)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")

	authHeader := c.authTokenHeader
	if authHeader == "" {
		authHeader = "x-forwarded-access-token"
	}
	if c.authToken != "" {
		req.Header.Set(authHeader, c.authTokenPrefix+c.authToken)
	}

	for key, value := range c.customHeaders {
		if strings.EqualFold(key, authHeader) || strings.EqualFold(key, "Authorization") {
			continue
		}
		req.Header.Set(key, value)
	}

	return req, nil
}

func (c *HTTPBFFClient) executeRequest(req *http.Request) (int, []byte, error) {
	resp, err := c.httpClient.Do(req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return 0, nil, NewConnectionError(c.target, fmt.Sprintf("request to %s BFF timed out", c.target))
		}
		if errors.Is(err, context.Canceled) {
			return 0, nil, NewConnectionError(c.target, fmt.Sprintf("request to %s BFF was canceled", c.target))
		}
		return 0, nil, NewConnectionError(c.target, fmt.Sprintf("failed to connect to %s BFF: %v", c.target, err))
	}
	defer resp.Body.Close()

	const maxResponseBodySize = 10 << 20 // 10 MB
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBodySize))
	if err != nil {
		return 0, nil, NewInvalidResponseError(c.target, fmt.Sprintf("failed to read response body: %v", err))
	}

	return resp.StatusCode, body, nil
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
