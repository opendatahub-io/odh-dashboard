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

	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/httpstream"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

const (
	portForwardStartupTimeout = 30 * time.Second
	maxCachedForwards         = 32
	forwardIdleTTL            = 5 * time.Minute
)

type requestNamespaceContextKey struct{}

// RequestNamespaceKey is populated by namespace-aware HTTP middleware.
var RequestNamespaceKey requestNamespaceContextKey

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
	mu                 sync.Mutex
	forwards           map[string]*activeForward
	creations          map[string]*forwardCreation
	pendingCreations   map[*forwardCreation]struct{}
	closeOnce          sync.Once
	closed             bool
	lifecycleCtx       context.Context
	lifecycleCancel    context.CancelFunc
	restConfig         *rest.Config
	clientset          kubernetes.Interface
	logger             *slog.Logger
	createForwardFn    func(context.Context, string, string, int) (*activeForward, error)
	creationLookupHook func()
}

type activeForward struct {
	localPort   uint16
	stopChan    chan struct{}
	errChan     chan error
	done        chan struct{}
	stopOnce    sync.Once
	terminalMu  sync.RWMutex
	terminalErr error
	terminated  bool
	lastUsed    time.Time
}

type forwardCreation struct {
	ctx       context.Context
	cancel    context.CancelFunc
	done      chan struct{}
	waiters   int
	completed bool
	result    uint16
	err       error
}

func (f *activeForward) stop() {
	f.stopOnce.Do(func() {
		close(f.stopChan)
	})
}

func (f *activeForward) wait() {
	if f.done != nil {
		<-f.done
	}
}

// publishTermination records the terminal result before notifying waiters that
// the forward has exited. The non-blocking send preserves compatibility with
// callers that still observe errChan directly without allowing termination to
// hang if the channel has already been consumed.
func (f *activeForward) publishTermination(err error) {
	f.terminalMu.Lock()
	f.terminalErr = err
	f.terminated = true
	f.terminalMu.Unlock()

	select {
	case f.errChan <- err:
	default:
	}
	if f.done != nil {
		close(f.done)
	}
}

func (f *activeForward) terminalError() (error, bool) {
	f.terminalMu.RLock()
	if f.terminated {
		err := f.terminalErr
		f.terminalMu.RUnlock()
		return err, true
	}
	f.terminalMu.RUnlock()

	// Some tests and older callers publish through errChan directly. Keep that
	// observation path non-blocking while production forwards use terminal state.
	select {
	case err := <-f.errChan:
		return err, true
	default:
	}
	select {
	case <-f.done:
		return nil, true
	default:
		return nil, false
	}
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
	lifecycleCtx, lifecycleCancel := context.WithCancel(context.Background())
	return &PortForwardManager{
		forwards:         make(map[string]*activeForward),
		creations:        make(map[string]*forwardCreation),
		pendingCreations: make(map[*forwardCreation]struct{}),
		lifecycleCtx:     lifecycleCtx,
		lifecycleCancel:  lifecycleCancel,
		restConfig:       restConfig,
		clientset:        clientset,
		logger:           logger,
	}
}

// ForwardURL rewrites an in-cluster service URL to a localhost port-forward.
// If the URL is not a *.svc.cluster.local address, it is returned unchanged.
// On the first call for a given service, a port-forward is established.
// Subsequent calls return the cached local port.
func (m *PortForwardManager) ForwardURL(ctx context.Context, requestNamespace, rawURL string) (string, error) {
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
	for _, label := range labels[:2] {
		if len(label) > 63 || strings.HasPrefix(label, "-") || strings.HasSuffix(label, "-") {
			return rawURL, nil
		}
		for _, r := range label {
			if (r < 'a' || r > 'z') && (r < '0' || r > '9') && r != '-' {
				return rawURL, nil
			}
		}
	}
	if parsed.User != nil {
		return "", errors.New("service URL userinfo is not supported")
	}
	serviceName := labels[0]
	namespace := labels[1]
	if requestNamespace == "" || namespace != requestNamespace {
		return "", fmt.Errorf("service URL namespace does not match request namespace")
	}

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
		return "", fmt.Errorf("invalid port %q in service URL: %w", portStr, err)
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
// A creation entry owns both the shared creation and its waiters. The registry
// lookup and waiter increment happen under the same lock that publishes and
// completes the entry, so a caller cannot observe one creation and join another.
func (m *PortForwardManager) getOrCreateForward(ctx context.Context, namespace, serviceName string, remotePort int) (uint16, error) {
	key := fmt.Sprintf("%s/%s:%d", namespace, serviceName, remotePort)
	if err := ctx.Err(); err != nil {
		return 0, err
	}
	if m.creationLookupHook != nil {
		m.creationLookupHook()
	}
	m.evictIdleForwards(time.Now())

	// Fast path: check cache under lock.
	m.mu.Lock()
	if m.closed {
		m.mu.Unlock()
		return 0, errors.New("port-forward manager is closed")
	}
	if fwd, ok := m.forwards[key]; ok {
		if err, stopped := fwd.terminalError(); stopped {
			if err != nil {
				m.logger.Warn("port-forward died, re-establishing",
					"key", key, "error", helper.SafeErrorForLog(err))
			}
			delete(m.forwards, key)
		} else {
			fwd.lastUsed = time.Now()
			m.mu.Unlock()
			return fwd.localPort, nil
		}
	}
	if m.creations == nil {
		m.creations = make(map[string]*forwardCreation)
	}
	lifecycleCtx := m.lifecycleCtx
	creation, ok := m.creations[key]
	if ok && creation.ctx.Err() != nil {
		// Do not let a new waiter join a creation that has already been
		// canceled, even if its goroutine has not finished cleaning up yet.
		delete(m.creations, key)
		ok = false
	}
	startCreation := false
	if !ok {
		if len(m.forwards)+len(m.creations) >= maxCachedForwards {
			m.mu.Unlock()
			return 0, errors.New("port-forward cache capacity reached")
		}
		creationCtx := lifecycleCtx
		if creationCtx == nil {
			creationCtx = context.Background()
		}
		creationCtx, creationCancel := context.WithCancel(creationCtx)
		creation = &forwardCreation{
			ctx:    creationCtx,
			cancel: creationCancel,
			done:   make(chan struct{}),
		}
		m.creations[key] = creation
		if m.pendingCreations == nil {
			m.pendingCreations = make(map[*forwardCreation]struct{})
		}
		m.pendingCreations[creation] = struct{}{}
		startCreation = true
	}
	creation.waiters++
	done := creation.done
	m.mu.Unlock()

	if startCreation {
		go m.runCreation(key, namespace, serviceName, remotePort, creation)
	}

	select {
	case <-ctx.Done():
		m.releaseCreationWaiter(key, creation)
		return 0, ctx.Err()
	case <-done:
		m.mu.Lock()
		result, err := creation.result, creation.err
		m.mu.Unlock()
		return result, err
	}
}

func (m *PortForwardManager) runCreation(key, namespace, serviceName string, remotePort int, creation *forwardCreation) {
	var fwd *activeForward
	var stoppedForward *activeForward
	var err error

	m.mu.Lock()
	if m.closed || creation.waiters == 0 || creation.ctx.Err() != nil {
		if m.closed {
			err = errors.New("port-forward manager is closed")
		} else {
			err = creation.ctx.Err()
		}
	} else if cached, ok := m.forwards[key]; ok {
		fwd = cached
	}
	m.mu.Unlock()

	if err == nil && fwd == nil {
		m.logger.Info("establishing port-forward", "key", key)

		startupCtx, cancel := context.WithTimeout(creation.ctx, portForwardStartupTimeout)
		defer cancel()

		podName, resolveErr := m.resolvePod(startupCtx, namespace, serviceName)
		if resolveErr != nil {
			err = fmt.Errorf("resolving pod for %s/%s: %w", namespace, serviceName, resolveErr)
		} else if m.createForwardFn != nil {
			fwd, err = m.createForwardFn(startupCtx, namespace, podName, remotePort)
			if err != nil {
				err = fmt.Errorf("creating port-forward %s: %w", key, err)
			}
		} else {
			fwd, err = m.createForward(startupCtx, namespace, podName, remotePort)
		}
	}

	m.mu.Lock()
	closed := m.closed
	creationCanceled := creation.ctx.Err()
	if closed {
		if fwd != nil {
			fwd.stop()
			stoppedForward = fwd
			fwd = nil
		}
		err = errors.New("port-forward manager is closed")
	} else if err == nil && fwd != nil && (creation.waiters == 0 || creationCanceled != nil) {
		fwd.stop()
		stoppedForward = fwd
		err = creationCanceled
		fwd = nil
	}
	if err == nil && fwd != nil && m.forwards[key] == nil {
		fwd.lastUsed = time.Now()
		m.forwards[key] = fwd
	}
	if err == nil && fwd != nil {
		m.logger.Info("port-forward established", "key", key, "localPort", fwd.localPort)
	}
	if current, ok := m.creations[key]; ok && current == creation {
		creation.result = 0
		if fwd != nil {
			creation.result = fwd.localPort
		}
		creation.err = err
	}
	m.mu.Unlock()

	if stoppedForward != nil {
		stoppedForward.wait()
	}

	m.mu.Lock()
	if !creation.completed {
		creation.completed = true
		if current, ok := m.creations[key]; ok && current == creation {
			delete(m.creations, key)
		}
		delete(m.pendingCreations, creation)
		close(creation.done)
	}
	m.mu.Unlock()
}

func (m *PortForwardManager) evictIdleForwards(now time.Time) {
	var evicted []*activeForward
	m.mu.Lock()
	for key, fwd := range m.forwards {
		if !fwd.lastUsed.IsZero() && now.Sub(fwd.lastUsed) >= forwardIdleTTL {
			fwd.stop()
			delete(m.forwards, key)
			evicted = append(evicted, fwd)
		}
	}
	m.mu.Unlock()
	for _, fwd := range evicted {
		fwd.wait()
	}
}

func (m *PortForwardManager) releaseCreationWaiter(key string, creation *forwardCreation) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if current, ok := m.creations[key]; !ok || current != creation || creation.completed {
		return
	}
	creation.waiters--
	if creation.waiters == 0 {
		creation.cancel()
	}
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
		upgrader: upgrader,
		client:   client,
		method:   http.MethodPost,
		url:      reqURL,
	}

	stopChan := make(chan struct{})
	readyChan := make(chan struct{})
	errChan := make(chan error, 1)
	active := &activeForward{stopChan: stopChan, errChan: errChan, done: make(chan struct{})}

	ports := []string{fmt.Sprintf("0:%d", remotePort)}

	fw, err := portforward.New(dialer, ports, stopChan, readyChan, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("creating port forwarder: %w", err)
	}

	go func() {
		active.publishTermination(fw.ForwardPorts())
	}()

	select {
	case <-ctx.Done():
		active.stop()
		active.wait()
		return nil, fmt.Errorf("waiting for port-forward startup: %w", ctx.Err())

	case <-readyChan:
		if err := ctx.Err(); err != nil {
			active.stop()
			active.wait()
			return nil, fmt.Errorf("waiting for port-forward startup: %w", err)
		}
		forwardedPorts, err := fw.GetPorts()
		if err != nil || len(forwardedPorts) == 0 {
			active.stop()
			active.wait()
			if err == nil {
				err = errors.New("no forwarded ports")
			}
			return nil, fmt.Errorf("getting forwarded ports: %w", err)
		}

		active.localPort = forwardedPorts[0].Local
		return active, nil

	case err := <-errChan:
		active.stop()
		active.wait()
		if err == nil {
			return nil, errors.New("port-forward stopped before becoming ready")
		}
		return nil, fmt.Errorf("port-forward failed to start: %w", err)
	}
}

// Close tears down all active port-forwards. Call on BFF shutdown.
func (m *PortForwardManager) Close() {
	m.closeOnce.Do(func() {
		var forwards []*activeForward
		var creations []*forwardCreation
		seenCreations := make(map[*forwardCreation]struct{})
		m.mu.Lock()
		m.closed = true
		if m.lifecycleCancel != nil {
			m.lifecycleCancel()
		}
		for key, fwd := range m.forwards {
			fwd.stop()
			forwards = append(forwards, fwd)
			m.logger.Debug("closed port-forward", "key", key)
		}
		m.forwards = make(map[string]*activeForward)
		for creation := range m.pendingCreations {
			creation.cancel()
			creations = append(creations, creation)
			seenCreations[creation] = struct{}{}
		}
		for _, creation := range m.creations {
			if _, seen := seenCreations[creation]; seen {
				continue
			}
			creation.cancel()
			creations = append(creations, creation)
		}
		m.mu.Unlock()

		// Wait outside the mutex: creations need the mutex to observe shutdown
		// and discard a forward that became ready concurrently with Close.
		for _, fwd := range forwards {
			fwd.wait()
		}
		for _, creation := range creations {
			<-creation.done
		}
	})
}
