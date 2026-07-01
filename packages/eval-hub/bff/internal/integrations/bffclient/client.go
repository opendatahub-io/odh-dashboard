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

// BFFClientInterface defines the contract for inter-BFF communication.
type BFFClientInterface interface {
	Call(ctx context.Context, method, path string, body interface{}, response interface{}) error
	IsAvailable(ctx context.Context) bool
	GetBaseURL() string
	GetTarget() BFFTarget
}

// HTTPBFFClient implements BFFClientInterface using HTTP.
type HTTPBFFClient struct {
	baseURL         string
	target          BFFTarget
	httpClient      *http.Client
	authToken       string
	customHeaders   map[string]string
	authTokenHeader string
	authTokenPrefix string
	allowedPaths    []string
}

// NewHTTPBFFClient creates a new HTTP-based BFF client with allowlist enforcement.
func NewHTTPBFFClient(
	baseURL string,
	target BFFTarget,
	authToken string,
	customHeaders map[string]string,
	authTokenHeader string,
	authTokenPrefix string,
	allowedPaths []string,
	insecureSkipVerify bool,
	rootCAs *x509.CertPool,
) *HTTPBFFClient {
	tlsConfig := &tls.Config{
		MinVersion:         tls.VersionTLS12,
		InsecureSkipVerify: insecureSkipVerify, //nolint:gosec // dev-only flag, validated at startup
	}
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
		allowedPaths:    allowedPaths,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: tlsConfig,
			},
		},
	}
}

// Call makes a request to the target BFF. If AllowedPaths is configured, the
// path must contain at least one allowed substring or the call is rejected locally.
func (c *HTTPBFFClient) Call(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	if len(c.allowedPaths) > 0 && !c.isPathAllowed(path) {
		return NewPathNotAllowedError(c.target, path)
	}

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

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")

	if c.authToken != "" {
		header := c.authTokenHeader
		if header == "" {
			header = "x-forwarded-access-token"
		}
		req.Header.Set(header, c.authTokenPrefix+c.authToken)
	}

	for key, value := range c.customHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return NewConnectionError(c.target, fmt.Sprintf("request to %s BFF timed out", c.target))
		}
		if errors.Is(err, context.Canceled) {
			return NewConnectionError(c.target, fmt.Sprintf("request to %s BFF was canceled", c.target))
		}
		return NewConnectionError(c.target, fmt.Sprintf("failed to connect to %s BFF: %v", c.target, err))
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return NewInvalidResponseError(c.target, fmt.Sprintf("failed to read response body: %v", err))
	}

	if resp.StatusCode >= 400 {
		return c.handleErrorResponse(resp.StatusCode, respBody)
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

func (c *HTTPBFFClient) isPathAllowed(path string) bool {
	for _, pattern := range c.allowedPaths {
		if strings.Contains(path, pattern) {
			return true
		}
	}
	return false
}

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

// IsAvailable performs a best-effort health check against /healthcheck.
func (c *HTTPBFFClient) IsAvailable(ctx context.Context) bool {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

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

func (c *HTTPBFFClient) GetBaseURL() string { return c.baseURL }

func (c *HTTPBFFClient) GetTarget() BFFTarget { return c.target }
