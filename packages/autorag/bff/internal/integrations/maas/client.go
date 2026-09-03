package maas

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const ReturnAllModelsHeader = "X-MaaS-Return-All-Models"

// Model and Response are transport representations of the MaaS BFF contract.
// They are consumed by the AutoRAG repository and never exposed by the API.
type Model struct {
	ID            string `json:"id"`
	ModelID       string `json:"model_id"`
	Name          string `json:"name"`
	DisplayName   string `json:"display_name"`
	DisplayNameV2 string `json:"displayName"`
	Description   string `json:"description"`
	ModelDetails  *struct {
		DisplayName string `json:"displayName"`
		Description string `json:"description"`
	} `json:"modelDetails"`
	ModelDetailsSnake *struct {
		DisplayName string `json:"display_name"`
		Description string `json:"description"`
	} `json:"model_details"`
}

type Response struct {
	Data struct {
		Data []Model `json:"data"`
	} `json:"data"`
}

type Client struct {
	baseURL         string
	http            *http.Client
	authMethod      string
	authTokenHeader string
	authTokenPrefix string
}

type TransportError struct {
	StatusCode int
	Message    string
	Cause      error
}

func (e *TransportError) Error() string { return e.Message }
func (e *TransportError) Unwrap() error { return e.Cause }

func NewClient(baseURL, authMethod, authTokenHeader, authTokenPrefix string, httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 30 * time.Second}
	}
	return &Client{baseURL: strings.TrimRight(baseURL, "/"), http: httpClient, authMethod: authMethod, authTokenHeader: authTokenHeader, authTokenPrefix: authTokenPrefix}
}

func (c *Client) ListModels(ctx context.Context, token string, headers map[string]string) (Response, error) {
	var empty Response
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/models", nil)
	if err != nil {
		return empty, fmt.Errorf("create MaaS request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	if token != "" && c.authMethod == "user_token" && c.authTokenHeader != "" {
		req.Header.Set(c.authTokenHeader, c.authTokenPrefix+token)
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res, err := c.http.Do(req)
	if err != nil {
		return empty, &TransportError{StatusCode: http.StatusServiceUnavailable, Message: "MaaS BFF is unavailable", Cause: err}
	}
	defer res.Body.Close()
	if res.StatusCode >= http.StatusBadRequest {
		statusCode := res.StatusCode
		if statusCode >= http.StatusInternalServerError {
			statusCode = http.StatusServiceUnavailable
		}
		return empty, &TransportError{StatusCode: statusCode, Message: fmt.Sprintf("MaaS BFF returned status %d", res.StatusCode)}
	}
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return empty, &TransportError{StatusCode: http.StatusBadGateway, Message: "invalid response from MaaS BFF", Cause: err}
	}
	var parsed Response
	if err := json.Unmarshal(body, &parsed); err != nil {
		return empty, &TransportError{StatusCode: http.StatusBadGateway, Message: "invalid response from MaaS BFF", Cause: err}
	}
	return parsed, nil
}
