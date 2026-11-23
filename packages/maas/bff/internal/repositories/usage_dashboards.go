package repositories

import (
	"context"
	"errors"
	"fmt"
	"sync"

	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
)

const (
	userUsageDashboardName  = "dashboard-5-maas-usage-logs"
	adminUsageDashboardName = "dashboard-4-maas-usage-logs-admin"
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
	namespace     string
	reader        usageDashboardReader
	clientMu      sync.Mutex
	client        dynamic.Interface
	clientFactory func() (dynamic.Interface, error)
}

func NewUsageDashboardsRepository(namespace string, mock bool) *UsageDashboardsRepository {
	repo := &UsageDashboardsRepository{namespace: namespace, clientFactory: newUsageDashboardClient}
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
	names := []string{userUsageDashboardName}
	if whoAmI.IsAdmin {
		names = append(names, adminUsageDashboardName)
	}
	dashboards := make([]map[string]any, 0, len(names))
	reader := r.reader
	if reader == nil {
		reader = r.readUsageDashboardWithServiceAccount
	}
	for _, name := range names {
		resource, err := reader(ctx, r.namespace, name)
		if err != nil {
			return nil, fmt.Errorf("reading PersesDashboard %q: %w", name, err)
		}
		dashboards = append(dashboards, resource)
	}
	return dashboards, nil
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
// Its namespaced Role permits get on the two approved resources only.
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
