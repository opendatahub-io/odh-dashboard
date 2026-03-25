package repositories

import (
	"errors"
	"fmt"
	"strconv"
	"sync"

	"github.com/kubeflow/model-registry/ui/bff/internal/mocks"
	"github.com/kubeflow/model-registry/ui/bff/internal/models"
)

var ErrMcpDeploymentNotFound = errors.New("MCP deployment not found")

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

	start := 0
	if nextPageToken != "" {
		v, err := strconv.Atoi(nextPageToken)
		if err != nil || v < 0 || v > len(filtered) {
			return models.McpDeploymentList{}, fmt.Errorf("invalid nextPageToken %q", nextPageToken)
		}
		start = v
	}

	end := start + int(pageSize)
	if end > len(filtered) {
		end = len(filtered)
	}

	pageItems := filtered[start:end]
	newNextPageToken := ""
	if end < len(filtered) {
		newNextPageToken = strconv.Itoa(end)
	}

	return models.McpDeploymentList{
		Items:         pageItems,
		Size:          int32(len(filtered)),
		PageSize:      int32(len(pageItems)),
		NextPageToken: newNextPageToken,
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
	return fmt.Errorf("%w: %q in namespace %q", ErrMcpDeploymentNotFound, name, namespace)
}
