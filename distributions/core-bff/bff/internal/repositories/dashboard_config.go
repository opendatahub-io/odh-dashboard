package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/k8sutil"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/maputil"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
)

// DashboardConfigRepository handles OdhDashboardConfig CRD operations.
// Uses a service-account-scoped dynamic client for reads, matching the privileged watcher model
// privileged watcher model where config is read with SA credentials.
type DashboardConfigRepository struct {
	platform    config.PlatformType
	saDynClient dynamic.Interface
}

// NewDashboardConfigRepository creates a new repository. On XKS platforms,
// OpenShift-dependent features are disabled in the default config.
// saDynClient is used for privileged reads so non-admin users still see the real config.
func NewDashboardConfigRepository(platform config.PlatformType, saDynClient dynamic.Interface) *DashboardConfigRepository {
	return &DashboardConfigRepository{platform: platform, saDynClient: saDynClient}
}

func (r *DashboardConfigRepository) GetDashboardConfig(
	ctx context.Context,
	namespace, name string, featureFlagOverrides map[string]bool,
) (*models.DashboardConfig, error) {
	raw, err := r.fetchOrCreateDashboardCR(ctx, namespace, name)
	if err != nil {
		return nil, err
	}

	defaultsMap, err := maputil.ToUnstructuredMap(models.BlankDashboardCR)
	if err != nil {
		return nil, fmt.Errorf("failed to convert defaults: %w", err)
	}

	merged := maputil.DeepMerge(defaultsMap, raw)

	if len(featureFlagOverrides) > 0 {
		applyFeatureFlagOverrides(merged, featureFlagOverrides)
	}

	// Lockouts and XKS overrides run last so they cannot be undone by request headers.
	applyFeatureLockouts(merged)

	if r.platform.IsXKS() {
		applyXKSOverrides(merged)
	}

	var config models.DashboardConfig
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(merged, &config); err != nil {
		return nil, fmt.Errorf("failed to convert merged config: %w", err)
	}

	return &config, nil
}

func (r *DashboardConfigRepository) GetRawDashboardConfig(
	ctx context.Context,
	namespace, name string,
) (map[string]any, error) {
	if r.saDynClient == nil {
		return nil, fmt.Errorf("service account dynamic client not available")
	}

	result, err := r.saDynClient.Resource(models.DashboardConfigGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard config %s/%s: %w", namespace, name, err)
	}

	return result.Object, nil
}

func (r *DashboardConfigRepository) PatchRawDashboardConfig(
	ctx context.Context,
	namespace, name string, patchData []byte, patchType types.PatchType,
) (map[string]any, error) {
	if r.saDynClient == nil {
		return nil, fmt.Errorf("service account dynamic client not available")
	}

	result, err := r.saDynClient.Resource(models.DashboardConfigGVR).Namespace(namespace).Patch(
		ctx, name, patchType, patchData, metav1.PatchOptions{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to patch dashboard config %s/%s: %w", namespace, name, err)
	}

	return result.Object, nil
}

func (r *DashboardConfigRepository) fetchOrCreateDashboardCR(
	ctx context.Context,
	namespace, name string,
) (map[string]any, error) {
	if r.saDynClient == nil {
		return nil, fmt.Errorf("service account dynamic client not available")
	}

	result, err := r.saDynClient.Resource(models.DashboardConfigGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err == nil {
		return result.Object, nil
	}

	if !k8serrors.IsNotFound(err) {
		return r.handleFetchError(err, namespace, name)
	}

	return r.autoCreateDashboardCR(ctx, namespace, name)
}

func (r *DashboardConfigRepository) handleFetchError(err error, namespace, name string) (map[string]any, error) {
	if k8sutil.IsDiscoveryError(err) {
		slog.Debug("OdhDashboardConfig CRD not installed, using defaults",
			slog.String("namespace", namespace), slog.String("name", name))
		return blankDefaults()
	}
	return nil, fmt.Errorf("failed to get dashboard config: %w", err)
}

func (r *DashboardConfigRepository) autoCreateDashboardCR(
	ctx context.Context,
	namespace, name string,
) (map[string]any, error) {
	// Deliberately sparse: omit spec.dashboardConfig so code-level defaults apply at read time.
	defaultCR := &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": "opendatahub.io/v1alpha",
			"kind":       "OdhDashboardConfig",
			"metadata": map[string]any{
				"name":      name,
				"namespace": namespace,
				"labels": map[string]any{
					"opendatahub.io/dashboard": "true",
				},
			},
			"spec": map[string]any{
				"notebookController": map[string]any{
					"enabled": true,
				},
				"templateOrder": []any{},
				"genAiStudioConfig": map[string]any{
					"aiAssetCustomEndpoints": map[string]any{
						"externalProviders": false,
						"clusterDomains":    []any{},
					},
				},
			},
		},
	}

	created, createErr := r.saDynClient.Resource(models.DashboardConfigGVR).Namespace(namespace).Create(ctx, defaultCR, metav1.CreateOptions{})
	if createErr == nil {
		return created.Object, nil
	}

	if k8serrors.IsAlreadyExists(createErr) {
		retryResult, retryErr := r.saDynClient.Resource(models.DashboardConfigGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
		if retryErr == nil {
			return retryResult.Object, nil
		}
	}

	slog.Debug("failed to auto-create OdhDashboardConfig, falling back to defaults",
		slog.String("namespace", namespace), slog.String("name", name), slog.Any("error", createErr))
	return blankDefaults()
}
