package proxy

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type watchEvent struct {
	Type   string          `json:"type"`
	Object json.RawMessage `json:"object"`
}

type objectMeta struct {
	Metadata struct {
		ResourceVersion string `json:"resourceVersion"`
	} `json:"metadata"`
}

func trackBookmark(tracker *ConnectionTracker, connID string, msg []byte) {
	var event watchEvent
	if err := json.Unmarshal(msg, &event); err != nil {
		return
	}
	if event.Type != "BOOKMARK" {
		return
	}
	var obj objectMeta
	if err := json.Unmarshal(event.Object, &obj); err != nil {
		return
	}
	if rv := obj.Metadata.ResourceVersion; rv != "" {
		tracker.updateResourceVersion(connID, rv)
	}
}

const (
	wsStaleConnectionTime  = 5 * time.Minute
	wsStaleCleanupInterval = 60 * time.Second
)

type connectionMetrics struct {
	// Created is the connection creation timestamp.
	Created time.Time
	// LastMessageReceived is the timestamp of the last received message.
	LastMessageReceived time.Time
	// LastMessageSent is the timestamp of the last sent message.
	LastMessageSent time.Time
	// LastPingSuccess is the timestamp of the last successful ping.
	LastPingSuccess time.Time
	// MessagesReceived is the count of messages received.
	MessagesReceived int64
	// MessagesSent is the count of messages sent.
	MessagesSent int64
	// LastResourceVersion is the last K8s resource version seen.
	LastResourceVersion string
}

type trackedConnection struct {
	id        string
	requestID string
	client    *websocket.Conn
	target    *websocket.Conn
	metrics   *connectionMetrics
}

// ConnectionTracker manages active WebSocket connections and performs stale connection cleanup.
type ConnectionTracker struct {
	mu          sync.Mutex
	connections map[string]*trackedConnection
	nextID      int
	stopCh      chan struct{}
	stopOnce    sync.Once
	wg          sync.WaitGroup
	logger      *slog.Logger
}

// NewConnectionTracker creates a ConnectionTracker and starts a background cleanup goroutine.
func NewConnectionTracker(logger *slog.Logger) *ConnectionTracker {
	ct := &ConnectionTracker{
		connections: make(map[string]*trackedConnection),
		stopCh:      make(chan struct{}),
		logger:      logger,
	}
	ct.wg.Go(ct.cleanupLoop)
	return ct
}

// Track registers a client-target WebSocket pair and returns its connection ID.
func (ct *ConnectionTracker) Track(client, target *websocket.Conn, requestID string) string {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	ct.nextID++
	id := fmt.Sprintf("ws-%d", ct.nextID)
	now := time.Now()
	ct.connections[id] = &trackedConnection{
		id:        id,
		requestID: requestID,
		client:    client,
		target:    target,
		metrics: &connectionMetrics{
			Created:             now,
			LastMessageReceived: now,
			LastMessageSent:     now,
		},
	}
	ct.logger.Debug("WebSocket connection tracked", slog.String("id", id), slog.String("request_id", ct.connections[id].requestID))
	return id
}

// Untrack removes a connection from the tracker by its ID.
func (ct *ConnectionTracker) Untrack(id string) {
	ct.mu.Lock()
	defer ct.mu.Unlock()
	requestID := ""
	if tc := ct.connections[id]; tc != nil {
		requestID = tc.requestID
	}
	delete(ct.connections, id)
	ct.logger.Debug("WebSocket connection untracked", slog.String("id", id), slog.String("request_id", requestID))
}

// ActiveCount returns the number of currently tracked connections.
func (ct *ConnectionTracker) ActiveCount() int {
	ct.mu.Lock()
	defer ct.mu.Unlock()
	return len(ct.connections)
}

// Stop terminates the cleanup goroutine and closes all tracked connections.
func (ct *ConnectionTracker) Stop() { ct.stopOnce.Do(ct.stop) }
func (ct *ConnectionTracker) stop() {
	close(ct.stopCh)
	ct.wg.Wait()

	ct.mu.Lock()
	connections := ct.connections
	ct.connections = make(map[string]*trackedConnection)
	ct.mu.Unlock()

	deadline := time.Now().Add(writeControlTimeout)
	for id, tc := range connections {
		ct.logger.Info("WebSocket shutdown", "id", id, "request_id", tc.requestID)
		sendCloseMessageForShutdown(tc.client, deadline)
		sendCloseMessageForShutdown(tc.target, deadline)
		if tc.client != nil {
			tc.client.Close()
		}
		if tc.target != nil {
			tc.target.Close()
		}
	}
	ct.logger.Info("ConnectionTracker stopped, all connections closed")
}

func (ct *ConnectionTracker) cleanupLoop() {
	ticker := time.NewTicker(wsStaleCleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ct.stopCh:
			return
		case <-ticker.C:
			ct.cleanupStale()
		}
	}
}

func (ct *ConnectionTracker) cleanupStale() {
	ct.mu.Lock()

	now := time.Now()
	var stale []*trackedConnection
	for id, tc := range ct.connections {
		lastActivity := tc.metrics.LastMessageReceived
		if tc.metrics.LastMessageSent.After(lastActivity) {
			lastActivity = tc.metrics.LastMessageSent
		}
		if tc.metrics.LastPingSuccess.After(lastActivity) {
			lastActivity = tc.metrics.LastPingSuccess
		}
		if now.Sub(lastActivity) > wsStaleConnectionTime {
			ct.logger.Info("Closing stale WebSocket connection",
				slog.String("id", id),
				slog.String("request_id", tc.requestID),
				slog.Duration("idle", now.Sub(lastActivity)))
			stale = append(stale, tc)
			delete(ct.connections, id)
		}
	}

	ct.mu.Unlock()

	closeMsg := websocket.FormatCloseMessage(websocket.CloseGoingAway, "stale connection")
	deadline := time.Now().Add(5 * time.Second)
	for _, tc := range stale {
		if tc.client != nil {
			_ = tc.client.WriteControl(websocket.CloseMessage, closeMsg, deadline)
			tc.client.Close()
		}
		if tc.target != nil {
			_ = tc.target.WriteControl(websocket.CloseMessage, closeMsg, deadline)
			tc.target.Close()
		}
	}
}

func (ct *ConnectionTracker) updateMetricsReceived(id string) {
	ct.mu.Lock()
	defer ct.mu.Unlock()
	if tc, ok := ct.connections[id]; ok {
		tc.metrics.LastMessageReceived = time.Now()
		tc.metrics.MessagesReceived++
	}
}

func (ct *ConnectionTracker) updateMetricsSent(id string) {
	ct.mu.Lock()
	defer ct.mu.Unlock()
	if tc, ok := ct.connections[id]; ok {
		tc.metrics.LastMessageSent = time.Now()
		tc.metrics.MessagesSent++
	}
}

func (ct *ConnectionTracker) updatePingSuccess(id string) {
	ct.mu.Lock()
	defer ct.mu.Unlock()
	if tc, ok := ct.connections[id]; ok {
		tc.metrics.LastPingSuccess = time.Now()
	}
}

func (ct *ConnectionTracker) updateResourceVersion(id string, rv string) {
	ct.mu.Lock()
	defer ct.mu.Unlock()
	if tc, ok := ct.connections[id]; ok {
		tc.metrics.LastResourceVersion = rv
	}
}

func (ct *ConnectionTracker) logClose(id, requestID string, err error) {
	ct.logger.Info("WebSocket closing", "id", id, "request_id", requestID, "close_code", closeCodeFromError(err))
}
