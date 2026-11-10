package proxy

import (
	"bufio"
	"bytes"
	"context"
	"crypto/tls"
	"io"
	"net"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
)

// Gorilla retains only the first 1 KiB of rejected handshake bodies. Read and sanitize
// failures before handing the same response bytes to Gorilla, without retrying the request.
type handshakeResponseConn struct {
	net.Conn
	reader    io.Reader
	rejection *http.Response
	request   *http.Request
}

func (c *handshakeResponseConn) Read(p []byte) (int, error) {
	if c.reader == nil {
		var prefix bytes.Buffer
		response, err := http.ReadResponse(bufio.NewReader(io.TeeReader(c.Conn, &prefix)), nil)
		if err != nil {
			return 0, err
		}
		if response.StatusCode >= http.StatusBadRequest {
			// Closing a raw HTTP body drains it. The connection is closed by Gorilla on
			// rejection, so use a no-op closer to retain the shared error-body bound.
			response.Body = io.NopCloser(response.Body)
			response.Request = c.request
			if err := httpcontract.KubernetesResponse(response); err != nil {
				return 0, err
			}
			c.rejection = response
		}
		c.reader = io.MultiReader(bytes.NewReader(prefix.Bytes()), c.Conn)
	}
	return c.reader.Read(p)
}

func dialWithHandshakeResponse(dialer *websocket.Dialer, target string, headers http.Header, serverName string, dialContext func(context.Context, string, string) (net.Conn, error)) (*websocket.Conn, *http.Response, error) {
	diagnosticRequest, err := http.NewRequest(http.MethodGet, target, nil)
	if err != nil {
		return nil, nil, err
	}
	diagnosticRequest.Header = headers.Clone()
	if dialContext == nil {
		dialContext = (&net.Dialer{}).DialContext
	}
	var captured *handshakeResponseConn
	wrap := func(conn net.Conn) net.Conn {
		captured = &handshakeResponseConn{Conn: conn, request: diagnosticRequest}
		return captured
	}
	dialer.NetDialContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
		conn, err := dialContext(ctx, network, addr)
		if err != nil {
			return nil, err
		}
		return wrap(conn), nil
	}
	dialer.NetDialTLSContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
		conn, err := dialContext(ctx, network, addr)
		if err != nil {
			return nil, err
		}
		cfg := dialer.TLSClientConfig.Clone()
		if cfg == nil {
			cfg = NewTLSConfig(nil, false)
		}
		if cfg.ServerName == "" {
			cfg.ServerName = serverName
		}
		secure := tls.Client(conn, cfg)
		if err := secure.HandshakeContext(ctx); err != nil {
			_ = conn.Close()
			return nil, err
		}
		return wrap(secure), nil
	}
	conn, response, err := dialer.Dial(target, headers)
	if captured != nil && captured.rejection != nil {
		response = captured.rejection
	}
	return conn, response, err
}
