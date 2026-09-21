package kubernetes

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// SandboxDeploymentResources identifies the resources created for one deployment.
// Empty names denote resources that were not created and are not rolled back.
type SandboxDeploymentResources struct {
	LlamaStackConfigMapName string
	WrapperAppConfigMapName string
	MCPAuthSecretNames      []string
	SandboxName             string
	MLflowRoleBindingName   string
	ServiceName             string
	RouteName               string
}

// SetSandboxConfigMapsOwner patches the two ConfigMaps created before the Sandbox CR.
// Kubernetes garbage collection removes them when their Sandbox owner is deleted.
func (kc *TokenKubernetesClient) SetSandboxConfigMapsOwner(
	ctx context.Context,
	namespace, sandboxName string,
	configMapNames ...string,
) error {
	ownerRef, err := kc.sandboxOwnerReference(ctx, namespace, sandboxName)
	if err != nil {
		return err
	}

	for _, name := range configMapNames {
		if name == "" {
			continue
		}
		cm := &corev1.ConfigMap{}
		if err := kc.Client.Get(ctx, client.ObjectKey{Namespace: namespace, Name: name}, cm); err != nil {
			return fmt.Errorf("failed to read ConfigMap %s for owner reference: %w", name, err)
		}
		original := cm.DeepCopy()
		cm.OwnerReferences = appendOwnerReference(cm.OwnerReferences, ownerRef)
		if err := kc.Client.Patch(ctx, cm, client.MergeFrom(original)); err != nil {
			return fmt.Errorf("failed to set Sandbox owner reference on ConfigMap %s: %w", name, err)
		}
	}

	kc.Logger.Info("set Sandbox owner references on ConfigMaps", "sandbox", sandboxName, "namespace", namespace)
	return nil
}

func appendOwnerReference(refs []metav1.OwnerReference, ownerRef metav1.OwnerReference) []metav1.OwnerReference {
	for _, ref := range refs {
		if ref.UID == ownerRef.UID {
			return refs
		}
	}
	return append(refs, ownerRef)
}

// RollbackSandboxDeployment deletes resources in reverse creation order. It is best effort:
// rollback failures are logged without hiding the error that caused the deployment to fail.
func (kc *TokenKubernetesClient) RollbackSandboxDeployment(
	ctx context.Context,
	namespace string,
	resources SandboxDeploymentResources,
) {
	for _, resource := range []struct {
		name string
		kind string
		obj  client.Object
	}{
		{resources.RouteName, "Route", sandboxRoute(namespace, resources.RouteName)},
		{resources.ServiceName, "Service", &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: resources.ServiceName, Namespace: namespace}}},
		{resources.MLflowRoleBindingName, "RoleBinding", &rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: resources.MLflowRoleBindingName, Namespace: namespace}}},
		{resources.SandboxName, "Sandbox", sandboxCR(namespace, resources.SandboxName)},
		{resources.WrapperAppConfigMapName, "ConfigMap", &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: resources.WrapperAppConfigMapName, Namespace: namespace}}},
		{resources.LlamaStackConfigMapName, "ConfigMap", &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: resources.LlamaStackConfigMapName, Namespace: namespace}}},
	} {
		if resource.name == "" {
			continue
		}
		if err := kc.Client.Delete(ctx, resource.obj); err != nil && !apierrors.IsNotFound(err) {
			kc.Logger.Error("failed to roll back agent deployment resource", "kind", resource.kind, "name", resource.name, "namespace", namespace, "error", err)
			continue
		}
		kc.Logger.Info("rolled back agent deployment resource", "kind", resource.kind, "name", resource.name, "namespace", namespace)
	}
	for _, name := range resources.MCPAuthSecretNames {
		secret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
		if err := kc.Client.Delete(ctx, secret); err != nil && !apierrors.IsNotFound(err) {
			kc.Logger.Error("failed to roll back MCP authentication Secret", "name", name, "namespace", namespace, "error", err)
		}
	}
}

func sandboxCR(namespace, name string) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(schema.GroupVersionKind{Group: sandboxGroup, Version: sandboxVersion, Kind: sandboxKind})
	obj.SetNamespace(namespace)
	obj.SetName(name)
	return obj
}

func sandboxRoute(namespace, name string) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(schema.GroupVersionKind{Group: "route.openshift.io", Version: "v1", Kind: "Route"})
	obj.SetNamespace(namespace)
	obj.SetName(name)
	return obj
}
