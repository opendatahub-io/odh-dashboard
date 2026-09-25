package kubernetes

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// mlflowClusterRoleName is the ClusterRole that grants read access to MLflow resources.
const mlflowClusterRoleName = "mlflow-access"

// CreateMLflowRoleBinding creates a namespace-scoped RoleBinding granting the Sandbox
// pod's ServiceAccount access to MLflow resources. The Sandbox controller creates a
// ServiceAccount with the same name as the Sandbox CR.
// AlreadyExists is treated as a no-op to make the call idempotent.
func (kc *TokenKubernetesClient) CreateMLflowRoleBinding(
	ctx context.Context,
	namespace string,
	sandboxName string,
) error {
	ownerRef, err := kc.sandboxOwnerReference(ctx, namespace, sandboxName)
	if err != nil {
		return err
	}
	rb := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "mlflow-" + sandboxName,
			Namespace: namespace,
			Labels:    map[string]string{dashboardLabel: "true"},
			OwnerReferences: []metav1.OwnerReference{
				ownerRef,
			},
		},
		Subjects: []rbacv1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      sandboxName,
				Namespace: namespace,
			},
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     mlflowClusterRoleName,
		},
	}

	if err := kc.Client.Create(ctx, rb); err != nil {
		if apierrors.IsAlreadyExists(err) {
			kc.Logger.Info("MLflow RoleBinding already exists", "name", rb.Name, "namespace", namespace)
			return nil
		}
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to create MLflow RoleBinding", "error", err, "namespace", namespace)
			return &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to create MLflow RoleBinding",
				},
			}
		}
		kc.Logger.Error("failed to create MLflow RoleBinding", "error", err, "name", rb.Name, "namespace", namespace)
		return fmt.Errorf("failed to create MLflow RoleBinding: %w", err)
	}

	kc.Logger.Info("created MLflow RoleBinding", "name", rb.Name, "namespace", namespace)
	return nil
}
