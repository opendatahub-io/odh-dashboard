package vectordb

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"testing"
	"time"

	"github.com/milvus-io/milvus-proto/go-api/v2/commonpb"
	"github.com/milvus-io/milvus/client/v2/column"
	"github.com/milvus-io/milvus/client/v2/entity"
	milvusclient "github.com/milvus-io/milvus/client/v2/milvusclient"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/proto"
)

type timeoutMilvusClient struct {
	observedContext context.Context
}

func (m *timeoutMilvusClient) Close(context.Context) error { return nil }

func (m *timeoutMilvusClient) Search(ctx context.Context, _ milvusclient.SearchOption, _ ...grpc.CallOption) ([]milvusclient.ResultSet, error) {
	m.observedContext = ctx
	<-ctx.Done()
	return nil, ctx.Err()
}

func (m *timeoutMilvusClient) HybridSearch(ctx context.Context, _ milvusclient.HybridSearchOption, _ ...grpc.CallOption) ([]milvusclient.ResultSet, error) {
	m.observedContext = ctx
	<-ctx.Done()
	return nil, ctx.Err()
}

type captureMilvusClient struct {
	searchOption milvusclient.SearchOption
	hybridOption milvusclient.HybridSearchOption
}

func (m *captureMilvusClient) Close(context.Context) error { return nil }

func (m *captureMilvusClient) Search(_ context.Context, option milvusclient.SearchOption, _ ...grpc.CallOption) ([]milvusclient.ResultSet, error) {
	m.searchOption = option
	return nil, nil
}

func (m *captureMilvusClient) HybridSearch(_ context.Context, option milvusclient.HybridSearchOption, _ ...grpc.CallOption) ([]milvusclient.ResultSet, error) {
	m.hybridOption = option
	return nil, nil
}

func TestMilvusSearchUsesDenseAndBM25Requests(t *testing.T) {
	for _, tc := range []struct {
		name, ranker, strategy, params string
		alpha, k                       float64
	}{
		{name: "rrf", ranker: "rrf", strategy: "rrf", params: `{"k":42}`, alpha: 0.5, k: 42},
		{name: "weighted", ranker: "weighted", strategy: "weighted", params: `{"weights":[0.25,0.75]}`, alpha: 0.25, k: 60},
	} {
		t.Run(tc.name, func(t *testing.T) {
			client := &captureMilvusClient{}
			db := &milvusDB{client: client}
			_, err := db.Search(context.Background(), "documents", []float32{0.1, 0.2}, "search words", SearchOptions{
				TopK: 5, Ranker: tc.ranker, Alpha: float32(tc.alpha), RankerK: tc.k,
			})
			require.NoError(t, err)
			assert.Nil(t, client.searchOption)
			require.NotNil(t, client.hybridOption)
			request, err := client.hybridOption.HybridRequest()
			require.NoError(t, err)
			assert.Equal(t, "documents", request.GetCollectionName())
			assert.Equal(t, []string{milvusTextField}, request.GetOutputFields())
			require.Len(t, request.GetRequests(), 2)
			fields := []string{milvusDenseVectorField, milvusSparseField}
			metrics := []string{string(entity.COSINE), string(entity.BM25)}
			for i, search := range request.GetRequests() {
				params := entity.KvPairsMap(search.GetSearchParams())
				assert.Equal(t, fields[i], params["anns_field"])
				assert.Equal(t, metrics[i], params["metric_type"])
			}
			var placeholder commonpb.PlaceholderGroup
			require.NoError(t, proto.Unmarshal(request.GetRequests()[1].GetPlaceholderGroup(), &placeholder))
			require.Len(t, placeholder.GetPlaceholders(), 1)
			assert.Equal(t, commonpb.PlaceholderType_VarChar, placeholder.GetPlaceholders()[0].GetType())
			assert.Equal(t, []byte("search words"), placeholder.GetPlaceholders()[0].GetValues()[0])
			rankParams := entity.KvPairsMap(request.GetRankParams())
			assert.Equal(t, tc.strategy, rankParams["strategy"])
			assert.JSONEq(t, tc.params, rankParams["params"])
		})
	}
}

func TestMilvusDenseSearchKeepsVectorFieldAndContent(t *testing.T) {
	client := &captureMilvusClient{}
	db := &milvusDB{client: client}
	_, err := db.Search(context.Background(), "documents", []float32{0.1, 0.2}, "query", SearchOptions{TopK: 5})
	require.NoError(t, err)
	assert.Nil(t, client.hybridOption)
	require.NotNil(t, client.searchOption)
	request, err := client.searchOption.Request()
	require.NoError(t, err)
	assert.Equal(t, "documents", request.GetCollectionName())
	assert.Equal(t, []string{milvusTextField}, request.GetOutputFields())
	params := entity.KvPairsMap(request.GetSearchParams())
	assert.Equal(t, milvusDenseVectorField, params["anns_field"])
	assert.Equal(t, string(entity.COSINE), params["metric_type"])
}

func TestExtractMilvusResultsPreservesContentAndPrimaryKeys(t *testing.T) {
	results, err := extractMilvusResults([]milvusclient.ResultSet{
		{
			IDs:    column.NewColumnInt64("id", []int64{42}),
			Fields: milvusclient.DataSet{column.NewColumnVarChar(milvusTextField, []string{"first chunk"})},
			Scores: []float32{0.75},
		},
		{
			IDs:    column.NewColumnVarChar("id", []string{"chunk-2"}),
			Fields: milvusclient.DataSet{column.NewColumnVarChar(milvusTextField, []string{"second chunk"})},
			Scores: []float32{0.5},
		},
	}, 2)
	require.NoError(t, err)
	assert.Equal(t, []SearchResult{
		{ID: "42", Text: "first chunk", Score: 0.75},
		{ID: "chunk-2", Text: "second chunk", Score: 0.5},
	}, results)
}

func TestMilvusSearchRejectsRRFAlphaBeforeConnecting(t *testing.T) {
	db := &milvusDB{}
	_, err := db.Search(context.Background(), "documents", nil, "query", SearchOptions{
		TopK: 5, Ranker: "rrf", Alpha: 0.5, AlphaSpecified: true, RankerK: 60,
	})
	require.ErrorIs(t, err, ErrUnsupportedSearch)
}

func TestMilvusSearch_RespectsCallerDeadlineAndPreservesDeadline(t *testing.T) {
	client := &timeoutMilvusClient{}
	db := &milvusDB{client: client}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	started := time.Now()
	_, err := db.Search(ctx, "collection", []float32{1}, "query", SearchOptions{TopK: 1})

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
	newClient := func(ctx context.Context, _ *milvusclient.ClientConfig) (milvusClient, error) {
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

func TestMilvusSearch_InternalDeadlineIsDatabaseTimeout(t *testing.T) {
	client := &timeoutMilvusClient{}
	db := &milvusDB{client: client, operationTimeout: 10 * time.Millisecond}

	_, err := db.Search(context.Background(), "collection", []float32{1}, "query", SearchOptions{TopK: 1})

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
		"MILVUS_URI":     []byte("https://milvus.apps.example.com:19530"),
		"MILVUS_CA_CERT": []byte("not a certificate"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse MILVUS_CA_CERT")
}

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
	}, true, "", 10*time.Millisecond, func(ctx context.Context, cfg *milvusclient.ClientConfig) (milvusClient, error) {
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
			var got milvusclient.ClientConfig
			_, err := newMilvusFromSecretWithTimeoutPolicy(context.Background(), map[string][]byte{
				"MILVUS_URI":   []byte("http://localhost:4321"),
				"MILVUS_TOKEN": []byte(tt.token),
			}, true, "", time.Millisecond, func(_ context.Context, cfg *milvusclient.ClientConfig) (milvusClient, error) {
				got = *cfg
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
	config := milvusTLSConfig(pool, "milvus.team-a.svc.cluster.local")

	assert.Same(t, pool, config.RootCAs)
	assert.Equal(t, "milvus.team-a.svc.cluster.local", config.ServerName)
	assert.Equal(t, uint16(tls.VersionTLS12), config.MinVersion)
}
