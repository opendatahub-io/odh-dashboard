package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/externalmodels"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// TestIsInternalHost verifies that SSRF validation is only skipped for localhost/loopback
// and for in-cluster services in the caller's authorized namespace. Cross-namespace and
// external hosts must NOT be treated as internal (CWE-918).
func TestIsInternalHost(t *testing.T) {
	tests := []struct {
		name             string
		baseURL          string
		allowedNamespace string
		want             bool
	}{
		{"same-namespace cluster service is trusted", "https://my-model.my-ns.svc.cluster.local:8443/v1", "my-ns", true},
		{"same-namespace cluster service on arbitrary port", "http://model.my-ns.svc.cluster.local:19530", "my-ns", true},
		{"cross-namespace cluster service is NOT trusted", "https://secret.kube-system.svc.cluster.local/v1", "my-ns", false},
		{"namespace-like service name does not match", "https://my-ns.other-ns.svc.cluster.local/v1", "my-ns", false},
		{"cluster service with empty authorized namespace is NOT trusted", "https://svc.my-ns.svc.cluster.local", "", false},
		{"localhost is trusted", "http://localhost:8080", "my-ns", true},
		{"loopback IP is trusted", "http://127.0.0.1:9000", "my-ns", true},
		{"private IP is not internal", "http://10.0.0.5:8080", "my-ns", false},
		{"external host is not internal", "https://api.openai.com/v1", "my-ns", false},
		{"lookalike cluster suffix is not internal", "https://evil.cluster.local", "my-ns", false},
		{"too-few labels is not internal", "https://svc.cluster.local", "my-ns", false},
		{"unparseable url is not internal", "://bad-url", "my-ns", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isInternalHost(tt.baseURL, tt.allowedNamespace); got != tt.want {
				t.Errorf("isInternalHost(%q, %q) = %v, want %v", tt.baseURL, tt.allowedNamespace, got, tt.want)
			}
		})
	}
}

// recordingServiceClient records the GetService arguments so tests can assert that
// resolveTrustedHost queries the right Service through the caller's identity.
type recordingServiceClient struct {
	k8smocks.ConfigurableMockKubernetesClient
	gotIdentity  *integrations.RequestIdentity
	gotNamespace string
	gotName      string
}

func (r *recordingServiceClient) GetService(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*corev1.Service, error) {
	r.gotIdentity, r.gotNamespace, r.gotName = identity, namespace, name
	return r.ConfigurableMockKubernetesClient.GetService(ctx, identity, namespace, name)
}

// controllerManagedSlice returns an EndpointSlice as the EndpointSlice controller
// produces it: a ready endpoint whose targetRef points at a Pod in the given
// namespace.
func controllerManagedSlice(ns string) discoveryv1.EndpointSlice {
	ready := true
	return discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: ns, Name: "my-model-x7"},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints: []discoveryv1.Endpoint{{
			Addresses:  []string{"10.1.2.3"},
			Conditions: discoveryv1.EndpointConditions{Ready: &ready},
			TargetRef:  &corev1.ObjectReference{Kind: "Pod", Namespace: ns, Name: "my-model-pod"},
		}},
	}
}

// manualSlice returns a manually managed EndpointSlice whose ready endpoint has no
// Pod targetRef, as an attacker would attach to redirect the Service's traffic at
// an arbitrary address.
func manualSlice() discoveryv1.EndpointSlice {
	ready := true
	return discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model-evil", Labels: map[string]string{"kubernetes.io/service-name": "my-model"}},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints: []discoveryv1.Endpoint{{
			Addresses:  []string{"10.9.9.9"},
			Conditions: discoveryv1.EndpointConditions{Ready: &ready},
		}},
	}
}

// TestResolveTrustedHost verifies the Service-backed trust decision: an in-namespace
// service DNS name is only trusted when the backing Service exists, is not an
// ExternalName alias (which could point at another namespace), has a selector
// (selectorless Services have manually managed endpoints that could point at
// another namespace's Pods; headless Services with a selector are legitimate
// controller-managed endpoints), and every ready endpoint of its EndpointSlices
// references a Pod in the caller's namespace (a manually managed EndpointSlice
// attached to a selector-backed Service could point at another namespace's Pod IP).
func TestResolveTrustedHost(t *testing.T) {
	logger := slog.Default()
	identity := &integrations.RequestIdentity{Token: "user-token"}

	tests := []struct {
		name      string
		baseURL   string
		service   *corev1.Service
		err       error
		slices    []discoveryv1.EndpointSlice
		slicesErr error
		want      bool
		wantErr   bool
		wantName  string
	}{
		{
			name:     "selector-backed ClusterIP service is trusted",
			want:     true,
			wantName: "my-model",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, Selector: map[string]string{"app": "my-model"}},
			},
			slices: []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
		},
		{
			name:     "pod-specific DNS name queries the Service label, not the pod",
			baseURL:  "https://my-model-pod.my-model.my-ns.svc.cluster.local:8443/v1",
			want:     true,
			wantName: "my-model",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, Selector: map[string]string{"app": "my-model"}},
			},
			slices: []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
		},
		{
			name: "ExternalName alias is NOT trusted",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeExternalName, ExternalName: "secret.other-ns.svc.cluster.local"},
			},
		},
		{
			name:     "selector-backed headless service is trusted",
			want:     true,
			wantName: "my-model",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, ClusterIP: "None", Selector: map[string]string{"app": "my-model"}},
			},
			slices: []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
		},
		{
			name: "selectorless service is NOT trusted",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP},
			},
		},
		{
			name: "manually managed EndpointSlice without a Pod targetRef is NOT trusted",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, Selector: map[string]string{"app": "my-model"}},
			},
			slices: []discoveryv1.EndpointSlice{manualSlice()},
		},
		{
			name: "manually managed EndpointSlice targeting another namespace's Pod is NOT trusted",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, ClusterIP: "None", Selector: map[string]string{"app": "my-model"}},
			},
			slices: []discoveryv1.EndpointSlice{controllerManagedSlice("other-ns")},
		},
		{
			name:      "endpoint slice lookup failure is NOT trusted",
			service:   &corev1.Service{ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"}, Spec: corev1.ServiceSpec{Selector: map[string]string{"app": "my-model"}}},
			slicesErr: fmt.Errorf("connection refused"),
			wantName:  "my-model",
		},
		{
			name:     "service lookup failure is NOT trusted",
			err:      fmt.Errorf("connection refused"),
			wantName: "my-model",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			baseURL := tt.baseURL
			if baseURL == "" {
				baseURL = "https://my-model.my-ns.svc.cluster.local:8443/v1"
			}
			client := &recordingServiceClient{ConfigurableMockKubernetesClient: k8smocks.ConfigurableMockKubernetesClient{Service: tt.service, ServiceError: tt.err, EndpointSlices: tt.slices, EndpointSlicesError: tt.slicesErr}}
			got, err := resolveTrustedHost(context.Background(), client, identity, baseURL, "my-ns", logger)
			if (err != nil) != tt.wantErr {
				t.Fatalf("resolveTrustedHost() error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("resolveTrustedHost() = %v, want %v", got, tt.want)
			}
			if tt.wantName != "" {
				if client.gotName != tt.wantName {
					t.Errorf("GetService queried Service %q, want %q", client.gotName, tt.wantName)
				}
				if client.gotNamespace != "my-ns" {
					t.Errorf("GetService queried namespace %q, want %q", client.gotNamespace, "my-ns")
				}
				if client.gotIdentity != identity {
					t.Errorf("GetService did not receive the caller's identity")
				}
			}
		})
	}
}

// TestResolveTrustedHostForbiddenLookup verifies that a caller who cannot read the
// Service gets a meaningful permission error instead of a misleading connectivity
// failure, while the host is still not trusted.
func TestResolveTrustedHostForbiddenLookup(t *testing.T) {
	client := &k8smocks.ConfigurableMockKubernetesClient{
		ServiceError: apierrors.NewForbidden(schema.GroupResource{Resource: "services"}, "my-model", fmt.Errorf("denied")),
	}
	trusted, err := resolveTrustedHost(
		context.Background(), client, nil,
		"https://my-model.my-ns.svc.cluster.local:8443/v1", "my-ns", slog.Default(),
	)
	if trusted {
		t.Error("resolveTrustedHost() = true, want false on forbidden lookup")
	}
	if err == nil {
		t.Fatal("resolveTrustedHost() error = nil, want permission error")
	}
	var extErr *externalmodels.ExternalModelError
	if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
		t.Errorf("resolveTrustedHost() error = %v, want ExternalModelError with status 403", err)
	}
}

// TestResolveTrustedHostForbiddenEndpointSliceLookup verifies that a caller who can
// read the Service but cannot list its EndpointSlices gets a meaningful permission
// error instead of a misleading connectivity failure, while the host is still not
// trusted.
func TestResolveTrustedHostForbiddenEndpointSliceLookup(t *testing.T) {
	client := &k8smocks.ConfigurableMockKubernetesClient{
		Service: &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
			Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, Selector: map[string]string{"app": "my-model"}},
		},
		EndpointSlicesError: apierrors.NewForbidden(schema.GroupResource{Resource: "endpointslices"}, "my-model-x7", fmt.Errorf("denied")),
	}
	trusted, err := resolveTrustedHost(
		context.Background(), client, nil,
		"https://my-model.my-ns.svc.cluster.local:8443/v1", "my-ns", slog.Default(),
	)
	if trusted {
		t.Error("resolveTrustedHost() = true, want false on forbidden endpoint slice lookup")
	}
	if err == nil {
		t.Fatal("resolveTrustedHost() error = nil, want permission error")
	}
	var extErr *externalmodels.ExternalModelError
	if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
		t.Errorf("resolveTrustedHost() error = %v, want ExternalModelError with status 403", err)
	}
}

// TestVerifyExternalModelTrustDecision exercises the Service-backed trust decision
// through VerifyExternalModel itself. The .svc.cluster.local hostname does not
// resolve in the test environment, so the observable difference is which stage
// fails: an untrusted host fails SSRF validation before any request ("failed to
// resolve hostname"), while a trusted host skips that check and fails in the
// transport's own dial instead.
func TestVerifyExternalModelTrustDecision(t *testing.T) {
	logger := slog.Default()
	identity := &integrations.RequestIdentity{Token: "user-token"}
	req := models.VerifyExternalModelRequest{
		ModelID:   "my-model",
		BaseURL:   "https://my-model.my-ns.svc.cluster.local:8443/v1",
		ModelType: models.ModelTypeLLM,
	}
	repo := NewExternalModelsRepository()

	t.Run("failed Service lookup does not enable the SSRF skip", func(t *testing.T) {
		client := &k8smocks.ConfigurableMockKubernetesClient{
			ServiceError: fmt.Errorf("connection refused"),
		}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want SSRF validation failure")
		}
		if !strings.Contains(err.Error(), "failed to resolve hostname") {
			t.Errorf("VerifyExternalModel() error = %v, want SSRF validation to run (failed to resolve hostname)", err)
		}
	})

	t.Run("Forbidden Service lookup prevents the model request", func(t *testing.T) {
		client := &k8smocks.ConfigurableMockKubernetesClient{
			ServiceError: apierrors.NewForbidden(schema.GroupResource{Resource: "services"}, "my-model", fmt.Errorf("denied")),
		}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want permission error")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
			t.Errorf("VerifyExternalModel() error = %v, want ExternalModelError with status 403", err)
		}
	})

	t.Run("eligible Service is trusted and skips SSRF validation", func(t *testing.T) {
		client := &k8smocks.ConfigurableMockKubernetesClient{
			Service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, Selector: map[string]string{"app": "my-model"}},
			},
			EndpointSlices: []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
		}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want transport dial failure for the unresolvable test hostname")
		}
		if strings.Contains(err.Error(), "failed to resolve hostname") {
			t.Errorf("VerifyExternalModel() error = %v, SSRF validation must be skipped for a trusted Service", err)
		}
	})

	t.Run("manually managed EndpointSlice does not enable the SSRF skip", func(t *testing.T) {
		client := &k8smocks.ConfigurableMockKubernetesClient{
			Service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, Selector: map[string]string{"app": "my-model"}},
			},
			EndpointSlices: []discoveryv1.EndpointSlice{manualSlice()},
		}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want SSRF validation failure")
		}
		if !strings.Contains(err.Error(), "failed to resolve hostname") {
			t.Errorf("VerifyExternalModel() error = %v, want SSRF validation to run (failed to resolve hostname)", err)
		}
	})
}
