package repositories

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"

	ogx "github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type OGXModelsRepository struct {
	k8sService         *corek8s.K8sService
	ogxClientFactory   ogx.OGXClientFactory
	insecureSkipVerify bool
	rootCAs            *x509.CertPool
	rewriteURL         func(context.Context, string) (string, error)
}

func NewOGXModelsRepository(
	k8sService *corek8s.K8sService,
	factory ogx.OGXClientFactory,
	insecureSkipVerify bool,
	rootCAs *x509.CertPool,
	rewriteURL func(context.Context, string) (string, error),
) *OGXModelsRepository {
	return &OGXModelsRepository{
		k8sService:         k8sService,
		ogxClientFactory:   factory,
		insecureSkipVerify: insecureSkipVerify,
		rootCAs:            rootCAs,
		rewriteURL:         rewriteURL,
	}
}

// GetOGXModels retrieves all models from OGX.
// Reads credentials from the named Kubernetes secret, creates an OGX client, and
// translates the native response into our stable public API format.
func (r *OGXModelsRepository) GetOGXModels(ctx context.Context, namespace, secretName string) (*models.OGXModelsData, error) {
	client, err := r.createOGXClient(ctx, namespace, secretName)
	if err != nil {
		return nil, err
	}

	nativeModels, err := client.ListModels(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list OGX models: %w", err)
	}

	allModels := make([]models.OGXModel, 0, len(nativeModels))
	var skipped, degraded int
	for _, native := range nativeModels {
		ogxModel, ok := translateOGXModel(native)
		if !ok {
			skipped++
			continue
		}
		if ogxModel.Type == "unknown" {
			degraded++
		}
		allModels = append(allModels, ogxModel)
	}

	if skipped > 0 || degraded > 0 {
		slog.Warn("Open GenAI Stack schema drift detected — some models could not be fully parsed",
			"total", len(nativeModels),
			"skipped", skipped,
			"degraded_to_unknown_type", degraded)
	}

	return &models.OGXModelsData{
		Models: allModels,
	}, nil
}

// createOGXClient reads credentials from the named secret and returns a ready OGX client.
// When ogxClientFactory produces a mock (MockOGXClient=true), namespace/secretName are
// passed for logging context only — no Kubernetes call is made.
func (r *OGXModelsRepository) createOGXClient(ctx context.Context, namespace, secretName string) (ogx.OGXClientInterface, error) {
	baseURL, apiKey, err := resolveOGXCredentials(ctx, r.k8sService, namespace, secretName)
	if err != nil {
		return nil, err
	}

	if r.rewriteURL != nil && baseURL != "" {
		if rewritten, pfErr := r.rewriteURL(ctx, baseURL); pfErr != nil {
			slog.Warn("dynamic port-forward failed for Open GenAI Stack endpoint, using original URL",
				"error", pfErr, "url", baseURL)
		} else {
			baseURL = rewritten
		}
	}

	return r.ogxClientFactory.CreateClient(baseURL, apiKey, r.insecureSkipVerify, r.rootCAs), nil
}

// translateOGXModel translates a Open GenAI Stack native model into our stable public API format.
// It degrades gracefully when upstream fields are missing:
//   - ID is required — models without an ID are skipped entirely.
//   - model_type is the most critical field (used by the UI to filter between embedding and
//     generation models). If missing, it defaults to "unknown" so the model still appears.
//   - provider and resource_path are optional — empty strings are acceptable.
//
// Returns false if the model should be skipped (missing ID).
func translateOGXModel(native models.OGXNativeModel) (models.OGXModel, bool) {
	if native.ID == "" {
		slog.Warn("skipping Open GenAI Stack model with empty ID")
		return models.OGXModel{}, false
	}

	result := models.OGXModel{ID: native.ID}

	if native.CustomMetadata == nil {
		// custom_metadata is absent — upstream schema may have changed.
		slog.Warn("Open GenAI Stack model missing custom_metadata — upstream schema may have changed",
			"model_id", native.ID)
		result.Type = "unknown"
		return result, true
	}

	result.Type = native.CustomMetadata.ModelType
	result.Provider = native.CustomMetadata.ProviderID
	result.ResourcePath = native.CustomMetadata.ProviderResourceID

	if result.Type == "" {
		slog.Warn("Open GenAI Stack model missing model_type — defaulting to unknown",
			"model_id", native.ID)
		result.Type = "unknown"
	}

	return result, true
}
