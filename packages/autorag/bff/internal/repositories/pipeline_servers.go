package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"

	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	k8sinterface "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// Custom errors for proper HTTP status code mapping
var (
	ErrNamespaceNotFound = errors.New("namespace not found")
	ErrForbidden         = errors.New("forbidden")
	ErrNotFound          = errors.New("resource not found")
)

const (
	dsPipelineGroup    = "datasciencepipelinesapplications.opendatahub.io"
	dsPipelineResource = "datasciencepipelinesapplications"
)

// PipelineServersRepository handles business logic for Pipeline Servers
type PipelineServersRepository struct{}

// NewPipelineServersRepository creates a new repository instance
func NewPipelineServersRepository() *PipelineServersRepository {
	return &PipelineServersRepository{}
}

// ListPipelineServers retrieves all Pipeline Servers (DSPipelineApplications) in a namespace
func (r *PipelineServersRepository) ListPipelineServers(ctx context.Context, client kubernetes.KubernetesClientInterface, namespace string) (*models.PipelineServersData, error) {
	// Get all DSPipelineApplications from Kubernetes
	dspas, err := r.listDSPipelineApplications(ctx, client, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to list DSPipelineApplications: %w", err)
	}

	// Convert to stable API format
	servers := make([]models.PipelineServer, 0, len(dspas))
	for _, dspa := range dspas {
		server := models.PipelineServer{
			Name:      dspa.Metadata.Name,
			Namespace: dspa.Metadata.Namespace,
			Ready:     dspa.Status.Ready,
			APIUrl:    getPipelineServerAPIUrl(dspa.Metadata.Namespace, dspa.Metadata.Name),
		}
		servers = append(servers, server)
	}

	return &models.PipelineServersData{
		Servers: servers,
	}, nil
}

// listDSPipelineApplications lists all DSPipelineApplication CRs in a namespace
func (r *PipelineServersRepository) listDSPipelineApplications(ctx context.Context, client kubernetes.KubernetesClientInterface, namespace string) ([]models.DSPipelineApplication, error) {
	// Check if we're running in mock K8s mode
	if isMockK8sMode() {
		// Running with mock K8s client - return mock data
		return getMockDSPipelineApplications(namespace), nil
	}

	// Get dynamic client
	config, err := helper.GetKubeconfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	// Discover the preferred API version for DSPipelineApplication
	gvr, err := discoverDSPipelineApplicationGVR(config)
	if err != nil {
		return nil, fmt.Errorf("failed to discover DSPipelineApplication API version: %w", err)
	}

	// List DSPipelineApplication CRs
	unstructuredList, err := dynamicClient.Resource(gvr).
		Namespace(namespace).
		List(ctx, metav1.ListOptions{})
	if err != nil {
		// Check for specific Kubernetes error types
		if k8serrors.IsNotFound(err) {
			// Namespace doesn't exist or resource type not found
			return nil, fmt.Errorf("%w: %s", ErrNamespaceNotFound, namespace)
		}
		if k8serrors.IsForbidden(err) {
			// No permission to list resources in this namespace
			return nil, fmt.Errorf("%w: cannot list DSPipelineApplications in namespace %s", ErrForbidden, namespace)
		}
		// Other unexpected errors
		return nil, fmt.Errorf("failed to list DSPipelineApplications in namespace %s: %w", namespace, err)
	}

	// Convert to our models
	dspas := make([]models.DSPipelineApplication, 0, len(unstructuredList.Items))
	for _, item := range unstructuredList.Items {
		dspa, err := unstructuredToDSPipelineApplication(&item)
		if err != nil {
			// Log warning but continue with other items
			continue
		}
		dspas = append(dspas, *dspa)
	}

	return dspas, nil
}

// getPipelineServerAPIUrl constructs the Pipeline Server API URL
func getPipelineServerAPIUrl(namespace, name string) string {
	// The Pipeline Server API is typically exposed as a Kubernetes service
	// Format: https://ds-pipeline-{name}.{namespace}.svc.cluster.local:8443
	return fmt.Sprintf("https://ds-pipeline-%s.%s.svc.cluster.local:8443", name, namespace)
}

// getDSPipelineApplication retrieves a specific DSPipelineApplication CR by name
func getDSPipelineApplication(ctx context.Context, client kubernetes.KubernetesClientInterface, namespace, name string) (*models.DSPipelineApplication, error) {
	// Validate we have a real Kubernetes client
	_, ok := client.GetClientset().(k8sinterface.Interface)
	if !ok {
		return nil, fmt.Errorf("failed to get kubernetes clientset")
	}

	// Get dynamic client
	config, err := helper.GetKubeconfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	// Discover the preferred API version for DSPipelineApplication
	gvr, err := discoverDSPipelineApplicationGVR(config)
	if err != nil {
		return nil, fmt.Errorf("failed to discover DSPipelineApplication API version: %w", err)
	}

	// Get the DSPipelineApplication CR
	unstructuredObj, err := dynamicClient.Resource(gvr).
		Namespace(namespace).
		Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get DSPipelineApplication %s/%s: %w", namespace, name, err)
	}

	// Convert unstructured to our model
	dspa, err := unstructuredToDSPipelineApplication(unstructuredObj)
	if err != nil {
		return nil, fmt.Errorf("failed to convert DSPipelineApplication: %w", err)
	}

	return dspa, nil
}

// unstructuredToDSPipelineApplication converts an unstructured object to DSPipelineApplication model
func unstructuredToDSPipelineApplication(obj *unstructured.Unstructured) (*models.DSPipelineApplication, error) {
	// Marshal to JSON then unmarshal to our struct
	jsonBytes, err := obj.MarshalJSON()
	if err != nil {
		return nil, fmt.Errorf("failed to marshal unstructured object: %w", err)
	}

	var dspa models.DSPipelineApplication
	if err := json.Unmarshal(jsonBytes, &dspa); err != nil {
		return nil, fmt.Errorf("failed to unmarshal to DSPipelineApplication: %w", err)
	}

	return &dspa, nil
}

// discoverDSPipelineApplicationGVR discovers the preferred API version for DSPipelineApplication
func discoverDSPipelineApplicationGVR(config *rest.Config) (schema.GroupVersionResource, error) {
	// Try known versions in order of preference (newer to older)
	knownVersions := []string{"v1", "v1beta1", "v1alpha1"}

	for _, version := range knownVersions {
		gvr := schema.GroupVersionResource{
			Group:    dsPipelineGroup,
			Version:  version,
			Resource: dsPipelineResource,
		}

		// Try to create a dynamic client and test if this version exists
		dynamicClient, err := dynamic.NewForConfig(config)
		if err != nil {
			continue
		}

		// Test if we can access the resource with this version
		// We do a simple list with limit=1 to check availability
		_, err = dynamicClient.Resource(gvr).List(context.Background(), metav1.ListOptions{Limit: 1})
		if err == nil || !k8serrors.IsNotFound(err) {
			// Version exists (either succeeded or got a different error like forbidden, which means the resource exists)
			return gvr, nil
		}
	}

	// If none of the known versions work, default to v1
	return schema.GroupVersionResource{
		Group:    dsPipelineGroup,
		Version:  "v1",
		Resource: dsPipelineResource,
	}, nil
}

// isMockK8sMode checks if we're running with mocked Kubernetes client
func isMockK8sMode() bool {
	mockK8s := os.Getenv("MOCK_K8S_CLIENT")
	return strings.ToLower(mockK8s) == "true"
}

// getMockDSPipelineApplications returns mock DSPipelineApplication data for development
func getMockDSPipelineApplications(namespace string) []models.DSPipelineApplication {
	return []models.DSPipelineApplication{
		{
			APIVersion: "datasciencepipelinesapplications.opendatahub.io/v1",
			Kind:       "DSPipelineApplication",
			Metadata: models.DSPipelineApplicationMetadata{
				Name:      "dspa",
				Namespace: namespace,
			},
			Spec: models.DSPipelineApplicationSpec{
				APIServer: &models.APIServer{
					Deploy: true,
				},
			},
			Status: models.DSPipelineApplicationStatus{
				Ready: true,
				Conditions: []models.DSPipelineApplicationCondition{
					{
						Type:    "Ready",
						Status:  "True",
						Reason:  "MinimumReplicasAvailable",
						Message: "Deployment has minimum availability",
					},
				},
			},
		},
		{
			APIVersion: "datasciencepipelinesapplications.opendatahub.io/v1",
			Kind:       "DSPipelineApplication",
			Metadata: models.DSPipelineApplicationMetadata{
				Name:      "dspa-test",
				Namespace: namespace,
			},
			Spec: models.DSPipelineApplicationSpec{
				APIServer: &models.APIServer{
					Deploy: true,
				},
			},
			Status: models.DSPipelineApplicationStatus{
				Ready: false,
				Conditions: []models.DSPipelineApplicationCondition{
					{
						Type:    "Ready",
						Status:  "False",
						Reason:  "PodNotReady",
						Message: "Waiting for pods to become ready",
					},
				},
			},
		},
	}
}
