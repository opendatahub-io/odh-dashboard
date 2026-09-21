package api

import (
	"bytes"
	"log/slog"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient/bffmocks"
)

func newTestAppWithLogBuffer() (*App, *bytes.Buffer) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&buf, nil))
	return &App{logger: logger}, &buf
}

// TestTrackBackgroundWorkRecoversPanic proves a panic inside background work is contained:
// it must not crash the test process, and Shutdown must still complete cleanly afterward
// (i.e. the WaitGroup's Done() still ran despite the panic).
func TestTrackBackgroundWorkRecoversPanic(t *testing.T) {
	app, buf := newTestAppWithLogBuffer()

	app.TrackBackgroundWork(func() {
		panic("boom")
	})

	done := make(chan error, 1)
	go func() { done <- app.Shutdown() }()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("expected Shutdown to succeed, got %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Shutdown did not complete -- panic likely prevented Done() from running")
	}

	if !strings.Contains(buf.String(), "recovered panic in background work") {
		t.Fatalf("expected the panic to be logged, got log output: %q", buf.String())
	}
}

// TestShutdownWaitsForBackgroundWork proves Shutdown gives in-flight background work
// (e.g. the MCP registry access endpoint cascade) a chance to finish before returning,
// rather than the process exiting out from under it.
func TestShutdownWaitsForBackgroundWork(t *testing.T) {
	app, _ := newTestAppWithLogBuffer()

	const workDuration = 100 * time.Millisecond
	finished := false
	app.TrackBackgroundWork(func() {
		time.Sleep(workDuration)
		finished = true
	})

	start := time.Now()
	if err := app.Shutdown(); err != nil {
		t.Fatalf("expected Shutdown to succeed, got %v", err)
	}
	elapsed := time.Since(start)

	if !finished {
		t.Fatal("expected Shutdown to wait for background work to finish, but it returned first")
	}
	if elapsed < workDuration {
		t.Fatalf("expected Shutdown to take at least %v (waiting for background work), took %v", workDuration, elapsed)
	}
}

// TestSetBFFClientFactoryForTestIsRaceFree is a regression test for a data race where
// SetBFFClientFactoryForTest fired the Once guard with a no-op closure and then wrote
// app.bffClientFactory outside of it, unsynchronized with BFFClientFactory()'s read of the
// same field. Run with -race: a concurrent SetBFFClientFactoryForTest + BFFClientFactory()
// call would previously be flagged as a race even though it wouldn't reproduce with plain
// `go test` (no race detector) due to timing.
func TestSetBFFClientFactoryForTestIsRaceFree(t *testing.T) {
	app, _ := newTestAppWithLogBuffer()
	mock := bffmocks.NewMockClientFactory(app.Logger())

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		app.SetBFFClientFactoryForTest(mock)
	}()
	go func() {
		defer wg.Done()
		_ = app.BFFClientFactory()
	}()
	wg.Wait()
}

// TestShutdownReturnsImmediatelyWithNoBackgroundWork guards against a regression where
// waiting on an empty WaitGroup (or the drain goroutine itself) adds latency to the common
// case where nothing is in flight.
func TestShutdownReturnsImmediatelyWithNoBackgroundWork(t *testing.T) {
	app, _ := newTestAppWithLogBuffer()

	start := time.Now()
	if err := app.Shutdown(); err != nil {
		t.Fatalf("expected Shutdown to succeed, got %v", err)
	}
	if elapsed := time.Since(start); elapsed > 500*time.Millisecond {
		t.Fatalf("expected Shutdown with no background work to return quickly, took %v", elapsed)
	}
}
