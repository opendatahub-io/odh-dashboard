package repositories

import (
	"context"
	"errors"
	"fmt"

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
	ErrPersesNamespaceNotConfigured = errors.New("Perses dashboard namespace is not configured")
	persesDashboardGVR              = schema.GroupVersionResource{Group: "perses.dev", Version: "v1alpha2", Resource: "persesdashboards"}
)

type usageDashboardReader func(context.Context, string, string) (map[string]any, error)

// UsageDashboardsRepository reads only the approved dashboard definitions.
// The BFF's service account is used for Kubernetes reads; caller authorization
// must already have succeeded before List is called.
type UsageDashboardsRepository struct {
	namespace string
	reader    usageDashboardReader
}

func NewUsageDashboardsRepository(namespace string, mock bool) *UsageDashboardsRepository {
	reader := readUsageDashboardWithServiceAccount
	if mock {
		reader = mocks.ReadUsageDashboard
		if namespace == "" {
			namespace = "mock-monitoring"
		}
	}
	return &UsageDashboardsRepository{namespace: namespace, reader: reader}
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
	for _, name := range names {
		resource, err := r.reader(ctx, r.namespace, name)
		if err != nil {
			return nil, fmt.Errorf("reading PersesDashboard %q: %w", name, err)
		}
		dashboards = append(dashboards, resource)
	}
	return dashboards, nil
}

// readUsageDashboardWithServiceAccount uses the MaaS BFF workload identity.
// Its namespaced Role permits get on the two approved resources only.
func readUsageDashboardWithServiceAccount(ctx context.Context, namespace, name string) (map[string]any, error) {
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
