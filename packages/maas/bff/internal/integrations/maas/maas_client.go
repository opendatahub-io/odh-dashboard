package maas

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

type MaasClient struct {
	httpClient *http.Client
	prefix     *url.URL
	logger     *slog.Logger
}

type MaasApiError struct {
	Error string `json:"error"`
}

func NewMaasClient(logger *slog.Logger, prefix *url.URL) *MaasClient {
	return &MaasClient{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		prefix: prefix.JoinPath("v1"),
		logger: logger,
	}
}

func (c *MaasClient) ListAPIKeys(ctx context.Context) ([]models.APIKeyMetadata, error) {
	endpoint := c.prefix.JoinPath("api-keys")

	var apiResponse []models.APIKeyMetadata
	err := c.sendRequest(ctx, "GET", endpoint, nil, &apiResponse)

	return apiResponse, err
}

func (c *MaasClient) GetAPIKey(ctx context.Context, id string) (*models.APIKeyMetadata, error) {
	endpoint := c.prefix.JoinPath("api-keys", id)

	var apiResponse models.APIKeyMetadata
	err := c.sendRequest(ctx, "GET", endpoint, nil, &apiResponse)

	return &apiResponse, err
}

func (c *MaasClient) CreateAPIKey(ctx context.Context, createRequest models.APIKeyRequest) (*models.APIKeyResponse, error) {
	jsonRequest, err := json.Marshal(createRequest)
	if err != nil {
		return nil, err
	}

	endpoint := c.prefix.JoinPath("api-keys")
	var apiResponse models.APIKeyResponse
	err = c.sendRequest(ctx, "POST", endpoint, jsonRequest, &apiResponse)
	return &apiResponse, err
}

func (c *MaasClient) sendRequest(ctx context.Context, method string, endpoint *url.URL, requestBody []byte, apiResponse any) error {
	var bodyReader io.Reader
	if requestBody != nil {
		bodyReader = bytes.NewBuffer(requestBody)
	}

	request, err := http.NewRequestWithContext(ctx, method, endpoint.String(), bodyReader)
	if err != nil {
		return err
	}

	request.Header.Set("Content-Type", "application/json")
	addIdentityHeaderToRequest(ctx, request)

	response, err := c.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer func() { _ = response.Body.Close() }()

	if response.StatusCode >= 400 {
		body, readBodyErr := io.ReadAll(response.Body)
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
		return fmt.Errorf("request to maas-api failed: %s", maasApiError.Error)
	}

	body, readBodyErr := io.ReadAll(response.Body)
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
