package proxy

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"
)

func TestConnectionTracker_TrackUntrack(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	if tracker.ActiveCount() != 0 {
		t.Fatalf("initial count = %d, want 0", tracker.ActiveCount())
	}

	id1 := tracker.Track(nil, nil, "")
	id2 := tracker.Track(nil, nil, "")

	if tracker.ActiveCount() != 2 {
		t.Errorf("after two tracks, count = %d, want 2", tracker.ActiveCount())
	}

	tracker.Untrack(id1)
	if tracker.ActiveCount() != 1 {
		t.Errorf("after untrack, count = %d, want 1", tracker.ActiveCount())
	}

	tracker.Untrack(id2)
	if tracker.ActiveCount() != 0 {
		t.Errorf("after second untrack, count = %d, want 0", tracker.ActiveCount())
	}
}

func TestConnectionTracker_StaleCleanup(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	tracker.Track(nil, nil, "")

	tracker.mu.Lock()
	for _, tc := range tracker.connections {
		staleTime := time.Now().Add(-(wsStaleConnectionTime + time.Minute))
		tc.metrics.LastMessageReceived = staleTime
		tc.metrics.LastMessageSent = staleTime
	}
	tracker.mu.Unlock()

	tracker.cleanupStale()

	if tracker.ActiveCount() != 0 {
		t.Errorf("after stale cleanup, count = %d, want 0", tracker.ActiveCount())
	}
}

func TestConnectionTracker_Stop(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	tracker.Track(nil, nil, "")
	tracker.Track(nil, nil, "")
	tracker.Stop()

	if tracker.ActiveCount() != 0 {
		t.Errorf("after stop, count = %d, want 0", tracker.ActiveCount())
	}
}

func TestConnectionTracker_PingsKeepConnectionAlive(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	tracker.Track(nil, nil, "")

	tracker.mu.Lock()
	for _, tc := range tracker.connections {
		staleTime := time.Now().Add(-(wsStaleConnectionTime + time.Minute))
		tc.metrics.LastMessageReceived = staleTime
		tc.metrics.LastMessageSent = staleTime
		tc.metrics.LastPingSuccess = time.Now()
	}
	tracker.mu.Unlock()

	tracker.cleanupStale()

	if tracker.ActiveCount() != 1 {
		t.Errorf("after stale cleanup with recent pings, count = %d, want 1 (pings keep connection alive)", tracker.ActiveCount())
	}
}

func TestConnectionTracker_StaleWithNoPings(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	tracker.Track(nil, nil, "")

	tracker.mu.Lock()
	for _, tc := range tracker.connections {
		staleTime := time.Now().Add(-(wsStaleConnectionTime + time.Minute))
		tc.metrics.LastMessageReceived = staleTime
		tc.metrics.LastMessageSent = staleTime
		// LastPingSuccess left at zero value - no successful pings
	}
	tracker.mu.Unlock()

	tracker.cleanupStale()

	if tracker.ActiveCount() != 0 {
		t.Errorf("after stale cleanup with no pings, count = %d, want 0", tracker.ActiveCount())
	}
}

func TestTrackBookmark(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	id := tracker.Track(nil, nil, "")

	bookmarkMsg := `{"type":"BOOKMARK","object":{"metadata":{"resourceVersion":"12345"}}}`
	trackBookmark(tracker, id, []byte(bookmarkMsg))

	tracker.mu.Lock()
	rv := tracker.connections[id].metrics.LastResourceVersion
	tracker.mu.Unlock()

	if rv != "12345" {
		t.Errorf("resourceVersion = %q, want %q", rv, "12345")
	}
}

func TestTrackBookmark_NonBookmarkIgnored(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	id := tracker.Track(nil, nil, "")

	addedMsg := `{"type":"ADDED","object":{"metadata":{"resourceVersion":"99999"}}}`
	trackBookmark(tracker, id, []byte(addedMsg))

	tracker.mu.Lock()
	rv := tracker.connections[id].metrics.LastResourceVersion
	tracker.mu.Unlock()

	if rv != "" {
		t.Errorf("resourceVersion = %q, want empty for non-BOOKMARK", rv)
	}
}

func TestTrackBookmark_InvalidJSON(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	id := tracker.Track(nil, nil, "")
	trackBookmark(tracker, id, []byte("not json"))

	tracker.mu.Lock()
	rv := tracker.connections[id].metrics.LastResourceVersion
	tracker.mu.Unlock()

	if rv != "" {
		t.Errorf("resourceVersion = %q, want empty for invalid JSON", rv)
	}
}

func TestConnectionTracker_StaleCleanupWithConnections(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		up := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
		conn, err := up.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}))
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http")
	clientConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial client error: %v", err)
	}
	targetConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial target error: %v", err)
	}

	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	id := tracker.Track(clientConn, targetConn, "")

	tracker.mu.Lock()
	staleTime := time.Now().Add(-(wsStaleConnectionTime + time.Minute))
	tracker.connections[id].metrics.LastMessageReceived = staleTime
	tracker.connections[id].metrics.LastMessageSent = staleTime
	tracker.mu.Unlock()

	tracker.cleanupStale()

	if tracker.ActiveCount() != 0 {
		t.Errorf("after stale cleanup with connections, count = %d, want 0", tracker.ActiveCount())
	}
}

func TestConnectionTrackerLogCloseRetainsCorrelationAfterUntrack(t *testing.T) {
	var logs bytes.Buffer
	tracker := NewConnectionTracker(slog.New(slog.NewJSONHandler(&logs, nil)))
	defer tracker.Stop()
	requestID := "6d755a02-faea-46ea-ae98-9de9cc8dc4f1"
	id := tracker.Track(nil, nil, requestID)
	tracker.Untrack(id)
	require.Zero(t, tracker.ActiveCount())
	tracker.logClose(id, requestID, &websocket.CloseError{Code: websocket.CloseNormalClosure, Text: "CANARY_SECRET"})
	var event struct {
		ID        string `json:"id"`
		RequestID string `json:"request_id"`
		CloseCode int    `json:"close_code"`
	}
	require.NoError(t, json.Unmarshal(logs.Bytes(), &event))
	require.Equal(t, id, event.ID)
	require.Equal(t, requestID, event.RequestID)
	require.Equal(t, websocket.CloseNormalClosure, event.CloseCode)
	require.NotContains(t, logs.String(), "CANARY")
}

type shutdownTestConn struct {
	net.Conn
	observe   atomic.Bool
	deadlines chan time.Time
	writes    chan struct{}
	release   <-chan struct{}
}

func (c *shutdownTestConn) SetWriteDeadline(deadline time.Time) error {
	if c.observe.Load() {
		c.deadlines <- deadline
	}
	return c.Conn.SetWriteDeadline(deadline)
}

func (c *shutdownTestConn) Write(b []byte) (int, error) {
	if c.observe.Load() {
		c.writes <- struct{}{}
		<-c.release
	}
	return c.Conn.Write(b)
}

func TestConnectionTrackerShutdownReleasesLockAndSharesDeadline(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := newUpgrader([]string{"*"})
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}))
	defer server.Close()
	release := make(chan struct{})
	releaseWrites := sync.OnceFunc(func() { close(release) })
	defer releaseWrites()
	deadlines := make(chan time.Time, 2)
	writes := make(chan struct{}, 2)
	dialer := websocket.Dialer{NetDialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
		conn, err := (&net.Dialer{}).DialContext(ctx, network, address)
		if err != nil {
			return nil, err
		}
		return &shutdownTestConn{Conn: conn, deadlines: deadlines, writes: writes, release: release}, nil
	}}
	var peers []*websocket.Conn
	for range 2 {
		conn, _, err := dialer.Dial("ws"+strings.TrimPrefix(server.URL, "http"), nil)
		require.NoError(t, err)
		defer conn.Close()
		conn.UnderlyingConn().(*shutdownTestConn).observe.Store(true)
		peers = append(peers, conn)
	}
	tracker := NewConnectionTracker(testLogger())
	tracker.Track(peers[0], peers[1], "")
	stopped := make(chan struct{})
	go func() { tracker.Stop(); close(stopped) }()
	select {
	case <-writes:
	case <-time.After(2 * time.Second):
		t.Fatal("shutdown did not attempt a close frame")
	}
	count := make(chan int, 1)
	go func() { count <- tracker.ActiveCount() }()
	select {
	case active := <-count:
		require.Zero(t, active)
	case <-time.After(time.Second):
		t.Fatal("shutdown holds tracker lock during network I/O")
	}
	releaseWrites()
	select {
	case <-stopped:
	case <-time.After(2 * time.Second):
		t.Fatal("shutdown did not finish")
	}
	first, second := <-deadlines, <-deadlines
	require.False(t, first.IsZero())
	require.Equal(t, first, second, "all shutdown notifications must share one deadline")
}
