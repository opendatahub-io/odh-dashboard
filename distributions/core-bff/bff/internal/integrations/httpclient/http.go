// Package httpclient provides an HTTP client for upstream service communication.
package httpclient

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"
)

const maxResponseBodySize = 10 << 20 // 10 MB

// HTTPClientInterface defines the interface for HTTP client operations.
type HTTPClientInterface interface {
	GET(ctx context.Context, url string) ([]byte, error)
	POST(ctx context.Context, url string, body io.Reader) ([]byte, error)
	PATCH(ctx context.Context, url string, body io.Reader) ([]byte, error)
}

// HTTPClient implements HTTPClientInterface for making HTTP requests.
type HTTPClient struct {
	client    *http.Client
	baseURL   string
	RequestID string
	logger    *slog.Logger
	Headers   http.Header
}

// ErrorResponse represents an HTTP error response body.
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// HTTPError represents an HTTP error with status code and error details.
type HTTPError struct {
	StatusCode int `json:"-"`
	ErrorResponse
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s - %s", e.StatusCode, e.Code, e.Message)
}

// NewHTTPClient creates a new HTTP client instance.
func NewHTTPClient(logger *slog.Logger, requestID string, baseURL string, headers http.Header, insecureSkipVerify bool) (HTTPClientInterface, error) {
	return &HTTPClient{
		client: &http.Client{Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				MinVersion:         tls.VersionTLS12,
				InsecureSkipVerify: insecureSkipVerify, //nolint:gosec // G402: controlled by CLI flag, dev-only
			},
		}},
		baseURL:   baseURL,
		RequestID: requestID,
		logger:    logger,
		Headers:   headers,
	}, nil
}

func (c *HTTPClient) GetRequestID() string {
	return c.RequestID
}

func (c *HTTPClient) GET(ctx context.Context, url string) ([]byte, error) {
	return c.doRequest(ctx, http.MethodGet, url, nil, http.StatusOK)
}

func (c *HTTPClient) POST(ctx context.Context, url string, body io.Reader) ([]byte, error) {
	return c.doRequest(ctx, http.MethodPost, url, body, http.StatusCreated)
}

func (c *HTTPClient) PATCH(ctx context.Context, url string, body io.Reader) ([]byte, error) {
	return c.doRequest(ctx, http.MethodPatch, url, body, http.StatusOK)
}

func (c *HTTPClient) doRequest(ctx context.Context, method, url string, body io.Reader, expectedStatus int) ([]byte, error) {
	requestID := uuid.NewString()
	fullURL := c.baseURL + url

	req, err := http.NewRequestWithContext(ctx, method, fullURL, body)
	if err != nil {
		return nil, err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	c.applyHeaders(req)
	logUpstreamReq(c.logger, requestID, req)

	response, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBodySize))
	logUpstreamResp(c.logger, requestID, response)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if response.StatusCode != expectedStatus {
		return nil, c.parseErrorResponse(response.StatusCode, respBody)
	}

	return respBody, nil
}

func (c *HTTPClient) parseErrorResponse(statusCode int, body []byte) *HTTPError {
	var errorResponse ErrorResponse
	if err := json.Unmarshal(body, &errorResponse); err != nil {
		c.logger.Warn("received non-JSON error response",
			"status_code", statusCode,
			"body_preview", string(body[:min(len(body), 200)]))

		errorResponse = ErrorResponse{
			Code:    strconv.Itoa(statusCode),
			Message: fmt.Sprintf("HTTP %d: %s", statusCode, string(body)),
		}
	}

	httpError := &HTTPError{
		StatusCode:    statusCode,
		ErrorResponse: errorResponse,
	}

	if httpError.Code == "" {
		httpError.Code = strconv.Itoa(statusCode)
	}
	return httpError
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

func logUpstreamReq(logger *slog.Logger, reqID string, req *http.Request) {
	logger.Debug("Making upstream HTTP request", slog.String("request_id", reqID), slog.Any("request", helpers.RequestLogValuer{Request: req}))
}

func logUpstreamResp(logger *slog.Logger, reqID string, resp *http.Response) {
	logger.Debug("Received upstream HTTP response", slog.String("request_id", reqID), slog.Any("response", helpers.ResponseLogValuer{Response: resp}))
}
