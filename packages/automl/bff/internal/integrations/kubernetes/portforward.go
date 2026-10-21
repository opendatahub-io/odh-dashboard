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

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/httpstream"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

const portForwardStartupTimeout = 30 * time.Second

// portForwardRetryCooldown bounds how quickly a new forward for the same key
// may be attempted after a failed startup. A stalled SPDY upgrade keeps its
// negotiation goroutine alive until the peer eventually responds, so repeated
// requests against an unresponsive target would otherwise accumulate one
// abandoned connection and goroutine per attempt.
const portForwardRetryCooldown = 5 * time.Second

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
	mu             sync.Mutex
	forwards       map[string]*activeForward
	recentFailures map[string]time.Time
	sfGroup        singleflight.Group
	restConfig     *rest.Config
	clientset      kubernetes.Interface
	logger         *slog.Logger
	closeOnce      sync.Once
	// closed is shut by Close to abort SPDY upgrades still stalled in their
	// (uninterruptible) response wait. It is nil when the manager was built
	// via a struct literal (tests) — receiving from a nil channel simply
	// never fires.
	closed chan struct{}
}

type activeForward struct {
	localPort uint16
	stopChan  chan struct{}
	errChan   chan error
}

// contextDialer preserves cancellation and startup deadlines while the Kubernetes
// SPDY dialer upgrades the port-forward connection.
type contextDialer struct {
	ctx      context.Context
	shutdown <-chan struct{}
	upgrader spdy.Upgrader
	client   *http.Client
	method   string
	url      *url.URL
}

// negotiationResult carries the outcome of an SPDY upgrade attempt that may
// still be in flight when Dial has already given up on it.
type negotiationResult struct {
	conn     httpstream.Connection
	protocol string
	err      error
}

// Dial upgrades the port-forward connection, racing the negotiation against
// the startup deadline and manager shutdown.
//
// spdy.Negotiate reads the upgrade response via a plain (non-context-aware)
// http.ReadResponse, so a server that accepts the connection but never sends
// response headers would block the negotiation — and with it the whole
// port-forward worker — indefinitely. When the deadline or shutdown fires
// first, Dial returns promptly and hands the still-running negotiation to a
// watcher that closes the tunnel if the peer ever completes it.
//
// The stalled connection itself cannot be closed from the outside: client-go's
// SPDY round tripper keeps the upgrade connection private until the response
// has been read, and the only construction hook that dials through custom code
// (RoundTripperConfig's UpgradeTransport) drops the proxy support that
// RoundTripperFor provides. The blocked negotiation goroutine and its watcher
// therefore linger until the peer responds; the retry cooldown bounds how
// many abandoned attempts can accumulate.
func (d *contextDialer) Dial(protocols ...string) (httpstream.Connection, string, error) {
	req, err := http.NewRequestWithContext(d.ctx, d.method, d.url.String(), nil)
	if err != nil {
		return nil, "", fmt.Errorf("creating port-forward request: %w", err)
	}

	result := make(chan negotiationResult, 1)
	go func() {
		conn, protocol, err := spdy.Negotiate(d.upgrader, d.client, req, protocols...)
		result <- negotiationResult{conn: conn, protocol: protocol, err: err}
	}()

	select {
	case r := <-result:
		return r.conn, r.protocol, r.err
	case <-d.ctx.Done():
		d.abandon(result)
		// ctx.Err() is reported with %v rather than wrapped: the caller
		// already surfaces the cancellation cause, and keeping this error
		// free of it preserves the abandonment notice as a distinct
		// startup diagnostic.
		return nil, "", fmt.Errorf("abandoning stalled port-forward upgrade negotiation (%v); the API server did not complete the SPDY upgrade", d.ctx.Err())
	case <-d.shutdown:
		d.abandon(result)
		return nil, "", errors.New("abandoning stalled port-forward upgrade negotiation: port-forward manager is closed")
	}
}

// abandon watches an already-abandoned negotiation so a tunnel the peer
// completes late is closed instead of lingering. The buffered result channel
// guarantees the negotiation goroutine never blocks sending to it.
func (d *contextDialer) abandon(result <-chan negotiationResult) {
	go func() {
		if r := <-result; r.conn != nil {
			r.conn.Close()
		}
	}()
}

// NewPortForwardManager creates a manager using the provided rest.Config and clientset.
// These should be the BFF's own credentials (not per-request user tokens), since
// port-forwards are long-lived and shared across requests.
func NewPortForwardManager(restConfig *rest.Config, clientset kubernetes.Interface, logger *slog.Logger) *PortForwardManager {
	return &PortForwardManager{
		forwards:       make(map[string]*activeForward),
		recentFailures: make(map[string]time.Time),
		closed:         make(chan struct{}),
		restConfig:     restConfig,
		clientset:      clientset,
		logger:         logger,
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

	// Require exact Kubernetes service FQDN: <service>.<namespace>.svc.cluster.local
	labels := strings.Split(hostname, ".")
	if len(labels) != 5 || labels[0] == "" || labels[1] == "" ||
		labels[2] != "svc" || labels[3] != "cluster" || labels[4] != "local" {
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
		if fwd, ok := m.forwards[key]; ok {
			m.mu.Unlock()
			return fwd.localPort, nil
		}
		// Pace retries after a failed startup: a stalled SPDY negotiation
		// outlives its deadline, and back-to-back attempts would accumulate
		// abandoned connections and goroutines.
		if lastFailed, failed := m.recentFailures[key]; failed && time.Since(lastFailed) < portForwardRetryCooldown {
			m.mu.Unlock()
			return nil, fmt.Errorf("port-forward %s failed to start recently; retrying after a %s cooldown", key, portForwardRetryCooldown)
		}
		m.mu.Unlock()

		m.logger.Info("establishing port-forward", "key", key)

		// Bound the whole startup path: a forward that never becomes ready must
		// not hang this request — and every request coalesced behind it — forever.
		startupCtx, cancel := context.WithTimeout(ctx, portForwardStartupTimeout)
		defer cancel()

		podName, err := m.resolvePod(startupCtx, namespace, serviceName)
		if err != nil {
			m.noteForwardFailure(key)
			return nil, fmt.Errorf("resolving pod for %s/%s: %w", namespace, serviceName, err)
		}

		fwd, err := m.createForward(startupCtx, namespace, podName, remotePort)
		if err != nil {
			m.noteForwardFailure(key)
			return nil, fmt.Errorf("creating port-forward %s: %w", key, err)
		}

		m.mu.Lock()
		m.forwards[key] = fwd
		delete(m.recentFailures, key)
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

// noteForwardFailure arms the retry cooldown for a key after a failed startup
// attempt, pacing retries against a target whose SPDY upgrade stalls. Safe on
// a nil map (lazy initialization) for managers built via struct literal.
func (m *PortForwardManager) noteForwardFailure(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.recentFailures == nil {
		m.recentFailures = make(map[string]time.Time)
	}
	m.recentFailures[key] = time.Now()
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
// The context bounds startup only — once ready, the forward runs until stopped.
func (m *PortForwardManager) createForward(ctx context.Context, namespace, podName string, remotePort int) (*activeForward, error) {
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

	client := &http.Client{Transport: transport, Timeout: portForwardStartupTimeout}
	if deadline, ok := ctx.Deadline(); ok {
		client.Timeout = time.Until(deadline)
	}
	dialer := &contextDialer{
		ctx:      ctx,
		shutdown: m.closed,
		upgrader: upgrader,
		client:   client,
		method:   http.MethodPost,
		url:      reqURL,
	}

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
	case <-ctx.Done():
		close(stopChan)
		return nil, fmt.Errorf("waiting for port-forward startup: %w", ctx.Err())

	case <-readyChan:
		if err := ctx.Err(); err != nil {
			close(stopChan)
			return nil, fmt.Errorf("waiting for port-forward startup: %w", err)
		}
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
	m.closeOnce.Do(func() {
		m.mu.Lock()
		defer m.mu.Unlock()

		// Abort SPDY upgrades still stalled in their response wait so the
		// pending workers unwind instead of lingering until the peer responds.
		if m.closed != nil {
			close(m.closed)
		}

		for key, fwd := range m.forwards {
			close(fwd.stopChan)
			m.logger.Debug("closed port-forward", "key", key)
		}
		m.forwards = make(map[string]*activeForward)
	})
}
