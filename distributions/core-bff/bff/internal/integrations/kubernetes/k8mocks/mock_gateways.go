package k8mocks

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	k8sclient "k8s.io/client-go/kubernetes"
)

// createGatewayTestData seeds Gateways for the native gateway discovery route
// (RHAI-50760). Seen from test-ns-a:
//   - opendatahub/selector-gateway, NotReady: "https" admits it by the
//     kubernetes.io/metadata.name label (decidable without a Namespace read);
//     "tenants" admits every namespace without a "team" label (needs the read).
//   - opendatahub/shared-gateway "http" admits every namespace, Ready;
//     its "internal" listener admits only opendatahub.
//   - test-ns-a/project-gateway "default" has no allowedRoutes (Same), Unknown.
func createGatewayTestData(ctx context.Context, dynClient dynamic.Interface) error {
	gateways := []map[string]any{
		gatewayObject("opendatahub", "shared-gateway",
			map[string]any{
				models.GatewayAnnotationDisplayName: "Shared gateway",
				models.GatewayAnnotationDescription: "Gateway for every project",
			},
			[]any{
				gatewayListener("http", map[string]any{"from": "All"}),
				gatewayListener("internal", map[string]any{"from": "Same"}),
			},
			[]any{gatewayCondition("Accepted", "True"), gatewayCondition("Programmed", "True")}),
		gatewayObject("opendatahub", "selector-gateway", nil,
			[]any{
				gatewayListener("https", map[string]any{
					"from":     "Selector",
					"selector": map[string]any{"matchLabels": map[string]any{"kubernetes.io/metadata.name": "test-ns-a"}},
				}),
				gatewayListener("tenants", map[string]any{
					"from": "Selector",
					"selector": map[string]any{"matchExpressions": []any{
						map[string]any{"key": "team", "operator": "DoesNotExist"},
					}},
				}),
			},
			[]any{gatewayCondition("Accepted", "True"), gatewayCondition("Programmed", "False")}),
		gatewayObject("test-ns-a", "project-gateway", nil,
			[]any{map[string]any{"name": "default", "port": int64(80), "protocol": "HTTP"}},
			nil),
	}
	for _, gw := range gateways {
		obj := &unstructured.Unstructured{Object: gw}
		if _, err := dynClient.Resource(models.GatewayGVR).Namespace(obj.GetNamespace()).Create(ctx, obj, metav1.CreateOptions{}); err != nil {
			return fmt.Errorf("failed to create Gateway %s/%s: %w", obj.GetNamespace(), obj.GetName(), err)
		}
	}
	return nil
}

func gatewayObject(namespace, name string, annotations map[string]any, listeners, conditions []any) map[string]any {
	metadata := map[string]any{"name": name, "namespace": namespace}
	if annotations != nil {
		metadata["annotations"] = annotations
	}
	obj := map[string]any{
		"apiVersion": "gateway.networking.k8s.io/v1",
		"kind":       "Gateway",
		"metadata":   metadata,
		"spec":       map[string]any{"gatewayClassName": "mock", "listeners": listeners},
	}
	if conditions != nil {
		obj["status"] = map[string]any{"conditions": conditions}
	}
	return obj
}

func gatewayListener(name string, namespaces map[string]any) map[string]any {
	return map[string]any{
		"name":          name,
		"port":          int64(80),
		"protocol":      "HTTP",
		"allowedRoutes": map[string]any{"namespaces": namespaces},
	}
}

func gatewayCondition(condType, status string) map[string]any {
	return map[string]any{
		"type": condType, "status": status, "reason": "Mock", "message": "",
		"lastTransitionTime": "2026-01-01T00:00:00Z",
	}
}

// createLLMInferenceServiceDeployerRBAC lets a user create LLMInferenceServices
// in one namespace, the access gateway discovery checks.
func createLLMInferenceServiceDeployerRBAC(ctx context.Context, k8sClient k8sclient.Interface, name, username, namespace string) error {
	role := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Rules: []rbacv1.PolicyRule{{
			APIGroups: []string{"serving.kserve.io"},
			Resources: []string{"llminferenceservices"},
			Verbs:     []string{"create"},
		}},
	}
	if _, err := k8sClient.RbacV1().Roles(namespace).Create(ctx, role, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create Role: %w", err)
	}
	binding := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Subjects:   []rbacv1.Subject{{Kind: "User", Name: username}},
		RoleRef:    rbacv1.RoleRef{Kind: "Role", Name: name, APIGroup: "rbac.authorization.k8s.io"},
	}
	if _, err := k8sClient.RbacV1().RoleBindings(namespace).Create(ctx, binding, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create RoleBinding: %w", err)
	}
	return nil
}

// createGatewayReaderRBAC grants the rules of the RHAII bundle's
// rhaii-dashboard-gateway-reader ClusterRole, bound cluster-wide.
func createGatewayReaderRBAC(ctx context.Context, k8sClient k8sclient.Interface, name, username string) error {
	role := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{Name: name},
		Rules: []rbacv1.PolicyRule{{
			APIGroups: []string{"gateway.networking.k8s.io"},
			Resources: []string{"gateways"},
			Verbs:     []string{"list"},
		}},
	}
	if _, err := k8sClient.RbacV1().ClusterRoles().Create(ctx, role, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create ClusterRole: %w", err)
	}
	binding := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: name},
		Subjects:   []rbacv1.Subject{{Kind: "User", Name: username}},
		RoleRef:    rbacv1.RoleRef{Kind: "ClusterRole", Name: name, APIGroup: "rbac.authorization.k8s.io"},
	}
	if _, err := k8sClient.RbacV1().ClusterRoleBindings().Create(ctx, binding, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create ClusterRoleBinding: %w", err)
	}
	return nil
}
