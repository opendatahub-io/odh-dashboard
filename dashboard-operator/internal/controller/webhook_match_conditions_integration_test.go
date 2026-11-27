//go:build integration

package controller_test

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	admissionv1 "k8s.io/api/admission/v1"
	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/kubernetes"
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
	require.NoError(t, cli.Create(context.Background(), &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "system"}}))

	// Webhook registration propagates asynchronously inside the API server.
	// Prove activation with a matching request, then reset counters before the
	// exact-count assertions below.
	activationAttempt := 0
	require.Eventually(t, func() bool {
		activationAttempt++
		probe := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
			Name: fmt.Sprintf("webhook-activation-%d", activationAttempt),
			Labels: map[string]string{
				v1alpha1.NamespacedRBACOptInLabel: "true",
			},
		}}
		return cli.Create(context.Background(), probe) == nil && webhookCalls(t, &mu, calls, "namespaces") > 0
	}, 10*time.Second, 100*time.Millisecond, "webhook configuration did not become active")
	resetWebhookCalls(&mu, calls)

	unrelatedConfigMap := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Name: "unrelated-config", Namespace: "system",
	}}
	require.NoError(t, cli.Create(context.Background(), unrelatedConfigMap), "unrelated ConfigMap CREATE must skip the webhook")
	require.Zero(t, webhookCalls(t, &mu, calls, "configmaps"))

	namespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "webhook-cel-test"}}
	require.NoError(t, cli.Create(context.Background(), namespace), "unrelated Namespace CREATE must not depend on the webhook")
	dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName}}
	require.NoError(t, cli.Create(context.Background(), dashboard), "Dashboard CREATE must evaluate oldObject == null without a CEL error")
	require.Zero(t, webhookCalls(t, &mu, calls, "namespaces"))
	require.Equal(t, 1, webhookCalls(t, &mu, calls, "dashboards"))
	state := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Name: v1alpha1.NamespacedRBACStateConfigMapName, Namespace: "system",
	}}
	require.NoError(t, cli.Create(context.Background(), state))
	require.Eventually(t, func() bool {
		return webhookCalls(t, &mu, calls, "configmaps") == 1
	}, 5*time.Second, 100*time.Millisecond, "state ConfigMap CREATE must invoke the webhook")

	namespace.Labels = map[string]string{"unrelated": "changed"}
	require.NoError(t, cli.Update(context.Background(), namespace))
	dashboard.Annotations = map[string]string{"unrelated": "changed"}
	require.NoError(t, cli.Update(context.Background(), dashboard))
	require.Zero(t, webhookCalls(t, &mu, calls, "namespaces"), "unrelated Namespace updates must skip the webhook")
	require.Equal(t, 1, webhookCalls(t, &mu, calls, "dashboards"), "unrelated Dashboard updates must skip the webhook")

	namespace.Labels[v1alpha1.NamespacedRBACOptInLabel] = "true"
	require.NoError(t, cli.Update(context.Background(), namespace))
	dashboard.Spec.NotebooksNamespace = namespace.Name
	require.NoError(t, cli.Update(context.Background(), dashboard))
	require.Equal(t, 1, webhookCalls(t, &mu, calls, "namespaces"))
	require.Equal(t, 2, webhookCalls(t, &mu, calls, "dashboards"))

	// Namespace metadata mutations through status and finalize must traverse the
	// same consent-label admission policy as updates to the main resource.
	namespace.Labels[v1alpha1.NamespacedRBACOptInLabel] = "false"
	require.NoError(t, cli.Status().Update(context.Background(), namespace))
	require.Equal(t, 2, webhookCalls(t, &mu, calls, "namespaces"))

	typedClient, err := kubernetes.NewForConfig(cfg)
	require.NoError(t, err)
	current, err := typedClient.CoreV1().Namespaces().Get(context.Background(), namespace.Name, metav1.GetOptions{})
	require.NoError(t, err)
	if current.Labels == nil {
		current.Labels = map[string]string{}
	}
	current.Labels[v1alpha1.NamespacedRBACOptInLabel] = "true"
	_, err = typedClient.CoreV1().Namespaces().Finalize(context.Background(), current, metav1.UpdateOptions{})
	require.NoError(t, err)
	require.Equal(t, 3, webhookCalls(t, &mu, calls, "namespaces"))

	dashboard.Annotations[v1alpha1.NamespacedRBACInventoryAnnotation] = "[]"
	require.NoError(t, cli.Update(context.Background(), dashboard))
	require.Equal(t, 3, webhookCalls(t, &mu, calls, "dashboards"), "controller-owned annotation changes must invoke the webhook")
	state.Data = map[string]string{"unrelated": "changed"}
	require.NoError(t, cli.Update(context.Background(), state))
	require.Equal(t, 2, webhookCalls(t, &mu, calls, "configmaps"), "controller-owned state changes must invoke the webhook")
}

func webhookCalls(t *testing.T, mu *sync.Mutex, calls map[string]int, resource string) int {
	t.Helper()
	mu.Lock()
	defer mu.Unlock()
	return calls[resource]
}

func resetWebhookCalls(mu *sync.Mutex, calls map[string]int) {
	mu.Lock()
	defer mu.Unlock()
	clear(calls)
}
