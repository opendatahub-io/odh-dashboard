package repositories

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
)

var (
	ErrMaaSUnauthorized = errors.New("MaaS authorization failed")
	ErrMaaSForbidden    = errors.New("MaaS access forbidden")
	ErrMaaSBadRequest   = errors.New("MaaS request was invalid")
	ErrMaaSUnavailable  = errors.New("MaaS service unavailable")
	ErrMaaSBadResponse  = errors.New("invalid MaaS response")
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
	ListModels(context.Context, string, map[string]string) (maas.Response, error)
}

type MaaSService struct {
	client MaaSClient
	mock   bool
}

type MaaSModelService interface {
	ListModels(context.Context, string, map[string]string) (MaaSModelsResponse, error)
}

func NewMaaSService(client MaaSClient, mock bool) *MaaSService {
	return &MaaSService{client: client, mock: mock}
}

func (s *MaaSService) ListModels(ctx context.Context, token string, headers map[string]string) (MaaSModelsResponse, error) {
	if s.mock {
		return MaaSModelsResponse{Data: MaaSModelsData{Models: []MaaSModel{
			{ID: "maas-model-1", DisplayName: "MaaS model 1", Description: "Mock MaaS model"},
			{ID: "maas-embedding-1", DisplayName: "MaaS embedding 1", Description: "Mock MaaS model"},
		}}}, nil
	}
	response, err := s.client.ListModels(ctx, token, headers)
	if err != nil {
		return MaaSModelsResponse{}, classifyMaaSError(err)
	}
	result := MaaSModelsResponse{Data: MaaSModelsData{Models: make([]MaaSModel, 0, len(response.Data.Data))}}
	for _, model := range response.Data.Data {
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
