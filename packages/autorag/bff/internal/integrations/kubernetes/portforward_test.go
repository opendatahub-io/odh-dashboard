package kubernetes

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
	k8sfake "k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
)

func newTestPortForwardManager(clientset kubernetes.Interface) *PortForwardManager {
	lifecycleCtx, lifecycleCancel := context.WithCancel(context.Background())
	return &PortForwardManager{
		forwards:         make(map[string]*activeForward),
		pendingCreations: make(map[*forwardCreation]struct{}),
		lifecycleCtx:     lifecycleCtx,
		lifecycleCancel:  lifecycleCancel,
		clientset:        clientset,
		logger:           slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

//nolint:staticcheck // The production resolver currently reads the Endpoints API.
func testPortForwardEndpoints() *corev1.Endpoints {
	//nolint:staticcheck // The production resolver currently reads the Endpoints API.
	return &corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{Name: "milvus", Namespace: "team-a"},
		//nolint:staticcheck // The production resolver currently reads the Endpoints API.
		Subsets: []corev1.EndpointSubset{{Addresses: []corev1.EndpointAddress{{TargetRef: &corev1.ObjectReference{Kind: "Pod", Name: "milvus-0"}}}}},
	}
}

func TestForwardURL_RewritesExactServiceFQDNAndResolvesNamespace(t *testing.T) {
	//nolint:staticcheck // The production resolver currently reads the Endpoints API.
	clientset := k8sfake.NewSimpleClientset(&corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{Name: "milvus", Namespace: "team-a"},
		//nolint:staticcheck // The production resolver currently reads the Endpoints API.
		Subsets: []corev1.EndpointSubset{{Addresses: []corev1.EndpointAddress{{TargetRef: &corev1.ObjectReference{Kind: "Pod", Name: "milvus-0"}}}}},
	})
	manager := newTestPortForwardManager(clientset)
	manager.createForwardFn = func(_ context.Context, namespace, podName string, port int) (*activeForward, error) {
		if namespace != "team-a" || podName != "milvus-0" || port != 19530 {
			t.Fatalf("forward target = %s/%s:%d, want team-a/milvus-0:19530", namespace, podName, port)
		}
		return &activeForward{localPort: 4567, stopChan: make(chan struct{}), errChan: make(chan error, 1)}, nil
	}

	got, err := manager.ForwardURL(context.Background(), "http://milvus.team-a.svc.cluster.local:19530/v1?x=1")
	if err != nil {
		t.Fatalf("ForwardURL() error = %v", err)
	}
	if got != "http://localhost:4567/v1?x=1" {
		t.Fatalf("ForwardURL() = %q, want rewritten URL", got)
	}
}

func TestForwardURL_DoesNotRewriteUnsupportedHostsOrUserinfo(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset())

	for _, rawURL := range []string{
		"http://milvus.team-a.svc.cluster.local.example.com:19530/v1",
		"http://example.com:19530/v1",
	} {
		got, err := manager.ForwardURL(context.Background(), rawURL)
		if err != nil || got != rawURL {
			t.Fatalf("ForwardURL(%q) = %q, %v; want unchanged and no error", rawURL, got, err)
		}
	}

	got, err := manager.ForwardURL(context.Background(), "http://user:password@milvus.team-a.svc.cluster.local:19530/v1")
	if err == nil || got != "" {
		t.Fatalf("userinfo URL = %q, %v; want rejected", got, err)
	}
	if err.Error() != "service URL userinfo is not supported" {
		t.Fatalf("userinfo error = %q, want sanitized error", err)
	}
}

func TestCreateForward_ContextCancellationStopsStartup(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	clientset, err := kubernetes.NewForConfig(&rest.Config{
		Host:    server.URL,
		APIPath: "/api",
		ContentConfig: rest.ContentConfig{
			GroupVersion:         &schema.GroupVersion{Group: "", Version: "v1"},
			NegotiatedSerializer: scheme.Codecs,
		},
	})
	if err != nil {
		t.Fatalf("NewForConfig() error = %v", err)
	}
	manager := newTestPortForwardManager(clientset)
	manager.restConfig = &rest.Config{Host: server.URL}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err = manager.createForward(ctx, "team-a", "milvus-0", 19530)
	if err == nil || !errors.Is(err, context.Canceled) {
		t.Fatalf("createForward() error = %v, want wrapped cancellation error", err)
	}
}

func TestActiveForwardStopIsIdempotent(t *testing.T) {
	forward := &activeForward{stopChan: make(chan struct{}), errChan: make(chan error, 1)}
	forward.stop()
	forward.stop()
}

func TestPortForwardManager_CachedErrorIsSanitized(t *testing.T) {
	clientset := k8sfake.NewSimpleClientset(testPortForwardEndpoints())
	var logs bytes.Buffer
	manager := newTestPortForwardManager(clientset)
	manager.logger = slog.New(slog.NewTextHandler(&logs, nil))
	manager.forwards["team-a/milvus:19530"] = &activeForward{
		localPort: 4567,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
	}
	manager.forwards["team-a/milvus:19530"].errChan <- errors.New("dial milvus://user:password@milvus.example:19530?token=secret#fragment")
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		return &activeForward{localPort: 4568, stopChan: make(chan struct{}), errChan: make(chan error, 1)}, nil
	}

	if _, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530); err != nil {
		t.Fatalf("getOrCreateForward() error = %v", err)
	}
	if strings.Contains(logs.String(), "password") || strings.Contains(logs.String(), "secret") {
		t.Fatalf("cached error leaked credentials: %s", logs.String())
	}
	if !strings.Contains(logs.String(), "milvus.example:19530") {
		t.Fatalf("cached error lost safe endpoint details: %s", logs.String())
	}
}

func TestSafeURLForLogRemovesSensitiveURLParts(t *testing.T) {
	for _, tt := range []struct {
		name string
		url  string
		want string
	}{
		{
			name: "userinfo path query and fragment",
			url:  "https://user:password@example.com:8443/s3/key%2Fwith%2Ftoken?X-Amz-Signature=secret#fragment",
			want: "https://example.com:8443",
		},
		{
			name: "raw path",
			url:  "http://example.com:8080/private/raw-token",
			want: "http://example.com:8080",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got := safeURLForLog(tt.url); got != tt.want {
				t.Fatalf("safeURLForLog() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestPortForwardManager_CanceledWaiterDoesNotCancelCreation(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	started := make(chan struct{})
	release := make(chan struct{})
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		close(started)
		<-release
		return &activeForward{localPort: 4567, stopChan: make(chan struct{}), errChan: make(chan error, 1)}, nil
	}

	creatorResult := make(chan error, 1)
	go func() {
		_, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
		creatorResult <- err
	}()
	<-started

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	startedAt := time.Now()
	_, err := manager.getOrCreateForward(ctx, "team-a", "milvus", 19530)
	if !errors.Is(err, context.Canceled) || time.Since(startedAt) > time.Second {
		t.Fatalf("canceled waiter error = %v, duration = %s; want prompt context cancellation", err, time.Since(startedAt))
	}

	close(release)
	if err := <-creatorResult; err != nil {
		t.Fatalf("healthy creator error = %v", err)
	}
}

func TestPortForwardManager_AllWaitersCancelStopsCreationWithoutCaching(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	started := make(chan struct{})
	canceled := make(chan struct{})
	forward := &activeForward{localPort: 4567, stopChan: make(chan struct{}), errChan: make(chan error, 1)}
	manager.createForwardFn = func(ctx context.Context, _ string, _ string, _ int) (*activeForward, error) {
		close(started)
		<-ctx.Done()
		close(canceled)
		return forward, nil
	}

	ctx1, cancel1 := context.WithCancel(context.Background())
	ctx2, cancel2 := context.WithCancel(context.Background())
	results := make(chan error, 2)
	for _, ctx := range []context.Context{ctx1, ctx2} {
		go func() {
			_, err := manager.getOrCreateForward(ctx, "team-a", "milvus", 19530)
			results <- err
		}()
	}
	<-started
	waitForCreationWaiters(t, manager, "team-a/milvus:19530", 2)

	cancel1()
	cancel2()
	for range 2 {
		if err := <-results; !errors.Is(err, context.Canceled) {
			t.Fatalf("canceled waiter error = %v, want context cancellation", err)
		}
	}
	<-canceled
	waitForCreationGone(t, manager, "team-a/milvus:19530")

	select {
	case <-forward.stopChan:
	default:
		t.Fatal("forward created after all waiters canceled was not stopped")
	}
	if len(manager.forwards) != 0 {
		t.Fatalf("forward cache has %d entries after all waiters canceled, want 0", len(manager.forwards))
	}
}

func TestPortForwardManager_AllWaitersCancelRetryBeforeOldCreationCleanup(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	started := make(chan struct{})
	oldCanceled := make(chan struct{})
	releaseOld := make(chan struct{})
	oldForward := &activeForward{localPort: 4567, stopChan: make(chan struct{}), errChan: make(chan error, 1)}
	newForward := &activeForward{localPort: 4568, stopChan: make(chan struct{}), errChan: make(chan error, 1)}

	var createMu sync.Mutex
	var attempts int
	manager.createForwardFn = func(ctx context.Context, _ string, _ string, _ int) (*activeForward, error) {
		createMu.Lock()
		attempts++
		attempt := attempts
		createMu.Unlock()
		if attempt == 1 {
			close(started)
			<-ctx.Done()
			close(oldCanceled)
			<-releaseOld
			return oldForward, nil
		}
		return newForward, nil
	}

	ctx1, cancel1 := context.WithCancel(context.Background())
	ctx2, cancel2 := context.WithCancel(context.Background())
	results := make(chan error, 2)
	for _, ctx := range []context.Context{ctx1, ctx2} {
		go func() {
			_, err := manager.getOrCreateForward(ctx, "team-a", "milvus", 19530)
			results <- err
		}()
	}
	<-started
	waitForCreationWaiters(t, manager, "team-a/milvus:19530", 2)

	manager.mu.Lock()
	oldCreation := manager.creations["team-a/milvus:19530"]
	manager.mu.Unlock()
	cancel1()
	cancel2()
	for range 2 {
		if err := <-results; !errors.Is(err, context.Canceled) {
			t.Fatalf("canceled waiter error = %v, want context cancellation", err)
		}
	}
	<-oldCanceled

	newResult := make(chan struct {
		port uint16
		err  error
	}, 1)
	go func() {
		port, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
		newResult <- struct {
			port uint16
			err  error
		}{port: port, err: err}
	}()
	result := <-newResult
	if result.err != nil || result.port != newForward.localPort {
		t.Fatalf("replacement creation = %d, %v; want %d, nil", result.port, result.err, newForward.localPort)
	}
	createMu.Lock()
	if attempts != 2 {
		createMu.Unlock()
		t.Fatalf("forward creation attempts = %d, want 2", attempts)
	}
	createMu.Unlock()

	closeDone := make(chan struct{})
	go func() {
		manager.Close()
		close(closeDone)
	}()
	select {
	case <-closeDone:
		t.Fatal("Close() returned before the detached creation exited")
	case <-time.After(10 * time.Millisecond):
	}

	close(releaseOld)
	select {
	case <-oldCreation.done:
	case <-time.After(time.Second):
		t.Fatal("detached creation did not finish")
	}
	select {
	case <-closeDone:
	case <-time.After(time.Second):
		t.Fatal("Close() did not wait for the detached creation")
	}

	if oldForward == manager.forwards["team-a/milvus:19530"] {
		t.Fatal("old creation affected replacement forward")
	}
	select {
	case <-newForward.stopChan:
	default:
		t.Fatal("Close() did not stop replacement forward")
	}
}

func waitForCreationWaiters(t *testing.T, manager *PortForwardManager, key string, want int) {
	t.Helper()
	deadline := time.After(time.Second)
	for {
		manager.mu.Lock()
		creation := manager.creations[key]
		waiters := 0
		if creation != nil {
			waiters = creation.waiters
		}
		manager.mu.Unlock()
		if waiters == want {
			return
		}
		select {
		case <-deadline:
			t.Fatalf("creation waiters = %d, want %d", waiters, want)
		case <-time.After(time.Millisecond):
		}
	}
}

func waitForCreationGone(t *testing.T, manager *PortForwardManager, key string) {
	t.Helper()
	deadline := time.After(time.Second)
	for {
		manager.mu.Lock()
		_, exists := manager.creations[key]
		manager.mu.Unlock()
		if !exists {
			return
		}
		select {
		case <-deadline:
			t.Fatal("forward creation did not finish")
		case <-time.After(time.Millisecond):
		}
	}
}

func TestPortForwardManager_CanceledInitiatorDoesNotPoisonHealthyWaiter(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	started := make(chan struct{})
	release := make(chan struct{})
	manager.createForwardFn = func(ctx context.Context, _ string, _ string, _ int) (*activeForward, error) {
		close(started)
		<-release
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		return &activeForward{localPort: 4567, stopChan: make(chan struct{}), errChan: make(chan error, 1)}, nil
	}

	initiatorCtx, cancelInitiator := context.WithCancel(context.Background())
	initiatorResult := make(chan error, 1)
	go func() {
		_, err := manager.getOrCreateForward(initiatorCtx, "team-a", "milvus", 19530)
		initiatorResult <- err
	}()
	<-started

	waiterResult := make(chan error, 1)
	go func() {
		_, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
		waiterResult <- err
	}()
	waitForCreationWaiters(t, manager, "team-a/milvus:19530", 2)
	cancelInitiator()

	if err := <-initiatorResult; !errors.Is(err, context.Canceled) {
		t.Fatalf("canceled initiator error = %v, want context cancellation", err)
	}
	close(release)
	if err := <-waiterResult; err != nil {
		t.Fatalf("healthy waiter error = %v", err)
	}
	if _, ok := manager.forwards["team-a/milvus:19530"]; !ok {
		t.Fatal("healthy waiter did not leave a cached forward")
	}
}

func TestPortForwardManager_FailedCreationRetryAfterCompletionStartsFreshCreation(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))

	var attempts int
	started := make(chan struct{})
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		attempts++
		if attempts == 1 {
			close(started)
			return nil, errors.New("initial port-forward failure")
		}
		return &activeForward{localPort: 4567, stopChan: make(chan struct{}), errChan: make(chan error, 1)}, nil
	}

	firstResult := make(chan error, 1)
	go func() {
		_, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
		firstResult <- err
	}()
	<-started

	lookupStarted := make(chan struct{})
	releaseLookup := make(chan struct{})
	var lookupOnce sync.Once
	manager.creationLookupHook = func() {
		lookupOnce.Do(func() {
			close(lookupStarted)
			<-releaseLookup
		})
	}

	retryResult := make(chan error, 1)
	go func() {
		_, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
		retryResult <- err
	}()
	<-lookupStarted

	if err := <-firstResult; err == nil || !strings.Contains(err.Error(), "initial port-forward failure") {
		t.Fatalf("initial creation error = %v, want initial failure", err)
	}
	// The retry was paused before its atomic registry lookup. The first
	// creation has completed and been removed, so releasing the retry must
	// start a new creation rather than join the obsolete one.
	close(releaseLookup)
	if err := <-retryResult; err != nil {
		t.Fatalf("retry error = %v, want successful recreation", err)
	}
	if attempts != 2 {
		t.Fatalf("forward creation attempts = %d, want 2", attempts)
	}

	if got, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530); err != nil || got != 4567 {
		t.Fatalf("later getOrCreateForward() = %d, %v; want cached recreation", got, err)
	}
	manager.Close()
}

func TestPortForwardManager_CachesAndRecreatesForward(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	var creations int
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		creations++
		return &activeForward{localPort: uint16(4566 + creations), stopChan: make(chan struct{}), errChan: make(chan error, 1)}, nil
	}

	for _, want := range []uint16{4567, 4567} {
		if got, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530); err != nil || got != want {
			t.Fatalf("getOrCreateForward() = %d, %v; want %d, nil", got, err, want)
		}
	}
	manager.forwards["team-a/milvus:19530"].errChan <- errors.New("forward stopped")
	if got, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530); err != nil || got != 4568 {
		t.Fatalf("recreated getOrCreateForward() = %d, %v; want 4568, nil", got, err)
	}
	if creations != 2 {
		t.Fatalf("forward creations = %d, want 2", creations)
	}
}

func TestPortForwardManager_RecreatesAfterTerminationPublished(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	oldForward := &activeForward{
		localPort: 4567,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
		done:      make(chan struct{}),
	}
	manager.forwards["team-a/milvus:19530"] = oldForward

	var creations int
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		creations++
		return &activeForward{
			localPort: uint16(4567 + creations),
			stopChan:  make(chan struct{}),
			errChan:   make(chan error, 1),
		}, nil
	}

	oldForward.publishTermination(errors.New("forward stopped"))
	select {
	case <-oldForward.done:
	default:
		t.Fatal("terminated forward did not close done")
	}

	got, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
	if err != nil || got != 4568 {
		t.Fatalf("getOrCreateForward() after termination = %d, %v; want 4568, nil", got, err)
	}
	if creations != 1 {
		t.Fatalf("forward creations = %d, want 1", creations)
	}
}

func TestActiveForward_NilTerminationIsSafe(t *testing.T) {
	forward := &activeForward{
		errChan: make(chan error, 1),
		done:    make(chan struct{}),
	}

	forward.publishTermination(nil)
	if err, stopped := forward.terminalError(); !stopped || err != nil {
		t.Fatalf("terminalError() = %v, %t; want nil, true", err, stopped)
	}
}

func TestPortForwardManager_CloseDuringCreationDoesNotInsertForward(t *testing.T) {
	clientset := k8sfake.NewSimpleClientset(testPortForwardEndpoints())
	manager := newTestPortForwardManager(clientset)
	started := make(chan struct{})
	forward := &activeForward{localPort: 4567, stopChan: make(chan struct{}), errChan: make(chan error, 1)}
	manager.createForwardFn = func(ctx context.Context, _ string, _ string, _ int) (*activeForward, error) {
		close(started)
		<-ctx.Done()
		return forward, nil
	}

	results := make(chan error, 2)
	go func() {
		_, err := manager.ForwardURL(context.Background(), "http://milvus.team-a.svc.cluster.local:19530")
		results <- err
	}()
	<-started
	go func() {
		_, err := manager.ForwardURL(context.Background(), "http://milvus.team-a.svc.cluster.local:19530")
		results <- err
	}()

	manager.Close()
	for range 2 {
		if err := <-results; err == nil || err.Error() != "port-forward manager is closed" {
			t.Fatalf("ForwardURL() error = %v, want closed manager error", err)
		}
	}
	if len(manager.forwards) != 0 {
		t.Fatalf("forward cache has %d entries after Close(), want 0", len(manager.forwards))
	}
	select {
	case <-forward.stopChan:
	default:
		t.Fatal("forward created during shutdown was not stopped")
	}
}

func TestPortForwardManager_CloseWaitsForCachedForwardExit(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset())
	forward := &activeForward{
		localPort: 4567,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
		done:      make(chan struct{}),
	}
	stopped := make(chan struct{})
	release := make(chan struct{})
	go func() {
		<-forward.stopChan
		close(stopped)
		<-release
		close(forward.done)
	}()
	manager.forwards["team-a/milvus:19530"] = forward

	closed := make(chan struct{})
	go func() {
		manager.Close()
		close(closed)
	}()

	<-stopped
	select {
	case <-closed:
		t.Fatal("Close() returned before the cached forward exited")
	default:
	}

	close(release)
	select {
	case <-closed:
	case <-time.After(time.Second):
		t.Fatal("Close() did not return after the cached forward exited")
	}
}

func TestPortForwardManager_RejectsRequestsAfterClose(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset())
	manager.Close()

	got, err := manager.ForwardURL(context.Background(), "http://milvus.team-a.svc.cluster.local:19530")
	if got != "" || err == nil || err.Error() != "port-forward manager is closed" {
		t.Fatalf("ForwardURL() = %q, %v; want closed manager rejection", got, err)
	}
}

func TestPortForwardManager_CloseIsIdempotent(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset())
	manager.Close()
	manager.Close()
}
