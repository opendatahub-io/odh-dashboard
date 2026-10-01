package proxy

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestConnectionTracker_TrackUntrack(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	if tracker.ActiveCount() != 0 {
		t.Fatalf("initial count = %d, want 0", tracker.ActiveCount())
	}

	id1 := tracker.Track(nil, nil)
	id2 := tracker.Track(nil, nil)

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

	tracker.Track(nil, nil)

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
	tracker.Track(nil, nil)
	tracker.Track(nil, nil)
	tracker.Stop()

	if tracker.ActiveCount() != 0 {
		t.Errorf("after stop, count = %d, want 0", tracker.ActiveCount())
	}
}

func TestConnectionTracker_PingsKeepConnectionAlive(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	tracker.Track(nil, nil)

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

	tracker.Track(nil, nil)

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

	id := tracker.Track(nil, nil)

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

	id := tracker.Track(nil, nil)

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

	id := tracker.Track(nil, nil)
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

	id := tracker.Track(clientConn, targetConn)

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
