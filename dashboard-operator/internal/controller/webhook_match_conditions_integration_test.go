//go:build integration

package controller_test

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
	admissionv1 "k8s.io/api/admission/v1"
	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestIntegration_WebhookMatchConditionsUseRealAPIServer(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	require.NoError(t, admissionregistrationv1.AddToScheme(scheme))
	require.NoError(t, v1alpha1.AddToScheme(scheme))

	localEnv := &envtest.Environment{
		CRDDirectoryPaths: []string{filepath.Join("..", "..", "config", "crd", "bases")},
		Scheme:            scheme,
	}
	cfg, err := localEnv.Start()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, localEnv.Stop()) })

	var mu sync.Mutex
	calls := map[string]int{}
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		var review admissionv1.AdmissionReview
		if err := json.NewDecoder(req.Body).Decode(&review); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		mu.Lock()
		calls[review.Request.Resource.Resource]++
		mu.Unlock()
		review.Response = &admissionv1.AdmissionResponse{UID: review.Request.UID, Allowed: true}
		review.Request = nil
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(review); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}))
	t.Cleanup(server.Close)

	manifest, err := os.ReadFile(filepath.Join("..", "..", "config", "webhook", "webhook.yaml"))
	require.NoError(t, err)
	var configuration admissionregistrationv1.ValidatingWebhookConfiguration
	require.NoError(t, yaml.NewYAMLOrJSONDecoder(bytes.NewReader(manifest), 4096).Decode(&configuration))
	require.Len(t, configuration.Webhooks, 1)
	webhook := &configuration.Webhooks[0]
	webhook.ClientConfig.Service = nil
	webhook.ClientConfig.URL = &server.URL
	webhook.ClientConfig.CABundle = pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: server.Certificate().Raw})

	cli, err := client.New(cfg, client.Options{Scheme: scheme})
	require.NoError(t, err)
	require.NoError(t, cli.Create(context.Background(), &configuration))

	namespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "webhook-cel-test"}}
	require.NoError(t, cli.Create(context.Background(), namespace), "Namespace CREATE must evaluate oldObject == null without a CEL error")
	dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName}}
	require.NoError(t, cli.Create(context.Background(), dashboard), "Dashboard CREATE must evaluate oldObject == null without a CEL error")
	require.Equal(t, 1, webhookCalls(t, &mu, calls, "namespaces"))
	require.Equal(t, 1, webhookCalls(t, &mu, calls, "dashboards"))

	namespace.Labels = map[string]string{"unrelated": "changed"}
	require.NoError(t, cli.Update(context.Background(), namespace))
	dashboard.Annotations = map[string]string{"unrelated": "changed"}
	require.NoError(t, cli.Update(context.Background(), dashboard))
	require.Equal(t, 1, webhookCalls(t, &mu, calls, "namespaces"), "unrelated Namespace updates must skip the webhook")
	require.Equal(t, 1, webhookCalls(t, &mu, calls, "dashboards"), "unrelated Dashboard updates must skip the webhook")

	namespace.Labels[v1alpha1.NamespacedRBACOptInLabel] = "true"
	require.NoError(t, cli.Update(context.Background(), namespace))
	dashboard.Spec.NotebooksNamespace = namespace.Name
	require.NoError(t, cli.Update(context.Background(), dashboard))
	require.Equal(t, 2, webhookCalls(t, &mu, calls, "namespaces"))
	require.Equal(t, 2, webhookCalls(t, &mu, calls, "dashboards"))
}

func webhookCalls(t *testing.T, mu *sync.Mutex, calls map[string]int, resource string) int {
	t.Helper()
	mu.Lock()
	defer mu.Unlock()
	return calls[resource]
}
