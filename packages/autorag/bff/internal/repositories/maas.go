package repositories

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/ssrf"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

var (
	ErrMaaSUnauthorized       = errors.New("MaaS authorization failed")
	ErrMaaSForbidden          = errors.New("MaaS access forbidden")
	ErrMaaSBadRequest         = errors.New("MaaS request was invalid")
	ErrMaaSUnavailable        = errors.New("MaaS service unavailable")
	ErrMaaSBadResponse        = errors.New("invalid MaaS response")
	ErrMaaSSecretNotFound     = errors.New("MaaS credentials secret not found")
	ErrMaaSSecretForbidden    = errors.New("MaaS credentials secret access forbidden")
	ErrMaaSCredentialsInvalid = errors.New("MaaS credentials are invalid")
)

type MaaSModel struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
}

type MaaSModelsData struct {
	Models []MaaSModel `json:"models"`
}

type MaaSModelsResponse struct {
	Data MaaSModelsData `json:"data"`
}

type MaaSClient interface {
	ListModels(context.Context, maas.RequestConfig) (maas.Response, error)
}

type MaaSService struct {
	client     MaaSClient
	k8sService kubernetes.Service
}

type MaaSModelService interface {
	ListModels(context.Context, string, string) (MaaSModelsResponse, error)
}

func NewMaaSService(client MaaSClient, k8sService kubernetes.Service) *MaaSService {
	return &MaaSService{client: client, k8sService: k8sService}
}

func (s *MaaSService) ListModels(ctx context.Context, namespace, secretName string) (MaaSModelsResponse, error) {
	if secretName == "" {
		return MaaSModelsResponse{}, ErrMaaSCredentialsInvalid
	}
	var config maas.RequestConfig
	{
		secret, err := s.k8sService.GetSecret(ctx, namespace, secretName)
		if err != nil {
			switch {
			case errors.Is(err, kubernetes.ErrNotFound) || apierrors.IsNotFound(err):
				return MaaSModelsResponse{}, fmt.Errorf("%w", ErrMaaSSecretNotFound)
			case errors.Is(err, kubernetes.ErrForbidden) || apierrors.IsForbidden(err):
				return MaaSModelsResponse{}, fmt.Errorf("%w", ErrMaaSSecretForbidden)
			default:
				return MaaSModelsResponse{}, fmt.Errorf("%w", ErrMaaSUnavailable)
			}
		}
		if secret == nil {
			return MaaSModelsResponse{}, ErrMaaSSecretNotFound
		}
		config.GatewayOrigin, err = kubernetes.LookupSecretValue(secret.Data, "MAAS_BASE_URL")
		if err != nil || config.GatewayOrigin == "" {
			return MaaSModelsResponse{}, ErrMaaSCredentialsInvalid
		}
		config.APIKey, err = kubernetes.LookupSecretValue(secret.Data, "MAAS_API_KEY")
		if err != nil || config.APIKey == "" {
			return MaaSModelsResponse{}, ErrMaaSCredentialsInvalid
		}
		if err := validateMaaSEndpoint(config.GatewayOrigin); err != nil {
			return MaaSModelsResponse{}, ErrMaaSCredentialsInvalid
		}
	}
	response, err := s.client.ListModels(ctx, config)
	if err != nil {
		return MaaSModelsResponse{}, classifyMaaSError(err)
	}
	result := MaaSModelsResponse{Data: MaaSModelsData{Models: make([]MaaSModel, 0, len(response.Data))}}
	for _, model := range response.Data {
		id := model.ID
		if id == "" {
			id = model.ModelID
		}
		if id == "" {
			continue
		}
		name := model.DisplayName
		if name == "" {
			name = model.DisplayNameV2
		}
		if name == "" && model.ModelDetails != nil {
			name = model.ModelDetails.DisplayName
		}
		if name == "" && model.ModelDetailsSnake != nil {
			name = model.ModelDetailsSnake.DisplayName
		}
		if name == "" {
			name = model.Name
		}
		description := model.Description
		if description == "" && model.ModelDetails != nil {
			description = model.ModelDetails.Description
		}
		if description == "" && model.ModelDetailsSnake != nil {
			description = model.ModelDetailsSnake.Description
		}
		result.Data.Models = append(result.Data.Models, MaaSModel{ID: id, DisplayName: name, Description: description})
	}
	return result, nil
}

func validateMaaSEndpoint(rawURL string) error {
	parsedURL, err := url.Parse(rawURL)
	if err != nil || parsedURL.Scheme != "https" || parsedURL.Hostname() == "" || parsedURL.User != nil || (parsedURL.Path != "" && parsedURL.Path != "/") || parsedURL.RawQuery != "" || parsedURL.Fragment != "" {
		return errors.New("invalid MaaS endpoint")
	}
	if ip := net.ParseIP(parsedURL.Hostname()); ip != nil {
		return ssrf.ValidateIP(ip)
	}
	if ips, err := net.LookupIP(parsedURL.Hostname()); err == nil {
		for _, ip := range ips {
			if err := ssrf.ValidateIP(ip); err != nil {
				return errors.New("invalid MaaS endpoint")
			}
		}
	}
	return nil
}

func classifyMaaSError(err error) error {
	var transportErr *maas.TransportError
	if !errors.As(err, &transportErr) {
		return fmt.Errorf("%w: %v", ErrMaaSUnavailable, err)
	}
	switch transportErr.StatusCode {
	case http.StatusUnauthorized:
		return fmt.Errorf("%w: %v", ErrMaaSUnauthorized, err)
	case http.StatusForbidden:
		return fmt.Errorf("%w: %v", ErrMaaSForbidden, err)
	case http.StatusBadRequest:
		return fmt.Errorf("%w: %v", ErrMaaSBadRequest, err)
	case http.StatusBadGateway:
		return fmt.Errorf("%w: %v", ErrMaaSBadResponse, err)
	default:
		return fmt.Errorf("%w: %v", ErrMaaSUnavailable, err)
	}
}
