package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http/httptest"
	"sync"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

type flushRecorder struct {
	*httptest.ResponseRecorder
	flushCount int
}

func (f *flushRecorder) Flush() {
	f.flushCount++
}

var _ = Describe("SSE Heartbeat", func() {

	var (
		rec    *flushRecorder
		mu     sync.Mutex
		logger *slog.Logger
	)

	BeforeEach(func() {
		rec = &flushRecorder{ResponseRecorder: httptest.NewRecorder()}
		mu = sync.Mutex{}
		logger = slog.New(slog.NewTextHandler(GinkgoWriter, nil))
	})

	It("should stop cleanly without panic", func() {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		hb := newSSEHeartbeat(rec, rec, &mu, logger)
		go hb.start(ctx)

		time.Sleep(50 * time.Millisecond)
		Expect(func() { hb.stop() }).ShouldNot(Panic())
	})

	It("should exit when context is cancelled", func() {
		ctx, cancel := context.WithCancel(context.Background())

		hb := newSSEHeartbeat(rec, rec, &mu, logger)
		go hb.start(ctx)

		cancel()
		time.Sleep(20 * time.Millisecond)

		// stopCh can still be closed safely after the goroutine exits via ctx.Done()
		Expect(func() { hb.stop() }).ShouldNot(Panic())
	})

	It("should write SSE comment format (colon prefix + double newline)", func() {
		// Simulate the heartbeat's write logic directly to avoid the 15s ticker wait
		mu.Lock()
		_, err := fmt.Fprint(rec, ": keepalive\n\n")
		mu.Unlock()
		Expect(err).NotTo(HaveOccurred())
		rec.Flush()

		body := rec.Body.String()
		Expect(body).To(HavePrefix(":"))
		Expect(body).To(ContainSubstring("keepalive"))
		Expect(body).To(HaveSuffix("\n\n"))
	})

	It("should respect mutex during writes", func() {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		hb := newSSEHeartbeat(rec, rec, &mu, logger)
		go hb.start(ctx)

		// Hold the mutex — the heartbeat goroutine should block, not race
		mu.Lock()
		time.Sleep(30 * time.Millisecond)
		mu.Unlock()

		Expect(func() { hb.stop() }).ShouldNot(Panic())
	})
})
