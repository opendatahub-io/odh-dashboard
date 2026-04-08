package repositories

import (
	"errors"
	"strings"
	"testing"

	"github.com/kubeflow/model-registry/ui/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// buildMcpServerFromCreateRequest
func TestBuildMcpServerFromCreateRequest_MinimalRequest(t *testing.T) {
	req := models.McpDeploymentCreateRequest{
		Image: "quay.io/mcp/test:1.0",
	}

	server, err := buildMcpServerFromCreateRequest("test-ns", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if server.APIVersion != mcpServerAPIVersion {
		t.Fatalf("expected apiVersion %q, got %q", mcpServerAPIVersion, server.APIVersion)
	}
	if server.Kind != mcpServerKind {
		t.Fatalf("expected kind %q, got %q", mcpServerKind, server.Kind)
	}
	if server.Metadata.Namespace != "test-ns" {
		t.Fatalf("expected namespace %q, got %q", "test-ns", server.Metadata.Namespace)
	}
	if !strings.HasPrefix(server.Metadata.Name, "mcp-") {
		t.Fatalf("expected auto-generated name starting with 'mcp-', got %q", server.Metadata.Name)
	}
	if server.Spec.Source.ContainerImage == nil || server.Spec.Source.ContainerImage.Ref != "quay.io/mcp/test:1.0" {
		t.Fatalf("expected image ref 'quay.io/mcp/test:1.0', got %v", server.Spec.Source.ContainerImage)
	}
	if server.Spec.Source.Type != "ContainerImage" {
		t.Fatalf("expected source type 'ContainerImage', got %q", server.Spec.Source.Type)
	}
	if server.Spec.Config.Port != defaultMcpPort {
		t.Fatalf("expected default port %d, got %d", defaultMcpPort, server.Spec.Config.Port)
	}
	if server.Spec.Runtime != nil {
		t.Fatalf("expected nil runtime, got %+v", server.Spec.Runtime)
	}
}

func TestBuildMcpServerFromCreateRequest_WithExplicitName(t *testing.T) {
	req := models.McpDeploymentCreateRequest{
		Name:  "my-mcp-server",
		Image: "quay.io/mcp/test:1.0",
	}

	server, err := buildMcpServerFromCreateRequest("default", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if server.Metadata.Name != "my-mcp-server" {
		t.Fatalf("expected name %q, got %q", "my-mcp-server", server.Metadata.Name)
	}
}

func TestBuildMcpServerFromCreateRequest_WithDisplayName(t *testing.T) {
	req := models.McpDeploymentCreateRequest{
		Name:        "github-mcp",
		DisplayName: "GitHub MCP Server",
		Image:       "quay.io/mcp/github:latest",
	}

	server, err := buildMcpServerFromCreateRequest("default", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if server.Metadata.Annotations == nil {
		t.Fatal("expected annotations to be set")
	}
	if server.Metadata.Annotations[mcpDisplayNameAnnotation] != "GitHub MCP Server" {
		t.Fatalf("expected display name annotation %q, got %q",
			"GitHub MCP Server", server.Metadata.Annotations[mcpDisplayNameAnnotation])
	}
}

func TestBuildMcpServerFromCreateRequest_WithServerName(t *testing.T) {
	req := models.McpDeploymentCreateRequest{
		Name:       "k8s-mcp",
		ServerName: "kubernetes-mcp-server",
		Image:      "quay.io/mcp/k8s:latest",
	}

	server, err := buildMcpServerFromCreateRequest("default", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if server.Metadata.Annotations == nil {
		t.Fatal("expected annotations to be set")
	}
	if server.Metadata.Annotations[mcpCatalogServerAnnotation] != "kubernetes-mcp-server" {
		t.Fatalf("expected catalog server annotation %q, got %q",
			"kubernetes-mcp-server", server.Metadata.Annotations[mcpCatalogServerAnnotation])
	}
}

func TestBuildMcpServerFromCreateRequest_WithDisplayNameAndServerName(t *testing.T) {
	req := models.McpDeploymentCreateRequest{
		Name:        "k8s-mcp",
		DisplayName: "Kubernetes MCP",
		ServerName:  "kubernetes-mcp-server",
		Image:       "quay.io/mcp/k8s:latest",
	}

	server, err := buildMcpServerFromCreateRequest("default", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if server.Metadata.Annotations[mcpDisplayNameAnnotation] != "Kubernetes MCP" {
		t.Fatalf("expected display name annotation %q, got %q",
			"Kubernetes MCP", server.Metadata.Annotations[mcpDisplayNameAnnotation])
	}
	if server.Metadata.Annotations[mcpCatalogServerAnnotation] != "kubernetes-mcp-server" {
		t.Fatalf("expected catalog server annotation %q, got %q",
			"kubernetes-mcp-server", server.Metadata.Annotations[mcpCatalogServerAnnotation])
	}
}

func TestBuildMcpServerFromCreateRequest_DefaultPort(t *testing.T) {
	req := models.McpDeploymentCreateRequest{
		Image: "quay.io/mcp/test:1.0",
	}

	server, err := buildMcpServerFromCreateRequest("default", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if server.Spec.Config.Port != defaultMcpPort {
		t.Fatalf("expected default port %d, got %d", defaultMcpPort, server.Spec.Config.Port)
	}
}

func TestBuildMcpServerFromCreateRequest_WithSpecYAML(t *testing.T) {
	yamlContent := `config:
  port: 3000
  path: /mcp
runtime:
  security:
    serviceAccountName: mcp-viewer`

	req := models.McpDeploymentCreateRequest{
		Name:  "k8s-mcp",
		Image: "quay.io/mcp/kubernetes:latest",
		YAML:  yamlContent,
	}

	server, err := buildMcpServerFromCreateRequest("default", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if server.Spec.Config.Port != 3000 {
		t.Fatalf("expected port 3000 from YAML, got %d", server.Spec.Config.Port)
	}
	if server.Spec.Config.Path != "/mcp" {
		t.Fatalf("expected path '/mcp', got %q", server.Spec.Config.Path)
	}
	if server.Spec.Runtime == nil {
		t.Fatal("expected runtime to be set from YAML")
	}
	if server.Spec.Runtime.Security == nil || server.Spec.Runtime.Security.ServiceAccountName != "mcp-viewer" {
		t.Fatalf("expected serviceAccountName 'mcp-viewer', got %+v", server.Spec.Runtime)
	}
}

func TestBuildMcpServerFromCreateRequest_WithDirectYAMLKeys(t *testing.T) {
	yamlContent := `config:
  port: 4000
  path: /sse`

	req := models.McpDeploymentCreateRequest{
		Name:  "direct-yaml",
		Image: "quay.io/mcp/test:1.0",
		YAML:  yamlContent,
	}

	server, err := buildMcpServerFromCreateRequest("default", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if server.Spec.Config.Port != 4000 {
		t.Fatalf("expected port 4000, got %d", server.Spec.Config.Port)
	}
	if server.Spec.Config.Path != "/sse" {
		t.Fatalf("expected path '/sse', got %q", server.Spec.Config.Path)
	}
}

func TestBuildMcpServerFromCreateRequest_InvalidYAML(t *testing.T) {
	req := models.McpDeploymentCreateRequest{
		Image: "quay.io/mcp/test:1.0",
		YAML:  "not: valid: yaml: [",
	}

	_, err := buildMcpServerFromCreateRequest("default", req)
	if err == nil {
		t.Fatal("expected error for invalid YAML")
	}
}

func TestBuildMcpServerFromCreateRequest_YAMLPortTakesPrecedence(t *testing.T) {
	yamlContent := `config:
  port: 5555`

	req := models.McpDeploymentCreateRequest{
		Image: "quay.io/mcp/test:1.0",
		YAML:  yamlContent,
	}

	server, err := buildMcpServerFromCreateRequest("default", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if server.Spec.Config.Port != 5555 {
		t.Fatalf("expected YAML port 5555, got %d", server.Spec.Config.Port)
	}
}

// convertMcpServerToUnstructured
func TestConvertMcpServerToUnstructured(t *testing.T) {
	server := models.MCPServer{
		APIVersion: mcpServerAPIVersion,
		Kind:       mcpServerKind,
		Metadata: models.MCPMetadata{
			Name:      "test-server",
			Namespace: "default",
			Annotations: map[string]string{
				mcpDisplayNameAnnotation: "Test Server",
			},
		},
		Spec: models.MCPServerSpec{
			Source: models.MCPSourceSpec{
				Type:           "ContainerImage",
				ContainerImage: &models.MCPContainerImage{Ref: "quay.io/test:1.0"},
			},
			Config: models.MCPConfigSpec{Port: 8080},
		},
	}

	u, err := convertMcpServerToUnstructured(server)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if u.GetName() != "test-server" {
		t.Fatalf("expected name 'test-server', got %q", u.GetName())
	}
	if u.GetNamespace() != "default" {
		t.Fatalf("expected namespace 'default', got %q", u.GetNamespace())
	}

	if _, exists := u.Object["status"]; exists {
		t.Fatal("expected status to be stripped")
	}
}

// convertUnstructuredToMcpDeployment
func newTestUnstructured(name, namespace, image string, port int64) unstructured.Unstructured {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": mcpServerAPIVersion,
			"kind":       mcpServerKind,
			"metadata": map[string]interface{}{
				"name":              name,
				"namespace":         namespace,
				"uid":               "test-uid-123",
				"creationTimestamp": "2026-03-30T10:00:00Z",
				"annotations": map[string]interface{}{
					mcpDisplayNameAnnotation: "My Test Server",
				},
			},
			"spec": map[string]interface{}{
				"source": map[string]interface{}{
					"type": "ContainerImage",
					"containerImage": map[string]interface{}{
						"ref": image,
					},
				},
				"config": map[string]interface{}{
					"port": port,
					"path": "/mcp",
				},
			},
		},
	}
	return obj
}

func TestConvertUnstructuredToMcpDeployment_Basic(t *testing.T) {
	obj := newTestUnstructured("k8s-mcp", "test-ns", "quay.io/mcp/k8s:1.0", 8080)

	deployment, err := convertUnstructuredToMcpDeployment(obj)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if deployment.Name != "k8s-mcp" {
		t.Fatalf("expected name 'k8s-mcp', got %q", deployment.Name)
	}
	if deployment.Namespace != "test-ns" {
		t.Fatalf("expected namespace 'test-ns', got %q", deployment.Namespace)
	}
	if deployment.UID != "test-uid-123" {
		t.Fatalf("expected UID 'test-uid-123', got %q", deployment.UID)
	}
	if deployment.Image != "quay.io/mcp/k8s:1.0" {
		t.Fatalf("expected image 'quay.io/mcp/k8s:1.0', got %q", deployment.Image)
	}
	if deployment.DisplayName != "My Test Server" {
		t.Fatalf("expected displayName 'My Test Server', got %q", deployment.DisplayName)
	}
	if deployment.YAML == "" {
		t.Fatal("expected YAML to be populated")
	}
	if !strings.Contains(deployment.YAML, "port: 8080") {
		t.Fatalf("expected YAML to contain 'port: 8080', got:\n%s", deployment.YAML)
	}
}

func TestConvertUnstructuredToMcpDeployment_WithServerAnnotation(t *testing.T) {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": mcpServerAPIVersion,
			"kind":       mcpServerKind,
			"metadata": map[string]interface{}{
				"name":              "k8s-mcp",
				"namespace":         "test-ns",
				"uid":               "test-uid-789",
				"creationTimestamp": "2026-03-30T10:00:00Z",
				"annotations": map[string]interface{}{
					mcpDisplayNameAnnotation:   "Kubernetes MCP",
					mcpCatalogServerAnnotation: "kubernetes-mcp-server",
				},
			},
			"spec": map[string]interface{}{
				"source": map[string]interface{}{
					"type": "ContainerImage",
					"containerImage": map[string]interface{}{
						"ref": "quay.io/mcp/k8s:1.0",
					},
				},
				"config": map[string]interface{}{
					"port": int64(8080),
				},
			},
		},
	}

	deployment, err := convertUnstructuredToMcpDeployment(obj)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if deployment.DisplayName != "Kubernetes MCP" {
		t.Fatalf("expected displayName 'Kubernetes MCP', got %q", deployment.DisplayName)
	}
	if deployment.ServerName != "kubernetes-mcp-server" {
		t.Fatalf("expected serverName 'kubernetes-mcp-server', got %q", deployment.ServerName)
	}
}

func TestConvertUnstructuredToMcpDeployment_NoAnnotations(t *testing.T) {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": mcpServerAPIVersion,
			"kind":       mcpServerKind,
			"metadata": map[string]interface{}{
				"name":              "no-annotations",
				"namespace":         "default",
				"uid":               "uid-456",
				"creationTimestamp": "2026-03-30T12:00:00Z",
			},
			"spec": map[string]interface{}{
				"source": map[string]interface{}{
					"type": "ContainerImage",
					"containerImage": map[string]interface{}{
						"ref": "quay.io/test:1.0",
					},
				},
				"config": map[string]interface{}{
					"port": int64(8080),
				},
			},
		},
	}

	deployment, err := convertUnstructuredToMcpDeployment(obj)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if deployment.DisplayName != "" {
		t.Fatalf("expected empty displayName, got %q", deployment.DisplayName)
	}
	if deployment.ServerName != "" {
		t.Fatalf("expected empty serverName, got %q", deployment.ServerName)
	}
}

// extractMcpServerStatus
func TestExtractMcpServerStatus_NoStatus(t *testing.T) {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"metadata": map[string]interface{}{"name": "test"},
		},
	}

	phase, conditions := extractMcpServerStatus(obj)
	if phase != models.McpDeploymentPhasePending {
		t.Fatalf("expected phase Pending, got %q", phase)
	}
	if conditions != nil {
		t.Fatalf("expected nil conditions, got %+v", conditions)
	}
}

func TestExtractMcpServerStatus_WithPhase(t *testing.T) {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"metadata": map[string]interface{}{"name": "test"},
			"status": map[string]interface{}{
				"phase": "Running",
			},
		},
	}

	phase, _ := extractMcpServerStatus(obj)
	if phase != models.McpDeploymentPhaseRunning {
		t.Fatalf("expected phase Running, got %q", phase)
	}
}

func TestExtractMcpServerStatus_WithConditions(t *testing.T) {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"metadata": map[string]interface{}{"name": "test"},
			"status": map[string]interface{}{
				"phase": "Running",
				"conditions": []interface{}{
					map[string]interface{}{
						"type":               "Ready",
						"status":             "True",
						"lastTransitionTime": "2026-03-30T10:00:00Z",
						"reason":             "AllGood",
						"message":            "Server is running",
					},
					map[string]interface{}{
						"type":   "Available",
						"status": "True",
					},
				},
			},
		},
	}

	phase, conditions := extractMcpServerStatus(obj)
	if phase != models.McpDeploymentPhaseRunning {
		t.Fatalf("expected phase Running, got %q", phase)
	}
	if len(conditions) != 2 {
		t.Fatalf("expected 2 conditions, got %d", len(conditions))
	}
	if conditions[0].Type != "Ready" {
		t.Fatalf("expected first condition type 'Ready', got %q", conditions[0].Type)
	}
	if conditions[0].Reason != "AllGood" {
		t.Fatalf("expected reason 'AllGood', got %q", conditions[0].Reason)
	}
	if conditions[1].Type != "Available" {
		t.Fatalf("expected second condition type 'Available', got %q", conditions[1].Type)
	}
}

// extractMcpServerAddress
func TestExtractMcpServerAddress_NoStatus(t *testing.T) {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"metadata": map[string]interface{}{"name": "test"},
		},
	}

	addr := extractMcpServerAddress(obj)
	if addr != nil {
		t.Fatalf("expected nil address, got %+v", addr)
	}
}

func TestExtractMcpServerAddress_NoAddressField(t *testing.T) {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"metadata": map[string]interface{}{"name": "test"},
			"status": map[string]interface{}{
				"phase": "Running",
			},
		},
	}

	addr := extractMcpServerAddress(obj)
	if addr != nil {
		t.Fatalf("expected nil address when no address field, got %+v", addr)
	}
}

func TestExtractMcpServerAddress_EmptyURL(t *testing.T) {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"metadata": map[string]interface{}{"name": "test"},
			"status": map[string]interface{}{
				"address": map[string]interface{}{
					"url": "",
				},
			},
		},
	}

	addr := extractMcpServerAddress(obj)
	if addr != nil {
		t.Fatalf("expected nil address for empty URL, got %+v", addr)
	}
}

func TestExtractMcpServerAddress_WithURL(t *testing.T) {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"metadata": map[string]interface{}{"name": "test"},
			"status": map[string]interface{}{
				"address": map[string]interface{}{
					"url": "http://test.default.svc.cluster.local:8080/mcp",
				},
			},
		},
	}

	addr := extractMcpServerAddress(obj)
	if addr == nil {
		t.Fatal("expected non-nil address")
	}
	if addr.URL != "http://test.default.svc.cluster.local:8080/mcp" {
		t.Fatalf("expected URL 'http://test.default.svc.cluster.local:8080/mcp', got %q", addr.URL)
	}
}

// convertUnstructuredToMcpDeployment — with status and address
func TestConvertUnstructuredToMcpDeployment_WithStatusAndAddress(t *testing.T) {
	obj := newTestUnstructured("k8s-mcp", "test-ns", "quay.io/mcp/k8s:1.0", 8080)
	obj.Object["status"] = map[string]interface{}{
		"phase": "Running",
		"conditions": []interface{}{
			map[string]interface{}{
				"type":               "Ready",
				"status":             "True",
				"lastTransitionTime": "2026-03-30T10:05:00Z",
				"reason":             "DeploymentAvailable",
				"message":            "Deployment is available and ready",
			},
		},
		"address": map[string]interface{}{
			"url": "http://k8s-mcp.test-ns.svc.cluster.local:8080/mcp",
		},
	}

	deployment, err := convertUnstructuredToMcpDeployment(obj)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if deployment.Phase != models.McpDeploymentPhaseRunning {
		t.Fatalf("expected phase Running, got %q", deployment.Phase)
	}
	if len(deployment.Conditions) != 1 {
		t.Fatalf("expected 1 condition, got %d", len(deployment.Conditions))
	}
	if deployment.Conditions[0].Reason != "DeploymentAvailable" {
		t.Fatalf("expected reason 'DeploymentAvailable', got %q", deployment.Conditions[0].Reason)
	}
	if deployment.Address == nil {
		t.Fatal("expected address to be populated")
	}
	if deployment.Address.URL != "http://k8s-mcp.test-ns.svc.cluster.local:8080/mcp" {
		t.Fatalf("expected address URL 'http://k8s-mcp.test-ns.svc.cluster.local:8080/mcp', got %q", deployment.Address.URL)
	}
}

func TestConvertUnstructuredToMcpDeployment_FailedNoAddress(t *testing.T) {
	obj := newTestUnstructured("broken-mcp", "test-ns", "quay.io/fake:bad", 8080)
	obj.Object["status"] = map[string]interface{}{
		"phase": "Failed",
		"conditions": []interface{}{
			map[string]interface{}{
				"type":   "Ready",
				"status": "False",
				"reason": "DeploymentFailed",
			},
		},
	}

	deployment, err := convertUnstructuredToMcpDeployment(obj)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if deployment.Phase != models.McpDeploymentPhaseFailed {
		t.Fatalf("expected phase Failed, got %q", deployment.Phase)
	}
	if deployment.Address != nil {
		t.Fatalf("expected nil address for failed deployment without address, got %+v", deployment.Address)
	}
}

// parseSpecYAML
func TestParseSpecYAML_DirectKeys(t *testing.T) {
	yamlStr := `config:
  port: 7070
runtime:
  replicas: 3`

	spec, err := parseSpecYAML(yamlStr)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if spec.Config == nil {
		t.Fatal("expected config to be parsed")
	}
	if spec.Config.Port != 7070 {
		t.Fatalf("expected port 7070, got %d", spec.Config.Port)
	}
	if spec.Runtime == nil {
		t.Fatal("expected runtime to be parsed")
	}
}

func TestParseSpecYAML_ConfigOnly(t *testing.T) {
	yamlStr := `config:
  port: 8080
  path: /sse`

	spec, err := parseSpecYAML(yamlStr)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if spec.Config == nil {
		t.Fatal("expected config to be parsed")
	}
	if spec.Runtime != nil {
		t.Fatalf("expected runtime to be nil, got %+v", spec.Runtime)
	}
}

func TestParseSpecYAML_EmptyYAMLReturnsError(t *testing.T) {
	_, err := parseSpecYAML("")
	if err == nil {
		t.Fatal("expected error for empty YAML")
	}
	if !strings.Contains(err.Error(), "YAML must contain config or runtime") {
		t.Fatalf("unexpected error message: %v", err)
	}
}

func TestParseSpecYAML_InvalidYAMLReturnsError(t *testing.T) {
	_, err := parseSpecYAML("invalid: yaml: [broken")
	if err == nil {
		t.Fatal("expected error for invalid YAML")
	}
}

func TestParseSpecYAML_NoConfigOrRuntimeReturnsError(t *testing.T) {
	_, err := parseSpecYAML("foo: bar")
	if err == nil {
		t.Fatal("expected error when YAML has no config or runtime")
	}
	if !strings.Contains(err.Error(), "YAML must contain config or runtime") {
		t.Fatalf("unexpected error message: %v", err)
	}
}

// buildMcpDeploymentPatch
func TestBuildMcpDeploymentPatch_DisplayNameOnly(t *testing.T) {
	displayName := "Updated Name"
	req := models.McpDeploymentUpdateRequest{
		DisplayName: &displayName,
	}

	patch, err := buildMcpDeploymentPatch(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	metadata, ok := patch["metadata"].(map[string]interface{})
	if !ok {
		t.Fatal("expected metadata in patch")
	}
	annotations, ok := metadata["annotations"].(map[string]interface{})
	if !ok {
		t.Fatal("expected annotations in metadata")
	}
	if annotations[mcpDisplayNameAnnotation] != "Updated Name" {
		t.Fatalf("expected display name annotation 'Updated Name', got %v", annotations[mcpDisplayNameAnnotation])
	}
	if _, exists := patch["spec"]; exists {
		t.Fatal("expected no spec in patch when only displayName is set")
	}
}

func TestBuildMcpDeploymentPatch_YAMLOnly(t *testing.T) {
	yamlStr := `config:
  port: 3000
  path: /mcp`
	req := models.McpDeploymentUpdateRequest{
		YAML: &yamlStr,
	}

	patch, err := buildMcpDeploymentPatch(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, exists := patch["metadata"]; exists {
		t.Fatal("expected no metadata in patch when only YAML is set")
	}

	specPatch, ok := patch["spec"].(map[string]interface{})
	if !ok {
		t.Fatal("expected spec in patch")
	}
	configPatch, ok := specPatch["config"]
	if !ok {
		t.Fatal("expected config in spec patch")
	}
	configMap, ok := configPatch.(map[string]interface{})
	if !ok {
		t.Fatal("expected config to be a map")
	}
	if configMap["port"] != int64(3000) {
		t.Fatalf("expected port 3000 in patch, got %v", configMap["port"])
	}
}

func TestBuildMcpDeploymentPatch_DisplayNameAndYAML(t *testing.T) {
	displayName := "New Name"
	yamlStr := `config:
  port: 4000
runtime:
  security:
    serviceAccountName: admin`

	req := models.McpDeploymentUpdateRequest{
		DisplayName: &displayName,
		YAML:        &yamlStr,
	}

	patch, err := buildMcpDeploymentPatch(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := patch["metadata"]; !ok {
		t.Fatal("expected metadata in patch")
	}
	specPatch, ok := patch["spec"].(map[string]interface{})
	if !ok {
		t.Fatal("expected spec in patch")
	}
	if _, ok := specPatch["config"]; !ok {
		t.Fatal("expected config in spec patch")
	}
	if _, ok := specPatch["runtime"]; !ok {
		t.Fatal("expected runtime in spec patch")
	}
}

func TestBuildMcpDeploymentPatch_EmptyRequest(t *testing.T) {
	req := models.McpDeploymentUpdateRequest{}

	patch, err := buildMcpDeploymentPatch(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(patch) != 0 {
		t.Fatalf("expected empty patch for empty request, got %+v", patch)
	}
}

func TestBuildMcpDeploymentPatch_EmptyYAMLResetsConfigAndRuntime(t *testing.T) {
	emptyYAML := ""
	req := models.McpDeploymentUpdateRequest{
		YAML: &emptyYAML,
	}

	patch, err := buildMcpDeploymentPatch(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	specPatch, ok := patch["spec"].(map[string]interface{})
	if !ok {
		t.Fatal("expected spec in patch when YAML is empty")
	}

	configPatch, ok := specPatch["config"].(map[string]interface{})
	if !ok {
		t.Fatal("expected config in spec patch")
	}

	if configPatch["port"] != defaultMcpPort {
		t.Fatalf("expected default port %d, got %v", defaultMcpPort, configPatch["port"])
	}
	if configPatch["path"] != nil {
		t.Fatalf("expected path to be nil, got %v", configPatch["path"])
	}
	if configPatch["arguments"] != nil {
		t.Fatalf("expected arguments to be nil, got %v", configPatch["arguments"])
	}
	if configPatch["env"] != nil {
		t.Fatalf("expected env to be nil, got %v", configPatch["env"])
	}
	if configPatch["envFrom"] != nil {
		t.Fatalf("expected envFrom to be nil, got %v", configPatch["envFrom"])
	}
	if configPatch["storage"] != nil {
		t.Fatalf("expected storage to be nil, got %v", configPatch["storage"])
	}

	if runtimeVal, exists := specPatch["runtime"]; !exists || runtimeVal != nil {
		t.Fatalf("expected runtime to be explicitly nil in patch, got exists=%v val=%v", exists, runtimeVal)
	}
}

func TestBuildMcpDeploymentPatch_ImageOnly(t *testing.T) {
	newImage := "quay.io/mcp/updated:2.0"
	req := models.McpDeploymentUpdateRequest{
		Image: &newImage,
	}

	patch, err := buildMcpDeploymentPatch(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, exists := patch["metadata"]; exists {
		t.Fatal("expected no metadata in patch when only image is set")
	}

	specPatch, ok := patch["spec"].(map[string]interface{})
	if !ok {
		t.Fatal("expected spec in patch")
	}

	source, ok := specPatch["source"].(map[string]interface{})
	if !ok {
		t.Fatal("expected source in spec patch")
	}
	if source["type"] != "ContainerImage" {
		t.Fatalf("expected source type 'ContainerImage', got %v", source["type"])
	}
	ci, ok := source["containerImage"].(map[string]interface{})
	if !ok {
		t.Fatal("expected containerImage in source")
	}
	if ci["ref"] != "quay.io/mcp/updated:2.0" {
		t.Fatalf("expected image ref 'quay.io/mcp/updated:2.0', got %v", ci["ref"])
	}
}

func TestBuildMcpDeploymentPatch_ImageAndYAML(t *testing.T) {
	newImage := "quay.io/mcp/new:3.0"
	yamlStr := `config:
  port: 5000
  path: /sse`
	req := models.McpDeploymentUpdateRequest{
		Image: &newImage,
		YAML:  &yamlStr,
	}

	patch, err := buildMcpDeploymentPatch(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	specPatch, ok := patch["spec"].(map[string]interface{})
	if !ok {
		t.Fatal("expected spec in patch")
	}

	if _, ok := specPatch["source"]; !ok {
		t.Fatal("expected source in spec patch for image update")
	}
	if _, ok := specPatch["config"]; !ok {
		t.Fatal("expected config in spec patch for YAML update")
	}
}

func TestBuildMcpDeploymentPatch_ImageAndEmptyYAML(t *testing.T) {
	newImage := "quay.io/mcp/new:3.0"
	emptyYAML := ""
	req := models.McpDeploymentUpdateRequest{
		Image: &newImage,
		YAML:  &emptyYAML,
	}

	patch, err := buildMcpDeploymentPatch(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	specPatch, ok := patch["spec"].(map[string]interface{})
	if !ok {
		t.Fatal("expected spec in patch")
	}

	if _, ok := specPatch["source"]; !ok {
		t.Fatal("expected source in spec patch for image update")
	}

	configPatch, ok := specPatch["config"].(map[string]interface{})
	if !ok {
		t.Fatal("expected config in spec patch for empty YAML reset")
	}
	if configPatch["port"] != defaultMcpPort {
		t.Fatalf("expected default port %d, got %v", defaultMcpPort, configPatch["port"])
	}
}

func TestBuildMcpDeploymentPatch_InvalidYAMLReturnsError(t *testing.T) {
	yamlStr := "broken: yaml: ["
	req := models.McpDeploymentUpdateRequest{
		YAML: &yamlStr,
	}

	_, err := buildMcpDeploymentPatch(req)
	if err == nil {
		t.Fatal("expected error for invalid YAML in patch")
	}
}

func TestConvertUnstructuredToMcpDeployment_YAMLOmitsEmptyFields(t *testing.T) {
	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": mcpServerAPIVersion,
			"kind":       mcpServerKind,
			"metadata": map[string]interface{}{
				"name":              "clean-yaml",
				"namespace":         "default",
				"uid":               "uid-clean",
				"creationTimestamp": "2026-03-30T12:00:00Z",
			},
			"spec": map[string]interface{}{
				"source": map[string]interface{}{
					"type": "ContainerImage",
					"containerImage": map[string]interface{}{
						"ref": "quay.io/test:1.0",
					},
				},
				"config": map[string]interface{}{
					"port": int64(8080),
				},
			},
		},
	}

	deployment, err := convertUnstructuredToMcpDeployment(obj)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if strings.Contains(deployment.YAML, "arguments:") {
		t.Fatalf("expected YAML to omit empty arguments, got:\n%s", deployment.YAML)
	}
	if strings.Contains(deployment.YAML, "env:") {
		t.Fatalf("expected YAML to omit empty env, got:\n%s", deployment.YAML)
	}
	if strings.Contains(deployment.YAML, "envFrom:") {
		t.Fatalf("expected YAML to omit empty envFrom, got:\n%s", deployment.YAML)
	}
	if strings.Contains(deployment.YAML, "storage:") {
		t.Fatalf("expected YAML to omit empty storage, got:\n%s", deployment.YAML)
	}
	if strings.Contains(deployment.YAML, "path:") {
		t.Fatalf("expected YAML to omit empty path, got:\n%s", deployment.YAML)
	}
	if !strings.Contains(deployment.YAML, "port: 8080") {
		t.Fatalf("expected YAML to contain 'port: 8080', got:\n%s", deployment.YAML)
	}
}

// Round-trip: Create -> Unstructured -> McpDeployment
func TestRoundTrip_CreateToDeployment(t *testing.T) {
	yamlContent := `config:
  port: 9090
  path: /mcp
runtime:
  security:
    serviceAccountName: mcp-viewer`

	req := models.McpDeploymentCreateRequest{
		Name:        "round-trip-test",
		DisplayName: "Round Trip Test",
		ServerName:  "kubernetes-mcp-server",
		Image:       "quay.io/mcp/kubernetes:2.0",
		YAML:        yamlContent,
	}

	server, err := buildMcpServerFromCreateRequest("my-ns", req)
	if err != nil {
		t.Fatalf("build error: %v", err)
	}

	u, err := convertMcpServerToUnstructured(server)
	if err != nil {
		t.Fatalf("unstructured conversion error: %v", err)
	}

	u.SetUID("round-trip-uid")
	u.SetCreationTimestamp(metav1.Now())

	deployment, err := convertUnstructuredToMcpDeployment(u)
	if err != nil {
		t.Fatalf("deployment conversion error: %v", err)
	}

	if deployment.Name != "round-trip-test" {
		t.Fatalf("expected name 'round-trip-test', got %q", deployment.Name)
	}
	if deployment.Namespace != "my-ns" {
		t.Fatalf("expected namespace 'my-ns', got %q", deployment.Namespace)
	}
	if deployment.DisplayName != "Round Trip Test" {
		t.Fatalf("expected displayName 'Round Trip Test', got %q", deployment.DisplayName)
	}
	if deployment.ServerName != "kubernetes-mcp-server" {
		t.Fatalf("expected serverName 'kubernetes-mcp-server', got %q", deployment.ServerName)
	}
	if deployment.Image != "quay.io/mcp/kubernetes:2.0" {
		t.Fatalf("expected image 'quay.io/mcp/kubernetes:2.0', got %q", deployment.Image)
	}
	if deployment.UID != "round-trip-uid" {
		t.Fatalf("expected UID 'round-trip-uid', got %q", deployment.UID)
	}
	if !strings.Contains(deployment.YAML, "path: /mcp") {
		t.Fatalf("expected YAML to contain 'path: /mcp', got:\n%s", deployment.YAML)
	}
	if !strings.Contains(deployment.YAML, "serviceAccountName: mcp-viewer") {
		t.Fatalf("expected YAML to contain 'serviceAccountName: mcp-viewer', got:\n%s", deployment.YAML)
	}
}

// validateCreateRequest
func TestValidateCreateRequest_MissingImage(t *testing.T) {
	req := models.McpDeploymentCreateRequest{Name: "my-server"}
	err := validateCreateRequest(req)
	if err == nil {
		t.Fatal("expected error for missing image")
	}
	if !errors.Is(err, ErrMcpDeploymentValidation) {
		t.Fatalf("expected ErrMcpDeploymentValidation, got %v", err)
	}
}

func TestValidateCreateRequest_WhitespaceOnlyImage(t *testing.T) {
	req := models.McpDeploymentCreateRequest{Image: "   "}
	err := validateCreateRequest(req)
	if err == nil {
		t.Fatal("expected error for whitespace-only image")
	}
	if !errors.Is(err, ErrMcpDeploymentValidation) {
		t.Fatalf("expected ErrMcpDeploymentValidation, got %v", err)
	}
}

func TestValidateCreateRequest_InvalidName(t *testing.T) {
	req := models.McpDeploymentCreateRequest{
		Name:  "INVALID_NAME!",
		Image: "quay.io/test:1.0",
	}
	err := validateCreateRequest(req)
	if err == nil {
		t.Fatal("expected error for invalid name")
	}
	if !errors.Is(err, ErrMcpDeploymentValidation) {
		t.Fatalf("expected ErrMcpDeploymentValidation, got %v", err)
	}
}

func TestValidateCreateRequest_NameTooLong(t *testing.T) {
	req := models.McpDeploymentCreateRequest{
		Name:  strings.Repeat("a", 254),
		Image: "quay.io/test:1.0",
	}
	err := validateCreateRequest(req)
	if err == nil {
		t.Fatal("expected error for name too long")
	}
	if !errors.Is(err, ErrMcpDeploymentValidation) {
		t.Fatalf("expected ErrMcpDeploymentValidation, got %v", err)
	}
}

func TestValidateCreateRequest_ValidRequest(t *testing.T) {
	req := models.McpDeploymentCreateRequest{
		Name:  "my-mcp-server",
		Image: "quay.io/test:1.0",
	}
	if err := validateCreateRequest(req); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestValidateCreateRequest_EmptyNameIsValid(t *testing.T) {
	req := models.McpDeploymentCreateRequest{Image: "quay.io/test:1.0"}
	if err := validateCreateRequest(req); err != nil {
		t.Fatalf("expected no error for empty name (auto-generated), got %v", err)
	}
}
