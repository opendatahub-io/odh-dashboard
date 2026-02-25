package repositories

import (
	"context"
	"encoding/json"
	"fmt"

	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	k8sinterface "k8s.io/client-go/kubernetes"
)

var dspipelineGVR = schema.GroupVersionResource{
	Group:    "datasciencepipelinesapplications.opendatahub.io",
	Version:  "v1alpha1",
	Resource: "datasciencepipelinesapplications",
}

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

	// List DSPipelineApplication CRs
	unstructuredList, err := dynamicClient.Resource(dspipelineGVR).
		Namespace(namespace).
		List(ctx, metav1.ListOptions{})
	if err != nil {
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

	// Get the DSPipelineApplication CR
	unstructuredObj, err := dynamicClient.Resource(dspipelineGVR).
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
