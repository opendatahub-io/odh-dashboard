package vectordb

import (
	"context"
	"math"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHybridCandidateLimit(t *testing.T) {
	assert.Equal(t, 50, hybridCandidateLimit(5))
	assert.Equal(t, maxHybridCandidates, hybridCandidateLimit(100))
	assert.Equal(t, maxHybridCandidates, hybridCandidateLimit(math.MaxInt))
}

func TestHybridSearchSQLCandidateLimits(t *testing.T) {
	sql := pgvectorHybridSearchSQL("documents")
	vectorCandidatesStart := strings.Index(sql, "vector_candidates")
	vectorRankedStart := strings.Index(sql, "vector_ranked AS")
	textCandidatesStart := strings.Index(sql, "text_candidates")
	textRankedStart := strings.Index(sql, "text_ranked AS")
	require.GreaterOrEqual(t, vectorCandidatesStart, 0)
	require.Greater(t, vectorRankedStart, vectorCandidatesStart)
	require.GreaterOrEqual(t, textCandidatesStart, 0)
	require.Greater(t, textRankedStart, textCandidatesStart)
	vectorCandidateSQL := sql[vectorCandidatesStart:vectorRankedStart]
	textCandidateSQL := sql[textCandidatesStart:textRankedStart]
	assert.Contains(t, vectorCandidateSQL, "LIMIT $6")
	assert.Contains(t, textCandidateSQL, "LIMIT $6")
	assert.NotContains(t, vectorCandidateSQL, "ROW_NUMBER")
	assert.NotContains(t, textCandidateSQL, "ROW_NUMBER")
	assert.Equal(t, 2, strings.Count(sql, "LIMIT $6"))
	assert.Contains(t, sql, "LIMIT $7")
	assert.Contains(t, sql, "FROM documents")
}

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
		"PGVECTOR_HOST":    []byte("postgres.team-a.cluster.local"),
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
	assert.Contains(t, err.Error(), "external endpoints must use TLS")
}

func TestDefaultPgvectorSSLMode(t *testing.T) {
	assert.Equal(t, "verify-full", defaultPgvectorSSLMode(false, false, false), "external endpoints use system-trust TLS without a custom CA")
	assert.Equal(t, "verify-full", defaultPgvectorSSLMode(true, false, true))
	assert.Equal(t, "disable", defaultPgvectorSSLMode(true, false, false))
	assert.Equal(t, "disable", defaultPgvectorSSLMode(false, true, false))
}

func TestNewPgvectorFromSecret_MalformedServerCert(t *testing.T) {
	_, err := newPgvectorFromSecret(context.Background(), map[string][]byte{
		"PGVECTOR_HOST":    []byte("postgres.team-a.svc.cluster.local"),
		"PGVECTOR_DB":      []byte("db"),
		"PGVECTOR_USER":    []byte("user"),
		"PGVECTOR_CA_CERT": []byte("not a certificate"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse PGVECTOR_CA_CERT")
}

// TestNewPgvectorFromSecret_DisableAllowedForLocalhost proves the localhost
// exception actually lets execution reach the connection attempt, rather than
// being rejected by the sslmode validation gate. It dials a bare loopback TCP
// listener that speaks no Postgres wire protocol, so pgx is guaranteed to fail
// the handshake — the assertion is only that the failure is not the
// "sslmode=disable ... only allowed" validation error.
func TestNewPgvectorFromSecret_RejectsLiteralIP(t *testing.T) {
	_, err := newPgvectorFromSecret(context.Background(), map[string][]byte{
		"PGVECTOR_HOST": []byte("127.0.0.1"),
		"PGVECTOR_DB":   []byte("db"),
		"PGVECTOR_USER": []byte("user"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "literal IP")
}

func TestSanitizeIdentifier(t *testing.T) {
	assert.Equal(t, "vs_abc_123", sanitizeIdentifier("vs-abc-123"))
	assert.Equal(t, "vs_abc_123", sanitizeIdentifier("vs.abc.123"))
	assert.Equal(t, "already_fine", sanitizeIdentifier("already_fine"))
	assert.Equal(t, "mix_of_both_things", sanitizeIdentifier("mix-of.both-things"))
}
