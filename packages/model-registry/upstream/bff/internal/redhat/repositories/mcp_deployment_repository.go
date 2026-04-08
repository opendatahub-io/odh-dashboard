package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strings"

	"github.com/google/uuid"
	k8s "github.com/kubeflow/model-registry/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/model-registry/ui/bff/internal/models"
	"gopkg.in/yaml.v3"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
)

var (
	ErrMcpDeploymentNotFound   = errors.New("MCP deployment not found")
	ErrMcpDeploymentConflict   = errors.New("MCP deployment already exists")
	ErrMcpDeploymentValidation = errors.New("MCP deployment validation failed")
)

var k8sNameRegexp = regexp.MustCompile(`^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$`)

var mcpServerGVR = schema.GroupVersionResource{
	Group:    "mcp.x-k8s.io",
	Version:  "v1alpha1",
	Resource: "mcpservers",
}

const (
	mcpServerAPIVersion        = "mcp.x-k8s.io/v1alpha1"
	mcpServerKind              = "MCPServer"
	mcpDisplayNameAnnotation   = "mcp.opendatahub.io/display-name"
	mcpCatalogServerAnnotation = "mcp.opendatahub.io/catalog-server"
	defaultMcpPort             = int32(8080)
)

type McpDeploymentRepository struct {
	logger *slog.Logger
}

func NewMcpDeploymentRepository(logger *slog.Logger) *McpDeploymentRepository {
	return &McpDeploymentRepository{logger: logger}
}

func (r *McpDeploymentRepository) buildDynamicClient(client k8s.KubernetesClientInterface) (dynamic.Interface, error) {
	cfg, err := restConfigForClient(client)
	if err != nil {
		return nil, err
	}
	dyn, err := dynamic.NewForConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic Kubernetes client: %w", err)
	}
	return dyn, nil
}

func (r *McpDeploymentRepository) List(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
) (models.McpDeploymentList, error) {
	if namespace == "" {
		return models.McpDeploymentList{}, errors.New("namespace is required")
	}

	dyn, err := r.buildDynamicClient(client)
	if err != nil {
		return models.McpDeploymentList{}, err
	}

	list, err := dyn.Resource(mcpServerGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return models.McpDeploymentList{}, fmt.Errorf("failed to list MCPServer resources: %w", err)
	}

	items := make([]models.McpDeployment, 0, len(list.Items))
	for _, item := range list.Items {
		deployment, err := convertUnstructuredToMcpDeployment(item)
		if err != nil {
			r.logger.Warn("skipping MCPServer conversion", "name", item.GetName(), "error", err)
			continue
		}
		items = append(items, deployment)
	}

	return models.McpDeploymentList{
		Items: items,
		Size:  int32(len(items)),
	}, nil
}

func (r *McpDeploymentRepository) Get(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	name string,
) (models.McpDeployment, error) {
	if namespace == "" || name == "" {
		return models.McpDeployment{}, errors.New("namespace and name are required")
	}

	dyn, err := r.buildDynamicClient(client)
	if err != nil {
		return models.McpDeployment{}, err
	}

	item, err := dyn.Resource(mcpServerGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			return models.McpDeployment{}, fmt.Errorf("%w: %q in namespace %q", ErrMcpDeploymentNotFound, name, namespace)
		}
		return models.McpDeployment{}, fmt.Errorf("failed to get MCPServer %q: %w", name, err)
	}

	return convertUnstructuredToMcpDeployment(*item)
}

func (r *McpDeploymentRepository) Create(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	req models.McpDeploymentCreateRequest,
) (models.McpDeployment, error) {
	if namespace == "" {
		return models.McpDeployment{}, errors.New("namespace is required")
	}

	if err := validateCreateRequest(req); err != nil {
		return models.McpDeployment{}, err
	}

	dyn, err := r.buildDynamicClient(client)
	if err != nil {
		return models.McpDeployment{}, err
	}

	server, err := buildMcpServerFromCreateRequest(namespace, req)
	if err != nil {
		return models.McpDeployment{}, err
	}

	obj, err := convertMcpServerToUnstructured(server)
	if err != nil {
		return models.McpDeployment{}, err
	}

	created, err := dyn.Resource(mcpServerGVR).Namespace(namespace).Create(ctx, &obj, metav1.CreateOptions{})
	if err != nil {
		if apierrors.IsAlreadyExists(err) {
			return models.McpDeployment{}, fmt.Errorf("%w: %q in namespace %q", ErrMcpDeploymentConflict, server.Metadata.Name, namespace)
		}
		return models.McpDeployment{}, fmt.Errorf("failed to create MCPServer: %w", err)
	}

	return convertUnstructuredToMcpDeployment(*created)
}

func (r *McpDeploymentRepository) Update(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	name string,
	req models.McpDeploymentUpdateRequest,
) (models.McpDeployment, error) {
	if namespace == "" || name == "" {
		return models.McpDeployment{}, errors.New("namespace and name are required")
	}

	dyn, err := r.buildDynamicClient(client)
	if err != nil {
		return models.McpDeployment{}, err
	}

	patchBody, err := buildMcpDeploymentPatch(req)
	if err != nil {
		return models.McpDeployment{}, err
	}

	patchBytes, err := json.Marshal(patchBody)
	if err != nil {
		return models.McpDeployment{}, fmt.Errorf("failed to encode patch body: %w", err)
	}

	patched, err := dyn.Resource(mcpServerGVR).Namespace(namespace).Patch(
		ctx, name, types.MergePatchType, patchBytes, metav1.PatchOptions{},
	)
	if err != nil {
		if apierrors.IsNotFound(err) {
			return models.McpDeployment{}, fmt.Errorf("%w: %q in namespace %q", ErrMcpDeploymentNotFound, name, namespace)
		}
		return models.McpDeployment{}, fmt.Errorf("failed to patch MCPServer %q: %w", name, err)
	}

	return convertUnstructuredToMcpDeployment(*patched)
}

func (r *McpDeploymentRepository) Delete(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	name string,
) error {
	if namespace == "" || name == "" {
		return errors.New("namespace and name are required")
	}

	dyn, err := r.buildDynamicClient(client)
	if err != nil {
		return err
	}

	if err := dyn.Resource(mcpServerGVR).Namespace(namespace).Delete(ctx, name, metav1.DeleteOptions{}); err != nil {
		if apierrors.IsNotFound(err) {
			return fmt.Errorf("%w: %q in namespace %q", ErrMcpDeploymentNotFound, name, namespace)
		}
		return fmt.Errorf("failed to delete MCPServer %q: %w", name, err)
	}

	return nil
}

func validateCreateRequest(req models.McpDeploymentCreateRequest) error {
	if strings.TrimSpace(req.Image) == "" {
		return fmt.Errorf("%w: image is required", ErrMcpDeploymentValidation)
	}
	if req.Name != "" {
		if err := validateMcpDeploymentName(req.Name); err != nil {
			return fmt.Errorf("%w: invalid name: %v", ErrMcpDeploymentValidation, err)
		}
	}
	return nil
}

func validateMcpDeploymentName(name string) error {
	if len(name) > 253 {
		return fmt.Errorf("name must be no more than 253 characters")
	}
	if !k8sNameRegexp.MatchString(name) {
		return fmt.Errorf("name must consist of lowercase alphanumeric characters or '-', and must start and end with an alphanumeric character")
	}
	return nil
}

func buildMcpServerFromCreateRequest(namespace string, req models.McpDeploymentCreateRequest) (models.MCPServer, error) {
	name := req.Name
	if name == "" {
		name = "mcp-" + uuid.New().String()[:8]
	}

	server := models.MCPServer{
		APIVersion: mcpServerAPIVersion,
		Kind:       mcpServerKind,
		Metadata: models.MCPMetadata{
			Name:      name,
			Namespace: namespace,
		},
		Spec: models.MCPServerSpec{
			Source: models.MCPSourceSpec{
				Type: "ContainerImage",
				ContainerImage: &models.MCPContainerImage{
					Ref: req.Image,
				},
			},
		},
	}

	if req.DisplayName != "" || req.ServerName != "" {
		server.Metadata.Annotations = map[string]string{}
		if req.DisplayName != "" {
			server.Metadata.Annotations[mcpDisplayNameAnnotation] = req.DisplayName
		}
		if req.ServerName != "" {
			server.Metadata.Annotations[mcpCatalogServerAnnotation] = req.ServerName
		}
	}

	if req.YAML != "" {
		spec, err := parseSpecYAML(req.YAML)
		if err != nil {
			return models.MCPServer{}, fmt.Errorf("invalid configuration YAML: %w", err)
		}
		if spec.Config != nil {
			server.Spec.Config = *spec.Config
		}
		if spec.Runtime != nil {
			server.Spec.Runtime = spec.Runtime
		}
	}

	if server.Spec.Config.Port == 0 {
		server.Spec.Config.Port = defaultMcpPort
	}

	return server, nil
}

func convertMcpServerToUnstructured(server models.MCPServer) (unstructured.Unstructured, error) {
	objMap, err := runtime.DefaultUnstructuredConverter.ToUnstructured(&server)
	if err != nil {
		return unstructured.Unstructured{}, fmt.Errorf("failed to convert MCPServer to unstructured: %w", err)
	}

	delete(objMap, "status")
	if metadata, ok := objMap["metadata"].(map[string]interface{}); ok {
		delete(metadata, "creationTimestamp")
	}

	var u unstructured.Unstructured
	u.Object = objMap
	return u, nil
}

func convertUnstructuredToMcpDeployment(obj unstructured.Unstructured) (models.McpDeployment, error) {
	var server models.MCPServer
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &server); err != nil {
		return models.McpDeployment{}, fmt.Errorf("failed to convert MCPServer %q: %w", obj.GetName(), err)
	}

	deployment := models.McpDeployment{
		Name:              server.Metadata.Name,
		Namespace:         server.Metadata.Namespace,
		UID:               string(obj.GetUID()),
		CreationTimestamp: obj.GetCreationTimestamp().UTC().Format("2006-01-02T15:04:05Z"),
		Phase:             models.McpDeploymentPhasePending,
	}

	if server.Metadata.Annotations != nil {
		deployment.DisplayName = server.Metadata.Annotations[mcpDisplayNameAnnotation]
		deployment.ServerName = server.Metadata.Annotations[mcpCatalogServerAnnotation]
	}

	if server.Spec.Source.ContainerImage != nil {
		deployment.Image = server.Spec.Source.ContainerImage.Ref
	}

	specBody := models.McpSpecBody{Config: &server.Spec.Config}
	if server.Spec.Runtime != nil {
		specBody.Runtime = server.Spec.Runtime
	}
	deployment.YAML = marshalSpecToYAML(specBody)

	deployment.Phase, deployment.Conditions = extractMcpServerStatus(obj)
	deployment.Address = extractMcpServerAddress(obj)

	return deployment, nil
}

func buildMcpDeploymentPatch(req models.McpDeploymentUpdateRequest) (map[string]interface{}, error) {
	patch := map[string]interface{}{}

	if req.DisplayName != nil || req.ServerName != nil {
		annotations := map[string]interface{}{}
		if req.DisplayName != nil {
			annotations[mcpDisplayNameAnnotation] = *req.DisplayName
		}
		if req.ServerName != nil {
			annotations[mcpCatalogServerAnnotation] = *req.ServerName
		}
		patch["metadata"] = map[string]interface{}{
			"annotations": annotations,
		}
	}

	specPatch := map[string]interface{}{}

	if req.Image != nil {
		specPatch["source"] = map[string]interface{}{
			"type": "ContainerImage",
			"containerImage": map[string]interface{}{
				"ref": *req.Image,
			},
		}
	}

	if req.YAML != nil {
		if *req.YAML == "" {
			specPatch["config"] = map[string]interface{}{
				"port":      defaultMcpPort,
				"path":      nil,
				"arguments": nil,
				"env":       nil,
				"envFrom":   nil,
				"storage":   nil,
			}
			specPatch["runtime"] = nil
		} else {
			spec, err := parseSpecYAML(*req.YAML)
			if err != nil {
				return nil, fmt.Errorf("invalid configuration YAML: %w", err)
			}

			if spec.Config != nil {
				configMap, err := runtime.DefaultUnstructuredConverter.ToUnstructured(spec.Config)
				if err != nil {
					return nil, fmt.Errorf("failed to convert config to patch: %w", err)
				}
				specPatch["config"] = configMap
			}

			if spec.Runtime != nil {
				runtimeMap, err := runtime.DefaultUnstructuredConverter.ToUnstructured(spec.Runtime)
				if err != nil {
					return nil, fmt.Errorf("failed to convert runtime to patch: %w", err)
				}
				specPatch["runtime"] = runtimeMap
			}
		}
	}

	if len(specPatch) > 0 {
		patch["spec"] = specPatch
	}

	return patch, nil
}

// parseSpecYAML unmarshals the frontend YAML into McpSpecBody.
// Expects config/runtime keys at the top level.
func parseSpecYAML(rawYAML string) (*models.McpSpecBody, error) {
	var generic map[string]interface{}
	if err := yaml.Unmarshal([]byte(rawYAML), &generic); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	jsonBytes, err := json.Marshal(generic)
	if err != nil {
		return nil, fmt.Errorf("failed to convert YAML to JSON: %w", err)
	}

	var direct models.McpSpecBody
	if err := json.Unmarshal(jsonBytes, &direct); err != nil {
		return nil, fmt.Errorf("failed to parse spec: %w", err)
	}

	if direct.Config != nil || direct.Runtime != nil {
		return &direct, nil
	}

	return nil, fmt.Errorf("YAML must contain config or runtime")
}

func marshalSpecToYAML(spec models.McpSpecBody) string {
	jsonBytes, err := json.Marshal(spec)
	if err != nil {
		return ""
	}

	var generic map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &generic); err != nil {
		return ""
	}

	yamlBytes, err := yaml.Marshal(generic)
	if err != nil {
		return ""
	}
	return string(yamlBytes)
}

func extractMcpServerStatus(obj unstructured.Unstructured) (models.McpDeploymentPhase, []models.McpDeploymentCondition) {
	phase := models.McpDeploymentPhasePending
	var conditions []models.McpDeploymentCondition

	status, ok := obj.Object["status"].(map[string]interface{})
	if !ok {
		return phase, conditions
	}

	if p, ok := status["phase"].(string); ok && p != "" {
		phase = models.McpDeploymentPhase(p)
	}

	condList, ok := status["conditions"].([]interface{})
	if !ok {
		return phase, conditions
	}

	conditions = make([]models.McpDeploymentCondition, 0, len(condList))
	for _, item := range condList {
		c, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		conditions = append(conditions, models.McpDeploymentCondition{
			Type:               getString(c, "type"),
			Status:             getString(c, "status"),
			LastTransitionTime: getString(c, "lastTransitionTime"),
			Reason:             getString(c, "reason"),
			Message:            getString(c, "message"),
		})
	}

	return phase, conditions
}

func extractMcpServerAddress(obj unstructured.Unstructured) *models.McpDeploymentAddress {
	status, ok := obj.Object["status"].(map[string]interface{})
	if !ok {
		return nil
	}
	addr, ok := status["address"].(map[string]interface{})
	if !ok {
		return nil
	}
	url := getString(addr, "url")
	if url == "" {
		return nil
	}
	return &models.McpDeploymentAddress{URL: url}
}
