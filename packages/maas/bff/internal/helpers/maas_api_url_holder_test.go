package helper

import (
	"context"
	"crypto/x509"
	"errors"
	"io"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
)

func TestMaasApiURLHolder(t *testing.T) {
	h := NewMaasApiURLHolder("")
	if h.Ready() {
		t.Fatal("expected empty holder not ready")
	}
	if _, ok := h.URL(); ok {
		t.Fatal("expected empty holder URL ok=false")
	}

	h.Set("https://maas.example.com/maas-api")
	if !h.Ready() {
		t.Fatal("expected holder ready after Set")
	}
	got, ok := h.URL()
	if !ok || got != "https://maas.example.com/maas-api" {
		t.Fatalf("URL() = (%q, %v), want ready URL", got, ok)
	}
}

func TestMaasApiDiscoveryLoop_SetsURLOnSuccess(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	holder := NewMaasApiURLHolder("")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var attempts atomic.Int32
	discover := func(context.Context, config.EnvConfig, *slog.Logger, *x509.CertPool) (string, error) {
		if attempts.Add(1) < 2 {
			return "", errors.New("not ready yet")
		}
		return "https://maas.example.com/maas-api", nil
	}

	wired := make(chan string, 1)
	onReady := func(url string) error {
		holder.Set(url) // mirrors App.wireMaasApiURL
		wired <- url
		return nil
	}

	go runMaasApiDiscoveryLoop(
		ctx,
		config.EnvConfig{},
		logger,
		nil,
		holder,
		onReady,
		discover,
		10*time.Millisecond,
		50*time.Millisecond,
	)

	select {
	case url := <-wired:
		if url != "https://maas.example.com/maas-api" {
			t.Fatalf("onReady url = %q", url)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for discovery success")
	}

	deadline := time.Now().Add(time.Second)
	for !holder.Ready() {
		if time.Now().After(deadline) {
			t.Fatal("holder not ready after discovery")
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func TestMaasApiDiscoveryLoop_StopsOnCancel(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	holder := NewMaasApiURLHolder("")
	ctx, cancel := context.WithCancel(context.Background())

	var attempts atomic.Int32
	discover := func(context.Context, config.EnvConfig, *slog.Logger, *x509.CertPool) (string, error) {
		attempts.Add(1)
		return "", errors.New("always fail")
	}

	done := make(chan struct{})
	go func() {
		runMaasApiDiscoveryLoop(
			ctx,
			config.EnvConfig{},
			logger,
			nil,
			holder,
			nil,
			discover,
			10*time.Millisecond,
			20*time.Millisecond,
		)
		close(done)
	}()

	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("loop did not stop after cancel")
	}

	if holder.Ready() {
		t.Fatal("holder should remain empty")
	}
	if attempts.Load() == 0 {
		t.Fatal("expected at least one discovery attempt")
	}
}

func TestNextDiscoveryBackoff(t *testing.T) {
	if got := nextDiscoveryBackoff(5*time.Second, maasDiscoveryMaxBackoff); got != 10*time.Second {
		t.Fatalf("got %v, want 10s", got)
	}
	if got := nextDiscoveryBackoff(20*time.Second, maasDiscoveryMaxBackoff); got != maasDiscoveryMaxBackoff {
		t.Fatalf("got %v, want max %v", got, maasDiscoveryMaxBackoff)
	}
}
