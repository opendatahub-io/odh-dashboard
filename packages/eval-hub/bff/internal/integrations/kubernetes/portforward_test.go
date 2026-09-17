package kubernetes

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	k8sfake "k8s.io/client-go/kubernetes/fake"
)

// === ForwardURL ===

// TestForwardURL_NonClusterURLs verifies that non-cluster URLs are returned unchanged.
// ForwardURL should only rewrite exact *.svc or *.svc.cluster.local addresses.
func TestForwardURL_NonClusterURLs(t *testing.T) {
	pfm := &PortForwardManager{
		forwards: make(map[string]*activeForward),
		logger:   slog.Default(),
	}

	for _, tt := range []struct {
		name string
		url  string
	}{
		{"plain HTTP URL", "http://example.com/api/v1/models"},
		{"HTTPS URL", "https://api.openai.com/v1/completions"},
		{"localhost URL", "http://localhost:8080/healthcheck"},
		{"IP address URL", "http://10.0.0.1:9090/metrics"},
		{"partial cluster name", "http://my-service.svc.cluster.example.com/api"},
		{"missing .local suffix", "http://my-service.ns.svc.cluster/api"},
		{"too few labels", "http://my-service.svc.cluster.local/api"}, // 4 labels, need 5 (service.ns.svc.cluster.local)
		{"empty string", ""},
	} {
		t.Run(tt.name, func(t *testing.T) {
			result, err := pfm.ForwardURL(context.Background(), tt.url)
			if err != nil {
				t.Fatalf("ForwardURL(%q) unexpected error: %v", tt.url, err)
			}
			if result != tt.url {
				t.Errorf("ForwardURL(%q) = %q, want unchanged URL", tt.url, result)
			}
		})
	}
}

// NOTE: TestForwardURL_ClusterURLParsing is intentionally omitted.
// Testing that cluster-internal URLs trigger forward creation requires a real
// k8s clientset — without one, resolvePod panics on a nil pointer dereference.
// The cached-forward tests (TestForwardURL_CachedForward, TestForwardURL_DefaultPorts,
// TestForwardURL_PreservesPathAndQuery) verify the URL parsing and rewriting logic
// by pre-populating the cache so the code never reaches resolvePod.

// TestForwardURL_DefaultPorts verifies that when no port is specified in the URL,
// the correct default port is inferred (80 for http, 443 for https).
func TestForwardURL_DefaultPorts(t *testing.T) {
	// Pre-populate the cache with forwards for the expected default ports
	// to verify that the correct default port was inferred.
	pfm := &PortForwardManager{
		forwards: make(map[string]*activeForward),
		logger:   slog.Default(),
	}

	// Cache a forward for http default port (80)
	pfm.forwards["my-namespace/my-service:80"] = &activeForward{
		localPort: 12345,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
	}

	// Cache a forward for https default port (443)
	pfm.forwards["my-namespace/my-service:443"] = &activeForward{
		localPort: 12346,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
	}

	t.Run("http defaults to port 80", func(t *testing.T) {
		result, err := pfm.ForwardURL(context.Background(), "http://my-service.my-namespace.svc.cluster.local/api")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != "http://localhost:12345/api" {
			t.Errorf("got %q, want %q", result, "http://localhost:12345/api")
		}
	})

	t.Run("https defaults to port 443", func(t *testing.T) {
		result, err := pfm.ForwardURL(context.Background(), "https://my-service.my-namespace.svc.cluster.local/api")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != "https://localhost:12346/api" {
			t.Errorf("got %q, want %q", result, "https://localhost:12346/api")
		}
	})
}

// TestForwardURL_CachedForward verifies that full and short Kubernetes service
// names both return a cached forward without attempting to create a new one.
func TestForwardURL_CachedForward(t *testing.T) {
	pfm := &PortForwardManager{
		forwards: make(map[string]*activeForward),
		logger:   slog.Default(),
	}

	// Pre-populate cache
	pfm.forwards["test-ns/test-svc:8080"] = &activeForward{
		localPort: 54321,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
	}

	for _, tt := range []struct {
		name string
		url  string
	}{
		{name: "service FQDN", url: "http://test-svc.test-ns.svc.cluster.local:8080/v1/models"},
		{name: "short service name", url: "http://test-svc.test-ns.svc:8080/v1/models"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			result, err := pfm.ForwardURL(context.Background(), tt.url)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			expected := "http://localhost:54321/v1/models"
			if result != expected {
				t.Errorf("got %q, want %q", result, expected)
			}
		})
	}
}

// TestForwardURL_InvalidPort verifies that a URL with a non-numeric port is
// handled gracefully. Go's url.Parse rejects the malformed port, so ForwardURL
// returns the raw URL unchanged (same as any unparseable URL).
func TestForwardURL_InvalidPort(t *testing.T) {
	pfm := &PortForwardManager{
		forwards: make(map[string]*activeForward),
		logger:   slog.Default(),
	}

	input := "http://svc.ns.svc.cluster.local:notaport/api"
	result, err := pfm.ForwardURL(context.Background(), input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// url.Parse fails on invalid ports, so the URL is returned unchanged.
	if result != input {
		t.Errorf("got %q, want unchanged URL %q", result, input)
	}
}

// TestForwardURL_PreservesPathAndQuery verifies that the path, query string,
// and fragment are preserved when rewriting the URL.
func TestForwardURL_PreservesPathAndQuery(t *testing.T) {
	pfm := &PortForwardManager{
		forwards: make(map[string]*activeForward),
		logger:   slog.Default(),
	}

	pfm.forwards["ns/svc:8080"] = &activeForward{
		localPort: 11111,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
	}

	result, err := pfm.ForwardURL(context.Background(), "http://svc.ns.svc.cluster.local:8080/api/v1/models?limit=10&offset=0")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := "http://localhost:11111/api/v1/models?limit=10&offset=0"
	if result != expected {
		t.Errorf("got %q, want %q", result, expected)
	}
}

// === PortForwardWrapTransport ===

// TestPortForwardWrapTransport_ReturnsRoundTripper verifies that the function
// returns a valid transport wrapper.
func TestPortForwardWrapTransport_ReturnsRoundTripper(t *testing.T) {
	pfm := &PortForwardManager{
		forwards: make(map[string]*activeForward),
		logger:   slog.Default(),
	}

	wrapFn := PortForwardWrapTransport(pfm, slog.Default())
	if wrapFn == nil {
		t.Fatal("PortForwardWrapTransport returned nil")
	}

	base := http.DefaultTransport
	wrapped := wrapFn(base)
	if wrapped == nil {
		t.Fatal("wrap function returned nil RoundTripper")
	}

	// Verify it's the expected type
	if _, ok := wrapped.(*portForwardRoundTripper); !ok {
		t.Errorf("expected *portForwardRoundTripper, got %T", wrapped)
	}
}

// TestPortForwardTransport_NonClusterRequest verifies that non-cluster URLs
// pass through to the base transport unchanged.
func TestPortForwardTransport_NonClusterRequest(t *testing.T) {
	// Set up a test HTTP server to act as the base transport target
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	pfm := &PortForwardManager{
		forwards: make(map[string]*activeForward),
		logger:   slog.Default(),
	}

	transport := &portForwardRoundTripper{
		base:    http.DefaultTransport,
		manager: pfm,
		logger:  slog.Default(),
	}

	req, err := http.NewRequest("GET", server.URL+"/api/v1/test", nil)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := transport.RoundTrip(req)
	if err != nil {
		t.Fatalf("RoundTrip error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want %d", resp.StatusCode, http.StatusOK)
	}
}

type recordingRoundTripper struct {
	request *http.Request
}

func (r *recordingRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	r.request = req.Clone(req.Context())
	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader("")),
		Request:    req,
	}, nil
}

// TestPortForwardTransport_ClusterRequestRewrite verifies that cluster-internal
// URLs are rewritten to localhost before they reach the base transport.
func TestPortForwardTransport_ClusterRequestRewrite(t *testing.T) {
	pfm := &PortForwardManager{
		forwards: make(map[string]*activeForward),
		logger:   slog.Default(),
	}

	pfm.forwards["my-ns/my-svc:8080"] = &activeForward{
		localPort: 54322,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
	}
	base := &recordingRoundTripper{}

	transport := &portForwardRoundTripper{
		base:    base,
		manager: pfm,
		logger:  slog.Default(),
	}

	req, err := http.NewRequest("GET", "http://my-svc.my-ns.svc.cluster.local:8080/api/v1/test", nil)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := transport.RoundTrip(req)
	if err != nil {
		t.Fatalf("RoundTrip error: %v", err)
	}
	defer resp.Body.Close()

	if base.request == nil {
		t.Fatal("base transport did not receive a request")
	}
	if got, want := base.request.URL.String(), "http://localhost:54322/api/v1/test"; got != want {
		t.Errorf("base transport URL = %q, want %q", got, want)
	}
}

// === Close ===

// TestClose verifies that Close tears down all active forwards and clears the map.
func TestClose(t *testing.T) {
	pfm := &PortForwardManager{
		forwards: make(map[string]*activeForward),
		logger:   slog.Default(),
	}

	stop1 := make(chan struct{})
	stop2 := make(chan struct{})

	pfm.forwards["ns1/svc1:80"] = &activeForward{
		localPort: 10001,
		stopChan:  stop1,
		errChan:   make(chan error, 1),
	}
	pfm.forwards["ns2/svc2:8080"] = &activeForward{
		localPort: 10002,
		stopChan:  stop2,
		errChan:   make(chan error, 1),
	}

	pfm.Close()

	// Verify stopChans are closed
	select {
	case <-stop1:
		// expected — channel was closed
	default:
		t.Error("stop channel 1 was not closed")
	}

	select {
	case <-stop2:
		// expected — channel was closed
	default:
		t.Error("stop channel 2 was not closed")
	}

	// Verify forwards map is cleared
	if len(pfm.forwards) != 0 {
		t.Errorf("forwards map has %d entries, want 0", len(pfm.forwards))
	}
}

// === Concurrent access ===

// TestForwardURL_ConcurrentAccess verifies that concurrent ForwardURL calls
// for the same cached forward are safe (no panics, no data races).
func TestForwardURL_ConcurrentAccess(t *testing.T) {
	pfm := &PortForwardManager{
		forwards: make(map[string]*activeForward),
		logger:   slog.Default(),
	}

	pfm.forwards["ns/svc:8080"] = &activeForward{
		localPort: 22222,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
	}

	var wg sync.WaitGroup
	const goroutines = 50

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result, err := pfm.ForwardURL(context.Background(), "http://svc.ns.svc.cluster.local:8080/api")
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}
			expected := "http://localhost:22222/api"
			if result != expected {
				t.Errorf("got %q, want %q", result, expected)
			}
		}()
	}

	wg.Wait()
}

// TestGetOrCreateForward_ConcurrentColdCache verifies that simultaneous cache
// misses are coalesced and establish exactly one port-forward.
func TestGetOrCreateForward_ConcurrentColdCache(t *testing.T) {
	const goroutines = 50
	pfm := &PortForwardManager{
		forwards:  make(map[string]*activeForward),
		clientset: testEndpointSliceClientset("ns", "svc", "svc-pod"),
		logger:    slog.Default(),
	}

	var createCalls atomic.Int32
	creationStarted := make(chan struct{})
	releaseCreation := make(chan struct{})
	pfm.createForwardFn = func(_ context.Context, namespace, podName string, podPort int) (*activeForward, error) {
		if createCalls.Add(1) == 1 {
			close(creationStarted)
		}
		if namespace != "ns" || podName != "svc-pod" || podPort != 8080 {
			t.Errorf("unexpected forward target %s/%s:%d", namespace, podName, podPort)
		}
		<-releaseCreation
		return &activeForward{
			localPort: 22222,
			stopChan:  make(chan struct{}),
			errChan:   make(chan error, 1),
		}, nil
	}

	start := make(chan struct{})
	results := make(chan struct {
		port uint16
		err  error
	}, goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			<-start
			port, err := pfm.getOrCreateForward(context.Background(), "ns", "svc", 8080)
			results <- struct {
				port uint16
				err  error
			}{port: port, err: err}
		}()
	}

	close(start)
	select {
	case <-creationStarted:
	case <-time.After(time.Second):
		t.Fatal("forward creation did not start")
	}
	// Keep the first creation blocked so the other callers exercise the
	// singleflight path instead of observing an already-populated cache.
	time.Sleep(100 * time.Millisecond)
	close(releaseCreation)

	for i := 0; i < goroutines; i++ {
		result := <-results
		if result.err != nil {
			t.Errorf("getOrCreateForward error: %v", result.err)
		}
		if result.port != 22222 {
			t.Errorf("local port = %d, want 22222", result.port)
		}
	}
	if got := createCalls.Load(); got != 1 {
		t.Errorf("forward creation calls = %d, want 1", got)
	}
}

// === NewPortForwardManager ===

// TestNewPortForwardManager verifies the constructor initializes fields correctly.
func TestNewPortForwardManager(t *testing.T) {
	logger := slog.Default()
	pfm := NewPortForwardManager(nil, nil, logger)

	if pfm == nil {
		t.Fatal("NewPortForwardManager returned nil")
	}
	if pfm.forwards == nil {
		t.Error("forwards map is nil")
	}
	if len(pfm.forwards) != 0 {
		t.Errorf("forwards map has %d entries, want 0", len(pfm.forwards))
	}
	if pfm.logger != logger {
		t.Error("logger not set correctly")
	}
}

func testEndpointSliceClientset(namespace, serviceName, podName string) *k8sfake.Clientset {
	ready := true
	notReady := false
	return k8sfake.NewSimpleClientset(
		&discoveryv1.EndpointSlice{
			ObjectMeta: metav1.ObjectMeta{
				Name:      serviceName + "-slice",
				Namespace: namespace,
				Labels:    map[string]string{discoveryv1.LabelServiceName: serviceName},
			},
			AddressType: discoveryv1.AddressTypeIPv4,
			Endpoints: []discoveryv1.Endpoint{
				{
					Addresses:  []string{"10.0.0.1"},
					Conditions: discoveryv1.EndpointConditions{Ready: &notReady},
					TargetRef:  &corev1.ObjectReference{Kind: "Pod", Name: "not-ready-pod"},
				},
				{
					Addresses:  []string{"10.0.0.2"},
					Conditions: discoveryv1.EndpointConditions{Ready: &ready},
					TargetRef:  &corev1.ObjectReference{Kind: "Pod", Name: podName},
				},
			},
		},
		&corev1.Service{
			ObjectMeta: metav1.ObjectMeta{Name: serviceName, Namespace: namespace},
			Spec: corev1.ServiceSpec{Ports: []corev1.ServicePort{
				{Port: 8080, TargetPort: intstr.FromInt32(8080)},
			}},
		},
	)
}

func TestResolveServiceTargetPort(t *testing.T) {
	const (
		namespace   = "ns"
		serviceName = "svc"
		podName     = "svc-pod"
	)
	clientset := k8sfake.NewSimpleClientset(
		&corev1.Service{
			ObjectMeta: metav1.ObjectMeta{Name: serviceName, Namespace: namespace},
			Spec: corev1.ServiceSpec{Ports: []corev1.ServicePort{
				{Port: 443, TargetPort: intstr.FromInt32(8443)},
				{Port: 80, TargetPort: intstr.FromString("http")},
				{Port: 9090},
				{Port: 1234, TargetPort: intstr.FromString("missing")},
			}},
		},
		&corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{Name: podName, Namespace: namespace},
			Spec: corev1.PodSpec{Containers: []corev1.Container{
				{
					Name: "evalhub",
					Ports: []corev1.ContainerPort{
						{Name: "http", ContainerPort: 8080, Protocol: corev1.ProtocolTCP},
					},
				},
			}},
		},
	)
	pfm := &PortForwardManager{clientset: clientset}

	tests := []struct {
		name        string
		servicePort int
		want        int
		wantErr     string
	}{
		{name: "numeric target port", servicePort: 443, want: 8443},
		{name: "named target port", servicePort: 80, want: 8080},
		{name: "omitted target port defaults to service port", servicePort: 9090, want: 9090},
		{name: "missing service port", servicePort: 9999, wantErr: "service port 9999 not found"},
		{name: "missing named target port", servicePort: 1234, wantErr: `named target port "missing" not found`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := pfm.resolveServiceTargetPort(context.Background(), namespace, serviceName, podName, tt.servicePort)
			if tt.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("error = %v, want error containing %q", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("target port = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestGetOrCreateForward_UsesServiceTargetPort(t *testing.T) {
	clientset := testEndpointSliceClientset("ns", "svc", "svc-pod")
	service, err := clientset.CoreV1().Services("ns").Get(context.Background(), "svc", metav1.GetOptions{})
	if err != nil {
		t.Fatalf("getting test service: %v", err)
	}
	service.Spec.Ports[0].TargetPort = intstr.FromInt32(8443)
	if _, err := clientset.CoreV1().Services("ns").Update(context.Background(), service, metav1.UpdateOptions{}); err != nil {
		t.Fatalf("updating test service: %v", err)
	}

	pfm := &PortForwardManager{
		forwards:  make(map[string]*activeForward),
		clientset: clientset,
		logger:    slog.Default(),
	}
	pfm.createForwardFn = func(_ context.Context, namespace, podName string, podPort int) (*activeForward, error) {
		if namespace != "ns" || podName != "svc-pod" || podPort != 8443 {
			t.Errorf("unexpected forward target %s/%s:%d", namespace, podName, podPort)
		}
		return &activeForward{
			localPort: 44444,
			stopChan:  make(chan struct{}),
			errChan:   make(chan error, 1),
		}, nil
	}

	if _, err := pfm.getOrCreateForward(context.Background(), "ns", "svc", 8080); err != nil {
		t.Fatalf("getOrCreateForward error: %v", err)
	}
}

// TestGetOrCreateForward_ReplacesDeadForward verifies that a dead cached forward
// is replaced and the replacement is cached.
func TestGetOrCreateForward_ReplacesDeadForward(t *testing.T) {
	const key = "ns/svc:8080"
	pfm := &PortForwardManager{
		forwards:  make(map[string]*activeForward),
		clientset: testEndpointSliceClientset("ns", "svc", "svc-pod"),
		logger:    slog.Default(),
	}

	errChan := make(chan error, 1)
	errChan <- errors.New("connection lost")

	pfm.forwards[key] = &activeForward{
		localPort: 33333,
		stopChan:  make(chan struct{}),
		errChan:   errChan,
	}

	replacement := &activeForward{
		localPort: 44444,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
	}
	createCalls := 0
	pfm.createForwardFn = func(ctx context.Context, namespace, podName string, remotePort int) (*activeForward, error) {
		createCalls++
		if namespace != "ns" || podName != "svc-pod" || remotePort != 8080 {
			t.Errorf("unexpected forward target %s/%s:%d", namespace, podName, remotePort)
		}
		return replacement, nil
	}

	localPort, err := pfm.getOrCreateForward(context.Background(), "ns", "svc", 8080)
	if err != nil {
		t.Fatalf("getOrCreateForward error: %v", err)
	}
	if localPort != replacement.localPort {
		t.Errorf("local port = %d, want %d", localPort, replacement.localPort)
	}
	if createCalls != 1 {
		t.Errorf("forward creation calls = %d, want 1", createCalls)
	}
	if pfm.forwards[key] != replacement {
		t.Error("replacement forward was not cached")
	}
}

// TestGetOrCreateForward_ClosesForwardCreatedDuringShutdown verifies that a
// forward created concurrently with shutdown is not left running.
func TestGetOrCreateForward_ClosesForwardCreatedDuringShutdown(t *testing.T) {
	creationStarted := make(chan struct{})
	allowCreation := make(chan struct{})
	replacement := &activeForward{
		localPort: 44444,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
	}
	pfm := &PortForwardManager{
		forwards:  make(map[string]*activeForward),
		clientset: testEndpointSliceClientset("ns", "svc", "svc-pod"),
		logger:    slog.Default(),
		createForwardFn: func(context.Context, string, string, int) (*activeForward, error) {
			close(creationStarted)
			<-allowCreation
			return replacement, nil
		},
	}

	result := make(chan error, 1)
	go func() {
		_, err := pfm.getOrCreateForward(context.Background(), "ns", "svc", 8080)
		result <- err
	}()

	select {
	case <-creationStarted:
	case <-time.After(time.Second):
		t.Fatal("forward creation did not start")
	}

	pfm.Close()
	close(allowCreation)

	select {
	case err := <-result:
		if !errors.Is(err, errPortForwardManagerClosed) {
			t.Fatalf("getOrCreateForward error = %v, want manager closing error", err)
		}
	case <-time.After(time.Second):
		t.Fatal("getOrCreateForward did not return after shutdown")
	}

	select {
	case <-replacement.stopChan:
		// Expected: the forward created after shutdown was stopped immediately.
	default:
		t.Error("forward created during shutdown was not stopped")
	}
	if len(pfm.forwards) != 0 {
		t.Errorf("forwards map has %d entries, want 0", len(pfm.forwards))
	}
}
