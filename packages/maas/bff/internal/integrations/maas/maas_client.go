package maas

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// ErrMaasApiNotConfigured is returned when the client has no base URL yet
// (for example while waiting for maas-api discovery).
var ErrMaasApiNotConfigured = errors.New("maas-api is not available")

type MaasClient struct {
	httpClient      *http.Client
	logger          *slog.Logger
	maxResponseSize int64

	mu     sync.RWMutex
	prefix *url.URL // nil until SetBaseURL / NewMaasClient with a non-empty URL
}

type MaasApiError struct {
	Error string `json:"error"`
}

type MaasUpstreamError struct {
	StatusCode int
	Message    string
}

func (e *MaasUpstreamError) Error() string {
	return e.Message
}

// NewMaasClient creates a MaaS API client. An empty baseURL is allowed so the BFF
// can start before maas-api is discoverable; call SetBaseURL once the URL is known.
func NewMaasClient(logger *slog.Logger, baseURL string) (*MaasClient, error) {
	client := &MaasClient{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true, // TODO: Don't skip TLS verification; honor `insecure-skip-verify` command line flag
				},
			},
		},
		logger:          logger,
		maxResponseSize: 2 << 20, // 2MB
	}
	if baseURL == "" {
		return client, nil
	}
	if err := client.SetBaseURL(baseURL); err != nil {
		return nil, err
	}
	return client, nil
}

// SetBaseURL configures (or reconfigures) the maas-api base URL used for requests.
func (c *MaasClient) SetBaseURL(baseURL string) error {
	if baseURL == "" {
		return fmt.Errorf("maas-api base URL must not be empty")
	}
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return err
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return fmt.Errorf("maas-api base URL %q is missing scheme or host", baseURL)
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	c.prefix = parsed.JoinPath("v1")
	return nil
}

// Ready reports whether a base URL has been configured.
func (c *MaasClient) Ready() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.prefix != nil
}

func (c *MaasClient) endpoint(parts ...string) (*url.URL, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.prefix == nil {
		return nil, ErrMaasApiNotConfigured
	}
	return c.prefix.JoinPath(parts...), nil
}

func (c *MaasClient) CreateAPIKey(ctx context.Context, request models.APIKeyCreateRequest) (*models.APIKeyCreateResponse, error) {
	jsonRequest, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	endpoint, err := c.endpoint("api-keys")
	if err != nil {
		return nil, err
	}
	var apiResponse models.APIKeyCreateResponse
	err = c.sendRequest(ctx, "POST", endpoint, jsonRequest, &apiResponse, nil)
	if err != nil {
		return nil, err
	}

	return &apiResponse, nil
}

func (c *MaasClient) SearchAPIKeys(ctx context.Context, request models.APIKeySearchRequest) (*models.APIKeyListResponse, error) {
	jsonRequest, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	endpoint, err := c.endpoint("api-keys", "search")
	if err != nil {
		return nil, err
	}
	var apiResponse models.APIKeyListResponse
	err = c.sendRequest(ctx, "POST", endpoint, jsonRequest, &apiResponse, nil)
	if err != nil {
		return nil, err
	}

	if apiResponse.Data == nil {
		apiResponse.Data = []models.APIKey{}
	}

	return &apiResponse, nil
}

func (c *MaasClient) GetAPIKey(ctx context.Context, id string) (*models.APIKey, error) {
	endpoint, err := c.endpoint("api-keys", id)
	if err != nil {
		return nil, err
	}

	var apiResponse models.APIKey
	err = c.sendRequest(ctx, "GET", endpoint, nil, &apiResponse, nil)

	if err != nil {
		return nil, err
	}

	return &apiResponse, nil
}

func (c *MaasClient) RevokeAPIKey(ctx context.Context, id string) (*models.APIKey, error) {
	endpoint, err := c.endpoint("api-keys", id)
	if err != nil {
		return nil, err
	}

	var apiResponse models.APIKey
	err = c.sendRequest(ctx, "DELETE", endpoint, nil, &apiResponse, nil)

	if err != nil {
		return nil, err
	}

	return &apiResponse, nil
}

func (c *MaasClient) BulkRevokeAPIKeys(ctx context.Context, request models.APIKeyBulkRevokeRequest) (*models.APIKeyBulkRevokeResponse, error) {
	jsonRequest, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	endpoint, err := c.endpoint("api-keys", "bulk-revoke")
	if err != nil {
		return nil, err
	}
	var apiResponse models.APIKeyBulkRevokeResponse
	err = c.sendRequest(ctx, "POST", endpoint, jsonRequest, &apiResponse, nil)
	if err != nil {
		return nil, err
	}

	return &apiResponse, nil
}

func (c *MaasClient) ListModels(ctx context.Context, headers http.Header) ([]models.MaaSModel, error) {
	endpoint, err := c.endpoint("models")
	if err != nil {
		return nil, err
	}

	var apiResponse models.MaaSModelsResponse
	err = c.sendRequest(ctx, "GET", endpoint, nil, &apiResponse, headers)

	if err != nil {
		return nil, err
	}

	return apiResponse.Data, nil
}

func (c *MaasClient) ListSubscriptionsForApiKeys(ctx context.Context) ([]models.SubscriptionListItem, error) {
	endpoint, err := c.endpoint("subscriptions")
	if err != nil {
		return nil, err
	}

	var apiResponse []models.SubscriptionListItem
	err = c.sendRequest(ctx, "GET", endpoint, nil, &apiResponse, nil)

	if err != nil {
		return nil, err
	}

	for i := range apiResponse {
		if apiResponse[i].ModelRefs == nil {
			apiResponse[i].ModelRefs = []models.ModelRefInfo{}
		}
		for j := range apiResponse[i].ModelRefs {
			if apiResponse[i].ModelRefs[j].TokenRateLimits == nil {
				apiResponse[i].ModelRefs[j].TokenRateLimits = []models.TokenRateLimitInfo{}
			}
		}
	}

	return apiResponse, nil
}

func (c *MaasClient) GetSingleUserSubscription(ctx context.Context, id string) (*models.SubscriptionListItem, error) {
	allSubscriptions, err := c.ListSubscriptionsForApiKeys(ctx)
	if err != nil {
		return nil, err
	}
	for i := range allSubscriptions {
		if allSubscriptions[i].SubscriptionIDHeader == id {
			return &allSubscriptions[i], nil
		}
	}
	return nil, nil
}

func (c *MaasClient) sendRequest(ctx context.Context, method string, endpoint *url.URL, requestBody []byte, apiResponse any, headers http.Header) error {
	var bodyReader io.Reader
	if requestBody != nil {
		bodyReader = bytes.NewBuffer(requestBody)
	}

	request, err := http.NewRequestWithContext(ctx, method, endpoint.String(), bodyReader)
	if err != nil {
		return err
	}

	for k, vv := range headers {
		for _, v := range vv {
			request.Header.Add(k, v)
		}
	}

	request.Header.Set("Content-Type", "application/json")
	addIdentityHeaderToRequest(ctx, request)

	response, err := c.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer func() { _ = response.Body.Close() }()

	if response.StatusCode >= 400 {
		body, readBodyErr := io.ReadAll(io.LimitReader(response.Body, c.maxResponseSize))
		if readBodyErr != nil {
			c.logger.Error("unknown error when invoking maas-api (read body)", "statusCode", response.StatusCode, "endpoint", endpoint.String(), "method", method)
			return fmt.Errorf("unknown error when invoking maas-api (read body): %w", readBodyErr)
		}

		maasApiError := MaasApiError{}
		if unmarshallErr := json.Unmarshal(body, &maasApiError); unmarshallErr != nil {
			c.logger.Error("unknown error when invoking maas-api (unmarshall)", "statusCode", response.StatusCode, "endpoint", endpoint.String(), "method", method)
			return fmt.Errorf("unknown error when invoking maas-api (unmarshall): %w", unmarshallErr)
		}

		c.logger.Error("request to maas-api failed", "statusCode", response.StatusCode, "error", maasApiError.Error, "endpoint", endpoint.String(), "method", method)
		return &MaasUpstreamError{StatusCode: response.StatusCode, Message: maasApiError.Error}
	}

	body, readBodyErr := io.ReadAll(io.LimitReader(response.Body, c.maxResponseSize))
	if readBodyErr != nil {
		c.logger.Warn("request to maas-api succeeded but the response could not be read", "error", readBodyErr.Error(), "statusCode", response.StatusCode, "endpoint", endpoint.String(), "method", method)
		return fmt.Errorf("request to maas-api succeeded but the response could not be read: %w", readBodyErr)
	}

	if unmarshallErr := json.Unmarshal(body, apiResponse); unmarshallErr != nil {
		c.logger.Error("request to maas-api succeeded but the response could not be parsed", "error", unmarshallErr, "statusCode", response.StatusCode, "endpoint", endpoint.String(), "method", method)
		return fmt.Errorf("request to maas-api succeeded but the response could not be parsed: %w", unmarshallErr)
	}

	return nil
}

func addIdentityHeaderToRequest(ctx context.Context, r *http.Request) {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if ok {
		r.Header.Set("Authorization", "Bearer "+identity.Token)
	}
}
