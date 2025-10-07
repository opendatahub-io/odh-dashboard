package maas

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MaaSClient is an alias for MaaSClientInterface for backward compatibility
type MaaSClient = MaaSClientInterface

// HTTPMaaSClient implements MaaSClient using HTTP requests
type HTTPMaaSClient struct {
	baseURL    string
	httpClient *http.Client
	authToken  string
}

// NewHTTPMaaSClient creates a new HTTP-based MaaS client
func NewHTTPMaaSClient(baseURL string, authToken string) *HTTPMaaSClient {
	return &HTTPMaaSClient{
		baseURL:   baseURL,
		authToken: authToken,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// setAuthHeaders adds authentication headers to the request
func (c *HTTPMaaSClient) setAuthHeaders(req *http.Request) {
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}
}

// ListModels retrieves all available models from the MaaS API
func (c *HTTPMaaSClient) ListModels(ctx context.Context) ([]models.MaaSModel, error) {
	url := fmt.Sprintf("%s/v1/models", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setAuthHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var response models.MaaSModelsResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return response.Data, nil
}

// IssueToken creates a new ephemeral token with specified TTL
func (c *HTTPMaaSClient) IssueToken(ctx context.Context, request models.MaaSTokenRequest) (*models.MaaSTokenResponse, error) {
	url := fmt.Sprintf("%s/v1/tokens", c.baseURL)

	// Set default TTL if not provided
	if request.TTL == "" {
		request.TTL = "4h"
	}

	requestBody, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	c.setAuthHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var response models.MaaSTokenResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &response, nil
}

// RevokeAllTokens invalidates all tokens for the current user
func (c *HTTPMaaSClient) RevokeAllTokens(ctx context.Context) error {
	url := fmt.Sprintf("%s/v1/tokens", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	c.setAuthHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
