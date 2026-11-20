package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
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
//
// GetDashboardConfig is the bootstrap read: it uses the service account on
// every platform so a non-admin sees the real configuration (documented in
// docs/bootstrap-contract.md). GetRawDashboardConfig and
// PatchRawDashboardConfig serve admin endpoints and follow the credential
// policy: the service account on OpenShift, the caller on xKS.
type DashboardConfigRepository struct {
	platform config.PlatformType
	// platformConfirmed is false when platform was guessed after an
	// inconclusive startup probe. See newDashboardConfigRepository.
	platformConfirmed bool
	saDynClient       dynamic.Interface
	clients           clientSource
}

// NewDashboardConfigRepository creates a repository for a confirmed platform.
// On XKS platforms, OpenShift-dependent features are disabled in the default
// config. saDynClient is used for privileged reads so non-admin users still see
// the real config.
func NewDashboardConfigRepository(platform config.PlatformType, saDynClient dynamic.Interface) *DashboardConfigRepository {
	return newDashboardConfigRepository(platform, true, saDynClient)
}

// newDashboardConfigRepository also records whether the platform is confirmed.
// Provisioning depends on it: only a confirmed OpenShift platform may create a
// missing configuration instance, and only a confirmed xKS platform treats a
// missing or unreadable instance as the expected read-only steady state.
func newDashboardConfigRepository(platform config.PlatformType, platformConfirmed bool, saDynClient dynamic.Interface) *DashboardConfigRepository {
	return &DashboardConfigRepository{platform: platform, platformConfirmed: platformConfirmed, saDynClient: saDynClient, clients: saSource(nil, saDynClient)}
}

func (r *DashboardConfigRepository) GetDashboardConfig(
	ctx context.Context,
	namespace, name string, featureFlagOverrides map[string]bool,
) (*models.DashboardConfig, error) {
	raw, err := r.fetchOrCreateDashboardCR(ctx, namespace, name)
	if err != nil {
		return nil, err
	}
	return r.mergeDashboardConfig(raw, featureFlagOverrides)
}

// GetDashboardConfigForUpdate reads the configuration an admin write is
// computed from. Under the service-account policy it is the bootstrap read.
// Under the caller policy it is the caller's own read of the instance, with no
// fallback: a denied, missing or absent configuration aborts the write instead
// of diffing against defaults the caller never saw.
func (r *DashboardConfigRepository) GetDashboardConfigForUpdate(
	ctx context.Context,
	namespace, name string,
) (*models.DashboardConfig, error) {
	if r.clients.policy != CredentialPolicyCaller {
		return r.GetDashboardConfig(ctx, namespace, name, nil)
	}
	raw, err := r.GetRawDashboardConfig(ctx, namespace, name)
	if err != nil {
		return nil, err
	}
	return r.mergeDashboardConfig(raw, nil)
}

// MergedDashboardConfig returns the effective configuration for a raw
// OdhDashboardConfig object, such as the one a successful patch returns.
func (r *DashboardConfigRepository) MergedDashboardConfig(raw map[string]any) (*models.DashboardConfig, error) {
	return r.mergeDashboardConfig(raw, nil)
}

// mergeDashboardConfig layers raw over the code-level defaults and applies the
// overrides, lockouts and platform overrides that every read applies.
func (r *DashboardConfigRepository) mergeDashboardConfig(
	raw map[string]any, featureFlagOverrides map[string]bool,
) (*models.DashboardConfig, error) {
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
	dyn, err := r.clients.dynamic(ctx)
	if err != nil {
		return nil, err
	}

	result, err := dyn.Resource(models.DashboardConfigGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard config %s/%s: %w", namespace, name, err)
	}

	return result.Object, nil
}

func (r *DashboardConfigRepository) PatchRawDashboardConfig(
	ctx context.Context,
	namespace, name string, patchData []byte, patchType types.PatchType,
) (map[string]any, error) {
	dyn, err := r.clients.dynamic(ctx)
	if err != nil {
		return nil, err
	}

	result, err := dyn.Resource(models.DashboardConfigGVR).Namespace(namespace).Patch(
		ctx, name, patchType, patchData, metav1.PatchOptions{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to patch dashboard config %s/%s: %w", namespace, name, err)
	}

	return result.Object, nil
}

// readOnlyBootstrap reports whether configuration bootstrap must not write.
// On xKS the OdhDashboardConfig CR is outside the selected profile: the
// installation owner provisions configuration, or it is supplied through the
// agreed xKS configuration source. The dashboard reads and falls back to
// defaults, never creates. OpenShift keeps the RHOAI auto-create behaviour.
func (r *DashboardConfigRepository) readOnlyBootstrap() bool {
	return r.platform.IsXKS() && r.platformConfirmed
}

// mayProvision reports whether a missing instance may be auto-created. It is
// false on xKS and on an unconfirmed platform: writing on a guess could create
// an OpenShift-shaped resource where the installation owner manages
// configuration, so the guess never authorizes a write.
func (r *DashboardConfigRepository) mayProvision() bool {
	return r.platformConfirmed && !r.platform.IsXKS()
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

	// Discovery absence is checked first: a discovery-style 404 also
	// satisfies IsNotFound, and it means the CRD is absent, not the instance.
	if !k8serrors.IsNotFound(err) || k8sutil.IsDiscoveryError(err) {
		return r.handleFetchError(err, namespace, name)
	}

	if r.readOnlyBootstrap() {
		slog.Debug("OdhDashboardConfig instance not provisioned; bootstrap is read-only, using defaults",
			slog.String("namespace", namespace), slog.String("name", name),
			slog.String("code", "CONFIG_INSTANCE_MISSING"))
		return blankDefaults()
	}

	if !r.mayProvision() {
		// The startup probe could not establish the platform, so neither the
		// OpenShift auto-create nor the xKS read-only contract is known to
		// apply. Do not write; serve defaults and say how to resolve it.
		slog.Warn("OdhDashboardConfig instance not provisioned and the platform is unconfirmed; not auto-creating it. Set ODH_PLATFORM_TYPE to OpenShift to restore provisioning, or to XKS for read-only bootstrap",
			slog.String("namespace", namespace), slog.String("name", name),
			slog.String("code", "CONFIG_PLATFORM_UNCONFIRMED"))
		return blankDefaults()
	}

	return r.autoCreateDashboardCR(ctx, namespace, name)
}

// handleFetchError maps each non-NotFound read failure to its own documented
// outcome. A CRD that is not installed and a read the service account may not
// perform both mean "no configuration in this profile", so both degrade to
// defaults rather than failing a bootstrap the caller cannot fix. Any other
// failure is a real upstream problem and surfaces as an error.
func (r *DashboardConfigRepository) handleFetchError(err error, namespace, name string) (map[string]any, error) {
	if k8sutil.IsDiscoveryError(err) {
		slog.Debug("OdhDashboardConfig CRD not installed, using defaults",
			slog.String("namespace", namespace), slog.String("name", name),
			slog.String("code", "CONFIG_CRD_ABSENT"))
		return blankDefaults()
	}
	if k8serrors.IsForbidden(err) && r.readOnlyBootstrap() {
		// Reduced service-account RBAC must not become a bootstrap dependency.
		slog.Warn("service account may not read OdhDashboardConfig; using defaults",
			slog.String("namespace", namespace), slog.String("name", name),
			slog.String("code", "CONFIG_FORBIDDEN"))
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

	httpcontract.LogContext(slog.Default(), ctx).Debug("failed to auto-create OdhDashboardConfig, falling back to defaults",
		slog.String("namespace", namespace), slog.String("name", name), slog.String("code", httpcontract.SafeErrorCode(createErr)))
	return blankDefaults()
}
