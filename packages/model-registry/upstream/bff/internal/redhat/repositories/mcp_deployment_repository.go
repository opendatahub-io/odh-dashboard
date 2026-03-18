package repositories

import (
	"fmt"
	"sync"

	"github.com/kubeflow/model-registry/ui/bff/internal/mocks"
	"github.com/kubeflow/model-registry/ui/bff/internal/models"
)

// McpDeploymentRepository provides CRUD operations for MCPServer deployments.
// Currently backed by in-memory mock data; will be replaced with real K8s
// client calls once the MCPServer CRD integration is finalized.
type McpDeploymentRepository struct {
	mu          sync.RWMutex
	deployments []models.McpDeployment
}

func NewMcpDeploymentRepository() *McpDeploymentRepository {
	return &McpDeploymentRepository{
		deployments: mocks.GetMcpDeploymentMocks(),
	}
}

func (r *McpDeploymentRepository) List(namespace string, pageSize int32, nextPageToken string) (models.McpDeploymentList, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := make([]models.McpDeployment, 0)
	for _, d := range r.deployments {
		if namespace == "" || d.Namespace == namespace {
			filtered = append(filtered, d)
		}
	}

	if pageSize <= 0 {
		pageSize = int32(len(filtered))
	}

	total := int32(len(filtered))
	if int(pageSize) < len(filtered) {
		filtered = filtered[:pageSize]
	}

	return models.McpDeploymentList{
		Items:    filtered,
		Size:     total,
		PageSize: pageSize,
	}, nil
}

func (r *McpDeploymentRepository) Delete(namespace string, name string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i, d := range r.deployments {
		if d.Name == name && (namespace == "" || d.Namespace == namespace) {
			r.deployments = append(r.deployments[:i], r.deployments[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("MCPServer deployment %q not found in namespace %q", name, namespace)
}
