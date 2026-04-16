package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

// PortForwardManager manages on-demand port-forwards to in-cluster services.
//
// LOCAL DEVELOPMENT ONLY — this component must never be instantiated in production.
// It is guarded by the DevMode config flag (default: false) in app.go. Production
// deployments do not set DevMode, so portForwardManager remains nil and all
// ForwardURL call sites (guarded by nil checks) are no-ops.
//
// Port-forwards are cached by namespace/service/port and reused across requests.
// If a forward dies (pod restart, network blip), the next call to ForwardURL
// detects the failure and re-establishes the forward transparently.
type PortForwardManager struct {
	mu         sync.Mutex
	forwards   map[string]*activeForward
	restConfig *rest.Config
	clientset  kubernetes.Interface
	logger     *slog.Logger
}

type activeForward struct {
	localPort uint16
	stopChan  chan struct{}
	errChan   chan error
}

// NewPortForwardManager creates a manager using the provided rest.Config and clientset.
// These should be the BFF's own credentials (not per-request user tokens), since
// port-forwards are long-lived and shared across requests.
func NewPortForwardManager(restConfig *rest.Config, clientset kubernetes.Interface, logger *slog.Logger) *PortForwardManager {
	return &PortForwardManager{
		forwards:   make(map[string]*activeForward),
		restConfig: restConfig,
		clientset:  clientset,
		logger:     logger,
	}
}

// ForwardURL rewrites an in-cluster service URL to a localhost port-forward.
// If the URL is not a *.svc.cluster.local address, it is returned unchanged.
// On the first call for a given service, a port-forward is established.
// Subsequent calls return the cached local port.
func (m *PortForwardManager) ForwardURL(ctx context.Context, rawURL string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL, nil
	}

	hostname := parsed.Hostname()
	if !strings.HasSuffix(hostname, ".svc.cluster.local") {
		return rawURL, nil
	}

	// Parse <service>.<namespace>.svc.cluster.local
	labels := strings.SplitN(hostname, ".", 5)
	if len(labels) < 5 {
		return rawURL, nil
	}
	serviceName := labels[0]
	namespace := labels[1]

	portStr := parsed.Port()
	if portStr == "" {
		if parsed.Scheme == "https" {
			portStr = "443"
		} else {
			portStr = "80"
		}
	}
	remotePort, err := strconv.Atoi(portStr)
	if err != nil {
		return "", fmt.Errorf("invalid port in URL %q: %w", rawURL, err)
	}

	localPort, err := m.getOrCreateForward(ctx, namespace, serviceName, remotePort)
	if err != nil {
		return "", err
	}

	// Rewrite URL to localhost
	rewritten := *parsed
	rewritten.Host = fmt.Sprintf("localhost:%d", localPort)
	return rewritten.String(), nil
}

// getOrCreateForward returns the local port for an active forward, or creates one.
func (m *PortForwardManager) getOrCreateForward(ctx context.Context, namespace, serviceName string, remotePort int) (uint16, error) {
	key := fmt.Sprintf("%s/%s:%d", namespace, serviceName, remotePort)

	m.mu.Lock()
	if fwd, ok := m.forwards[key]; ok {
		// Check if still alive
		select {
		case err := <-fwd.errChan:
			m.logger.Warn("port-forward died, re-establishing",
				"key", key, "error", err)
			delete(m.forwards, key)
		default:
			m.mu.Unlock()
			return fwd.localPort, nil
		}
	}
	m.mu.Unlock()

	m.logger.Info("establishing port-forward", "key", key)

	// Resolve service to pod
	podName, err := m.resolvePod(ctx, namespace, serviceName)
	if err != nil {
		return 0, fmt.Errorf("resolving pod for %s/%s: %w", namespace, serviceName, err)
	}

	// Create forward
	fwd, err := m.createForward(namespace, podName, remotePort)
	if err != nil {
		return 0, fmt.Errorf("creating port-forward %s: %w", key, err)
	}

	m.mu.Lock()
	m.forwards[key] = fwd
	m.mu.Unlock()

	m.logger.Info("port-forward established",
		"key", key, "localPort", fwd.localPort)
	return fwd.localPort, nil
}

// resolvePod finds a ready pod backing the given service.
func (m *PortForwardManager) resolvePod(ctx context.Context, namespace, serviceName string) (string, error) {
	endpoints, err := m.clientset.CoreV1().Endpoints(namespace).Get(ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("getting endpoints for %s/%s: %w", namespace, serviceName, err)
	}

	for _, subset := range endpoints.Subsets {
		for _, addr := range subset.Addresses {
			if addr.TargetRef != nil && addr.TargetRef.Kind == "Pod" {
				return addr.TargetRef.Name, nil
			}
		}
	}

	return "", fmt.Errorf("no ready pods found for service %s/%s", namespace, serviceName)
}

// createForward establishes a port-forward to a pod and waits for it to be ready.
func (m *PortForwardManager) createForward(namespace, podName string, remotePort int) (*activeForward, error) {
	reqURL := m.clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Namespace(namespace).
		Name(podName).
		SubResource("portforward").
		URL()

	transport, upgrader, err := spdy.RoundTripperFor(m.restConfig)
	if err != nil {
		return nil, fmt.Errorf("creating SPDY round tripper: %w", err)
	}

	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, http.MethodPost, reqURL)

	stopChan := make(chan struct{})
	readyChan := make(chan struct{})
	errChan := make(chan error, 1)

	ports := []string{fmt.Sprintf("0:%d", remotePort)}

	fw, err := portforward.New(dialer, ports, stopChan, readyChan, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("creating port forwarder: %w", err)
	}

	go func() {
		errChan <- fw.ForwardPorts()
	}()

	select {
	case <-readyChan:
		forwardedPorts, err := fw.GetPorts()
		if err != nil || len(forwardedPorts) == 0 {
			close(stopChan)
			return nil, fmt.Errorf("getting forwarded ports: %w", err)
		}

		return &activeForward{
			localPort: forwardedPorts[0].Local,
			stopChan:  stopChan,
			errChan:   errChan,
		}, nil

	case err := <-errChan:
		return nil, fmt.Errorf("port-forward failed to start: %w", err)
	}
}

// Close tears down all active port-forwards. Call on BFF shutdown.
func (m *PortForwardManager) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for key, fwd := range m.forwards {
		close(fwd.stopChan)
		m.logger.Debug("closed port-forward", "key", key)
	}
	m.forwards = make(map[string]*activeForward)
}
