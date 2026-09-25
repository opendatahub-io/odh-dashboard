package vectordb

import (
	"context"
	"net"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewPgvectorFromSecret_MissingRequiredFields(t *testing.T) {
	_, err := newPgvectorFromSecret(context.Background(), map[string][]byte{
		"PGVECTOR_HOST": []byte("localhost"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "missing required fields")
}

func TestNewPgvectorFromSecret_InvalidPort(t *testing.T) {
	_, err := newPgvectorFromSecret(context.Background(), map[string][]byte{
		"PGVECTOR_HOST": []byte("localhost"),
		"PGVECTOR_DB":   []byte("db"),
		"PGVECTOR_USER": []byte("user"),
		"PGVECTOR_PORT": []byte("not-a-port"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid PGVECTOR_PORT")
}

func TestNewPgvectorFromSecret_PortOutOfRange(t *testing.T) {
	_, err := newPgvectorFromSecret(context.Background(), map[string][]byte{
		"PGVECTOR_HOST": []byte("localhost"),
		"PGVECTOR_DB":   []byte("db"),
		"PGVECTOR_USER": []byte("user"),
		"PGVECTOR_PORT": []byte("70000"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid PGVECTOR_PORT")
	assert.Contains(t, err.Error(), "1-65535")
}

func TestNewPgvectorFromSecret_InvalidSSLMode(t *testing.T) {
	_, err := newPgvectorFromSecret(context.Background(), map[string][]byte{
		"PGVECTOR_HOST":    []byte("localhost"),
		"PGVECTOR_DB":      []byte("db"),
		"PGVECTOR_USER":    []byte("user"),
		"PGVECTOR_SSLMODE": []byte("not-a-real-mode"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid PGVECTOR_SSLMODE")
}

func TestNewPgvectorFromSecret_DisableRejectedForRemoteHost(t *testing.T) {
	_, err := newPgvectorFromSecret(context.Background(), map[string][]byte{
		"PGVECTOR_HOST":    []byte("db.apps.example.com"),
		"PGVECTOR_DB":      []byte("db"),
		"PGVECTOR_USER":    []byte("user"),
		"PGVECTOR_SSLMODE": []byte("disable"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "sslmode=disable is only allowed")
}

func TestNewPgvectorFromSecret_DisableDefaultRejectedForRemoteHostWithoutCert(t *testing.T) {
	_, err := newPgvectorFromSecret(context.Background(), map[string][]byte{
		"PGVECTOR_HOST": []byte("db.apps.example.com"),
		"PGVECTOR_DB":   []byte("db"),
		"PGVECTOR_USER": []byte("user"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "sslmode=disable is only allowed")
}

func TestNewPgvectorFromSecret_MalformedServerCert(t *testing.T) {
	_, err := newPgvectorFromSecret(context.Background(), map[string][]byte{
		"PGVECTOR_HOST":        []byte("localhost"),
		"PGVECTOR_DB":          []byte("db"),
		"PGVECTOR_USER":        []byte("user"),
		"PGVECTOR_SERVER_CERT": []byte("not a certificate"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse PGVECTOR_SERVER_CERT")
}

// TestNewPgvectorFromSecret_DisableAllowedForLocalhost proves the localhost
// exception actually lets execution reach the connection attempt, rather than
// being rejected by the sslmode validation gate. It dials a bare loopback TCP
// listener that speaks no Postgres wire protocol, so pgx is guaranteed to fail
// the handshake — the assertion is only that the failure is not the
// "sslmode=disable ... only allowed" validation error.
func TestNewPgvectorFromSecret_DisableAllowedForLocalhost(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	defer ln.Close()
	go acceptAndCloseForever(ln)

	_, portStr, err := net.SplitHostPort(ln.Addr().String())
	require.NoError(t, err)
	_, err = strconv.Atoi(portStr)
	require.NoError(t, err)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = newPgvectorFromSecret(ctx, map[string][]byte{
		"PGVECTOR_HOST": []byte("127.0.0.1"),
		"PGVECTOR_PORT": []byte(portStr),
		"PGVECTOR_DB":   []byte("db"),
		"PGVECTOR_USER": []byte("user"),
	})
	require.Error(t, err, "dummy listener speaks no Postgres protocol, connection must fail")
	assert.NotContains(t, err.Error(), "sslmode=disable is only allowed",
		"localhost should pass the sslmode validation gate")
}

func TestSanitizeIdentifier(t *testing.T) {
	assert.Equal(t, "vs_abc_123", sanitizeIdentifier("vs-abc-123"))
	assert.Equal(t, "vs_abc_123", sanitizeIdentifier("vs.abc.123"))
	assert.Equal(t, "already_fine", sanitizeIdentifier("already_fine"))
	assert.Equal(t, "mix_of_both_things", sanitizeIdentifier("mix-of.both-things"))
}
