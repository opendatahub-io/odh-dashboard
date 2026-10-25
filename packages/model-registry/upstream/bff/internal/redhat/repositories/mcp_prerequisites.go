package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/kubeflow/hub/ui/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

const (
	mcpPrerequisiteManagedByLabel = "mcp.opendatahub.io/managed-by"
	mcpPrerequisiteServerLabel    = "mcp.opendatahub.io/server"
	mcpPrerequisiteManager        = "odh-dashboard"
)

var (
	serviceAccountGVR = schema.GroupVersionResource{Version: "v1", Resource: "serviceaccounts"}
	configMapGVR      = schema.GroupVersionResource{Version: "v1", Resource: "configmaps"}
	roleBindingGVR    = schema.GroupVersionResource{Group: "rbac.authorization.k8s.io", Version: "v1", Resource: "rolebindings"}
)

type createdMcpPrerequisite struct {
	resource  schema.GroupVersionResource
	namespace string
	name      string
}

func mcpPrerequisiteLabels(serverName string) map[string]string {
	return map[string]string{
		mcpPrerequisiteManagedByLabel: mcpPrerequisiteManager,
		mcpPrerequisiteServerLabel:    serverName,
	}
}

func ensureMcpPrerequisites(
	ctx context.Context,
	dyn dynamic.Interface,
	namespace string,
	serverName string,
	prerequisites []models.McpDeploymentPrerequisite,
) ([]createdMcpPrerequisite, error) {
	created := make([]createdMcpPrerequisite, 0, len(prerequisites)+1)
	labels := mcpPrerequisiteLabels(serverName)

	for _, prerequisite := range prerequisites {
		if strings.TrimSpace(prerequisite.Name) == "" {
			return created, fmt.Errorf("MCP prerequisite %s has no name", prerequisite.Type)
		}

		switch prerequisite.Type {
		case "ServiceAccount":
			_, err := dyn.Resource(serviceAccountGVR).Namespace(namespace).Get(ctx, prerequisite.Name, metav1.GetOptions{})
			if err != nil && !apierrors.IsNotFound(err) {
				return created, fmt.Errorf("failed to inspect ServiceAccount %q: %w", prerequisite.Name, err)
			}
			if apierrors.IsNotFound(err) {
				item := &unstructured.Unstructured{Object: map[string]interface{}{
					"apiVersion": "v1",
					"kind":       "ServiceAccount",
					"metadata": map[string]interface{}{
						"name":      prerequisite.Name,
						"namespace": namespace,
						"labels":    stringMapToInterface(labels),
					},
				}}
				if _, err := dyn.Resource(serviceAccountGVR).Namespace(namespace).Create(ctx, item, metav1.CreateOptions{}); err != nil {
					return created, fmt.Errorf("failed to create ServiceAccount %q: %w", prerequisite.Name, err)
				}
				created = append(created, createdMcpPrerequisite{serviceAccountGVR, namespace, prerequisite.Name})
			}

			if prerequisite.ClusterRole != "" {
				if prerequisite.ClusterRole != "view" {
					return created, fmt.Errorf("unsupported ServiceAccount ClusterRole %q", prerequisite.ClusterRole)
				}
				roleBindingName := mcpViewRoleBindingName(serverName)
				roleBindings := dyn.Resource(roleBindingGVR).Namespace(namespace)
				binding, err := roleBindings.Get(ctx, roleBindingName, metav1.GetOptions{})
				if err != nil && !apierrors.IsNotFound(err) {
					return created, fmt.Errorf("failed to inspect RoleBinding %q: %w", roleBindingName, err)
				}
				if apierrors.IsNotFound(err) {
					binding = &unstructured.Unstructured{Object: map[string]interface{}{
						"apiVersion": "rbac.authorization.k8s.io/v1",
						"kind":       "RoleBinding",
						"metadata": map[string]interface{}{
							"name":      roleBindingName,
							"namespace": namespace,
							"labels":    stringMapToInterface(labels),
						},
						"subjects": []interface{}{map[string]interface{}{
							"kind":      "ServiceAccount",
							"name":      prerequisite.Name,
							"namespace": namespace,
						}},
						"roleRef": map[string]interface{}{
							"apiGroup": "rbac.authorization.k8s.io",
							"kind":     "ClusterRole",
							"name":     "view",
						},
					}}
					if _, err := roleBindings.Create(ctx, binding, metav1.CreateOptions{}); err != nil {
						return created, fmt.Errorf("failed to create RoleBinding %q: %w", roleBindingName, err)
					}
					created = append(created, createdMcpPrerequisite{roleBindingGVR, namespace, roleBindingName})
				} else if !mcpViewRoleBindingMatches(binding, prerequisite.Name, namespace) {
					return created, fmt.Errorf("RoleBinding %q already exists with a different subject or role", roleBindingName)
				}
			}

		case "ConfigMap":
			configMaps := dyn.Resource(configMapGVR).Namespace(namespace)
			_, err := configMaps.Get(ctx, prerequisite.Name, metav1.GetOptions{})
			if err == nil {
				continue
			}
			if !apierrors.IsNotFound(err) {
				return created, fmt.Errorf("failed to inspect ConfigMap %q: %w", prerequisite.Name, err)
			}
			item := &unstructured.Unstructured{Object: map[string]interface{}{
				"apiVersion": "v1",
				"kind":       "ConfigMap",
				"metadata": map[string]interface{}{
					"name":      prerequisite.Name,
					"namespace": namespace,
					"labels":    stringMapToInterface(labels),
				},
			}}
			if len(prerequisite.Data) > 0 {
				item.Object["data"] = stringMapToInterface(prerequisite.Data)
			}
			if _, err := configMaps.Create(ctx, item, metav1.CreateOptions{}); err != nil {
				return created, fmt.Errorf("failed to create ConfigMap %q: %w", prerequisite.Name, err)
			}
			created = append(created, createdMcpPrerequisite{configMapGVR, namespace, prerequisite.Name})

		default:
			return created, fmt.Errorf("unsupported MCP prerequisite type %q", prerequisite.Type)
		}
	}

	return created, nil
}

func cleanupMcpPrerequisites(ctx context.Context, dyn dynamic.Interface, created []createdMcpPrerequisite) {
	for index := len(created) - 1; index >= 0; index-- {
		item := created[index]
		_ = dyn.Resource(item.resource).Namespace(item.namespace).Delete(ctx, item.name, metav1.DeleteOptions{})
	}
}

func cleanupOwnedMcpPrerequisites(ctx context.Context, dyn dynamic.Interface, namespace, serverName string) {
	selector := fmt.Sprintf("%s=%s,%s=%s", mcpPrerequisiteManagedByLabel, mcpPrerequisiteManager, mcpPrerequisiteServerLabel, serverName)
	for _, resource := range []schema.GroupVersionResource{roleBindingGVR, configMapGVR, serviceAccountGVR} {
		list, err := dyn.Resource(resource).Namespace(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector})
		if err != nil {
			continue
		}
		for _, item := range list.Items {
			_ = dyn.Resource(resource).Namespace(namespace).Delete(ctx, item.GetName(), metav1.DeleteOptions{})
		}
	}
}

func mcpViewRoleBindingName(serverName string) string {
	name := "mcp-" + serverName + "-view"
	if len(name) > 63 {
		name = strings.TrimRight(name[:63], "-")
	}
	return name
}

func mcpViewRoleBindingMatches(binding *unstructured.Unstructured, serviceAccount, namespace string) bool {
	role, _, _ := unstructured.NestedString(binding.Object, "roleRef", "name")
	kind, _, _ := unstructured.NestedString(binding.Object, "roleRef", "kind")
	subjects, _, _ := unstructured.NestedSlice(binding.Object, "subjects")
	if role != "view" || kind != "ClusterRole" || len(subjects) != 1 {
		return false
	}
	subject, ok := subjects[0].(map[string]interface{})
	if !ok {
		return false
	}
	name, _, _ := unstructured.NestedString(subject, "name")
	subjectNamespace, _, _ := unstructured.NestedString(subject, "namespace")
	subjectKind, _, _ := unstructured.NestedString(subject, "kind")
	return name == serviceAccount && subjectNamespace == namespace && subjectKind == "ServiceAccount"
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
	result := make(map[string]interface{}, len(values))
	for key, value := range values {
		result[key] = value
	}
	return result
}
