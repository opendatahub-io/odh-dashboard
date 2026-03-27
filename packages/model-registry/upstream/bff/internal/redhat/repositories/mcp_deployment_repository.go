package repositories

import (
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/kubeflow/model-registry/ui/bff/internal/mocks"
	"github.com/kubeflow/model-registry/ui/bff/internal/models"
)

var (
	ErrMcpDeploymentNotFound = errors.New("MCP deployment not found")
	ErrMcpDeploymentConflict = errors.New("MCP deployment already exists")
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

func (r *McpDeploymentRepository) Get(namespace string, name string) (models.McpDeployment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, d := range r.deployments {
		if d.Name == name && (namespace == "" || d.Namespace == namespace) {
			return d, nil
		}
	}
	return models.McpDeployment{}, fmt.Errorf("%w: %q in namespace %q", ErrMcpDeploymentNotFound, name, namespace)
}

func (r *McpDeploymentRepository) Create(namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	name := req.Name
	if name == "" {
		name = "mcp-" + uuid.New().String()[:8]
	}

	for _, d := range r.deployments {
		if d.Name == name && d.Namespace == namespace {
			return models.McpDeployment{}, fmt.Errorf("%w: %q in namespace %q", ErrMcpDeploymentConflict, name, namespace)
		}
	}

	port := req.Port
	if port == 0 {
		port = 8080
	}

	deployment := models.McpDeployment{
		Name:              name,
		DisplayName:       req.DisplayName,
		Namespace:         namespace,
		UID:               uuid.New().String(),
		CreationTimestamp: time.Now().UTC().Format(time.RFC3339),
		Image:             req.Image,
		Port:              port,
		YAML:              req.YAML,
		Phase:             models.McpDeploymentPhasePending,
	}

	r.deployments = append(r.deployments, deployment)
	return deployment, nil
}

func (r *McpDeploymentRepository) Update(namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i, d := range r.deployments {
		if d.Name == name && (namespace == "" || d.Namespace == namespace) {
			if req.DisplayName != nil {
				r.deployments[i].DisplayName = *req.DisplayName
			}
			if req.Image != nil {
				r.deployments[i].Image = *req.Image
			}
			if req.Port != nil {
				r.deployments[i].Port = *req.Port
			}
			if req.YAML != nil {
				r.deployments[i].YAML = *req.YAML
			}
			return r.deployments[i], nil
		}
	}
	return models.McpDeployment{}, fmt.Errorf("%w: %q in namespace %q", ErrMcpDeploymentNotFound, name, namespace)
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
