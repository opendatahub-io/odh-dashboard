package repositories

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

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
	// Inject the default suffix set with deterministic lookups so the
	// search-path candidate probes never touch the test machine's resolver.
	withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			classif, err := classifyHost(context.Background(), tt.baseURL)
			if err != nil {
				t.Fatalf("classifyHost(%q) error = %v, want nil", tt.baseURL, err)
			}
			if got := classif.internalTo(tt.allowedNamespace, tt.allowLoopback); got != tt.want {
				t.Errorf("classifyHost(%q).internalTo(%q, %v) = %v, want %v", tt.baseURL, tt.allowedNamespace, tt.allowLoopback, got, tt.want)
			}
		})
	}
}

// withInjectedServiceDNS swaps the cluster suffix and absolute-lookup
// functions for deterministic fakes and restores them when the test ends.
// The resolver's ndots is pinned to the Kubernetes default of 5 so outcomes
// do not depend on the test machine's resolv.conf.
func withInjectedServiceDNS(t *testing.T, suffixes []string, resolvesAbsolutely bool) {
	withInjectedServiceDNSNdots(t, suffixes, resolvesAbsolutely, 5)
}

// withInjectedServiceDNSNdots is withInjectedServiceDNS with an explicit
// ndots threshold, for coverage of resolver configurations where a name with
// enough dots is tried absolutely before the search path.
func withInjectedServiceDNSNdots(t *testing.T, suffixes []string, resolvesAbsolutely bool, ndots int) {
	t.Helper()
	originalSuffixes, originalProbeable, originalLookup, originalNdots := clusterServiceSuffixesFn, probeableServiceSuffixesFn, lookupAbsHostFn, resolverNdotsFn
	clusterServiceSuffixesFn = func() []string { return suffixes }
	probeableServiceSuffixesFn = func() []string { return suffixes }
	lookupAbsHostFn = func(context.Context, string) (bool, error) { return resolvesAbsolutely, nil }
	resolverNdotsFn = func() int { return ndots }
	t.Cleanup(func() {
		clusterServiceSuffixesFn = originalSuffixes
		probeableServiceSuffixesFn = originalProbeable
		lookupAbsHostFn = originalLookup
		resolverNdotsFn = originalNdots
	})
}

// classifyOrFatal classifies a URL, failing the test on a classification
// error.
func classifyOrFatal(t *testing.T, baseURL string) hostClassification {
	t.Helper()
	classif, err := classifyHost(context.Background(), baseURL)
	if err != nil {
		t.Fatalf("classifyHost(%q) error = %v, want nil", baseURL, err)
	}
	return classif
}

func TestServiceHostClassificationSearchDomains(t *testing.T) {
	t.Run("custom cluster domain is classified like cluster.local", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.example.com"}, false)
		assert.True(t, classifyOrFatal(t, "https://my-model.my-ns.svc.cluster.example.com:8443/v1").internalTo("my-ns", false),
			"same-namespace service on a custom cluster domain must be trusted")
		assert.False(t, classifyOrFatal(t, "https://my-model.other-ns.svc.cluster.example.com:8443/v1").internalTo("my-ns", false),
			"cross-namespace service on a custom cluster domain must not be trusted")
		assert.True(t, classifyOrFatal(t, "https://my-model.other-ns.svc.cluster.example.com:8443/v1").crossNamespace("my-ns"),
			"cross-namespace service on a custom cluster domain must be denied explicitly")
	})

	t.Run("short cross-namespace name completed by search is classified cross-namespace", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		assert.True(t, classifyOrFatal(t, "https://my-model.other-ns:8443/v1").crossNamespace("my-ns"),
			"a short service.namespace name only the search path resolves must be denied explicitly")
		assert.False(t, classifyOrFatal(t, "https://my-model.other-ns:8443/v1").internalTo("my-ns", false))
	})

	t.Run("short same-namespace name completed by search is trusted", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		assert.True(t, classifyOrFatal(t, "https://my-model.my-ns:8443/v1").internalTo("my-ns", false),
			"a short same-namespace service name must go through Service verification")
	})

	t.Run("external two-label hostname that resolves absolutely stays external", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		originalLookup := lookupAbsHostFn
		lookupAbsHostFn = func(_ context.Context, host string) (bool, error) {
			// The name resolves absolutely; no search-path expansion does.
			return host == "example.com", nil
		}
		t.Cleanup(func() { lookupAbsHostFn = originalLookup })
		classif := classifyOrFatal(t, "https://example.com:8443/v1")
		assert.False(t, classif.internalTo("my-ns", false))
		assert.False(t, classif.crossNamespace("my-ns"))
		assert.False(t, classif.isServiceName)
	})

	t.Run("two-label hostname resolving both absolutely and as a Service is classified as the Service", func(t *testing.T) {
		// Under the Kubernetes default ndots:5, a two-label name has fewer
		// dots than the threshold, so the resolver tries search-path
		// expansion before the absolute name; the Service interpretation is
		// the destination the connection would actually use and must be
		// namespace-checked.
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		originalLookup := lookupAbsHostFn
		lookupAbsHostFn = func(_ context.Context, host string) (bool, error) {
			switch host {
			case "example.com", "example.com.svc.cluster.local":
				return true, nil
			}
			return false, nil
		}
		t.Cleanup(func() { lookupAbsHostFn = originalLookup })
		classif := classifyOrFatal(t, "https://example.com:8443/v1")
		assert.True(t, classif.isServiceName, "a name whose Service interpretation resolves must be classified as a Service")
		assert.Equal(t, "com", classif.namespace)
		assert.True(t, classif.crossNamespace("my-ns"),
			"a cross-namespace Service interpretation must be denied explicitly")
	})

	t.Run("two-label hostname resolving both absolutely and as a Service stays external under ndots:1", func(t *testing.T) {
		// With ndots:1 the resolver tries the absolute name first; when it
		// resolves, the search-path Service expansion is never reached.
		// Classifying the name as a Service anyway would 403 other-namespace
		// callers or pin same-namespace callers to the internal Pod for a URL
		// whose connection actually goes to the public endpoint.
		withInjectedServiceDNSNdots(t, []string{"svc.cluster.local"}, false, 1)
		originalLookup := lookupAbsHostFn
		lookupAbsHostFn = func(_ context.Context, host string) (bool, error) {
			switch host {
			case "example.com", "example.com.svc.cluster.local":
				return true, nil
			}
			return false, nil
		}
		t.Cleanup(func() { lookupAbsHostFn = originalLookup })
		classif := classifyOrFatal(t, "https://example.com:8443/v1")
		assert.False(t, classif.isServiceName, "the absolute interpretation wins under ndots:1, so the name stays external")
		assert.False(t, classif.crossNamespace("my-ns"))
		assert.False(t, classif.internalTo("my-ns", false))
	})

	t.Run("two-label name whose absolute lookup fails is still completed by the search path under ndots:1", func(t *testing.T) {
		// When the absolute name does not resolve, the resolver falls back to
		// the search path even with ndots:1, so the Service interpretation
		// must still be classified and namespace-checked.
		withInjectedServiceDNSNdots(t, []string{"svc.cluster.local"}, false, 1)
		originalLookup := lookupAbsHostFn
		lookupAbsHostFn = func(_ context.Context, host string) (bool, error) {
			return host == "my-model.other-ns.svc.cluster.local", nil
		}
		t.Cleanup(func() { lookupAbsHostFn = originalLookup })
		classif := classifyOrFatal(t, "https://my-model.other-ns:8443/v1")
		assert.True(t, classif.isServiceName, "a name only the search path resolves must be classified as a Service")
		assert.True(t, classif.crossNamespace("my-ns"))
	})

	t.Run("three-label name whose pod-specific Service interpretation resolves is classified as a Service", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		originalLookup := lookupAbsHostFn
		lookupAbsHostFn = func(_ context.Context, host string) (bool, error) {
			return host == "pod-a.my-model.my-ns.svc.cluster.local", nil
		}
		t.Cleanup(func() { lookupAbsHostFn = originalLookup })
		classif := classifyOrFatal(t, "https://pod-a.my-model.my-ns:8443/v1")
		assert.True(t, classif.isServiceName)
		assert.Equal(t, "my-model", classif.service)
		assert.Equal(t, "my-ns", classif.namespace)
		assert.Equal(t, "pod-a", classif.podLabel)
	})

	t.Run("single-label name resolving in the BFF pod's namespace is classified as a Service there", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		originalPodNS, originalLookup := bffPodNamespaceFn, lookupAbsHostFn
		bffPodNamespaceFn = func() (string, bool) { return "bff-ns", true }
		lookupAbsHostFn = func(_ context.Context, host string) (bool, error) {
			return host == "my-model.bff-ns.svc.cluster.local", nil
		}
		t.Cleanup(func() {
			bffPodNamespaceFn = originalPodNS
			lookupAbsHostFn = originalLookup
		})
		classif := classifyOrFatal(t, "https://my-model:8443/v1")
		assert.True(t, classif.isServiceName)
		assert.Equal(t, "my-model", classif.service)
		assert.Equal(t, "bff-ns", classif.namespace)
		assert.True(t, classif.crossNamespace("my-ns"),
			"a caller in another namespace must not reach the BFF pod namespace's Service")
		assert.True(t, classif.internalTo("bff-ns", false),
			"a caller authorized for the BFF pod namespace keeps the verified trust path")
	})

	t.Run("single-label name without an establishable BFF pod namespace is denied", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		originalPodNS := bffPodNamespaceFn
		bffPodNamespaceFn = func() (string, bool) { return "", false }
		t.Cleanup(func() { bffPodNamespaceFn = originalPodNS })
		classif := classifyOrFatal(t, "https://my-model:8443/v1")
		assert.True(t, classif.mustDeny, "the namespace a single-label name resolves in cannot be established, so it must be denied")
		assert.False(t, classif.isServiceName)
	})

	t.Run("trailing root dot makes a short name absolute, so it gets no search completion", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		for _, baseURL := range []string{"https://my-model.my-ns.svc.:8443/v1", "https://my-model.my-ns.:8443/v1"} {
			classif := classifyOrFatal(t, baseURL)
			assert.False(t, classif.isServiceName, "%s: an absolute short name is not a Service via search completion", baseURL)
			assert.False(t, classif.mustDeny)
		}
	})

	t.Run("fully qualified Service name with trailing root dot is still classified", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		classif := classifyOrFatal(t, "https://my-model.my-ns.svc.cluster.local.:8443/v1")
		assert.True(t, classif.isServiceName)
		assert.Equal(t, "my-ns", classif.namespace)
	})

	t.Run("bare cross-namespace .svc name is classified cross-namespace", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		classif := classifyOrFatal(t, "https://my-model.other-ns.svc:8443/v1")
		assert.True(t, classif.crossNamespace("my-ns"),
			"a bare service.namespace.svc name the search path completes must be denied explicitly")
		assert.False(t, classif.internalTo("my-ns", false))
	})

	t.Run("bare same-namespace .svc name is classified as a service name", func(t *testing.T) {
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		classif := classifyOrFatal(t, "https://my-model.my-ns.svc:8443/v1")
		assert.True(t, classif.internalTo("my-ns", false),
			"a bare same-namespace .svc name must go through Service verification")
	})

	t.Run("transient DNS failure propagates instead of misclassifying", func(t *testing.T) {
		// A resolver timeout must not collapse into a negative answer, which
		// would misclassify an external two-label hostname as a Service name
		// and return a misleading authorization denial.
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		originalLookup := lookupAbsHostFn
		lookupAbsHostFn = func(context.Context, string) (bool, error) { return false, errors.New("read udp: i/o timeout") }
		t.Cleanup(func() { lookupAbsHostFn = originalLookup })
		_, err := classifyHost(context.Background(), "https://example.com:8443/v1")
		assert.Error(t, err, "a transient DNS failure must propagate as a classification error")
	})

	t.Run("canceled context propagates from the absolute-name lookup", func(t *testing.T) {
		// Cancellation is not a definitive negative answer, so it must surface
		// as an error rather than classify a short name as a Service.
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		_, err := lookupAbsHostFn(ctx, "example.com")
		assert.Error(t, err, "a canceled context must propagate from the absolute-name lookup")
	})
}

func TestParseResolvConfServiceSuffixes(t *testing.T) {
	path := filepath.Join(t.TempDir(), "resolv.conf")
	content := "nameserver 10.96.0.10\nsearch my-ns.svc.cluster.example.com svc.cluster.example.com cluster.example.com\noptions ndots:5\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("failed to write test resolv.conf: %v", err)
	}
	assert.Equal(t, []string{"svc.cluster.example.com"}, parseResolvConfServiceSuffixes(path))
	assert.Empty(t, parseResolvConfServiceSuffixes(filepath.Join(t.TempDir(), "missing.conf")))
}

func TestParseResolvConfNdots(t *testing.T) {
	writeConf := func(content string) string {
		path := filepath.Join(t.TempDir(), "resolv.conf")
		if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
			t.Fatalf("failed to write test resolv.conf: %v", err)
		}
		return path
	}
	assert.Equal(t, 5, parseResolvConfNdots(writeConf("search my-ns.svc.cluster.local\noptions ndots:5\n")))
	assert.Equal(t, 1, parseResolvConfNdots(writeConf("search my-ns.svc.cluster.local\n")), "absent option defaults to 1")
	assert.Equal(t, 1, parseResolvConfNdots(writeConf("options ndots:not-a-number\n")), "invalid option defaults to 1")
	assert.Equal(t, 1, parseResolvConfNdots(filepath.Join(t.TempDir(), "missing.conf")), "missing file defaults to 1")
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

	// Inject the default suffix set with deterministic lookups so names that
	// classify structurally as neither Service nor pod-specific name (e.g.
	// extra intermediate labels) never probe the machine's resolver, whose
	// answer for cluster.local names differs between developer machines and
	// CI runners.
	withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)

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
			name:      "endpoint slice lookup failure propagates an availability error",
			service:   selectorSvc("", intstr.FromInt32(8443)),
			slicesErr: fmt.Errorf("connection refused"),
			wantErr:   true,
			wantName:  "my-model",
		},
		{
			name:     "pod lookup failure propagates an availability error",
			service:  selectorSvc("", intstr.FromInt32(8443)),
			slices:   []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
			podErr:   fmt.Errorf("connection refused"),
			wantErr:  true,
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
			name:     "service lookup failure propagates an availability error",
			err:      fmt.Errorf("connection refused"),
			wantErr:  true,
			wantName: "my-model",
		},
		{
			name:     "NotFound Service lookup is untrusted without an error",
			err:      apierrors.NewNotFound(schema.GroupResource{Resource: "services"}, "my-model"),
			want:     false,
			wantErr:  false,
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
			got, addresses, err := resolveTrustedHost(context.Background(), client, identity, baseURL, classifyOrFatal(t, baseURL), "my-ns", false, logger)
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
				"https://my-model.my-ns.svc.cluster.local:8443/v1",
				classifyOrFatal(t, "https://my-model.my-ns.svc.cluster.local:8443/v1"),
				"my-ns", false, slog.Default(),
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

// TestResolveTrustedHostLoopbackCanonicalization verifies that DNS-equivalent
// spellings of localhost (uppercase, trailing root dot) keep the
// local-development loopback exemption instead of losing it between the
// canonicalized classification and the trust decision.
func TestResolveTrustedHostLoopbackCanonicalization(t *testing.T) {
	for _, baseURL := range []string{"http://LOCALHOST:8080", "http://localhost.:8080", "http://localhost:8080"} {
		t.Run(baseURL, func(t *testing.T) {
			classif := classifyOrFatal(t, baseURL)
			trusted, addresses, err := resolveTrustedHost(
				context.Background(), &k8smocks.ConfigurableMockKubernetesClient{}, nil,
				baseURL, classif, "my-ns", true, slog.Default(),
			)
			if err != nil {
				t.Fatalf("resolveTrustedHost() error = %v, want nil", err)
			}
			if !trusted {
				t.Errorf("resolveTrustedHost() = false, want loopback trusted with the local-endpoint option enabled")
			}
			if len(addresses) != 0 {
				t.Errorf("resolveTrustedHost() addresses = %v, want none for loopback", addresses)
			}
		})
	}
}

// TestResolveTrustedHostDoesNotLogSensitiveSelectorValues verifies that trust
// lookup failures log only a safe error category: raw Kubernetes error
// messages can embed caller-controlled label selectors, which must not reach
// the logs.
func TestResolveTrustedHostDoesNotLogSensitiveSelectorValues(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&buf, nil))
	// A Service whose selector carries a sensitive value; the pod list fails
	// with an error whose message embeds that selector, as Kubernetes API
	// errors do.
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Namespace: "my-ns", Name: "my-model"},
		Spec: corev1.ServiceSpec{
			Type:     corev1.ServiceTypeClusterIP,
			Selector: map[string]string{"app": "secret-selector-value"},
			Ports:    []corev1.ServicePort{{Name: "https", Port: 8443, TargetPort: intstr.FromInt32(8443)}},
		},
	}
	client := &k8smocks.ConfigurableMockKubernetesClient{
		Service:        service,
		EndpointSlices: []discoveryv1.EndpointSlice{controllerManagedSlice("my-ns")},
		PodError:       fmt.Errorf("pods is forbidden: labelSelector app=secret-selector-value: connection refused"),
	}
	_, _, err := resolveTrustedHost(
		context.Background(), client, nil,
		"https://my-model.my-ns.svc.cluster.local:8443/v1",
		classifyOrFatal(t, "https://my-model.my-ns.svc.cluster.local:8443/v1"),
		"my-ns", false, logger,
	)
	if err == nil {
		t.Fatal("resolveTrustedHost() error = nil, want availability error")
	}
	if strings.Contains(buf.String(), "secret-selector-value") {
		t.Errorf("trust lookup logs leaked the sensitive selector value: %s", buf.String())
	}
	if !strings.Contains(buf.String(), "pod list failed") {
		t.Errorf("trust lookup failure was not logged: %s", buf.String())
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
			t.Fatal("VerifyExternalModel() error = nil, want availability error")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusServiceUnavailable {
			t.Errorf("VerifyExternalModel() error = %v, want 503 availability error", err)
		}
		// The client-facing message must identify the Service without the
		// underlying client-go error, which can leak internal cluster details;
		// the full error is preserved in the server log instead.
		if strings.Contains(err.Error(), "connection refused") {
			t.Errorf("VerifyExternalModel() error = %v, want the underlying Kubernetes error sanitized from the client-facing message", err)
		}
		if !strings.Contains(err.Error(), "my-model") {
			t.Errorf("VerifyExternalModel() error = %v, want the message to identify the Service", err)
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

	t.Run("uppercase cross-namespace Service DNS name is denied without SSRF resolution", func(t *testing.T) {
		req := req
		req.BaseURL = "https://my-model.Other-Ns.SVC.CLUSTER.LOCAL:8443/v1"
		client := &k8smocks.ConfigurableMockKubernetesClient{}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want DNS-equivalent uppercase cross-namespace Service to be denied")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
			t.Errorf("VerifyExternalModel() error = %v, want ExternalModelError with status 403", err)
		}
	})

	t.Run("trailing-dot cross-namespace Service DNS name is denied without SSRF resolution", func(t *testing.T) {
		req := req
		req.BaseURL = "https://my-model.other-ns.svc.cluster.local.:8443/v1"
		client := &k8smocks.ConfigurableMockKubernetesClient{}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want DNS-equivalent trailing-dot cross-namespace Service to be denied")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
			t.Errorf("VerifyExternalModel() error = %v, want ExternalModelError with status 403", err)
		}
	})

	t.Run("DNS-equivalent spelling of a same-namespace Service is still trusted", func(t *testing.T) {
		// Canonicalization must not over-block: uppercase and trailing-dot
		// forms of a verifiable same-namespace Service keep their trust.
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			t.Fatalf("failed to reserve an ephemeral port: %v", err)
		}
		closedPort := listener.Addr().(*net.TCPAddr).Port
		if err := listener.Close(); err != nil {
			t.Fatalf("failed to release the ephemeral port: %v", err)
		}
		req := req
		req.BaseURL = fmt.Sprintf("https://My-Model.My-Ns.svc.cluster.local.:%d/v1", closedPort)
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
		if !strings.Contains(err.Error(), "pinned dial") {
			t.Errorf("VerifyExternalModel() error = %v, want pinned dial failure for the trusted Service", err)
		}
	})

	t.Run("short cross-namespace Service name is denied without SSRF resolution", func(t *testing.T) {
		// A short <service>.<namespace> name the pod's search path completes
		// must receive the same cross-namespace denial as its FQDN form.
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		req := req
		req.BaseURL = "https://my-model.other-ns:8443/v1"
		client := &k8smocks.ConfigurableMockKubernetesClient{}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want short cross-namespace Service to be denied")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
			t.Errorf("VerifyExternalModel() error = %v, want ExternalModelError with status 403", err)
		}
		if !strings.Contains(err.Error(), "another namespace") {
			t.Errorf("VerifyExternalModel() error = %v, want cross-namespace denial message", err)
		}
	})

	t.Run("transient DNS failure classifying a short name returns an availability error", func(t *testing.T) {
		// A resolver timeout while distinguishing a short Service name from an
		// external hostname must fail closed as a 503 rather than misclassify
		// the host and return a misleading authorization denial.
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		originalLookup := lookupAbsHostFn
		lookupAbsHostFn = func(context.Context, string) (bool, error) { return false, errors.New("read udp: i/o timeout") }
		t.Cleanup(func() { lookupAbsHostFn = originalLookup })
		req := req
		req.BaseURL = "https://example.com:8443/v1"
		client := &k8smocks.ConfigurableMockKubernetesClient{}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want availability error")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusServiceUnavailable {
			t.Errorf("VerifyExternalModel() error = %v, want ExternalModelError with status 503", err)
		}
	})

	t.Run("bare cross-namespace .svc Service name is denied without SSRF resolution", func(t *testing.T) {
		// A bare <service>.<namespace>.svc name is completed by the pod's DNS
		// search path to the same cross-namespace Service as its FQDN form, so
		// it must receive the same explicit denial instead of reaching the
		// DNS-based SSRF filter, which a non-RFC1918 Service CIDR passes.
		req := req
		req.BaseURL = "https://my-model.other-ns.svc:8443/v1"
		client := &k8smocks.ConfigurableMockKubernetesClient{}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want bare cross-namespace .svc Service to be denied")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
			t.Errorf("VerifyExternalModel() error = %v, want ExternalModelError with status 403", err)
		}
		if !strings.Contains(err.Error(), "another namespace") {
			t.Errorf("VerifyExternalModel() error = %v, want cross-namespace denial message", err)
		}
	})

	t.Run("bare same-namespace .svc Service name is trusted", func(t *testing.T) {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			t.Fatalf("failed to reserve an ephemeral port: %v", err)
		}
		closedPort := listener.Addr().(*net.TCPAddr).Port
		if err := listener.Close(); err != nil {
			t.Fatalf("failed to release the ephemeral port: %v", err)
		}
		req := req
		req.BaseURL = fmt.Sprintf("https://my-model.my-ns.svc:%d/v1", closedPort)
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
			t.Errorf("VerifyExternalModel() error = %v, a bare same-namespace .svc name must skip SSRF validation", err)
		}
		if !strings.Contains(err.Error(), "pinned dial") {
			t.Errorf("VerifyExternalModel() error = %v, want pinned dial failure for the trusted Service", err)
		}
	})

	t.Run("single-label Service name is denied when the BFF pod namespace cannot be established", func(t *testing.T) {
		// A single-label name resolves (if at all) to a Service in the BFF
		// pod's own namespace; without a reliable source for that namespace
		// it must be denied outright rather than fall back to DNS-based SSRF
		// validation, which a non-RFC1918 Service CIDR passes.
		withInjectedServiceDNS(t, []string{"svc.cluster.local"}, false)
		originalPodNS := bffPodNamespaceFn
		bffPodNamespaceFn = func() (string, bool) { return "", false }
		t.Cleanup(func() { bffPodNamespaceFn = originalPodNS })
		req := req
		req.BaseURL = "https://my-model:8443/v1"
		client := &k8smocks.ConfigurableMockKubernetesClient{}
		_, err := repo.VerifyExternalModel(logger, context.Background(), client, identity, "my-ns", req, nil, false, false)
		if err == nil {
			t.Fatal("VerifyExternalModel() error = nil, want single-label name without an establishable namespace to be denied")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
			t.Errorf("VerifyExternalModel() error = %v, want ExternalModelError with status 403", err)
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
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden || extErr.Code != "FORBIDDEN" {
			t.Errorf("VerifyExternalModel() error = %v, want ExternalModelError with status 403 and code FORBIDDEN", err)
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
		// Regression: a same-namespace Service whose backing resources fail
		// validation must be rejected outright. Falling back to DNS-based SSRF
		// validation would pass on a non-RFC1918 Service CIDR (e.g.
		// 100.96.0.0/16) and let the BFF reach unvalidated endpoints.
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
			t.Fatal("VerifyExternalModel() error = nil, want in-cluster endpoint rejection")
		}
		var extErr *externalmodels.ExternalModelError
		if !errors.As(err, &extErr) || extErr.StatusCode != http.StatusForbidden {
			t.Errorf("VerifyExternalModel() error = %v, want 403 rejection of an unverifiable in-cluster endpoint", err)
		}
	})
}
