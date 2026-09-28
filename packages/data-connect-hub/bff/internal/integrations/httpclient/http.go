package integrations

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	helper "github.com/opendatahub-io/data-connect-hub/bff/internal/helpers"
)

type HTTPClientInterface interface {
	GET(url string) ([]byte, error)
	POST(url string, body io.Reader) ([]byte, error)
	PATCH(url string, body io.Reader) ([]byte, error)
	DELETE(url string) ([]byte, error)
}

type HTTPClient struct {
	client    *http.Client
	baseURL   string
	RequestID string
	logger    *slog.Logger
	Headers   http.Header
}

const httpClientTimeout = 30 * time.Second

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type HTTPError struct {
	StatusCode int `json:"-"`
	ErrorResponse
}

const maxResponseBodySize = 10 << 20

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s - %s", e.StatusCode, e.Code, e.Message)
}

func NewHTTPClient(logger *slog.Logger, RequestID string, baseURL string, headers http.Header, insecureSkipVerify bool, rootCAs *x509.CertPool) (HTTPClientInterface, error) {
	return NewHTTPClientWithTransport(logger, RequestID, baseURL, headers, insecureSkipVerify, rootCAs, newHTTPTransport(insecureSkipVerify, rootCAs))
}

func NewHTTPClientWithTransport(logger *slog.Logger, RequestID string, baseURL string, headers http.Header, insecureSkipVerify bool, rootCAs *x509.CertPool, transport *http.Transport) (HTTPClientInterface, error) {
	return &HTTPClient{
		client: &http.Client{
			Timeout:       httpClientTimeout,
			Transport:     transport,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return errors.New("redirects are not allowed") },
		},
		baseURL:   baseURL,
		RequestID: RequestID,
		logger:    logger,
		Headers:   headers,
	}, nil
}

func NewSharedHTTPTransport(insecureSkipVerify bool, rootCAs *x509.CertPool) *http.Transport {
	return newHTTPTransport(insecureSkipVerify, rootCAs)
}

func newHTTPTransport(insecureSkipVerify bool, rootCAs *x509.CertPool) *http.Transport {
	return &http.Transport{
		TLSClientConfig: &tls.Config{
			MinVersion:         tls.VersionTLS12,
			InsecureSkipVerify: insecureSkipVerify,
			RootCAs:            rootCAs,
		},
		IdleConnTimeout: 90 * time.Second,
	}
}

func (c *HTTPClient) GetRequestID() string {
	return c.RequestID
}

func (c *HTTPClient) GET(url string) ([]byte, error) {
	requestId := uuid.NewString()

	fullURL := c.baseURL + url
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, err
	}

	c.applyHeaders(req)

	logUpstreamReq(c.logger, requestId, req)

	response, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	body, err := readResponseBody(response.Body)
	logUpstreamResp(c.logger, requestId, response, body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if response.StatusCode != http.StatusOK {
		var errorResponse ErrorResponse
		if err := json.Unmarshal(body, &errorResponse); err != nil {
			// If we can't unmarshal as JSON, create a generic error response with the raw body
			c.logger.Warn("received non-JSON error response",
				"request_id", requestId,
				"status_code", response.StatusCode,
				"content_type", response.Header.Get("Content-Type"),
				"error_classification", "non_json_upstream_error")

			errorResponse = ErrorResponse{
				Code:    strconv.Itoa(response.StatusCode),
				Message: "upstream service returned an error",
			}
		}
		httpError := &HTTPError{
			StatusCode:    response.StatusCode,
			ErrorResponse: errorResponse,
		}

		if httpError.Code == "" {
			httpError.Code = strconv.Itoa(response.StatusCode)
		}
		return nil, httpError
	}

	return body, nil
}

func (c *HTTPClient) POST(url string, body io.Reader) ([]byte, error) {
	requestId := uuid.NewString()

	fullURL := c.baseURL + url
	req, err := http.NewRequest("POST", fullURL, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	c.applyHeaders(req)

	logUpstreamReq(c.logger, requestId, req)

	response, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	responseBody, err := readResponseBody(response.Body)
	logUpstreamResp(c.logger, requestId, response, responseBody)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusCreated && response.StatusCode != http.StatusAccepted && response.StatusCode != http.StatusNoContent {
		var errorResponse ErrorResponse
		if err := json.Unmarshal(responseBody, &errorResponse); err != nil {
			// If we can't unmarshal as JSON, create a generic error response with the raw body
			c.logger.Warn("received non-JSON error response",
				"request_id", requestId,
				"status_code", response.StatusCode,
				"content_type", response.Header.Get("Content-Type"),
				"error_classification", "non_json_upstream_error")

			errorResponse = ErrorResponse{
				Code:    strconv.Itoa(response.StatusCode),
				Message: "upstream service returned an error",
			}
		}
		httpError := &HTTPError{
			StatusCode:    response.StatusCode,
			ErrorResponse: errorResponse,
		}

		if httpError.Code == "" {
			httpError.Code = strconv.Itoa(response.StatusCode)
		}
		return nil, httpError
	}

	return responseBody, nil
}

func (c *HTTPClient) PATCH(url string, body io.Reader) ([]byte, error) {
	fullURL := c.baseURL + url
	req, err := http.NewRequest(http.MethodPatch, fullURL, body)
	if err != nil {
		return nil, err
	}

	requestId := uuid.NewString()

	req.Header.Set("Content-Type", "application/json")

	c.applyHeaders(req)

	logUpstreamReq(c.logger, requestId, req)

	response, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	responseBody, err := readResponseBody(response.Body)
	logUpstreamResp(c.logger, requestId, response, responseBody)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if response.StatusCode != http.StatusOK {
		var errorResponse ErrorResponse
		if err := json.Unmarshal(responseBody, &errorResponse); err != nil {
			// If we can't unmarshal as JSON, create a generic error response with the raw body
			c.logger.Warn("received non-JSON error response",
				"request_id", requestId,
				"status_code", response.StatusCode,
				"content_type", response.Header.Get("Content-Type"),
				"error_classification", "non_json_upstream_error")

			errorResponse = ErrorResponse{
				Code:    strconv.Itoa(response.StatusCode),
				Message: "upstream service returned an error",
			}
		}
		httpError := &HTTPError{
			StatusCode:    response.StatusCode,
			ErrorResponse: errorResponse,
		}

		if httpError.Code == "" {
			httpError.Code = strconv.Itoa(response.StatusCode)
		}
		return nil, httpError
	}
	return responseBody, nil
}

func (c *HTTPClient) DELETE(url string) ([]byte, error) {
	requestID := uuid.NewString()
	req, err := http.NewRequest(http.MethodDelete, c.baseURL+url, nil)
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
	body, err := readResponseBody(response.Body)
	logUpstreamResp(c.logger, requestID, response, body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}
	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusNoContent {
		return nil, newHTTPError(response.StatusCode, body)
	}
	return body, nil
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

func readResponseBody(reader io.Reader) ([]byte, error) {
	body, err := io.ReadAll(io.LimitReader(reader, maxResponseBodySize+1))
	if err != nil {
		return nil, err
	}
	if len(body) > maxResponseBodySize {
		return nil, fmt.Errorf("response body exceeds maximum size of %d bytes", maxResponseBodySize)
	}
	return body, nil
}

func newHTTPError(statusCode int, body []byte) error {
	var errorResponse ErrorResponse
	if err := json.Unmarshal(body, &errorResponse); err != nil {
		errorResponse = ErrorResponse{
			Code:    strconv.Itoa(statusCode),
			Message: "upstream service returned an error",
		}
	}
	if errorResponse.Code == "" {
		errorResponse.Code = strconv.Itoa(statusCode)
	}
	return &HTTPError{StatusCode: statusCode, ErrorResponse: errorResponse}
}

func logUpstreamReq(logger *slog.Logger, reqId string, req *http.Request) {
	logger.Debug("Making upstream HTTP request", slog.String("request_id", reqId), slog.Any("request", helper.RequestLogValuer{Request: req}))
}

func logUpstreamResp(logger *slog.Logger, reqId string, resp *http.Response, body []byte) {
	logger.Debug("Received upstream HTTP response", slog.String("request_id", reqId), slog.Any("response", helper.ResponseLogValuer{Response: resp}))
}
