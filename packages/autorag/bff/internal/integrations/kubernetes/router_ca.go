package kubernetes

import (
	"context"
	"fmt"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sclient "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

const (
	ingressOperatorNamespace = "openshift-ingress-operator"
	routerCASecretName       = "router-ca"
	routerCASecretKey        = "tls.crt"
	routerCABundleName       = "autorag-router-ca-bundle"
	routerCABundleKey        = "ca-bundle.crt"
	dashboardManagedLabel    = "opendatahub.io/dashboard"
)

// NewInClusterClient creates a client authenticated with the AutoRAG service
// account. It is used only for installation-level router CA synchronization.
func NewInClusterClient() (k8sclient.Interface, error) {
	config, err := rest.InClusterConfig()
	if err != nil {
		return nil, fmt.Errorf("load in-cluster Kubernetes config: %w", err)
	}
	client, err := k8sclient.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("create in-cluster Kubernetes client: %w", err)
	}
	return client, nil
}

// SyncRouterCABundle copies only the public router CA certificate into a
// namespace-local ConfigMap. The certificate is returned even when the
// destination ConfigMap cannot be written so callers can still use it in
// memory for the current process.
func SyncRouterCABundle(ctx context.Context, client k8sclient.Interface, namespace string) ([]byte, error) {
	if client == nil {
		return nil, fmt.Errorf("Kubernetes client is not configured")
	}
	if namespace == "" {
		return nil, fmt.Errorf("router CA bundle namespace is empty")
	}

	routerCA, err := client.CoreV1().Secrets(ingressOperatorNamespace).Get(ctx, routerCASecretName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("get OpenShift router CA Secret: %w", err)
	}
	certificate := append([]byte(nil), routerCA.Data[routerCASecretKey]...)
	if len(certificate) == 0 {
		return nil, fmt.Errorf("OpenShift router CA Secret is missing %q", routerCASecretKey)
	}

	configMaps := client.CoreV1().ConfigMaps(namespace)
	bundle, err := configMaps.Get(ctx, routerCABundleName, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return certificate, fmt.Errorf("router CA ConfigMap %q is not present: %w", routerCABundleName, err)
	}
	if err != nil {
		return certificate, fmt.Errorf("get router CA ConfigMap: %w", err)
	}

	if bundle.Data == nil {
		bundle.Data = make(map[string]string)
	}
	if bundle.Labels == nil {
		bundle.Labels = make(map[string]string)
	}
	changed := bundle.Data[routerCABundleKey] != string(certificate) || bundle.Labels[dashboardManagedLabel] != "true"
	if !changed {
		return certificate, nil
	}
	bundle.Data[routerCABundleKey] = string(certificate)
	bundle.Labels[dashboardManagedLabel] = "true"
	if _, err := configMaps.Update(ctx, bundle, metav1.UpdateOptions{}); err != nil {
		return certificate, fmt.Errorf("update router CA ConfigMap: %w", err)
	}
	return certificate, nil
}
