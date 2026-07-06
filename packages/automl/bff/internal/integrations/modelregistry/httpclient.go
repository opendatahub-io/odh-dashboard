package modelregistry

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"
)

// HTTPClientInterface defines the interface for Model Registry API HTTP operations.
// All methods accept a context.Context for cancellation and deadline propagation.
type HTTPClientInterface interface {
	GET(ctx context.Context, url string) ([]byte, error)
	POST(ctx context.Context, url string, body io.Reader) ([]byte, error)
	PATCH(ctx context.Context, url string, body io.Reader) ([]byte, error)
}

// maxResponseBodyBytes caps response body reads to prevent unbounded memory use.
const maxResponseBodyBytes = 10 * 1024 * 1024 // 10MB

// HTTPClient is an HTTP client for the Model Registry REST API.
type HTTPClient struct {
	client  *http.Client
	baseURL string
	logger  *slog.Logger
	Headers http.Header
}

// ErrorResponse represents an error response from the Model Registry API.
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// HTTPError wraps HTTP error responses for proper error handling.
type HTTPError struct {
	StatusCode int `json:"-"`
	ErrorResponse
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s - %s", e.StatusCode, e.Code, e.Message)
}

// NewHTTPClient creates a new HTTP client for the Model Registry API.
func NewHTTPClient(logger *slog.Logger, baseURL string, headers http.Header, insecureSkipVerify bool, rootCAs *x509.CertPool) (HTTPClientInterface, error) {
	tlsCfg := &tls.Config{
		InsecureSkipVerify: insecureSkipVerify,
		MinVersion:         tls.VersionTLS12,
	}
	if rootCAs != nil {
		tlsCfg.RootCAs = rootCAs
	}
	return &HTTPClient{
		client: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: tlsCfg,
			},
		},
		baseURL: baseURL,
		logger:  logger,
		Headers: headers,
	}, nil
}

func (c *HTTPClient) GET(ctx context.Context, url string) ([]byte, error) {
	requestID := uuid.NewString()
	fullURL := c.baseURL + url
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, err
	}
	c.applyHeaders(req)
	logUpstreamReq(c.logger, requestID, req)

	response, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	body, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBodyBytes))
	logUpstreamResp(c.logger, requestID, response, body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if response.StatusCode != http.StatusOK {
		return nil, parseErrorResponse(response.StatusCode, body, c.logger)
	}
	return body, nil
}

func (c *HTTPClient) POST(ctx context.Context, url string, body io.Reader) ([]byte, error) {
	requestID := uuid.NewString()
	fullURL := c.baseURL + url
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	c.applyHeaders(req)
	logUpstreamReq(c.logger, requestID, req)

	response, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBodyBytes))
	logUpstreamResp(c.logger, requestID, response, responseBody)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusCreated {
		return nil, parseErrorResponse(response.StatusCode, responseBody, c.logger)
	}
	return responseBody, nil
}

func (c *HTTPClient) PATCH(ctx context.Context, url string, body io.Reader) ([]byte, error) {
	requestID := uuid.NewString()
	fullURL := c.baseURL + url
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, fullURL, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	c.applyHeaders(req)
	logUpstreamReq(c.logger, requestID, req)

	response, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBodyBytes))
	logUpstreamResp(c.logger, requestID, response, responseBody)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if response.StatusCode != http.StatusOK {
		return nil, parseErrorResponse(response.StatusCode, responseBody, c.logger)
	}
	return responseBody, nil
}

func (c *HTTPClient) applyHeaders(req *http.Request) {
	if c.Headers != nil {
		for key, values := range c.Headers {
			for _, value := range values {
				req.Header.Add(key, value)
			}
		}
	}
}

func parseErrorResponse(statusCode int, body []byte, logger *slog.Logger) *HTTPError {
	var errorResponse ErrorResponse
	if err := json.Unmarshal(body, &errorResponse); err != nil {
		logger.Warn("received non-JSON error response",
			"status_code", statusCode,
			"body_preview", string(body[:min(len(body), 200)]))
		errorResponse = ErrorResponse{
			Code:    strconv.Itoa(statusCode),
			Message: fmt.Sprintf("HTTP %d: %s", statusCode, string(body)),
		}
	}
	if errorResponse.Code == "" {
		errorResponse.Code = strconv.Itoa(statusCode)
	}
	return &HTTPError{StatusCode: statusCode, ErrorResponse: errorResponse}
}

func logUpstreamReq(logger *slog.Logger, reqID string, req *http.Request) {
	logger.Debug("Making upstream HTTP request", slog.String("request_id", reqID), slog.Any("request", helper.RequestLogValuer{Request: req}))
}

func logUpstreamResp(logger *slog.Logger, reqID string, resp *http.Response, body []byte) {
	logger.Debug("Received upstream HTTP response", slog.String("request_id", reqID), slog.Any("response", helper.ResponseLogValuer{Response: resp, Body: body}))
}
