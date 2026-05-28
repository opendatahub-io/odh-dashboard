package repositories

import (
	"context"
	"crypto/x509"
	"fmt"

	ogx "github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

const vectorIOAPI = "vector_io"

type OGXVectorStoresRepository struct {
	k8sService         *corek8s.K8sService
	ogxClientFactory   ogx.OGXClientFactory
	insecureSkipVerify bool
	rootCAs            *x509.CertPool
	rewriteURL         func(context.Context, string) (string, error)
}

func NewOGXVectorStoresRepository(
	k8sService *corek8s.K8sService,
	factory ogx.OGXClientFactory,
	insecureSkipVerify bool,
	rootCAs *x509.CertPool,
	rewriteURL func(context.Context, string) (string, error),
) *OGXVectorStoresRepository {
	return &OGXVectorStoresRepository{
		k8sService:         k8sService,
		ogxClientFactory:   factory,
		insecureSkipVerify: insecureSkipVerify,
		rootCAs:            rootCAs,
		rewriteURL:         rewriteURL,
	}
}

// GetOGXVectorStoreProviders retrieves vector store providers from OGX
// by calling the native /v1/providers endpoint and filtering for vector_io API type.
func (r *OGXVectorStoresRepository) GetOGXVectorStoreProviders(ctx context.Context, namespace, secretName string) (*models.OGXVectorStoreProvidersData, error) {
	client, err := r.createOGXClient(ctx, namespace, secretName)
	if err != nil {
		return nil, err
	}

	allProviders, err := client.ListProviders(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list OGX providers: %w", err)
	}

	vectorStoreProviders := make([]models.OGXVectorStoreProvider, 0)
	for _, p := range allProviders {
		if p.API == vectorIOAPI {
			vectorStoreProviders = append(vectorStoreProviders, models.OGXVectorStoreProvider{
				ProviderID:   p.ProviderID,
				ProviderType: p.ProviderType,
			})
		}
	}

	return &models.OGXVectorStoreProvidersData{
		VectorStoreProviders: vectorStoreProviders,
	}, nil
}

// createOGXClient reads credentials from the named secret and returns a ready OGX client.
func (r *OGXVectorStoresRepository) createOGXClient(ctx context.Context, namespace, secretName string) (ogx.OGXClientInterface, error) {
	baseURL, apiKey, err := resolveOGXCredentials(ctx, r.k8sService, namespace, secretName)
	if err != nil {
		return nil, err
	}

	if r.rewriteURL != nil && baseURL != "" {
		if rewritten, pfErr := r.rewriteURL(ctx, baseURL); pfErr != nil {
			// log warning but continue with original URL
			_ = pfErr
		} else {
			baseURL = rewritten
		}
	}

	return r.ogxClientFactory.CreateClient(baseURL, apiKey, r.insecureSkipVerify, r.rootCAs), nil
}
