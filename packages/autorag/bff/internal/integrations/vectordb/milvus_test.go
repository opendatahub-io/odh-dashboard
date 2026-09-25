package vectordb

import (
	"context"
	"net"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewMilvusFromSecret_MissingURI(t *testing.T) {
	_, err := newMilvusFromSecret(context.Background(), map[string][]byte{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "missing MILVUS_URI")
}

func TestNewMilvusFromSecret_PlaintextRejectedForRemoteHost(t *testing.T) {
	_, err := newMilvusFromSecret(context.Background(), map[string][]byte{
		"MILVUS_URI": []byte("http://milvus.apps.example.com:19530"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "plaintext (http://) is only allowed")
}

func TestNewMilvusFromSecret_MalformedServerCert(t *testing.T) {
	_, err := newMilvusFromSecret(context.Background(), map[string][]byte{
		"MILVUS_URI":         []byte("https://milvus.apps.example.com:19530"),
		"MILVUS_SERVER_CERT": []byte("not a certificate"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse MILVUS_SERVER_CERT")
}

// TestNewMilvusFromSecret_PlaintextAllowedForLocalhost proves the localhost
// exception actually lets execution reach the connection attempt, rather than
// being rejected by the plaintext/TLS validation gate. It dials a bare loopback
// TCP listener that speaks neither gRPC nor the Milvus wire protocol, so the
// SDK is guaranteed to fail — the assertion is only that the failure is not the
// "plaintext ... only allowed" validation error.
func TestNewMilvusFromSecret_PlaintextAllowedForLocalhost(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	defer ln.Close()
	go acceptAndCloseForever(ln)

	_, port, err := net.SplitHostPort(ln.Addr().String())
	require.NoError(t, err)

	ctx, cancel := context.WithTimeout(context.Background(), 1500*time.Millisecond)
	defer cancel()

	_, err = newMilvusFromSecret(ctx, map[string][]byte{
		"MILVUS_URI": []byte("http://127.0.0.1:" + port),
	})
	if err != nil {
		assert.NotContains(t, err.Error(), "plaintext (http://) is only allowed",
			"localhost should pass the TLS validation gate")
	}
}

// acceptAndCloseForever accepts and immediately closes connections until the
// listener itself is closed, simulating an unreachable/non-protocol-speaking peer.
func acceptAndCloseForever(ln net.Listener) {
	for {
		conn, err := ln.Accept()
		if err != nil {
			return
		}
		conn.Close()
	}
}
