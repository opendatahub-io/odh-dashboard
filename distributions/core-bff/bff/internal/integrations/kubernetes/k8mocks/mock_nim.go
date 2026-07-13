package k8mocks

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	k8sclient "k8s.io/client-go/kubernetes"
)

//nolint:gosec // G101: test-only fake data, not real credentials
func createNIMTestData(ctx context.Context, k8sClient k8sclient.Interface, dynClient dynamic.Interface) error {
	ns := "opendatahub"

	_, err := k8sClient.CoreV1().Secrets(ns).Create(ctx, &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "nvidia-nim-access", Namespace: ns},
		Data:       map[string][]byte{"api_key": []byte("fake-nim-api-key")},
	}, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create NIM api key secret: %w", err)
	}

	_, err = k8sClient.CoreV1().Secrets(ns).Create(ctx, &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "nim-pull-secret", Namespace: ns},
		Data:       map[string][]byte{".dockerconfigjson": []byte(`{"auths":{}}`)},
		Type:       corev1.SecretTypeDockerConfigJson,
	}, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create NIM pull secret: %w", err)
	}

	_, err = k8sClient.CoreV1().ConfigMaps(ns).Create(ctx, &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: "nim-config", Namespace: ns},
		Data:       map[string]string{"config.yaml": "nim-models: []"},
	}, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create NIM config map: %w", err)
	}

	account := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "nim.opendatahub.io/v1",
		"kind":       "Account",
		"metadata":   map[string]interface{}{"name": models.NIMAccountName, "namespace": ns},
		"spec":       map[string]interface{}{"apiKeySecret": map[string]interface{}{"name": "nvidia-nim-access"}},
		"status": map[string]interface{}{
			"nimPullSecret": map[string]interface{}{"name": "nim-pull-secret"},
			"nimConfig":     map[string]interface{}{"name": "nim-config"},
		},
	}}
	_, err = dynClient.Resource(models.NIMAccountGVR).Namespace(ns).Create(ctx, account, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create NIM account: %w", err)
	}

	return nil
}
