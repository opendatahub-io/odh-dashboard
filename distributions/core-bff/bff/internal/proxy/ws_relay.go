package proxy

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
)

const wsHeartbeatInterval = 15 * time.Second

const maxWatchPendingBytes = 4 << 20

func forwardTargetToClient(tracker *ConnectionTracker, connID, requestID string, target, client *websocket.Conn, cleanup func(), watch bool, diagnosticRequest *http.Request) {
	defer cleanup()
	base64Watch := watch && target.Subprotocol() == base64BinarySubprotocol
	var pending []byte
	sanitize := func(event []byte) []byte {
		trackBookmark(tracker, connID, event)
		return httpcontract.ProxyWatchEvent(event, diagnosticRequest)
	}
	for {
		msgType, msg, err := target.ReadMessage()
		if err != nil {
			if len(pending) > 0 {
				err = errors.New("upstream closed with an incomplete watch event")
			}
			tracker.logClose(connID, requestID, err)
			sendCloseMessage(client, err)
			return
		}
		tracker.updateMetricsReceived(connID)
		if watch {
			if base64Watch {
				msg, err = base64.StdEncoding.DecodeString(string(msg))
			}
			if err == nil {
				msg, pending, err = proxyWatchMessage(msg, pending, sanitize)
			}
			if err != nil {
				tracker.logClose(connID, requestID, err)
				sendCloseMessage(client, err)
				return
			}
			if len(msg) == 0 && len(pending) > 0 {
				continue // Never forward an incomplete, unsanitized event.
			}
			if base64Watch {
				msg = []byte(base64.StdEncoding.EncodeToString(msg))
			}
		}
		if writeErr := client.WriteMessage(msgType, msg); writeErr != nil {
			tracker.logClose(connID, requestID, writeErr)
			sendCloseMessage(target, writeErr)
			return
		}
		tracker.updateMetricsSent(connID)
	}
}

// Watch streams can split or combine JSON events across WebSocket messages.
func proxyWatchMessage(message, pending []byte, sanitize func([]byte) []byte) ([]byte, []byte, error) {
	pending = append(pending, message...)
	decoder := json.NewDecoder(bytes.NewReader(pending))
	var out bytes.Buffer
	var offset int
	for {
		var event json.RawMessage
		err := decoder.Decode(&event)
		if errors.Is(err, io.EOF) {
			out.Write(pending[offset:]) // Preserve trailing whitespace and empty keepalives.
			return out.Bytes(), nil, nil
		}
		if errors.Is(err, io.ErrUnexpectedEOF) {
			rest := pending[offset:]
			if len(rest) > maxWatchPendingBytes {
				return nil, nil, errors.New("incomplete watch event exceeds buffering limit")
			}
			return out.Bytes(), rest, nil
		}
		if err != nil {
			return nil, nil, err
		}
		end := int(decoder.InputOffset())
		out.Write(pending[offset : end-len(event)]) // Keep stream delimiters outside the sanitized JSON.
		out.Write(sanitize(event))
		offset = end
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

func bridgeConnections(tracker *ConnectionTracker, clientConn, targetConn *websocket.Conn, requestID string, watch bool, diagnosticRequest *http.Request) {
	// Override gorilla's default close handler, which otherwise echoes untrusted peer text.
	for _, conn := range []*websocket.Conn{clientConn, targetConn} {
		conn.SetCloseHandler(func(code int, _ string) error {
			safe := normalizeReceivedCloseCode(code)
			// A best-effort echo must not replace Gorilla's peer CloseError.
			_ = conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(safe, closeReason(safe)), time.Now().Add(writeControlTimeout))
			return nil
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

	go forwardTargetToClient(tracker, connID, requestID, targetConn, clientConn, cleanup, watch, diagnosticRequest)
	go forwardClientToTarget(tracker, connID, requestID, clientConn, targetConn, cleanup)
	go runHeartbeat(tracker, connID, requestID, targetConn, heartbeat, done, cleanup, clientConn)
}
