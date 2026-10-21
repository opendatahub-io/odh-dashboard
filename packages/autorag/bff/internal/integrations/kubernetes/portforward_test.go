package kubernetes

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
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
	"k8s.io/client-go/transport/spdy"
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

	got, err := manager.ForwardURL(context.Background(), "team-a", "http://milvus.team-a.svc.cluster.local:19530/v1?x=1")
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
		got, err := manager.ForwardURL(context.Background(), "team-a", rawURL)
		if err != nil || got != rawURL {
			t.Fatalf("ForwardURL(%q) = %q, %v; want unchanged and no error", rawURL, got, err)
		}
	}

	got, err := manager.ForwardURL(context.Background(), "team-a", "http://user:password@milvus.team-a.svc.cluster.local:19530/v1")
	if err == nil || got != "" {
		t.Fatalf("userinfo URL = %q, %v; want rejected", got, err)
	}
	if err.Error() != "service URL userinfo is not supported" {
		t.Fatalf("userinfo error = %q, want sanitized error", err)
	}
}

func TestCreateForward_ContextCancellationStopsStartup(t *testing.T) {
	requestObserved := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(requestObserved)
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
	server.Close()
	select {
	case <-requestObserved:
		t.Fatal("pre-canceled createForward() started a port-forward request")
	default:
	}
}

func TestCreateForward_ActiveStartupCancellationRetainsStartupError(t *testing.T) {
	requestObserved := make(chan struct{})
	allowResponse := make(chan struct{})
	handlerFinished := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(requestObserved)
		<-allowResponse
		w.WriteHeader(http.StatusInternalServerError)
		close(handlerFinished)
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
	defer cancel()
	result := make(chan error, 1)
	go func() {
		_, createErr := manager.createForward(ctx, "team-a", "milvus-0", 19530)
		result <- createErr
	}()

	select {
	case <-requestObserved:
	case <-time.After(time.Second):
		t.Fatal("port-forward request was not observed")
	}
	cancel()
	close(allowResponse)
	select {
	case <-handlerFinished:
	case <-time.After(time.Second):
		t.Fatal("port-forward startup handler did not finish")
	}

	select {
	case err = <-result:
	case <-time.After(time.Second):
		t.Fatal("createForward() did not finish after startup cancellation")
	}
	if err == nil || !errors.Is(err, context.Canceled) {
		t.Fatalf("createForward() error = %v, want cancellation error", err)
	}
	var joined interface{ Unwrap() []error }
	if !errors.As(err, &joined) {
		t.Fatalf("createForward() error = %v, want joined cancellation and startup errors", err)
	}
	var startupDiagnostic error
	for _, cause := range joined.Unwrap() {
		if cause != nil && !errors.Is(cause, context.Canceled) && cause.Error() != "" {
			startupDiagnostic = cause
			break
		}
	}
	if startupDiagnostic == nil {
		t.Fatalf("createForward() error = %v, want non-cancellation startup diagnostic", err)
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
	// The failed creation armed the retry cooldown. Elapse it so the retry
	// below exercises the registry-lookup freshness this test is about,
	// rather than cooldown pacing.
	manager.mu.Lock()
	delete(manager.recentFailures, "team-a/milvus:19530")
	manager.mu.Unlock()
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
		_, err := manager.ForwardURL(context.Background(), "team-a", "http://milvus.team-a.svc.cluster.local:19530")
		results <- err
	}()
	<-started
	go func() {
		_, err := manager.ForwardURL(context.Background(), "team-a", "http://milvus.team-a.svc.cluster.local:19530")
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

	got, err := manager.ForwardURL(context.Background(), "team-a", "http://milvus.team-a.svc.cluster.local:19530")
	if got != "" || err == nil || err.Error() != "port-forward manager is closed" {
		t.Fatalf("ForwardURL() = %q, %v; want closed manager rejection", got, err)
	}
}

func TestPortForwardManager_CloseIsIdempotent(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset())
	manager.Close()
	manager.Close()
}

func TestPortForwardManager_AllowsCrossNamespaceServiceForwarding(t *testing.T) {
	// The request namespace owns the database Secret, while the service can be
	// shared from another namespace during local development.
	//nolint:staticcheck // The production resolver currently reads the Endpoints API.
	clientset := k8sfake.NewSimpleClientset(&corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{Name: "milvus", Namespace: "milvus"},
		//nolint:staticcheck // The production resolver currently reads the Endpoints API.
		Subsets: []corev1.EndpointSubset{{Addresses: []corev1.EndpointAddress{{TargetRef: &corev1.ObjectReference{Kind: "Pod", Name: "milvus-0"}}}}},
	})
	manager := newTestPortForwardManager(clientset)
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		return &activeForward{localPort: 4567, stopChan: make(chan struct{}), errChan: make(chan error, 1)}, nil
	}

	got, err := manager.ForwardURL(context.Background(), "dduong-36-ga", "http://milvus.milvus.svc.cluster.local:19530")
	if err != nil || got != "http://localhost:4567" {
		t.Fatalf("ForwardURL() = %q, %v; want cross-namespace forwarding", got, err)
	}
}

func TestPortForwardManager_BoundsCachedForwards(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset())
	for i := 0; i < maxCachedForwards; i++ {
		manager.forwards[fmt.Sprintf("team-a/service-%d:19530", i)] = &activeForward{
			localPort: uint16(4000 + i),
			stopChan:  make(chan struct{}),
			errChan:   make(chan error, 1),
			lastUsed:  time.Now(),
		}
	}
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		t.Fatal("cache capacity must reject creation")
		return nil, nil
	}

	_, err := manager.getOrCreateForward(context.Background(), "team-a", "new-service", 19530)
	if err == nil || !strings.Contains(err.Error(), "cache capacity") {
		t.Fatalf("getOrCreateForward() error = %v, want capacity error", err)
	}
}

func TestPortForwardManager_EvictsIdleForwardAndStopsTunnel(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset())
	forward := &activeForward{
		localPort: 4567,
		stopChan:  make(chan struct{}),
		errChan:   make(chan error, 1),
		done:      make(chan struct{}),
		lastUsed:  time.Now().Add(-forwardIdleTTL - time.Second),
	}
	close(forward.done)
	manager.forwards["team-a/milvus:19530"] = forward
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		return &activeForward{localPort: 4568, stopChan: make(chan struct{}), errChan: make(chan error, 1)}, nil
	}

	manager.clientset = k8sfake.NewSimpleClientset(testPortForwardEndpoints())
	port, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
	if err != nil || port != 4568 {
		t.Fatalf("getOrCreateForward() = %d, %v; want replacement", port, err)
	}
	select {
	case <-forward.stopChan:
	default:
		t.Fatal("idle forward was not stopped")
	}
	if got := manager.forwards["team-a/milvus:19530"]; got == forward {
		t.Fatal("idle forward remained cached")
	}
}

// === Stalled SPDY upgrade regression tests ===
//
// An API server that accepts the SPDY upgrade request but never sends response
// headers blocks spdy.Negotiate in a plain (non-context-aware)
// http.ReadResponse. Before the abandonment fix, that stall hung the
// port-forward worker, the createForward wait() on its exit, and Close()
// itself, and each retry accumulated another abandoned connection and
// goroutine.

// newStalledForwardServer returns a test server that mimics an API server
// whose SPDY upgrade never completes: Endpoints lookups succeed, but
// portforward POSTs are accepted (connection hijacked) and never answered.
func newStalledForwardServer(t *testing.T) (kubernetes.Interface, *rest.Config, chan struct{}) {
	t.Helper()
	requestSeen := make(chan struct{}, 1)
	hold := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/portforward") {
			select {
			case requestSeen <- struct{}{}:
			default:
			}
			conn, _, err := w.(http.Hijacker).Hijack()
			if err != nil {
				return
			}
			defer conn.Close()
			<-hold
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"kind":"Endpoints","apiVersion":"v1","metadata":{"name":"milvus","namespace":"team-a"},"subsets":[{"addresses":[{"targetRef":{"kind":"Pod","name":"milvus-0"}}]}]}`)
	}))
	t.Cleanup(func() {
		// Release the hijacked connections so the abandoned negotiations and
		// the server itself can drain before the test ends.
		close(hold)
		server.Close()
	})
	cfg := &rest.Config{Host: server.URL}
	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		t.Fatalf("NewForConfig() error = %v", err)
	}
	return clientset, cfg, requestSeen
}

// TestContextDialer_AbandonsStalledUpgrade verifies the dialer gives up on a
// stalled upgrade when the startup deadline fires instead of blocking on the
// peer's missing response headers.
func TestContextDialer_AbandonsStalledUpgrade(t *testing.T) {
	_, cfg, requestSeen := newStalledForwardServer(t)

	transport, upgrader, err := spdy.RoundTripperFor(cfg)
	if err != nil {
		t.Fatalf("RoundTripperFor() error = %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	target, err := url.Parse(cfg.Host + "/api/v1/namespaces/team-a/pods/milvus-0/portforward")
	if err != nil {
		t.Fatal(err)
	}
	d := &contextDialer{
		ctx:      ctx,
		upgrader: upgrader,
		client:   &http.Client{Transport: transport},
		method:   http.MethodPost,
		url:      target,
	}

	done := make(chan error, 1)
	go func() {
		_, _, dialErr := d.Dial("SPDY/3.1")
		done <- dialErr
	}()

	select {
	case <-requestSeen:
	case <-time.After(10 * time.Second):
		t.Fatal("stalled upgrade request was not observed")
	}

	select {
	case dialErr := <-done:
		if dialErr == nil {
			t.Fatal("expected dial against a stalled upgrade to fail")
		}
		if !strings.Contains(dialErr.Error(), "abandon") {
			t.Fatalf("dial error = %v, want abandoned negotiation error", dialErr)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("dial against stalled upgrade did not return — the abandoned negotiation leaks the worker goroutine")
	}
}

// TestCreateForward_StalledUpgradeFailsFast verifies the full createForward
// path — including the ctx.Done branch's wait() on the worker's exit —
// returns at the startup deadline instead of hanging on the stalled upgrade.
func TestCreateForward_StalledUpgradeFailsFast(t *testing.T) {
	clientset, cfg, _ := newStalledForwardServer(t)
	manager := newTestPortForwardManager(clientset)
	manager.restConfig = cfg

	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()

	done := make(chan error, 1)
	go func() {
		_, createErr := manager.createForward(ctx, "team-a", "milvus-0", 19530)
		done <- createErr
	}()

	select {
	case err := <-done:
		if err == nil {
			t.Fatal("expected createForward against a stalled upgrade to fail")
		}
		if !errors.Is(err, context.DeadlineExceeded) {
			t.Fatalf("createForward() error = %v, want deadline exceeded", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("createForward() did not return after the startup deadline — the stalled upgrade hangs the worker and its waiters")
	}
}

// TestPortForwardManager_CloseAbortsStalledCreation verifies Close() unwinds
// a creation that is stalled mid-upgrade. Previously the stalled dial was
// uninterruptible, so Close() blocked forever waiting for the creation.
func TestPortForwardManager_CloseAbortsStalledCreation(t *testing.T) {
	clientset, cfg, requestSeen := newStalledForwardServer(t)
	manager := newTestPortForwardManager(clientset)
	manager.restConfig = cfg

	result := make(chan error, 1)
	go func() {
		_, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
		result <- err
	}()

	select {
	case <-requestSeen:
	case <-time.After(10 * time.Second):
		t.Fatal("stalled upgrade request was not observed")
	}

	closed := make(chan struct{})
	go func() {
		manager.Close()
		close(closed)
	}()

	// The 30s startup deadline is far away — only the lifecycle cancellation
	// wired through Close() can return control this quickly.
	select {
	case <-closed:
	case <-time.After(10 * time.Second):
		t.Fatal("Close() did not return — a stalled creation cannot be aborted on shutdown")
	}
	select {
	case err := <-result:
		if err == nil {
			t.Fatal("stalled creation unexpectedly succeeded")
		}
	case <-time.After(10 * time.Second):
		t.Fatal("stalled creation did not finish after Close()")
	}
}

// TestPortForwardManager_FailedCreationArmsCooldown verifies a failed startup
// arms the retry cooldown for the key.
func TestPortForwardManager_FailedCreationArmsCooldown(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		return nil, errors.New("upgrade stalled")
	}

	_, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
	if err == nil || !strings.Contains(err.Error(), "upgrade stalled") {
		t.Fatalf("initial creation error = %v, want startup failure", err)
	}

	manager.mu.Lock()
	failedAt, armed := manager.recentFailures["team-a/milvus:19530"]
	manager.mu.Unlock()
	if !armed {
		t.Fatal("failed creation did not arm the retry cooldown")
	}
	if elapsed := time.Since(failedAt); elapsed < 0 || elapsed > 5*time.Second {
		t.Fatalf("cooldown armed %s ago, want ~now", elapsed)
	}
}

// TestPortForwardManager_CooldownGatesNewCreation verifies a recently failed
// key is rejected before any creation attempt.
func TestPortForwardManager_CooldownGatesNewCreation(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	manager.recentFailures = map[string]time.Time{"team-a/milvus:19530": time.Now()}
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		t.Fatal("cooldown must reject before starting a new creation")
		return nil, nil
	}

	_, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
	if err == nil || !strings.Contains(err.Error(), "cooldown") {
		t.Fatalf("getOrCreateForward() error = %v, want cooldown rejection", err)
	}
}

// TestPortForwardManager_CooldownExpiresAndAllowsRetry verifies an expired
// cooldown lets a new creation proceed and a successful creation clears it.
func TestPortForwardManager_CooldownExpiresAndAllowsRetry(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	manager.recentFailures = map[string]time.Time{"team-a/milvus:19530": time.Now().Add(-portForwardRetryCooldown - time.Second)}
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		return &activeForward{localPort: 4567, stopChan: make(chan struct{}), errChan: make(chan error, 1)}, nil
	}

	port, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
	if err != nil || port != 4567 {
		t.Fatalf("getOrCreateForward() = %d, %v; want creation after cooldown expiry", port, err)
	}

	manager.mu.Lock()
	_, armed := manager.recentFailures["team-a/milvus:19530"]
	manager.mu.Unlock()
	if armed {
		t.Fatal("successful creation did not clear the retry cooldown")
	}
}

// TestPortForwardManager_CanceledCreationDoesNotThrottleHealthyRetry verifies
// that a creation canceled because its waiters left — not because the target
// failed — does not arm the retry cooldown: the next healthy caller must be
// able to establish the forward immediately. The factory mirrors the real
// cancellation path by reporting the creation context error as a startup
// failure.
func TestPortForwardManager_CanceledCreationDoesNotThrottleHealthyRetry(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	started := make(chan struct{})
	manager.createForwardFn = func(ctx context.Context, _ string, _ string, _ int) (*activeForward, error) {
		close(started)
		<-ctx.Done()
		// Match the real createForward: a canceled startup reports the
		// cancellation as a startup error rather than a healthy forward.
		return nil, ctx.Err()
	}

	ctx, cancel := context.WithCancel(context.Background())
	result := make(chan error, 1)
	go func() {
		_, err := manager.getOrCreateForward(ctx, "team-a", "milvus", 19530)
		result <- err
	}()
	<-started
	waitForCreationWaiters(t, manager, "team-a/milvus:19530", 1)

	cancel()
	if err := <-result; !errors.Is(err, context.Canceled) {
		t.Fatalf("canceled caller error = %v, want context cancellation", err)
	}
	waitForCreationGone(t, manager, "team-a/milvus:19530")

	// The cancellation is not a target failure: the next healthy caller must
	// not inherit a cooldown from the abandoned creation.
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		return &activeForward{localPort: 4567, stopChan: make(chan struct{}), errChan: make(chan error, 1)}, nil
	}
	port, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
	if err != nil || port != 4567 {
		t.Fatalf("healthy retry after canceled creation = %d, %v; want 4567, nil", port, err)
	}
}

// TestPortForwardManager_OutstandingAbandonmentCapGatesNewCreations verifies
// the outstanding-negotiation cap: while too many abandoned negotiations are
// still blocked on peers that never respond, new creations are rejected before
// any creation attempt.
func TestPortForwardManager_OutstandingAbandonmentCapGatesNewCreations(t *testing.T) {
	manager := newTestPortForwardManager(k8sfake.NewSimpleClientset(testPortForwardEndpoints()))
	manager.abandonedNegotiations = maxOutstandingAbandonedNegotiations
	manager.createForwardFn = func(context.Context, string, string, int) (*activeForward, error) {
		t.Fatal("the outstanding-negotiation cap must reject before starting a new creation")
		return nil, nil
	}

	_, err := manager.getOrCreateForward(context.Background(), "team-a", "milvus", 19530)
	if err == nil || !strings.Contains(err.Error(), "outstanding") {
		t.Fatalf("getOrCreateForward() error = %v, want outstanding-negotiation rejection", err)
	}
}

// newUpgradingForwardServer returns a test server that behaves like a healthy
// API server as far as port-forward startup is concerned: Endpoints lookups
// succeed, and portforward POSTs are hijacked and answered with a valid 101
// Switching Protocols response after respondAfter. The upgraded connection is
// then held open (the established "tunnel"); if the client closes it, that is
// reported on the returned channel so tests can assert abandoned tunnels are
// torn down.
func newUpgradingForwardServer(t *testing.T, respondAfter time.Duration) (kubernetes.Interface, *rest.Config, chan struct{}, chan struct{}) {
	t.Helper()
	requestSeen := make(chan struct{}, 1)
	tunnel := make(chan struct{})
	clientClosed := make(chan struct{}, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/portforward") {
			select {
			case requestSeen <- struct{}{}:
			default:
			}
			conn, _, err := w.(http.Hijacker).Hijack()
			if err != nil {
				return
			}
			defer conn.Close()
			if respondAfter > 0 {
				select {
				case <-time.After(respondAfter):
				case <-tunnel:
					return
				}
			}
			// Complete the upgrade exactly as the client validates it: a 101
			// with Connection/Upgrade headers and the negotiated protocol
			// echoed back (ForwardPorts negotiates portforward.k8s.io over
			// the SPDY/3.1 transport).
			response := "HTTP/1.1 101 Switching Protocols\r\n" +
				"Connection: Upgrade\r\n" +
				"Upgrade: SPDY/3.1\r\n" +
				"X-Stream-Protocol-Version: portforward.k8s.io\r\n\r\n"
			if _, err := conn.Write([]byte(response)); err != nil {
				return
			}
			go func() {
				buf := make([]byte, 1)
				for {
					if _, err := conn.Read(buf); err != nil {
						select {
						case clientClosed <- struct{}{}:
						default:
						}
						return
					}
				}
			}()
			<-tunnel
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"kind":"Endpoints","apiVersion":"v1","metadata":{"name":"milvus","namespace":"team-a"},"subsets":[{"addresses":[{"targetRef":{"kind":"Pod","name":"milvus-0"}}]}]}`)
	}))
	t.Cleanup(func() {
		// Release the held tunnels so the server can drain before the test ends.
		close(tunnel)
		server.Close()
	})
	cfg := &rest.Config{Host: server.URL}
	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		t.Fatalf("NewForConfig() error = %v", err)
	}
	return clientset, cfg, requestSeen, clientClosed
}

// TestCreateForward_SuccessfulUpgradeSurvivesDeadline verifies a healthy
// upgrade becomes a ready forward well before the startup deadline, and that
// the deadline passing afterwards does not truncate the established forward —
// the startup context bounds startup only.
func TestCreateForward_SuccessfulUpgradeSurvivesDeadline(t *testing.T) {
	clientset, cfg, _, _ := newUpgradingForwardServer(t, 0)
	manager := newTestPortForwardManager(clientset)
	manager.restConfig = cfg

	deadline := 1500 * time.Millisecond
	ctx, cancel := context.WithTimeout(context.Background(), deadline)
	defer cancel()

	startedAt := time.Now()
	fwd, err := manager.createForward(ctx, "team-a", "milvus-0", 19530)
	if err != nil {
		t.Fatalf("createForward() against a healthy upgrade error = %v", err)
	}
	if fwd == nil || fwd.localPort == 0 {
		t.Fatalf("createForward() = %+v, want ready forward with a local port", fwd)
	}
	if elapsed := time.Since(startedAt); elapsed >= deadline {
		t.Fatalf("healthy upgrade became ready in %s, want before the %s startup deadline", elapsed, deadline)
	}

	// Let the startup deadline pass: the established forward must survive it.
	time.Sleep(deadline)
	if err, stopped := fwd.terminalError(); stopped {
		t.Fatalf("established forward did not survive the startup deadline: %v", err)
	}

	fwd.stop()
	fwd.wait()
}

// TestContextDialer_ClosesTunnelCompletedAfterDeadline verifies the
// abandonment watcher tears down a tunnel the peer completes only after the
// deadline already abandoned it — the late upgrade must not linger as a live
// connection.
func TestContextDialer_ClosesTunnelCompletedAfterDeadline(t *testing.T) {
	_, cfg, _, clientClosed := newUpgradingForwardServer(t, 600*time.Millisecond)

	transport, upgrader, err := spdy.RoundTripperFor(cfg)
	if err != nil {
		t.Fatalf("RoundTripperFor() error = %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	target, err := url.Parse(cfg.Host + "/api/v1/namespaces/team-a/pods/milvus-0/portforward")
	if err != nil {
		t.Fatal(err)
	}
	d := &contextDialer{
		ctx:      ctx,
		upgrader: upgrader,
		client:   &http.Client{Transport: transport},
		method:   http.MethodPost,
		url:      target,
	}

	done := make(chan error, 1)
	go func() {
		_, _, dialErr := d.Dial("SPDY/3.1")
		done <- dialErr
	}()

	select {
	case dialErr := <-done:
		if dialErr == nil || !strings.Contains(dialErr.Error(), "abandon") {
			t.Fatalf("dial error = %v, want abandoned negotiation error", dialErr)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("dial did not abandon the stalled upgrade at the deadline")
	}

	// The peer completes the upgrade only after the abandonment. The watcher
	// must close that late tunnel instead of leaving it live.
	select {
	case <-clientClosed:
	case <-time.After(10 * time.Second):
		t.Fatal("tunnel completed after the deadline was not closed by the abandonment watcher")
	}
}

// TestCreateForward_AbandonmentTrackedUntilSettled verifies an abandoned
// negotiation counts against the outstanding-negotiation cap from the moment
// it is abandoned until the peer finally responds — the window in which its
// connection and goroutines linger with no other resource accounting.
func TestCreateForward_AbandonmentTrackedUntilSettled(t *testing.T) {
	clientset, cfg, _, clientClosed := newUpgradingForwardServer(t, 600*time.Millisecond)
	manager := newTestPortForwardManager(clientset)
	manager.restConfig = cfg

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	if _, err := manager.createForward(ctx, "team-a", "milvus-0", 19530); err == nil {
		t.Fatal("expected createForward against a late upgrade to fail at the deadline")
	}

	// The negotiation was abandoned at the deadline while the peer stayed
	// silent; it must count as outstanding. The abandonment happens on the
	// ForwardPorts goroutine, so it is observed shortly after createForward
	// has already returned to its caller.
	var abandoned int
	deadline := time.After(10 * time.Second)
	for {
		manager.mu.Lock()
		abandoned = manager.abandonedNegotiations
		manager.mu.Unlock()
		if abandoned == 1 {
			break
		}
		select {
		case <-deadline:
			t.Fatalf("outstanding abandoned negotiations = %d, want 1 after the deadline abandoned the upgrade", abandoned)
		case <-time.After(5 * time.Millisecond):
		}
	}

	// The peer completes the upgrade only after the abandonment; the watcher
	// closes the late tunnel and the slot must be released.
	select {
	case <-clientClosed:
	case <-time.After(10 * time.Second):
		t.Fatal("late tunnel was not closed by the abandonment watcher")
	}
	settleDeadline := time.After(10 * time.Second)
	for {
		manager.mu.Lock()
		abandoned = manager.abandonedNegotiations
		manager.mu.Unlock()
		if abandoned == 0 {
			return
		}
		select {
		case <-settleDeadline:
			t.Fatalf("abandoned negotiation did not settle after the peer responded; outstanding = %d", abandoned)
		case <-time.After(5 * time.Millisecond):
		}
	}
}
