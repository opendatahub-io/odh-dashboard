// Package proxy provides WebSocket toolkit utilities for building BFF endpoints
// that communicate with Kubernetes or other WebSocket backends.
package proxy

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	WriteControlTimeout = 5 * time.Second
	ConnectionTimeout   = 10 * time.Second
	HeartbeatInterval   = 15 * time.Second
	WriteMessageTimeout = 30 * time.Second
	MaxConnections      = 1000
)

func NewUpgrader(allowedOrigins []string) websocket.Upgrader {
	return websocket.Upgrader{
		CheckOrigin: OriginChecker(allowedOrigins),
	}
}

func OriginChecker(allowedOrigins []string) func(*http.Request) bool {
	if len(allowedOrigins) == 0 {
		return SameOriginCheck
	}
	if slices.Contains(allowedOrigins, "*") {
		return func(r *http.Request) bool { return true }
	}
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.TrimRight(o, "/")] = true
	}
	return func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return false
		}
		return allowed[strings.TrimRight(origin, "/")]
	}
}

func SameOriginCheck(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return false
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	return strings.EqualFold(u.Host, r.Host)
}

func CloseCodeFromError(err error) int {
	var ce *websocket.CloseError
	if errors.As(err, &ce) {
		return SanitizeCloseCode(ce.Code)
	}
	return SanitizeCloseCode(websocket.CloseInternalServerErr)
}

func SendCloseMessage(conn *websocket.Conn, err error) {
	_ = conn.WriteControl(websocket.CloseMessage,
		websocket.FormatCloseMessage(CloseCodeFromError(err), ""),
		time.Now().Add(WriteControlTimeout))
}

func ForwardTargetToClient(tracker *ConnectionTracker, connID string, target, client *websocket.Conn, cleanup func()) {
	defer cleanup()
	for {
		msgType, msg, err := target.ReadMessage()
		if err != nil {
			SendCloseMessage(client, err)
			return
		}
		tracker.updateMetricsReceived(connID)
		trackBookmark(tracker, connID, msg)
		_ = client.SetWriteDeadline(time.Now().Add(WriteMessageTimeout))
		if writeErr := client.WriteMessage(msgType, msg); writeErr != nil {
			return
		}
		tracker.updateMetricsSent(connID)
	}
}

func ForwardClientToTarget(tracker *ConnectionTracker, connID string, client, target *websocket.Conn, cleanup func()) {
	defer cleanup()
	for {
		msgType, msg, err := client.ReadMessage()
		if err != nil {
			SendCloseMessage(target, err)
			return
		}
		tracker.updateMetricsReceived(connID)
		_ = target.SetWriteDeadline(time.Now().Add(WriteMessageTimeout))
		if writeErr := target.WriteMessage(msgType, msg); writeErr != nil {
			return
		}
		tracker.updateMetricsSent(connID)
	}
}

func RunHeartbeat(tracker *ConnectionTracker, connID string, target *websocket.Conn, heartbeat *time.Ticker, done <-chan struct{}, cleanup func()) {
	for {
		select {
		case <-done:
			return
		case <-heartbeat.C:
			if err := target.WriteControl(websocket.PingMessage, nil, time.Now().Add(WriteControlTimeout)); err != nil {
				cleanup()
				return
			}
			tracker.updatePingSuccess(connID)
		}
	}
}

func DialK8sWebSocket(targetWSURL string, tlsConfig *tls.Config, token string, targetURL *url.URL, netDialContext func(ctx context.Context, network, addr string) (net.Conn, error), clientSubprotocols []string) (*websocket.Conn, *http.Response, error) {
	subprotocols := make([]string, 0, len(clientSubprotocols)+1)
	subprotocols = append(subprotocols, BearerSubprotocol(token))
	subprotocols = append(subprotocols, clientSubprotocols...)

	dialer := websocket.Dialer{
		TLSClientConfig:  tlsConfig,
		HandshakeTimeout: ConnectionTimeout,
		NetDialContext:   netDialContext,
		Subprotocols:     subprotocols,
	}

	dialHeaders := http.Header{}
	dialHeaders.Set("Host", targetURL.Host)
	dialHeaders.Set("Origin", targetURL.Scheme+"://"+targetURL.Host)
	dialHeaders.Set("Authorization", "Bearer "+token)

	return dialer.Dial(targetWSURL, dialHeaders)
}

func BearerSubprotocol(token string) string {
	return "base64url.bearer.authorization.k8s.io." + base64.RawURLEncoding.EncodeToString([]byte(token))
}

func NegotiatedSubprotocolHeader(targetConn *websocket.Conn, clientSubprotocols []string) http.Header {
	sp := targetConn.Subprotocol()
	if sp == "" {
		return nil
	}
	for _, csp := range clientSubprotocols {
		if csp == sp {
			h := http.Header{}
			h.Set("Sec-WebSocket-Protocol", sp)
			return h
		}
	}
	return nil
}

func BridgeConnections(tracker *ConnectionTracker, clientConn, targetConn *websocket.Conn) {
	if tracker.ActiveCount() >= MaxConnections {
		closeMsg := websocket.FormatCloseMessage(websocket.CloseTryAgainLater, "too many connections")
		_ = clientConn.WriteControl(websocket.CloseMessage, closeMsg, time.Now().Add(WriteControlTimeout))
		clientConn.Close()
		targetConn.Close()
		return
	}

	connID := tracker.Track(clientConn, targetConn)
	heartbeat := time.NewTicker(HeartbeatInterval)
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

	go ForwardTargetToClient(tracker, connID, targetConn, clientConn, cleanup)
	go ForwardClientToTarget(tracker, connID, clientConn, targetConn, cleanup)
	go RunHeartbeat(tracker, connID, targetConn, heartbeat, done, cleanup)
}

func SanitizeCloseCode(code int) int {
	switch code {
	case 1004, 1005, 1006:
		return 1011
	default:
		return code
	}
}

func ClearHTTPDeadlines(conn *websocket.Conn) {
	if netConn := conn.UnderlyingConn(); netConn != nil {
		netConn.SetDeadline(time.Time{}) //nolint:errcheck // best-effort deadline clearing
	}
}
