package integrations

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	helper "github.com/opendatahub-io/rag-playground/internal/helpers"
)

type HTTPClientInterface interface {
	GET(url string) ([]byte, error)
	POST(url string, body io.Reader) ([]byte, error)
	PATCH(url string, body io.Reader) ([]byte, error)
}

type HTTPClient struct {
	client  *http.Client
	baseURL string
	logger  *slog.Logger
}

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type HTTPError struct {
	StatusCode int `json:"-"`
	ErrorResponse
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s - %s", e.StatusCode, e.Code, e.Message)
}

func NewHTTPClient(logger *slog.Logger, baseURL string) (HTTPClientInterface, error) {

	return &HTTPClient{
		client: &http.Client{Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}},
		baseURL: baseURL,
		logger:  logger,
	}, nil
}

func (c *HTTPClient) GET(url string) ([]byte, error) {
	requestId := uuid.NewString()

	fullURL := c.baseURL + url
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, err
	}

	logUpstreamReq(c.logger, requestId, req)

	response, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}

	defer func() {
		if closeErr := response.Body.Close(); closeErr != nil {
			c.logger.Warn("failed to close response body", "error", closeErr)
		}
	}()

	body, err := io.ReadAll(response.Body)
	logUpstreamResp(c.logger, requestId, response, body)

	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	return body, nil
}

func (c *HTTPClient) POST(url string, body io.Reader) ([]byte, error) {
	requestId := uuid.NewString()

	fullURL := c.baseURL + url
	fmt.Println(fullURL)
	req, err := http.NewRequest("POST", fullURL, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	logUpstreamReq(c.logger, requestId, req)

	response, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}

	defer func() {
		if closeErr := response.Body.Close(); closeErr != nil {
			c.logger.Warn("failed to close response body", "error", closeErr)
		}
	}()

	responseBody, err := io.ReadAll(response.Body)
	logUpstreamResp(c.logger, requestId, response, responseBody)

	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	// Certain operations like DB creation just return 200
	if response.StatusCode != http.StatusCreated && response.StatusCode != http.StatusOK {
		var errorResponse ErrorResponse
		if err := json.Unmarshal(responseBody, &errorResponse); err != nil {
			return nil, fmt.Errorf("error parsing error response: %w", err)
		}
		httpError := &HTTPError{
			StatusCode:    response.StatusCode,
			ErrorResponse: errorResponse,
		}
		//Sometimes the code comes empty from model registry API
		//also not all error codes are correctly implemented
		//see https://github.com/kubeflow/model-registry/issues/95
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

	logUpstreamReq(c.logger, requestId, req)

	response, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}

	defer func() {
		if closeErr := response.Body.Close(); closeErr != nil {
			c.logger.Warn("failed to close response body", "error", closeErr)
		}
	}()

	responseBody, err := io.ReadAll(response.Body)
	logUpstreamResp(c.logger, requestId, response, responseBody)

	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if response.StatusCode != http.StatusOK {
		var errorResponse ErrorResponse
		if err := json.Unmarshal(responseBody, &errorResponse); err != nil {
			return nil, fmt.Errorf("error parsing error response: %w", err) // updated wording
		}
		httpError := &HTTPError{
			StatusCode:    response.StatusCode,
			ErrorResponse: errorResponse,
		}
		//Sometimes the code comes empty from model registry API
		//also not all error codes are correctly implemented
		//see https://github.com/kubeflow/model-registry/issues/95
		if httpError.Code == "" {
			httpError.Code = strconv.Itoa(response.StatusCode)
		}
		return nil, httpError
	}

	return responseBody, nil
}

func logUpstreamReq(logger *slog.Logger, reqId string, req *http.Request) {
	logger.Debug("Making upstream HTTP request", slog.String("request_id", reqId), slog.Any("request", helper.RequestLogValuer{Request: req}))
}

func logUpstreamResp(logger *slog.Logger, reqId string, resp *http.Response, body []byte) {
	logger.Debug("Received upstream HTTP response", slog.String("request_id", reqId), slog.Any("response", helper.ResponseLogValuer{Response: resp, Body: body}))
}
