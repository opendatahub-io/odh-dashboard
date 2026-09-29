package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"

	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/httpstream"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

const portForwardStartupTimeout = 30 * time.Second

var errPortForwardManagerClosed = errors.New("port-forward manager is closing")

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
	mu              sync.Mutex
	forwards        map[string]*activeForward
	closing         bool
	sfGroup         singleflight.Group
	restConfig      *rest.Config
	clientset       kubernetes.Interface
	logger          *slog.Logger
	createForwardFn func(context.Context, string, string, int) (*activeForward, error)
}

type activeForward struct {
	localPort uint16
	stopChan  chan struct{}
	errChan   chan error
	stopOnce  sync.Once
}

func (f *activeForward) stop() {
	f.stopOnce.Do(func() {
		close(f.stopChan)
	})
}

// contextDialer preserves cancellation and startup deadlines while the Kubernetes
// SPDY dialer upgrades the port-forward connection.
type contextDialer struct {
	ctx      context.Context
	upgrader spdy.Upgrader
	client   *http.Client
	method   string
	url      *url.URL
}

func (d *contextDialer) Dial(protocols ...string) (httpstream.Connection, string, error) {
	req, err := http.NewRequestWithContext(d.ctx, d.method, d.url.String(), nil)
	if err != nil {
		return nil, "", fmt.Errorf("creating port-forward request: %w", err)
	}
	return spdy.Negotiate(d.upgrader, d.client, req, protocols...)
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
// If the URL is not a *.svc or *.svc.cluster.local address, it is returned unchanged.
// On the first call for a given service, a port-forward is established.
// Subsequent calls return the cached local port.
func (m *PortForwardManager) ForwardURL(ctx context.Context, rawURL string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL, nil
	}

	hostname := parsed.Hostname()

	// Require an exact Kubernetes service DNS name in either supported form:
	// <service>.<namespace>.svc or <service>.<namespace>.svc.cluster.local.
	labels := strings.Split(hostname, ".")
	isShortServiceName := len(labels) == 3 && labels[2] == "svc"
	isServiceFQDN := len(labels) == 5 && labels[2] == "svc" &&
		labels[3] == "cluster" && labels[4] == "local"
	if (!isShortServiceName && !isServiceFQDN) || labels[0] == "" || labels[1] == "" {
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
// Concurrent requests for the same key are coalesced via singleflight so only
// one forward is created even when the browser fires multiple requests at once.
func (m *PortForwardManager) getOrCreateForward(ctx context.Context, namespace, serviceName string, remotePort int) (uint16, error) {
	key := fmt.Sprintf("%s/%s:%d", namespace, serviceName, remotePort)

	// Fast path: check cache under lock.
	m.mu.Lock()
	if m.closing {
		m.mu.Unlock()
		return 0, errPortForwardManagerClosed
	}
	if fwd, ok := m.forwards[key]; ok {
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

	// Slow path: create forward, deduplicated across concurrent callers.
	val, err, _ := m.sfGroup.Do(key, func() (interface{}, error) {
		// Re-check cache — another caller in the singleflight group may have
		// populated it between our cache miss and winning the Do race.
		m.mu.Lock()
		if m.closing {
			m.mu.Unlock()
			return nil, errPortForwardManagerClosed
		}
		if fwd, ok := m.forwards[key]; ok {
			m.mu.Unlock()
			return fwd.localPort, nil
		}
		m.mu.Unlock()

		m.logger.Info("establishing port-forward", "key", key)

		startupCtx, cancel := context.WithTimeout(ctx, portForwardStartupTimeout)
		defer cancel()

		podName, err := m.resolvePod(startupCtx, namespace, serviceName)
		if err != nil {
			return nil, fmt.Errorf("resolving pod for %s/%s: %w", namespace, serviceName, err)
		}
		podPort, err := m.resolveServiceTargetPort(startupCtx, namespace, serviceName, podName, remotePort)
		if err != nil {
			return nil, fmt.Errorf("resolving target port for %s: %w", key, err)
		}

		fwd, err := m.newForward(startupCtx, namespace, podName, podPort)
		if err != nil {
			return nil, fmt.Errorf("creating port-forward %s: %w", key, err)
		}

		m.mu.Lock()
		if m.closing {
			m.mu.Unlock()
			fwd.stop()
			return nil, errPortForwardManagerClosed
		}
		m.forwards[key] = fwd
		m.mu.Unlock()

		m.logger.Info("port-forward established",
			"key", key, "localPort", fwd.localPort)
		return fwd.localPort, nil
	})
	if err != nil {
		return 0, err
	}
	return val.(uint16), nil
}

// resolveServiceTargetPort maps the port exposed by a Service to the port on
// the selected Pod. Named target ports are resolved against its containers.
func (m *PortForwardManager) resolveServiceTargetPort(ctx context.Context, namespace, serviceName, podName string, remotePort int) (int, error) {
	service, err := m.clientset.CoreV1().Services(namespace).Get(ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		return 0, fmt.Errorf("getting service %s/%s: %w", namespace, serviceName, err)
	}

	var targetPort intstr.IntOrString
	found := false
	for _, servicePort := range service.Spec.Ports {
		if int(servicePort.Port) == remotePort {
			targetPort = servicePort.TargetPort
			found = true
			break
		}
	}
	if !found {
		return 0, fmt.Errorf("service port %d not found", remotePort)
	}

	if targetPort.Type == intstr.Int {
		if targetPort.IntValue() == 0 {
			return remotePort, nil
		}
		return targetPort.IntValue(), nil
	}
	if targetPort.StrVal == "" {
		return remotePort, nil
	}

	pod, err := m.clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return 0, fmt.Errorf("getting pod %s/%s: %w", namespace, podName, err)
	}
	for _, container := range pod.Spec.Containers {
		for _, containerPort := range container.Ports {
			if containerPort.Name == targetPort.StrVal && containerPort.Protocol == corev1.ProtocolTCP {
				return int(containerPort.ContainerPort), nil
			}
		}
	}

	return 0, fmt.Errorf("named target port %q not found on pod %s", targetPort.StrVal, podName)
}

func (m *PortForwardManager) newForward(ctx context.Context, namespace, podName string, podPort int) (*activeForward, error) {
	if m.createForwardFn != nil {
		return m.createForwardFn(ctx, namespace, podName, podPort)
	}
	return m.createForward(ctx, namespace, podName, podPort)
}

// resolvePod finds a ready pod backing the given service.
func (m *PortForwardManager) resolvePod(ctx context.Context, namespace, serviceName string) (string, error) {
	endpointSlices, err := m.clientset.DiscoveryV1().EndpointSlices(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: fmt.Sprintf("%s=%s", discoveryv1.LabelServiceName, serviceName),
	})
	if err != nil {
		return "", fmt.Errorf("getting endpoint slices for %s/%s: %w", namespace, serviceName, err)
	}

	for _, endpointSlice := range endpointSlices.Items {
		for _, endpoint := range endpointSlice.Endpoints {
			if endpoint.Conditions.Ready != nil && !*endpoint.Conditions.Ready {
				continue
			}
			if endpoint.TargetRef != nil && endpoint.TargetRef.Kind == "Pod" && endpoint.TargetRef.Name != "" {
				return endpoint.TargetRef.Name, nil
			}
		}
	}

	return "", fmt.Errorf("no ready pods found for service %s/%s", namespace, serviceName)
}

// createForward establishes a port-forward to a pod and waits for it to be ready.
func (m *PortForwardManager) createForward(ctx context.Context, namespace, podName string, podPort int) (*activeForward, error) {
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

	dialer := &contextDialer{
		ctx:      ctx,
		upgrader: upgrader,
		client:   &http.Client{Transport: transport},
		method:   http.MethodPost,
		url:      reqURL,
	}

	stopChan := make(chan struct{})
	readyChan := make(chan struct{})
	errChan := make(chan error, 1)
	active := &activeForward{stopChan: stopChan, errChan: errChan}

	ports := []string{fmt.Sprintf("0:%d", podPort)}

	fw, err := portforward.New(dialer, ports, stopChan, readyChan, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("creating port forwarder: %w", err)
	}

	go func() {
		errChan <- fw.ForwardPorts()
	}()

	select {
	case <-ctx.Done():
		active.stop()
		return nil, fmt.Errorf("waiting for port-forward startup: %w", ctx.Err())

	case <-readyChan:
		if err := ctx.Err(); err != nil {
			active.stop()
			return nil, fmt.Errorf("waiting for port-forward startup: %w", err)
		}
		forwardedPorts, err := fw.GetPorts()
		if err != nil || len(forwardedPorts) == 0 {
			active.stop()
			return nil, fmt.Errorf("getting forwarded ports: %w", err)
		}

		active.localPort = forwardedPorts[0].Local
		return active, nil

	case err := <-errChan:
		active.stop()
		if err == nil {
			return nil, errors.New("port-forward stopped before becoming ready")
		}
		return nil, fmt.Errorf("port-forward failed to start: %w", err)
	}
}

// Close tears down all active port-forwards. Call on BFF shutdown.
func (m *PortForwardManager) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.closing {
		return
	}
	m.closing = true

	for key, fwd := range m.forwards {
		fwd.stop()
		m.logger.Debug("closed port-forward", "key", key)
	}
	m.forwards = make(map[string]*activeForward)
}
