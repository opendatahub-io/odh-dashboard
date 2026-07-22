package repositories

import (
	"context"
	"fmt"
	"strings"

	agentsopenshell "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/openshell"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
	v1 "github.com/rhuss/openshell-sdk-go/openshell/v1"
)

type ProviderRepository struct {
	registry *agentsopenshell.GatewayRegistry
}

func NewProviderRepository(registry *agentsopenshell.GatewayRegistry) *ProviderRepository {
	return &ProviderRepository{registry: registry}
}

func (r *ProviderRepository) ListProviders(ctx context.Context, gwName string) (*models.ProviderListResponse, error) {
	client, err := r.registry.GetClient(ctx, gwName)
	if err != nil {
		return nil, err
	}

	providers, err := client.Providers().List(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list providers: %w", err)
	}

	result := make([]models.Provider, 0, len(providers))
	for _, p := range providers {
		result = append(result, sdkProviderToModel(p))
	}

	return &models.ProviderListResponse{Providers: result}, nil
}

func (r *ProviderRepository) GetProvider(ctx context.Context, gwName, providerName string) (*models.ProviderDetail, error) {
	client, err := r.registry.GetClient(ctx, gwName)
	if err != nil {
		return nil, err
	}

	p, err := client.Providers().Get(ctx, providerName)
	if err != nil {
		return nil, fmt.Errorf("failed to get provider: %w", err)
	}

	detail := &models.ProviderDetail{
		Provider:    sdkProviderToModel(p),
		Config:      p.Spec.Config,
		Credentials: maskCredentials(p.Spec.Credentials),
	}
	return detail, nil
}

func (r *ProviderRepository) CreateProvider(ctx context.Context, gwName string, req *models.CreateProviderRequest) (*models.Provider, error) {
	client, err := r.registry.GetClient(ctx, gwName)
	if err != nil {
		return nil, err
	}

	sdkProvider := &v1.Provider{
		Name:   req.Name,
		Type:   req.ProfileName,
		Labels: req.Labels,
		Spec: v1.ProviderSpec{
			Credentials: req.Credentials,
			Config:      req.Config,
		},
	}

	created, err := client.Providers().Create(ctx, sdkProvider)
	if err != nil {
		return nil, fmt.Errorf("failed to create provider: %w", err)
	}

	result := sdkProviderToModel(created)
	return &result, nil
}

func (r *ProviderRepository) UpdateProvider(ctx context.Context, gwName, providerName string, req *models.UpdateProviderRequest) (*models.Provider, error) {
	client, err := r.registry.GetClient(ctx, gwName)
	if err != nil {
		return nil, err
	}

	existing, err := client.Providers().Get(ctx, providerName)
	if err != nil {
		return nil, fmt.Errorf("failed to get provider for update: %w", err)
	}

	if req.Credentials != nil {
		existing.Spec.Credentials = req.Credentials
	}
	if req.Config != nil {
		existing.Spec.Config = req.Config
	}
	if req.Labels != nil {
		existing.Labels = req.Labels
	}

	updated, err := client.Providers().Update(ctx, existing)
	if err != nil {
		return nil, fmt.Errorf("failed to update provider: %w", err)
	}

	result := sdkProviderToModel(updated)
	return &result, nil
}

func (r *ProviderRepository) DeleteProvider(ctx context.Context, gwName, providerName string) error {
	client, err := r.registry.GetClient(ctx, gwName)
	if err != nil {
		return err
	}

	if err := client.Providers().Delete(ctx, providerName); err != nil {
		return fmt.Errorf("failed to delete provider: %w", err)
	}
	return nil
}

func (r *ProviderRepository) ListProfiles(ctx context.Context, gwName string) (*models.ProviderProfileListResponse, error) {
	client, err := r.registry.GetClient(ctx, gwName)
	if err != nil {
		return nil, err
	}

	profiles, err := client.Providers().Profiles().List(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list profiles: %w", err)
	}

	result := make([]models.ProviderProfile, 0, len(profiles))
	for _, p := range profiles {
		creds := make([]models.ProviderProfileField, 0, len(p.Credentials))
		for _, c := range p.Credentials {
			creds = append(creds, models.ProviderProfileField{
				Name:        c.Name,
				Description: c.Description,
				Required:    c.Required,
				Secret:      c.Secret,
			})
		}
		result = append(result, models.ProviderProfile{
			Name:        p.DisplayName,
			Description: p.Description,
			Credentials: creds,
		})
	}

	return &models.ProviderProfileListResponse{Profiles: result}, nil
}

func sdkProviderToModel(p *v1.Provider) models.Provider {
	expiresAt := ""
	if len(p.Spec.CredentialExpiresAt) > 0 {
		for _, t := range p.Spec.CredentialExpiresAt {
			expiresAt = t.String()
			break
		}
	}

	return models.Provider{
		ID:                  p.ID,
		Name:                p.Name,
		Type:                p.Type,
		Labels:              p.Labels,
		CredentialExpiresAt: expiresAt,
	}
}

func maskCredentials(creds map[string]string) map[string]string {
	if creds == nil {
		return nil
	}
	masked := make(map[string]string, len(creds))
	for k, v := range creds {
		if len(v) > 4 {
			masked[k] = strings.Repeat("*", len(v)-4) + v[len(v)-4:]
		} else {
			masked[k] = strings.Repeat("*", len(v))
		}
	}
	return masked
}
