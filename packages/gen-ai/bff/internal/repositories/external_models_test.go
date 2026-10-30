package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"reflect"
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
	"k8s.io/apimachinery/pkg/util/intstr"
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
// namespace. The address is loopback so any resulting pinned dial fails fast and
// locally instead of depending on the test environment's network.
func controllerManagedSlice(ns string) discoveryv1.EndpointSlice {
	ready := true
	return discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: ns, Name: "my-model-x7"},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints: []discoveryv1.Endpoint{{
			Addresses:  []string{"127.0.0.1"},
			Conditions: discoveryv1.EndpointConditions{Ready: &ready},
			TargetRef:  &corev1.ObjectReference{Kind: "Pod", Namespace: ns, Name: "my-model-pod"},
		}},
	}
}

// readinessSlice returns an EndpointSlice with a ready endpoint at 127.0.0.1 and a
// not-ready but serving endpoint at 127.0.0.2, both referencing the same Pod (which
// the mock returns with both PodIPs).
func readinessSlice() discoveryv1.EndpointSlice {
	ready, notReady, serving := true, false, true
	return discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model-readiness"},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints: []discoveryv1.Endpoint{
			{
				Addresses:  []string{"127.0.0.1"},
				Conditions: discoveryv1.EndpointConditions{Ready: &ready},
				TargetRef:  &corev1.ObjectReference{Kind: "Pod", Namespace: "my-ns", Name: "my-model-pod"},
			},
			{
				Addresses:  []string{"127.0.0.2"},
				Conditions: discoveryv1.EndpointConditions{Ready: &notReady, Serving: &serving},
				TargetRef:  &corev1.ObjectReference{Kind: "Pod", Namespace: "my-ns", Name: "my-model-pod"},
			},
		},
	}
}

// podNamedSlice returns an EndpointSlice for a headless Service with two named
// endpoints (pod-a at 127.0.0.1, pod-b at 127.0.0.2).
func podNamedSlice() discoveryv1.EndpointSlice {
	ready := true
	podA, podB := "pod-a", "pod-b"
	return discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model-named"},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints: []discoveryv1.Endpoint{
			{
				Addresses:  []string{"127.0.0.1"},
				Conditions: discoveryv1.EndpointConditions{Ready: &ready},
				Hostname:   &podA,
				TargetRef:  &corev1.ObjectReference{Kind: "Pod", Namespace: "my-ns", Name: "my-model-pod"},
			},
			{
				Addresses:  []string{"127.0.0.2"},
				Conditions: discoveryv1.EndpointConditions{Ready: &ready},
				Hostname:   &podB,
				TargetRef:  &corev1.ObjectReference{Kind: "Pod", Namespace: "my-ns", Name: "my-model-pod"},
			},
		},
	}
}

// runningPodWithIPs returns a running, non-host-network Pod with the given pod IPs,
// as the EndpointSlice controller's targetRefs point at.
func runningPodWithIPs(ns string, ips ...string) *corev1.Pod {
	podIPs := make([]corev1.PodIP, 0, len(ips))
	for _, ip := range ips {
		podIPs = append(podIPs, corev1.PodIP{IP: ip})
	}
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Namespace: ns, Name: "my-model-pod"},
		Status: corev1.PodStatus{
			Phase:  corev1.PodRunning,
			PodIPs: podIPs,
		},
	}
}

// runningPod returns a running, non-host-network Pod with a single pod IP.
func runningPod(ns, ip string) *corev1.Pod {
	return runningPodWithIPs(ns, ip)
}

// namedPod returns a Pod with the given name, IP, and phase.
func namedPod(name, ip string, phase corev1.PodPhase) *corev1.Pod {
	pod := runningPodWithIPs("my-ns", ip)
	pod.Name = name
	pod.Status.Phase = phase
	return pod
}

// podPhaseSlice returns an EndpointSlice whose two ready endpoints reference
// different Pods by targetRef name, so tests can mix Pod phases.
func podPhaseSlice() discoveryv1.EndpointSlice {
	ready := true
	return discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model-phases"},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints: []discoveryv1.Endpoint{
			{
				Addresses:  []string{"127.0.0.1"},
				Conditions: discoveryv1.EndpointConditions{Ready: &ready},
				TargetRef:  &corev1.ObjectReference{Kind: "Pod", Namespace: "my-ns", Name: "running-pod"},
			},
			{
				Addresses:  []string{"127.0.0.2"},
				Conditions: discoveryv1.EndpointConditions{Ready: &ready},
				TargetRef:  &corev1.ObjectReference{Kind: "Pod", Namespace: "my-ns", Name: "pending-pod"},
			},
		},
	}
}

// unreadyNoServingSlice returns an EndpointSlice whose single endpoint is
// Ready=false with no Serving condition: an absent Serving condition defers to
// Ready, so it must not become a fallback dial candidate.
func unreadyNoServingSlice() discoveryv1.EndpointSlice {
	notReady := false
	return discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model-unready"},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints: []discoveryv1.Endpoint{{
			Addresses:  []string{"127.0.0.1"},
			Conditions: discoveryv1.EndpointConditions{Ready: &notReady},
			TargetRef:  &corev1.ObjectReference{Kind: "Pod", Namespace: "my-ns", Name: "running-pod"},
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

// nilReadyNoTargetSlice returns an EndpointSlice whose endpoint has a nil Ready
// condition (interpreted as ready per the EndpointSlice API) and no Pod targetRef.
func nilReadyNoTargetSlice() discoveryv1.EndpointSlice {
	return discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model-nilready", Labels: map[string]string{"kubernetes.io/service-name": "my-model"}},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints:   []discoveryv1.Endpoint{{Addresses: []string{"10.9.9.9"}}},
	}
}

// forgedRefSlice returns a manually managed EndpointSlice whose ready endpoint
// carries a forged in-namespace Pod targetRef while its address points elsewhere.
func forgedRefSlice() discoveryv1.EndpointSlice {
	ready := true
	return discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model-forged", Labels: map[string]string{"kubernetes.io/service-name": "my-model"}},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints: []discoveryv1.Endpoint{{
			Addresses:  []string{"10.9.9.9"},
			Conditions: discoveryv1.EndpointConditions{Ready: &ready},
			TargetRef:  &corev1.ObjectReference{Kind: "Pod", Namespace: "my-ns", Name: "my-model-pod"},
		}},
	}
}

// terminatingSlice returns a manually managed EndpointSlice whose endpoint is
// Ready=false, Serving=true, Terminating=true — the combination service routing
// can fall back to when no ready endpoint exists — with the given targetRef and a
// cross-namespace destination address.
func terminatingSlice(withRef bool) discoveryv1.EndpointSlice {
	notReady, serving, terminating := false, true, true
	endpoint := discoveryv1.Endpoint{
		Addresses: []string{"10.9.9.9"},
		Conditions: discoveryv1.EndpointConditions{
			Ready:       &notReady,
			Serving:     &serving,
			Terminating: &terminating,
		},
	}
	if withRef {
		endpoint.TargetRef = &corev1.ObjectReference{Kind: "Pod", Namespace: "my-ns", Name: "my-model-pod"}
	}
	return discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model-term", Labels: map[string]string{"kubernetes.io/service-name": "my-model"}},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints:   []discoveryv1.Endpoint{endpoint},
	}
}

// TestResolveTrustedHost verifies the Service-backed trust decision: an in-namespace
// service DNS name is only trusted when the backing Service exists, is not an
// ExternalName alias (which could point at another namespace), has a selector
// (selectorless Services have manually managed endpoints that could point at
// another namespace's Pods; headless Services with a selector are legitimate
// controller-managed endpoints), and every endpoint of its EndpointSlices —
// regardless of readiness, since routing can fall back to terminating endpoints —
// references a running, non-host-network Pod in the caller's namespace whose PodIPs
// contain the endpoint's addresses (a manually managed EndpointSlice attached to a
// selector-backed Service could otherwise point at another namespace's Pod IP). A
// trusted Service returns validated address:backendPort dial targets, with the
// backend port resolved from the Service's targetPort (ClusterIP Services) or the
// URL's port (headless Services), ready endpoints preferred over serving ones, and
// pod-specific DNS names restricted to the matching endpoint hostname.
func TestResolveTrustedHost(t *testing.T) {
	logger := slog.Default()
	identity := &integrations.RequestIdentity{Token: "user-token"}

	// selectorSvc builds a selector-backed Service exposing port 8443 (the URL port
	// used by the tests) with the given targetPort and clusterIP ("None" for
	// headless).
	selectorSvc := func(clusterIP string, targetPort intstr.IntOrString) *corev1.Service {
		return &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
			Spec: corev1.ServiceSpec{
				Type:      corev1.ServiceTypeClusterIP,
				ClusterIP: clusterIP,
				Selector:  map[string]string{"app": "my-model"},
				Ports:     []corev1.ServicePort{{Name: "https", Port: 8443, TargetPort: targetPort}},
			},
		}
	}

	tests := []struct {
		name          string
		baseURL       string
		service       *corev1.Service
		err           error
		slices        []discoveryv1.EndpointSlice
		slicesErr     error
		pod           *corev1.Pod
		pods          map[string]*corev1.Pod
		podErr        error
		want          bool
		wantErr       bool
		wantName      string
		wantAddresses []string
	}{
		{
			name:          "selector-backed ClusterIP service is trusted and dials the numeric targetPort",
			want:          true,
			wantName:      "my-model",
			service:       selectorSvc("", intstr.FromInt32(9443)),
			slices:        []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:9443"},
		},
		{
			name:     "Service URL on port 80 dials the endpoint on targetPort 8080",
			baseURL:  "http://my-model.my-ns.svc.cluster.local:80/v1",
			want:     true,
			wantName: "my-model",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec: corev1.ServiceSpec{
					Type:     corev1.ServiceTypeClusterIP,
					Selector: map[string]string{"app": "my-model"},
					Ports:    []corev1.ServicePort{{Name: "http", Port: 80, TargetPort: intstr.FromInt32(8080)}},
				},
			},
			slices:        []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:8080"},
		},
		{
			name:     "named targetPort is resolved from the EndpointSlice",
			want:     true,
			wantName: "my-model",
			service:  selectorSvc("", intstr.FromString("https")),
			slices: []discoveryv1.EndpointSlice{func() discoveryv1.EndpointSlice {
				slice := controllerManagedSlice("my-ns")
				port := int32(8443)
				name := "https"
				slice.Ports = []discoveryv1.EndpointPort{{Name: &name, Port: &port}}
				return slice
			}()},
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name:     "URL port not exposed by the ClusterIP Service is NOT trusted",
			baseURL:  "https://my-model.my-ns.svc.cluster.local:9999/v1",
			service:  selectorSvc("", intstr.FromInt32(8443)),
			wantName: "my-model",
		},
		{
			name:          "pod-specific DNS name is pinned to the matching endpoint hostname",
			baseURL:       "https://pod-a.my-model.my-ns.svc.cluster.local:8443/v1",
			want:          true,
			wantName:      "my-model",
			service:       selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443)),
			slices:        []discoveryv1.EndpointSlice{podNamedSlice()},
			pod:           runningPodWithIPs("my-ns", "127.0.0.1", "127.0.0.2"),
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name:     "pod-specific DNS name with no matching endpoint hostname fails closed",
			baseURL:  "https://pod-c.my-model.my-ns.svc.cluster.local:8443/v1",
			service:  selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443)),
			slices:   []discoveryv1.EndpointSlice{podNamedSlice()},
			pod:      runningPodWithIPs("my-ns", "127.0.0.1", "127.0.0.2"),
			wantName: "my-model",
		},
		{
			name: "ExternalName alias is NOT trusted",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeExternalName, ExternalName: "secret.other-ns.svc.cluster.local"},
			},
		},
		{
			name:          "selector-backed headless service is trusted and dials the URL port",
			want:          true,
			wantName:      "my-model",
			service:       selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443)),
			slices:        []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name: "selectorless service is NOT trusted",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP},
			},
		},
		{
			name:    "manually managed EndpointSlice without a Pod targetRef is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{manualSlice()},
		},
		{
			name:    "manually managed EndpointSlice targeting another namespace's Pod is NOT trusted",
			service: selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{controllerManagedSlice("other-ns")},
		},
		{
			name:    "nil Ready condition without a Pod targetRef is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{nilReadyNoTargetSlice()},
		},
		{
			name:    "forged Pod targetRef with a non-matching address is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{forgedRefSlice()},
			pod:     runningPod("my-ns", "127.0.0.1"),
		},
		{
			name:    "forged Pod targetRef to a missing Pod is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{forgedRefSlice()},
			podErr:  apierrors.NewNotFound(schema.GroupResource{Resource: "pods"}, "my-model-pod"),
		},
		{
			name:    "host-network Pod is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			pod: func() *corev1.Pod {
				pod := runningPod("my-ns", "127.0.0.1")
				pod.Spec.HostNetwork = true
				return pod
			}(),
		},
		{
			name:    "Succeeded Pod is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			pod: func() *corev1.Pod {
				pod := runningPod("my-ns", "127.0.0.1")
				pod.Status.Phase = corev1.PodSucceeded
				return pod
			}(),
		},
		{
			name:      "endpoint slice lookup failure is NOT trusted",
			service:   selectorSvc("", intstr.FromInt32(8443)),
			slicesErr: fmt.Errorf("connection refused"),
			wantName:  "my-model",
		},
		{
			name:     "pod lookup failure is NOT trusted",
			service:  selectorSvc("", intstr.FromInt32(8443)),
			slices:   []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			podErr:   fmt.Errorf("connection refused"),
			wantName: "my-model",
		},
		{
			name:    "terminating endpoint without a Pod targetRef is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{terminatingSlice(false)},
		},
		{
			name:    "terminating endpoint with a forged Pod targetRef and unrelated address is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{terminatingSlice(true)},
			pod:     runningPod("my-ns", "127.0.0.1"),
		},
		{
			name:    "terminating endpoint referencing a matching Pod is trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices: []discoveryv1.EndpointSlice{func() discoveryv1.EndpointSlice {
				slice := terminatingSlice(true)
				slice.Endpoints[0].Addresses = []string{"127.0.0.1"}
				return slice
			}()},
			want:          true,
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name:          "ready endpoints are preferred over serving endpoints as dial targets",
			service:       selectorSvc("", intstr.FromInt32(8443)),
			slices:        []discoveryv1.EndpointSlice{readinessSlice()},
			pod:           runningPodWithIPs("my-ns", "127.0.0.1", "127.0.0.2"),
			want:          true,
			wantName:      "my-model",
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name:    "serving endpoints are used as dial targets when no ready endpoint exists",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices: []discoveryv1.EndpointSlice{func() discoveryv1.EndpointSlice {
				slice := readinessSlice()
				slice.Endpoints = slice.Endpoints[1:]
				return slice
			}()},
			want:          true,
			wantName:      "my-model",
			pod:           runningPodWithIPs("my-ns", "127.0.0.1", "127.0.0.2"),
			wantAddresses: []string{"127.0.0.2:8443"},
		},
		{
			name:    "Pending replica is excluded without discarding ready Running replicas",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{podPhaseSlice()},
			pods: map[string]*corev1.Pod{
				"running-pod": namedPod("running-pod", "127.0.0.1", corev1.PodRunning),
				"pending-pod": namedPod("pending-pod", "127.0.0.2", corev1.PodPending),
			},
			want:          true,
			wantName:      "my-model",
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name:     "unready endpoint without a Serving condition is not a fallback candidate",
			service:  selectorSvc("", intstr.FromInt32(8443)),
			slices:   []discoveryv1.EndpointSlice{unreadyNoServingSlice()},
			pod:      runningPod("my-ns", "127.0.0.1"),
			wantName: "my-model",
		},
		{
			name:     "Service with no endpoints fails closed",
			service:  selectorSvc("", intstr.FromInt32(8443)),
			slices:   []discoveryv1.EndpointSlice{},
			wantName: "my-model",
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
			client := &recordingServiceClient{ConfigurableMockKubernetesClient: k8smocks.ConfigurableMockKubernetesClient{Service: tt.service, ServiceError: tt.err, EndpointSlices: tt.slices, EndpointSlicesError: tt.slicesErr, Pod: tt.pod, Pods: tt.pods, PodError: tt.podErr}}
			got, addresses, err := resolveTrustedHost(context.Background(), client, identity, baseURL, "my-ns", logger)
			if (err != nil) != tt.wantErr {
				t.Fatalf("resolveTrustedHost() error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("resolveTrustedHost() = %v, want %v", got, tt.want)
			}
			if tt.wantAddresses != nil {
				if !reflect.DeepEqual(addresses, tt.wantAddresses) {
					t.Errorf("resolveTrustedHost() addresses = %v, want %v", addresses, tt.wantAddresses)
				}
			} else if !tt.want && len(addresses) > 0 {
				t.Errorf("resolveTrustedHost() addresses = %v, want none for untrusted host", addresses)
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
	trusted, _, err := resolveTrustedHost(
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
			Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, ClusterIP: corev1.ClusterIPNone, Selector: map[string]string{"app": "my-model"}},
		},
		EndpointSlicesError: apierrors.NewForbidden(schema.GroupResource{Resource: "endpointslices"}, "my-model-x7", fmt.Errorf("denied")),
	}
	trusted, _, err := resolveTrustedHost(
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

// TestResolveTrustedHostForbiddenPodLookup verifies that a caller who can list the
// EndpointSlices but cannot get the referenced Pod gets a meaningful permission
// error instead of a misleading connectivity failure, while the host is still not
// trusted.
func TestResolveTrustedHostForbiddenPodLookup(t *testing.T) {
	client := &k8smocks.ConfigurableMockKubernetesClient{
		Service: &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
			Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, ClusterIP: corev1.ClusterIPNone, Selector: map[string]string{"app": "my-model"}},
		},
		EndpointSlices: []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
		PodError:       apierrors.NewForbidden(schema.GroupResource{Resource: "pods"}, "my-model-pod", fmt.Errorf("denied")),
	}
	trusted, _, err := resolveTrustedHost(
		context.Background(), client, nil,
		"https://my-model.my-ns.svc.cluster.local:8443/v1", "my-ns", slog.Default(),
	)
	if trusted {
		t.Error("resolveTrustedHost() = true, want false on forbidden pod lookup")
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
// resolve hostname"), while a trusted host skips that check and its connection is
// pinned to the validated loopback address, where the dial fails locally because
// nothing is listening.
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
				Spec: corev1.ServiceSpec{
					Type:      corev1.ServiceTypeClusterIP,
					ClusterIP: corev1.ClusterIPNone,
					Selector:  map[string]string{"app": "my-model"},
				},
			},
			EndpointSlices: []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			Pod:            runningPod("my-ns", "127.0.0.1"),
		}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want pinned dial failure to the loopback address with nothing listening")
		}
		if strings.Contains(err.Error(), "failed to resolve hostname") {
			t.Errorf("VerifyExternalModel() error = %v, SSRF validation must be skipped for a trusted Service", err)
		}
		if !strings.Contains(err.Error(), "pinned dial") {
			t.Errorf("VerifyExternalModel() error = %v, want pinned dial failure for the trusted Service", err)
		}
	})

	t.Run("manually managed EndpointSlice does not enable the SSRF skip", func(t *testing.T) {
		client := &k8smocks.ConfigurableMockKubernetesClient{
			Service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec: corev1.ServiceSpec{
					Type:     corev1.ServiceTypeClusterIP,
					Selector: map[string]string{"app": "my-model"},
					Ports:    []corev1.ServicePort{{Name: "https", Port: 8443, TargetPort: intstr.FromInt32(8443)}},
				},
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
