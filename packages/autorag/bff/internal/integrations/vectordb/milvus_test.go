package vectordb

import (
	"context"
	"errors"
	"net"
	"testing"
	"time"

	milvusclient "github.com/milvus-io/milvus-sdk-go/v2/client"
	"github.com/milvus-io/milvus-sdk-go/v2/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type timeoutMilvusClient struct {
	observedContext context.Context
}

func (m *timeoutMilvusClient) Close() error { return nil }

func (m *timeoutMilvusClient) Search(ctx context.Context, _ string, _ []string, _ string, _ []string, _ []entity.Vector, _ string, _ entity.MetricType, _ int, _ entity.SearchParam, _ ...milvusclient.SearchQueryOptionFunc) ([]milvusclient.SearchResult, error) {
	m.observedContext = ctx
	<-ctx.Done()
	return nil, ctx.Err()
}

func TestMilvusSearch_RespectsCallerDeadlineAndPreservesDeadline(t *testing.T) {
	client := &timeoutMilvusClient{}
	db := &milvusDB{client: client}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	started := time.Now()
	_, err := db.Search(ctx, "collection", []float32{1}, "query", 1, 0.5, false)

	assert.ErrorIs(t, err, context.DeadlineExceeded)
	assert.NotErrorIs(t, err, ErrDatabaseTimeout)
	assert.NotNil(t, client.observedContext)
	assert.Less(t, time.Since(started), time.Second)
}

func TestClassifyMilvusError_ParentCancellation(t *testing.T) {
	parentCtx, cancel := context.WithCancel(context.Background())
	cancel()
	operationCtx := context.Background()

	err := classifyMilvusError(parentCtx, operationCtx, context.Canceled)

	assert.ErrorIs(t, err, context.Canceled)
	assert.NotErrorIs(t, err, ErrDatabaseTimeout)
}

func TestClassifyMilvusError_ParentDeadline(t *testing.T) {
	parentCtx, cancel := context.WithTimeout(context.Background(), 0)
	defer cancel()
	operationCtx := context.Background()

	err := classifyMilvusError(parentCtx, operationCtx, context.DeadlineExceeded)

	assert.ErrorIs(t, err, context.DeadlineExceeded)
	assert.NotErrorIs(t, err, ErrDatabaseTimeout)
	assert.NotContains(t, err.Error(), "password")
}

func TestClassifyMilvusError_InternalDeadline(t *testing.T) {
	parentCtx := context.Background()
	operationCtx, cancel := context.WithTimeout(context.Background(), 0)
	defer cancel()

	err := classifyMilvusError(parentCtx, operationCtx, context.DeadlineExceeded)

	assert.ErrorIs(t, err, ErrDatabaseTimeout)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
	assert.NotContains(t, err.Error(), "password")
}

func TestClassifyMilvusError_ConnectionFailure(t *testing.T) {
	err := classifyMilvusError(context.Background(), context.Background(), errors.New("dial failed"))

	assert.ErrorIs(t, err, ErrDatabaseUnavailable)
	assert.NotErrorIs(t, err, ErrDatabaseTimeout)
}

func TestNewMilvusFromSecret_MissingURI(t *testing.T) {
	_, err := newMilvusFromSecret(context.Background(), map[string][]byte{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "missing MILVUS_URI")
}

func TestNewMilvusFromSecret_InternalDeadlineIsDatabaseTimeout(t *testing.T) {
	started := make(chan struct{})
	newClient := func(ctx context.Context, _ milvusclient.Config) (milvusClient, error) {
		close(started)
		<-ctx.Done()
		return nil, ctx.Err()
	}

	result := make(chan error, 1)
	go func() {
		_, err := newMilvusFromSecretWithTimeout(context.Background(), map[string][]byte{
			"MILVUS_URI": []byte("http://127.0.0.1:19530"),
		}, 10*time.Millisecond, newClient)
		result <- err
	}()

	<-started
	err := <-result
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrDatabaseTimeout)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
}

func TestMilvusSearch_RejectsHybridSearch(t *testing.T) {
	db := &milvusDB{}
	_, err := db.Search(context.Background(), "collection", nil, "query", 5, 0.5, true)
	require.ErrorIs(t, err, ErrUnsupportedSearch)
	assert.Contains(t, err.Error(), "Milvus hybrid search is not supported")
}

func TestMilvusSearch_InternalDeadlineIsDatabaseTimeout(t *testing.T) {
	client := &timeoutMilvusClient{}
	db := &milvusDB{client: client, operationTimeout: 10 * time.Millisecond}

	_, err := db.Search(context.Background(), "collection", []float32{1}, "query", 1, 0.5, false)

	require.Error(t, err)
	assert.ErrorIs(t, err, ErrDatabaseTimeout)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
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
