package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
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
// in local development mode and for in-cluster services in the caller's authorized
// namespace. Cross-namespace and external hosts must NOT be treated as internal (CWE-918).
func TestIsInternalHost(t *testing.T) {
	tests := []struct {
		name             string
		baseURL          string
		allowedNamespace string
		allowLoopback    bool
		want             bool
	}{
		{"same-namespace cluster service is trusted", "https://my-model.my-ns.svc.cluster.local:8443/v1", "my-ns", false, true},
		{"same-namespace cluster service on arbitrary port", "http://model.my-ns.svc.cluster.local:19530", "my-ns", false, true},
		{"cross-namespace cluster service is NOT trusted", "https://secret.kube-system.svc.cluster.local/v1", "my-ns", false, false},
		{"namespace-like service name does not match", "https://my-ns.other-ns.svc.cluster.local/v1", "my-ns", false, false},
		{"cluster service with empty authorized namespace is NOT trusted", "https://svc.my-ns.svc.cluster.local", "", false, false},
		{"localhost is NOT trusted outside local development", "http://localhost:8080", "my-ns", false, false},
		{"loopback IP is NOT trusted outside local development", "http://127.0.0.1:9000", "my-ns", false, false},
		{"localhost is trusted in local development", "http://localhost:8080", "my-ns", true, true},
		{"loopback IP is trusted in local development", "http://127.0.0.1:9000", "my-ns", true, true},
		{"private IP is not internal", "http://10.0.0.5:8080", "my-ns", false, false},
		{"external host is not internal", "https://api.openai.com/v1", "my-ns", false, false},
		{"lookalike cluster suffix is not internal", "https://evil.cluster.local", "my-ns", false, false},
		{"too-few labels is not internal", "https://svc.cluster.local", "my-ns", false, false},
		{"unparseable url is not internal", "://bad-url", "my-ns", false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isInternalHost(tt.baseURL, tt.allowedNamespace, tt.allowLoopback); got != tt.want {
				t.Errorf("isInternalHost(%q, %q, %v) = %v, want %v", tt.baseURL, tt.allowedNamespace, tt.allowLoopback, got, tt.want)
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

func boolPtr(b bool) *bool { return &b }

func policyLocal() *corev1.ServiceInternalTrafficPolicy {
	p := corev1.ServiceInternalTrafficPolicyLocal
	return &p
}

// podRefAt returns a Pod targetRef for the named Pod in the given namespace.
func podRefAt(ns, name string) *corev1.ObjectReference {
	return &corev1.ObjectReference{Kind: "Pod", Namespace: ns, Name: name}
}

// ep builds a single EndpointSlice endpoint; a nil ready/serving/terminating
// pointer leaves the condition unset, and an empty hostname omits the endpoint
// hostname.
func ep(address string, ready, serving, terminating *bool, hostname string, ref *corev1.ObjectReference) discoveryv1.Endpoint {
	e := discoveryv1.Endpoint{
		Addresses:  []string{address},
		Conditions: discoveryv1.EndpointConditions{Ready: ready, Serving: serving, Terminating: terminating},
		TargetRef:  ref,
	}
	if hostname != "" {
		e.Hostname = &hostname
	}
	return e
}

// sliceWith builds an EndpointSlice over the given endpoints. labelled marks a
// manually attached slice, which carries the kubernetes.io/service-name label an
// attacker uses to attach it to a selector-backed Service.
func sliceWith(ns, name string, labelled bool, endpoints ...discoveryv1.Endpoint) discoveryv1.EndpointSlice {
	s := discoveryv1.EndpointSlice{
		ObjectMeta:  metav1.ObjectMeta{Namespace: ns, Name: name},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints:   endpoints,
	}
	if labelled {
		s.Labels = map[string]string{"kubernetes.io/service-name": "my-model"}
	}
	return s
}

// withSlicePort returns the slice with a single named TCP port, as the EndpointSlice
// controller publishes the resolved Service port.
func withSlicePort(s discoveryv1.EndpointSlice, name string, port int32) discoveryv1.EndpointSlice {
	s.Ports = []discoveryv1.EndpointPort{{Name: &name, Port: &port}}
	return s
}

// controllerManagedSlice returns an EndpointSlice as the EndpointSlice controller
// produces it: a ready endpoint whose targetRef points at a Pod in the given
// namespace, publishing the Service's "https" port (the URL port used by the tests).
// The address is loopback so any resulting pinned dial fails fast and
// locally instead of depending on the test environment's network.
func controllerManagedSlice(ns string) discoveryv1.EndpointSlice {
	return withSlicePort(sliceWith(ns, "my-model-x7", false, ep("127.0.0.1", boolPtr(true), nil, nil, "", podRefAt(ns, "my-model-pod"))), "https", 8443)
}

// manualSlice builds a manually managed EndpointSlice whose single endpoint sits
// at an arbitrary address with the given readiness conditions, optionally
// carrying a (possibly forged) Pod targetRef. It publishes the Service's "https" port so the negative cases
// reach the endpoint validation they exercise instead of being skipped as
// portless slices.
func manualSlice(name, address string, ready, serving, terminating *bool, ref *corev1.ObjectReference) discoveryv1.EndpointSlice {
	return withSlicePort(sliceWith("my-ns", name, true, ep(address, ready, serving, terminating, "", ref)), "https", 8443)
}

// runningPodWithIPs returns a running, non-host-network Pod with the given pod IPs,
// as the EndpointSlice controller's targetRefs point at.
func runningPodWithIPs(ns string, ips ...string) *corev1.Pod {
	podIPs := make([]corev1.PodIP, 0, len(ips))
	for _, ip := range ips {
		podIPs = append(podIPs, corev1.PodIP{IP: ip})
	}
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Namespace: ns, Name: "my-model-pod", Labels: map[string]string{"app": "my-model"}},
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

// namedSlice returns an EndpointSlice for a headless Service with two named
// endpoints (pod-a at 127.0.0.1, pod-b at 127.0.0.2).
func namedSlice() discoveryv1.EndpointSlice {
	return sliceWith("my-ns", "my-model-named", false,
		ep("127.0.0.1", boolPtr(true), nil, nil, "pod-a", podRefAt("my-ns", "my-model-pod")),
		ep("127.0.0.2", boolPtr(true), nil, nil, "pod-b", podRefAt("my-ns", "my-model-pod")))
}

// readinessSlice returns an EndpointSlice with a ready endpoint at 127.0.0.1 and a
// terminating-but-serving endpoint at 127.0.0.2, both referencing the same Pod
// (which the mock returns with both PodIPs).
func readinessSlice() discoveryv1.EndpointSlice {
	return withSlicePort(sliceWith("my-ns", "my-model-readiness", false,
		ep("127.0.0.1", boolPtr(true), nil, nil, "", podRefAt("my-ns", "my-model-pod")),
		ep("127.0.0.2", boolPtr(false), boolPtr(true), boolPtr(true), "", podRefAt("my-ns", "my-model-pod"))), "https", 8443)
}

// TestResolveTrustedHost verifies the Service-backed trust decision and dial
// target resolution described on resolveTrustedHost: ExternalName, selectorless,
// and manually-endpoint-managed Services fail closed, and trusted Services return
// validated address:backendPort targets with ready endpoints preferred.
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
			name:          "selector-backed ClusterIP service is trusted and dials the EndpointSlice's published port for a numeric targetPort",
			want:          true,
			wantName:      "my-model",
			service:       selectorSvc("", intstr.FromInt32(9443)),
			slices:        []discoveryv1.EndpointSlice{withSlicePort(controllerManagedSlice("my-ns"), "https", 9443)},
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:9443"},
		},
		{
			name:     "Service URL on port 80 dials the endpoint on the slice's published port 8080",
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
			slices:        []discoveryv1.EndpointSlice{withSlicePort(controllerManagedSlice("my-ns"), "http", 8080)},
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:8080"},
		},
		{
			name:     "numeric targetPort change is ignored while slices still publish the old backend port",
			want:     true,
			wantName: "my-model",
			// Service targetPort updated to 9443 but the EndpointSlice controller has
			// not reconciled yet: Kubernetes still routes through the published 8443,
			// so the pinned dial must use the slice's port, not the new targetPort.
			service:       selectorSvc("", intstr.FromInt32(9443)),
			slices:        []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name:          "named targetPort is resolved from the EndpointSlice",
			want:          true,
			wantName:      "my-model",
			service:       selectorSvc("", intstr.FromString("https")),
			slices:        []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
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
			slices:        []discoveryv1.EndpointSlice{namedSlice()},
			pod:           runningPodWithIPs("my-ns", "127.0.0.1", "127.0.0.2"),
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name:     "pod-specific DNS name on a ClusterIP Service dials the URL port, not the Service's translated port",
			baseURL:  "https://pod-a.my-model.my-ns.svc.cluster.local:8443/v1",
			want:     true,
			wantName: "my-model",
			// CoreDNS resolves endpoint-specific names directly to endpoint
			// addresses even for ClusterIP Services, so the URL's port must be
			// retained instead of being translated to the slice's published
			// backend port (9443).
			service:       selectorSvc("", intstr.FromInt32(9443)),
			slices:        []discoveryv1.EndpointSlice{withSlicePort(namedSlice(), "https", 9443)},
			pod:           runningPodWithIPs("my-ns", "127.0.0.1", "127.0.0.2"),
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name:    "pod-specific DNS name on a ClusterIP Service with only terminating endpoints fails closed",
			baseURL: "https://pod-a.my-model.my-ns.svc.cluster.local:8443/v1",
			// Endpoint DNS does not publish terminating endpoints, so the
			// ClusterIP terminating-endpoint fallback must not apply to a
			// pod-specific name.
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices: []discoveryv1.EndpointSlice{withSlicePort(sliceWith("my-ns", "my-model-pod-term", false,
				ep("127.0.0.1", boolPtr(false), boolPtr(true), boolPtr(true), "pod-a", podRefAt("my-ns", "my-model-pod"))), "https", 8443)},
			pod:      runningPod("my-ns", "127.0.0.1"),
			wantName: "my-model",
		},
		{
			name:     "CoreDNS default dashed-IP endpoint name is trusted for a hostname-less endpoint",
			baseURL:  "https://10-0-0-10.my-model.my-ns.svc.cluster.local:8443/v1",
			want:     true,
			wantName: "my-model",
			// CoreDNS names a hostname-less endpoint after its address with dots
			// replaced by dashes, so such names must resolve to that endpoint.
			service: selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443)),
			slices: []discoveryv1.EndpointSlice{withSlicePort(sliceWith("my-ns", "my-model-dashed", false,
				ep("10.0.0.10", boolPtr(true), nil, nil, "", podRefAt("my-ns", "my-model-pod"))), "https", 8443)},
			pod:           runningPod("my-ns", "10.0.0.10"),
			wantAddresses: []string{"10.0.0.10:8443"},
		},
		{
			name:    "extra intermediate labels are NOT a valid service DNS name",
			baseURL: "https://pod-a.extra.my-model.my-ns.svc.cluster.local:8443/v1",
			service: selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{namedSlice()},
			pod:     runningPodWithIPs("my-ns", "127.0.0.1", "127.0.0.2"),
		},
		{
			name:     "pod-specific DNS name with no matching endpoint hostname fails closed",
			baseURL:  "https://pod-c.my-model.my-ns.svc.cluster.local:8443/v1",
			service:  selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443)),
			slices:   []discoveryv1.EndpointSlice{namedSlice()},
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
			slices:  []discoveryv1.EndpointSlice{manualSlice("my-model-evil", "10.9.9.9", boolPtr(true), nil, nil, nil)},
		},
		{
			name:    "manually managed EndpointSlice targeting another namespace's Pod is NOT trusted",
			service: selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{controllerManagedSlice("other-ns")},
		},
		{
			name:    "nil Ready condition without a Pod targetRef is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{manualSlice("my-model-nilready", "10.9.9.9", nil, nil, nil, nil)},
		},
		{
			name:    "forged Pod targetRef with a non-matching address is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{manualSlice("my-model-forged", "10.9.9.9", boolPtr(true), nil, nil, podRefAt("my-ns", "my-model-pod"))},
			pod:     runningPod("my-ns", "127.0.0.1"),
		},
		{
			name:    "forged Pod targetRef to a Pod missing from the selector-matched list is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{manualSlice("my-model-forged", "10.9.9.9", boolPtr(true), nil, nil, podRefAt("my-ns", "my-model-pod"))},
			// A successful Pod list that lacks the referenced Pod: the list itself
			// works, but the targetRef name is absent from it.
			pods: map[string]*corev1.Pod{
				"other-pod": namedPod("other-pod", "10.9.9.10", corev1.PodRunning),
			},
		},
		{
			name:    "endpoint Pod that no longer matches the Service selector is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			pod: func() *corev1.Pod {
				pod := runningPod("my-ns", "127.0.0.1")
				pod.Labels = nil
				return pod
			}(),
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
			slices:  []discoveryv1.EndpointSlice{manualSlice("my-model-term", "10.9.9.9", boolPtr(false), boolPtr(true), boolPtr(true), nil)},
		},
		{
			name:    "terminating endpoint with a forged Pod targetRef and unrelated address is NOT trusted",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices:  []discoveryv1.EndpointSlice{manualSlice("my-model-term", "10.9.9.9", boolPtr(false), boolPtr(true), boolPtr(true), podRefAt("my-ns", "my-model-pod"))},
			pod:     runningPod("my-ns", "127.0.0.1"),
		},
		{
			name:          "terminating endpoint referencing a matching Pod is trusted",
			service:       selectorSvc("", intstr.FromInt32(8443)),
			slices:        []discoveryv1.EndpointSlice{manualSlice("my-model-term", "127.0.0.1", boolPtr(false), boolPtr(true), boolPtr(true), podRefAt("my-ns", "my-model-pod"))},
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
			name:    "headless Service with only terminating endpoints fails closed",
			service: selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443)),
			// Headless DNS does not publish terminating endpoints, so they are not
			// dial targets even though the VIP fallback would route to them.
			slices: []discoveryv1.EndpointSlice{func() discoveryv1.EndpointSlice {
				slice := readinessSlice()
				slice.Endpoints = slice.Endpoints[1:]
				return slice
			}()},
			pod:      runningPodWithIPs("my-ns", "127.0.0.1", "127.0.0.2"),
			wantName: "my-model",
		},
		{
			name:     "headless Service with publishNotReadyAddresses dials controller-published ready endpoints",
			want:     true,
			wantName: "my-model",
			service: func() *corev1.Service {
				svc := selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443))
				svc.Spec.PublishNotReadyAddresses = true
				return svc
			}(),
			// The endpoint controller marks endpoints Ready even when the Service
			// publishes not-ready addresses, so the controller-produced slice
			// carries Ready=true endpoints that headless DNS serves.
			slices:        []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name: "headless Service with publishNotReadyAddresses and an unreconciled not-ready slice fails closed",
			service: func() *corev1.Service {
				svc := selectorSvc(corev1.ClusterIPNone, intstr.FromInt32(8443))
				svc.Spec.PublishNotReadyAddresses = true
				return svc
			}(),
			// An unreconciled slice can still carry Ready=false endpoints that
			// DNS does not publish yet; dialing them would verify a URL normal
			// Service routing cannot currently reach.
			slices:   []discoveryv1.EndpointSlice{withSlicePort(sliceWith("my-ns", "my-model-unreconciled", false, ep("127.0.0.1", boolPtr(false), nil, nil, "", podRefAt("my-ns", "my-model-pod"))), "https", 8443)},
			pod:      runningPod("my-ns", "127.0.0.1"),
			wantName: "my-model",
		},
		{
			name:    "Pending replica is excluded without discarding ready Running replicas",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices: []discoveryv1.EndpointSlice{withSlicePort(sliceWith("my-ns", "my-model-phases", false,
				ep("127.0.0.1", boolPtr(true), nil, nil, "", podRefAt("my-ns", "running-pod")),
				ep("127.0.0.2", boolPtr(true), nil, nil, "", podRefAt("my-ns", "pending-pod"))), "https", 8443)},
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
			slices:   []discoveryv1.EndpointSlice{withSlicePort(sliceWith("my-ns", "my-model-unready", false, ep("127.0.0.1", boolPtr(false), nil, nil, "", podRefAt("my-ns", "my-model-pod"))), "https", 8443)},
			pod:      runningPod("my-ns", "127.0.0.1"),
			wantName: "my-model",
		},
		{
			name:    "serving endpoint without a Terminating condition is not a fallback candidate",
			service: selectorSvc("", intstr.FromInt32(8443)),
			// kube-proxy's terminating fallback selects only endpoints that are
			// both serving and explicitly terminating, so a serving endpoint
			// that is not terminating is not dialed.
			slices:   []discoveryv1.EndpointSlice{manualSlice("my-model-serving", "127.0.0.1", boolPtr(false), boolPtr(true), nil, podRefAt("my-ns", "my-model-pod"))},
			pod:      runningPod("my-ns", "127.0.0.1"),
			wantName: "my-model",
		},
		{
			name:     "serving endpoint with Terminating=false is not a fallback candidate",
			service:  selectorSvc("", intstr.FromInt32(8443)),
			slices:   []discoveryv1.EndpointSlice{manualSlice("my-model-notterm", "127.0.0.1", boolPtr(false), boolPtr(true), boolPtr(false), podRefAt("my-ns", "my-model-pod"))},
			pod:      runningPod("my-ns", "127.0.0.1"),
			wantName: "my-model",
		},
		{
			name:     "TCP Service port is selected when UDP shares the same port number",
			want:     true,
			wantName: "my-model",
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec: corev1.ServiceSpec{
					Type:     corev1.ServiceTypeClusterIP,
					Selector: map[string]string{"app": "my-model"},
					Ports: []corev1.ServicePort{
						{Name: "quic", Port: 8443, Protocol: corev1.ProtocolUDP, TargetPort: intstr.FromInt32(8444)},
						{Name: "https", Port: 8443, Protocol: corev1.ProtocolTCP, TargetPort: intstr.FromInt32(8443)},
					},
				},
			},
			slices:        []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name:    "slice without the named Service port does not discard other slices' targets",
			service: selectorSvc("", intstr.FromString("https")),
			slices: []discoveryv1.EndpointSlice{
				controllerManagedSlice("my-ns"),
				withSlicePort(controllerManagedSlice("my-ns"), "http", 8080),
			},
			want:          true,
			wantName:      "my-model",
			pod:           runningPod("my-ns", "127.0.0.1"),
			wantAddresses: []string{"127.0.0.1:8443"},
		},
		{
			name:     "named Service port with no slice exposing it fails closed",
			service:  selectorSvc("", intstr.FromString("https")),
			slices:   []discoveryv1.EndpointSlice{withSlicePort(controllerManagedSlice("my-ns"), "http", 8080)},
			pod:      runningPod("my-ns", "127.0.0.1"),
			wantName: "my-model",
		},
		{
			name:     "ClusterIP Service with a numeric targetPort and a slice publishing no ports fails closed",
			service:  selectorSvc("", intstr.FromInt32(8443)),
			slices:   []discoveryv1.EndpointSlice{sliceWith("my-ns", "my-model-noports", false, ep("127.0.0.1", boolPtr(true), nil, nil, "", podRefAt("my-ns", "my-model-pod")))},
			pod:      runningPod("my-ns", "127.0.0.1"),
			wantName: "my-model",
		},
		{
			name:    "slice publishing the selected port as non-TCP fails closed",
			service: selectorSvc("", intstr.FromInt32(8443)),
			slices: []discoveryv1.EndpointSlice{func() discoveryv1.EndpointSlice {
				slice := controllerManagedSlice("my-ns")
				protocol := corev1.ProtocolUDP
				port := int32(8443)
				name := "https"
				slice.Ports = []discoveryv1.EndpointPort{{Name: &name, Port: &port, Protocol: &protocol}}
				return slice
			}()},
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
			got, addresses, err := resolveTrustedHost(context.Background(), client, identity, baseURL, "my-ns", false, logger)
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
// Service, its EndpointSlices, or the referenced Pod gets a meaningful permission
// error instead of a misleading connectivity failure, while the host is still not
// trusted.
func TestResolveTrustedHostForbiddenLookup(t *testing.T) {
	selectorSvc := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
		Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeClusterIP, ClusterIP: corev1.ClusterIPNone, Selector: map[string]string{"app": "my-model"}},
	}
	tests := []struct {
		name   string
		client *k8smocks.ConfigurableMockKubernetesClient
	}{
		{
			name:   "forbidden Service lookup",
			client: &k8smocks.ConfigurableMockKubernetesClient{ServiceError: apierrors.NewForbidden(schema.GroupResource{Resource: "services"}, "my-model", fmt.Errorf("denied"))},
		},
		{
			name:   "forbidden EndpointSlice lookup",
			client: &k8smocks.ConfigurableMockKubernetesClient{Service: selectorSvc, EndpointSlicesError: apierrors.NewForbidden(schema.GroupResource{Resource: "endpointslices"}, "my-model-x7", fmt.Errorf("denied"))},
		},
		{
			name: "forbidden Pod lookup",
			client: &k8smocks.ConfigurableMockKubernetesClient{
				Service:        selectorSvc,
				EndpointSlices: []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
				PodError:       apierrors.NewForbidden(schema.GroupResource{Resource: "pods"}, "my-model-pod", fmt.Errorf("denied")),
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			trusted, _, err := resolveTrustedHost(
				context.Background(), tt.client, nil,
				"https://my-model.my-ns.svc.cluster.local:8443/v1", "my-ns", false, slog.Default(),
			)
			if trusted {
				t.Error("resolveTrustedHost() = true, want false on forbidden lookup")
			}
			var extErr *externalmodels.ExternalModelError
			if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
				t.Errorf("resolveTrustedHost() error = %v, want ExternalModelError with status 403", err)
			}
		})
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
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
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
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want permission error")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
			t.Errorf("VerifyExternalModel() error = %v, want ExternalModelError with status 403", err)
		}
	})

	t.Run("eligible Service is trusted and skips SSRF validation", func(t *testing.T) {
		// Reserve an ephemeral port and release it so the pinned dial targets a
		// loopback port that is reliably closed, instead of assuming 8443 is
		// unused on the test machine.
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			t.Fatalf("failed to reserve an ephemeral port: %v", err)
		}
		closedPort := listener.Addr().(*net.TCPAddr).Port
		if err := listener.Close(); err != nil {
			t.Fatalf("failed to release the ephemeral port: %v", err)
		}
		req := req
		req.BaseURL = fmt.Sprintf("https://my-model.my-ns.svc.cluster.local:%d/v1", closedPort)

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
		_, err = repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
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

	t.Run("IPv6 endpoint address in short form is trusted despite PodIP textual difference", func(t *testing.T) {
		// Kubernetes re-stringifies Pod IPs when publishing EndpointSlices, so the
		// endpoint address may use a different (but equivalent) IPv6 textual form
		// than the Pod's status. Use loopback forms of the same shapes the
		// endpoint controller produces (full vs zero-compressed) so the pinned
		// dial fails fast and locally.
		listener, err := net.Listen("tcp", "[::1]:0")
		if err != nil {
			t.Skipf("IPv6 loopback unavailable: %v", err)
		}
		closedPort := listener.Addr().(*net.TCPAddr).Port
		if err := listener.Close(); err != nil {
			t.Fatalf("failed to release the ephemeral port: %v", err)
		}
		req := req
		req.BaseURL = fmt.Sprintf("https://my-model.my-ns.svc.cluster.local:%d/v1", closedPort)

		client := &k8smocks.ConfigurableMockKubernetesClient{
			Service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec: corev1.ServiceSpec{
					Type:      corev1.ServiceTypeClusterIP,
					ClusterIP: corev1.ClusterIPNone,
					Selector:  map[string]string{"app": "my-model"},
				},
			},
			EndpointSlices: []discoveryv1.EndpointSlice{withSlicePort(
				sliceWith("my-ns", "my-model-x7", false, ep("::1", boolPtr(true), nil, nil, "", podRefAt("my-ns", "my-model-pod"))),
				"https", int32(closedPort))},
			Pod: runningPodWithIPs("my-ns", "::0001"),
		}
		_, err = repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want pinned dial failure to the loopback address with nothing listening")
		}
		if strings.Contains(err.Error(), "failed to resolve hostname") {
			t.Errorf("VerifyExternalModel() error = %v, equivalent IPv6 forms must match and the Service must be trusted", err)
		}
		if !strings.Contains(err.Error(), "pinned dial") {
			t.Errorf("VerifyExternalModel() error = %v, want pinned dial failure for the trusted Service", err)
		}
	})

	t.Run("cross-namespace Service DNS name is denied without SSRF resolution", func(t *testing.T) {
		req := req
		req.BaseURL = "https://my-model.other-ns.svc.cluster.local:8443/v1"
		client := &k8smocks.ConfigurableMockKubernetesClient{}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want cross-namespace Service to be denied")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
			t.Errorf("VerifyExternalModel() error = %v, want ExternalModelError with status 403", err)
		}
		if !strings.Contains(err.Error(), "another namespace") {
			t.Errorf("VerifyExternalModel() error = %v, want cross-namespace denial message", err)
		}
	})

	t.Run("internalTrafficPolicy Local Service is not trusted via its VIP name", func(t *testing.T) {
		// With Local policy, kube-proxy only routes the VIP to endpoints on the
		// BFF's node; the pinned dial bypasses that filtering, so verification
		// must fail closed instead of reporting a URL the BFF cannot use.
		client := &k8smocks.ConfigurableMockKubernetesClient{
			Service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec: corev1.ServiceSpec{
					Type:                  corev1.ServiceTypeClusterIP,
					Selector:              map[string]string{"app": "my-model"},
					InternalTrafficPolicy: policyLocal(),
					Ports:                 []corev1.ServicePort{{Name: "https", Port: 8443, TargetPort: intstr.FromInt32(8443)}},
				},
			},
			EndpointSlices: []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			Pod:            runningPod("my-ns", "127.0.0.1"),
		}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want Local-policy Service to fail closed")
		}
		if strings.Contains(err.Error(), "pinned dial") {
			t.Errorf("VerifyExternalModel() error = %v, a Local-policy VIP name must not be pinned-dialed", err)
		}
	})

	t.Run("internalTrafficPolicy Local headless Service is still trusted", func(t *testing.T) {
		// Headless Services have no VIP: normal traffic goes directly to the
		// endpoint addresses, so Local policy does not apply and the pinned dial
		// matches real routing.
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			t.Fatalf("failed to reserve an ephemeral port: %v", err)
		}
		closedPort := listener.Addr().(*net.TCPAddr).Port
		if err := listener.Close(); err != nil {
			t.Fatalf("failed to release the ephemeral port: %v", err)
		}
		req := req
		req.BaseURL = fmt.Sprintf("https://my-model.my-ns.svc.cluster.local:%d/v1", closedPort)
		client := &k8smocks.ConfigurableMockKubernetesClient{
			Service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
				Spec: corev1.ServiceSpec{
					Type:                  corev1.ServiceTypeClusterIP,
					ClusterIP:             corev1.ClusterIPNone,
					Selector:              map[string]string{"app": "my-model"},
					InternalTrafficPolicy: policyLocal(),
				},
			},
			EndpointSlices: []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			Pod:            runningPod("my-ns", "127.0.0.1"),
		}
		_, err = repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want pinned dial failure to the loopback address with nothing listening")
		}
		if !strings.Contains(err.Error(), "pinned dial") {
			t.Errorf("VerifyExternalModel() error = %v, want pinned dial failure for the trusted headless Service", err)
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
			EndpointSlices: []discoveryv1.EndpointSlice{manualSlice("my-model-evil", "10.9.9.9", boolPtr(true), nil, nil, nil)},
		}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want SSRF validation failure")
		}
		if !strings.Contains(err.Error(), "failed to resolve hostname") {
			t.Errorf("VerifyExternalModel() error = %v, want SSRF validation to run (failed to resolve hostname)", err)
		}
	})
}
