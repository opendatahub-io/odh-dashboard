package proxy

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
)

const wsHeartbeatInterval = 15 * time.Second

func forwardTargetToClient(tracker *ConnectionTracker, connID, requestID string, target, client *websocket.Conn, cleanup func(), watch bool) {
	defer cleanup()
	for {
		msgType, msg, err := target.ReadMessage()
		if err != nil {
			tracker.logClose(connID, requestID, err)
			sendCloseMessage(client, err)
			return
		}
		tracker.updateMetricsReceived(connID)
		if watch {
			trackBookmark(tracker, connID, msg)
			msg = httpcontract.SanitizeWatchEvent(msg)
		}
		if writeErr := client.WriteMessage(msgType, msg); writeErr != nil {
			tracker.logClose(connID, requestID, writeErr)
			sendCloseMessage(target, writeErr)
			return
		}
		tracker.updateMetricsSent(connID)
	}
}

func forwardClientToTarget(tracker *ConnectionTracker, connID, requestID string, client, target *websocket.Conn, cleanup func()) {
	defer cleanup()
	for {
		msgType, msg, err := client.ReadMessage()
		if err != nil {
			tracker.logClose(connID, requestID, err)
			sendCloseMessage(target, err)
			return
		}
		tracker.updateMetricsReceived(connID)
		if writeErr := target.WriteMessage(msgType, msg); writeErr != nil {
			tracker.logClose(connID, requestID, writeErr)
			sendCloseMessage(client, writeErr)
			return
		}
		tracker.updateMetricsSent(connID)
	}
}

func runHeartbeat(tracker *ConnectionTracker, connID, requestID string, target *websocket.Conn, heartbeat *time.Ticker, done <-chan struct{}, cleanup func(), clients ...*websocket.Conn) {
	for {
		select {
		case <-done:
			return
		case <-heartbeat.C:
			if err := target.WriteControl(websocket.PingMessage, nil, time.Now().Add(writeControlTimeout)); err != nil {
				tracker.logClose(connID, requestID, err)
				for _, client := range clients {
					sendCloseMessage(client, err)
				}
				cleanup()
				return
			}
			tracker.updatePingSuccess(connID)
		}
	}
}

func bridgeConnections(tracker *ConnectionTracker, clientConn, targetConn *websocket.Conn, requestID string, watch bool) {
	// Override gorilla's default close handler, which otherwise echoes untrusted peer text.
	for _, conn := range []*websocket.Conn{clientConn, targetConn} {
		conn.SetCloseHandler(func(code int, _ string) error {
			safe := normalizeReceivedCloseCode(code)
			return conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(safe, closeReason(safe)), time.Now().Add(writeControlTimeout))
		})
	}
	connID := tracker.Track(clientConn, targetConn, requestID)
	heartbeat := time.NewTicker(wsHeartbeatInterval)
	done := make(chan struct{})
	var closeOnce sync.Once
	cleanup := func() {
		closeOnce.Do(func() {
			close(done)
			heartbeat.Stop()
			tracker.Untrack(connID)
			clientConn.Close()
			targetConn.Close()
		})
	}

	go forwardTargetToClient(tracker, connID, requestID, targetConn, clientConn, cleanup, watch)
	go forwardClientToTarget(tracker, connID, requestID, clientConn, targetConn, cleanup)
	go runHeartbeat(tracker, connID, requestID, targetConn, heartbeat, done, cleanup, clientConn)
}
