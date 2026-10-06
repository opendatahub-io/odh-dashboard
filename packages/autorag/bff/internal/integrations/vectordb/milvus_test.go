package vectordb

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
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
			"MILVUS_URI": []byte("http://milvus.team-a.svc.cluster.local:19530"),
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
	assert.Contains(t, err.Error(), "external endpoints must use https")
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
// Literal addresses are rejected before any connection attempt.
func TestNewMilvusFromSecret_RejectsLiteralIP(t *testing.T) {
	_, err := newMilvusFromSecret(context.Background(), map[string][]byte{
		"MILVUS_URI": []byte("http://127.0.0.1:19530"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "literal IP")
}

func TestNewMilvusFromForwardedSecret_AllowsLocalhost(t *testing.T) {
	var gotAddress string
	_, err := newMilvusFromSecretWithTimeoutPolicy(context.Background(), map[string][]byte{
		"MILVUS_URI": []byte("http://localhost:4321"),
	}, true, 10*time.Millisecond, func(ctx context.Context, cfg milvusclient.Config) (milvusClient, error) {
		gotAddress = cfg.Address
		return nil, context.DeadlineExceeded
	})

	require.Error(t, err)
	assert.Equal(t, "localhost:4321", gotAddress)
}

func TestNewMilvusFromSecret_ParsesTokenForms(t *testing.T) {
	tests := []struct {
		name     string
		token    string
		username string
		password string
		apiKey   string
	}{
		{name: "colon credentials", token: "user:password", username: "user", password: "password"},
		{name: "API key", token: "api-key", apiKey: "api-key"},
		{name: "empty token"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got milvusclient.Config
			_, err := newMilvusFromSecretWithTimeoutPolicy(context.Background(), map[string][]byte{
				"MILVUS_URI":   []byte("http://localhost:4321"),
				"MILVUS_TOKEN": []byte(tt.token),
			}, true, time.Millisecond, func(_ context.Context, cfg milvusclient.Config) (milvusClient, error) {
				got = cfg
				return nil, context.DeadlineExceeded
			})

			require.Error(t, err)
			assert.Equal(t, tt.username, got.Username)
			assert.Equal(t, tt.password, got.Password)
			assert.Equal(t, tt.apiKey, got.APIKey)
		})
	}
}

func TestMilvusTLSConfigUsesCustomCAPoolAndTLS12Minimum(t *testing.T) {
	pool := x509.NewCertPool()
	config := milvusTLSConfig(pool)

	assert.Same(t, pool, config.RootCAs)
	assert.Equal(t, uint16(tls.VersionTLS12), config.MinVersion)
}
