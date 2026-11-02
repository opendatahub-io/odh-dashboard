package kubernetes

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func TestSyncRouterCABundleUpdatesManagedConfigMap(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: routerCASecretName, Namespace: ingressOperatorNamespace},
			Data: map[string][]byte{
				routerCASecretKey: []byte("router-ca"),
				"tls.key":         []byte("must-not-copy"),
			},
		},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: routerCABundleName, Namespace: "applications"}},
	)

	certificate, err := SyncRouterCABundle(context.Background(), client, "applications")
	require.NoError(t, err)
	assert.Equal(t, []byte("router-ca"), certificate)

	bundle, err := client.CoreV1().ConfigMaps("applications").Get(context.Background(), routerCABundleName, metav1.GetOptions{})
	require.NoError(t, err)
	assert.Equal(t, map[string]string{routerCABundleKey: "router-ca"}, bundle.Data)
	assert.Equal(t, "true", bundle.Labels[dashboardManagedLabel])
}

func TestSyncRouterCABundleUpdatesRotatedCertificate(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: routerCASecretName, Namespace: ingressOperatorNamespace},
			Data:       map[string][]byte{routerCASecretKey: []byte("new-router-ca")},
		},
		&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: routerCABundleName, Namespace: "applications"},
			Data:       map[string]string{routerCABundleKey: "old-router-ca"},
		},
	)

	_, err := SyncRouterCABundle(context.Background(), client, "applications")
	require.NoError(t, err)
	bundle, err := client.CoreV1().ConfigMaps("applications").Get(context.Background(), routerCABundleName, metav1.GetOptions{})
	require.NoError(t, err)
	assert.Equal(t, "new-router-ca", bundle.Data[routerCABundleKey])
	assert.Equal(t, "true", bundle.Labels[dashboardManagedLabel])
}

func TestSyncRouterCABundleRejectsMissingCertificate(t *testing.T) {
	client := fake.NewSimpleClientset(&corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: routerCASecretName, Namespace: ingressOperatorNamespace},
		Data:       map[string][]byte{"tls.key": []byte("private-key")},
	})

	_, err := SyncRouterCABundle(context.Background(), client, "applications")
	require.Error(t, err)
	assert.Contains(t, err.Error(), routerCASecretKey)
}

func TestSyncRouterCABundleRequiresManagedConfigMap(t *testing.T) {
	client := fake.NewSimpleClientset(&corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: routerCASecretName, Namespace: ingressOperatorNamespace},
		Data:       map[string][]byte{routerCASecretKey: []byte("router-ca")},
	})

	certificate, err := SyncRouterCABundle(context.Background(), client, "applications")
	require.Error(t, err)
	assert.Equal(t, []byte("router-ca"), certificate)
}
