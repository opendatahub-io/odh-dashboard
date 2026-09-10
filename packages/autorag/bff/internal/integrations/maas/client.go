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

// Model and Response are transport representations of the hosted MaaS API contract.
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
	Data []Model `json:"data"`
}

type Client struct {
	http *http.Client
}

// RequestConfig contains request-scoped upstream overrides. It is intentionally
// separate from Client so credentials and endpoints never mutate shared state.
type RequestConfig struct {
	GatewayOrigin string
	APIKey        string
}

type TransportError struct {
	StatusCode int
	Message    string
	Cause      error
}

func (e *TransportError) Error() string { return e.Message }
func (e *TransportError) Unwrap() error { return e.Cause }

func NewClient(httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 30 * time.Second}
	}
	return &Client{http: httpClient}
}

func (c *Client) ListModels(ctx context.Context, config RequestConfig) (Response, error) {
	var empty Response
	if config.GatewayOrigin == "" || config.APIKey == "" {
		return empty, &TransportError{StatusCode: http.StatusBadRequest, Message: "MaaS credentials are required"}
	}
	baseURL := strings.TrimRight(config.GatewayOrigin, "/")
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/maas-api/v1/models", nil)
	if err != nil {
		return empty, fmt.Errorf("create MaaS request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+config.APIKey)
	res, err := c.http.Do(req)
	if err != nil {
		return empty, &TransportError{StatusCode: http.StatusServiceUnavailable, Message: "hosted MaaS is unavailable", Cause: err}
	}
	defer res.Body.Close()
	if res.StatusCode >= http.StatusBadRequest {
		statusCode := res.StatusCode
		if statusCode >= http.StatusInternalServerError {
			statusCode = http.StatusServiceUnavailable
		}
		return empty, &TransportError{StatusCode: statusCode, Message: fmt.Sprintf("hosted MaaS returned status %d", res.StatusCode)}
	}
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return empty, &TransportError{StatusCode: http.StatusBadGateway, Message: "invalid response from hosted MaaS", Cause: err}
	}
	var parsed Response
	if err := json.Unmarshal(body, &parsed); err != nil {
		return empty, &TransportError{StatusCode: http.StatusBadGateway, Message: "invalid response from hosted MaaS", Cause: err}
	}
	return parsed, nil
}
