package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
)

// A caller whose token has an organization gets the Portal-specific dashboard when
// it can be read and the shared one otherwise; any other caller always gets the
// shared one. The shared
// names start with "dashboard-", so the RHOAI Dashboard lists them too; the Portal
// names don't. The RBAC Role in
// manifests/observability/rhoai/maas-usage-dashboard-role.yaml must allow all four.
const (
	userUsageDashboardName        = "dashboard-5-maas-usage-logs"
	adminUsageDashboardName       = "dashboard-4-maas-usage-logs-admin"
	portalUserUsageDashboardName  = "maas-portal-usage-logs"
	portalAdminUsageDashboardName = "maas-portal-usage-logs-admin"
)

// usageDashboardCandidates lists the names to try for one dashboard, in order.
type usageDashboardCandidates struct {
	portal, shared string
}

var (
	userUsageDashboard  = usageDashboardCandidates{portal: portalUserUsageDashboardName, shared: userUsageDashboardName}
	adminUsageDashboard = usageDashboardCandidates{portal: portalAdminUsageDashboardName, shared: adminUsageDashboardName}
)

var (
	ErrInvalidMaaSUser              = errors.New("MaaS user has no subject")
	ErrPersesNamespaceNotConfigured = errors.New("perses dashboard namespace is not configured")
	persesDashboardGVR              = schema.GroupVersionResource{Group: "perses.dev", Version: "v1alpha2", Resource: "persesdashboards"}
)

type usageDashboardReader func(context.Context, string, string) (map[string]any, error)

// UsageDashboardsRepository reads only the approved dashboard definitions.
// The BFF's service account is used for Kubernetes reads; caller authorization
// must already have succeeded before List is called.
type UsageDashboardsRepository struct {
	logger        *slog.Logger
	namespace     string
	reader        usageDashboardReader
	clientMu      sync.Mutex
	client        dynamic.Interface
	clientFactory func() (dynamic.Interface, error)
}

func NewUsageDashboardsRepository(logger *slog.Logger, namespace string, mock bool) *UsageDashboardsRepository {
	repo := &UsageDashboardsRepository{logger: logger, namespace: namespace, clientFactory: newUsageDashboardClient}
	if mock {
		repo.reader = mocks.ReadUsageDashboard
		if namespace == "" {
			repo.namespace = "mock-monitoring"
		}
	}
	return repo
}

func (r *UsageDashboardsRepository) List(ctx context.Context, whoAmI *models.MaaSWhoAmI) ([]map[string]any, error) {
	if whoAmI == nil || whoAmI.Sub == "" {
		return nil, ErrInvalidMaaSUser
	}
	if r.namespace == "" {
		return nil, ErrPersesNamespaceNotConfigured
	}
	candidates := []usageDashboardCandidates{userUsageDashboard}
	if whoAmI.IsAdmin {
		candidates = append(candidates, adminUsageDashboard)
	}
	dashboards := make([]map[string]any, 0, len(candidates))
	reader := r.reader
	if reader == nil {
		reader = r.readUsageDashboardWithServiceAccount
	}
	preferPortal := callerHasOrganization(whoAmI)
	for _, candidate := range candidates {
		resource, err := r.readUsageDashboard(ctx, reader, candidate, preferPortal)
		if err != nil {
			return nil, err
		}
		dashboards = append(dashboards, resource)
	}
	return dashboards, nil
}

// callerHasOrganization reports whether the caller's token has an org_id claim.
// whoAmI is MaaS /v1/me's answer for the caller's own token, which sets org_id
// only from a verified OIDC token's claim, so a client can't set it. OpenShift
// tokens never have one. This is the right gate for 3.6: the Portal copies' data
// source goes through maas-api's usage proxy, which on 3.6 requires an
// organization, so an OIDC caller without org_id couldn't use the copies anyway.
// If the proxy later accepts tokens without an organization (models-as-a-service
// #1897), the test for "any verified OIDC caller" is a non-empty iss from /v1/me.
func callerHasOrganization(whoAmI *models.MaaSWhoAmI) bool {
	return whoAmI.OrgID != ""
}

// readUsageDashboard reads the shared dashboard, or, when preferPortal is set,
// the Portal one first. It falls back to the shared dashboard when the Portal one
// is NotFound, or Forbidden: the read uses the BFF service account, so Forbidden
// means its Role doesn't list the Portal names yet (an operator that hasn't
// reconciled it), not that the caller lacks access. Other errors on the Portal
// dashboard, and any error on the shared one, are returned.
func (r *UsageDashboardsRepository) readUsageDashboard(ctx context.Context, reader usageDashboardReader, candidate usageDashboardCandidates, preferPortal bool) (map[string]any, error) {
	namespace := r.namespace
	if preferPortal {
		resource, err := reader(ctx, namespace, candidate.portal)
		switch {
		case err == nil:
			return resource, nil
		case apierrors.IsForbidden(err):
			if r.logger != nil {
				r.logger.Warn("Reading the Portal usage dashboard was forbidden; serving the shared one. The usage-dashboard Role may not be reconciled yet.",
					slog.String("dashboard", candidate.portal), slog.String("fallback", candidate.shared))
			}
		case !apierrors.IsNotFound(err):
			return nil, fmt.Errorf("reading PersesDashboard %q: %w", candidate.portal, err)
		}
	}
	resource, err := reader(ctx, namespace, candidate.shared)
	if err != nil {
		return nil, fmt.Errorf("reading PersesDashboard %q: %w", candidate.shared, err)
	}
	return resource, nil
}

// getClient shares one service-account client across dashboard reads. Failed
// initialization is retried so a temporary credential issue does not persist.
func (r *UsageDashboardsRepository) getClient() (dynamic.Interface, error) {
	r.clientMu.Lock()
	defer r.clientMu.Unlock()
	if r.client != nil {
		return r.client, nil
	}
	client, err := r.clientFactory()
	if err != nil {
		return nil, err
	}
	r.client = client
	return client, nil
}

func newUsageDashboardClient() (dynamic.Interface, error) {
	config, err := rest.InClusterConfig()
	if err != nil {
		config, err = helper.GetKubeconfig()
		if err != nil {
			return nil, fmt.Errorf("loading Kubernetes credentials: %w", err)
		}
	}
	client, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("creating Kubernetes client: %w", err)
	}
	return client, nil
}

// readUsageDashboardWithServiceAccount uses the MaaS BFF workload identity.
// Its namespaced Role permits get on the approved resources only (Portal and shared names).
func (r *UsageDashboardsRepository) readUsageDashboardWithServiceAccount(ctx context.Context, namespace, name string) (map[string]any, error) {
	client, err := r.getClient()
	if err != nil {
		return nil, err
	}
	resource, err := client.Resource(persesDashboardGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}
	return usageDashboardResource(resource, namespace)
}

func usageDashboardResource(resource *unstructured.Unstructured, namespace string) (map[string]any, error) {
	name := resource.GetName()
	spec, ok := resource.Object["spec"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("PersesDashboard %q has no spec", name)
	}
	configSpec, ok := spec["config"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("PersesDashboard %q has no spec.config", name)
	}
	configSpec = cloneUsageDashboardMap(configSpec)
	if _, found := configSpec["datasources"]; !found {
		configSpec["datasources"] = map[string]any{}
	}
	return map[string]any{
		"kind": "Dashboard",
		"metadata": map[string]any{
			"name": resource.GetName(), "project": namespace,
			"version":   resource.GetGeneration(),
			"createdAt": resource.GetCreationTimestamp().UTC().Format("2006-01-02T15:04:05Z07:00"),
			"updatedAt": resource.GetCreationTimestamp().UTC().Format("2006-01-02T15:04:05Z07:00"),
		},
		"spec": configSpec,
	}, nil
}

func cloneUsageDashboardMap(value map[string]any) map[string]any {
	clone := make(map[string]any, len(value))
	for key, item := range value {
		clone[key] = item
	}
	return clone
}
