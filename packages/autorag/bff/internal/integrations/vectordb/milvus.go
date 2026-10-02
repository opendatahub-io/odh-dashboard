package vectordb

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"strings"
	"time"

	milvusclient "github.com/milvus-io/milvus-sdk-go/v2/client"
	"github.com/milvus-io/milvus-sdk-go/v2/entity"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/certificates"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

const (
	milvusTextField        = "content"
	milvusDenseVectorField = "vector"
	milvusSparseField      = "sparse"
	MilvusOperationTimeout = 15 * time.Second
)

type milvusDB struct {
	client           milvusClient
	operationTimeout time.Duration
}

type milvusClient interface {
	Close() error
	Search(context.Context, string, []string, string, []string, []entity.Vector, string, entity.MetricType, int, entity.SearchParam, ...milvusclient.SearchQueryOptionFunc) ([]milvusclient.SearchResult, error)
}

func classifyMilvusError(parentCtx, operationCtx context.Context, err error) error {
	if parentErr := parentCtx.Err(); parentErr != nil {
		return fmt.Errorf("%w: %w", parentErr, err)
	}
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(operationCtx.Err(), context.DeadlineExceeded) {
		return fmt.Errorf("%w: %w", ErrDatabaseTimeout, err)
	}
	return fmt.Errorf("%w: %w", ErrDatabaseUnavailable, err)
}

func newMilvusFromSecret(ctx context.Context, data map[string][]byte) (VectorDB, error) {
	return newMilvusFromSecretWithTimeout(ctx, data, MilvusOperationTimeout, func(connectCtx context.Context, cfg milvusclient.Config) (milvusClient, error) {
		client, err := milvusclient.NewClient(connectCtx, cfg)
		return client, err
	})
}

func newMilvusFromSecretWithTimeout(
	ctx context.Context,
	data map[string][]byte,
	timeout time.Duration,
	newClient func(context.Context, milvusclient.Config) (milvusClient, error),
) (VectorDB, error) {
	uri := strings.TrimSpace(string(data["MILVUS_URI"]))
	token := strings.TrimSpace(string(data["MILVUS_TOKEN"]))
	certPEM := data["MILVUS_SERVER_CERT"]

	if uri == "" {
		return nil, fmt.Errorf("milvus secret missing MILVUS_URI")
	}

	var username, password string
	if parts := strings.SplitN(token, ":", 2); len(parts) == 2 {
		username = parts[0]
		password = parts[1]
	}

	addr := strings.TrimPrefix(strings.TrimPrefix(uri, "https://"), "http://")
	useTLS := strings.HasPrefix(uri, "https://")

	if !useTLS {
		host := addr
		if h, _, err := net.SplitHostPort(addr); err == nil {
			host = h
		}
		if !isLocalNetworkHost(host) {
			return nil, fmt.Errorf(
				"milvus: plaintext (http://) is only allowed for localhost or *.cluster.local hosts, got %q — use https:// with MILVUS_SERVER_CERT", host)
		}
	}

	cfg := milvusclient.Config{
		Address:       addr,
		Username:      username,
		Password:      password,
		EnableTLSAuth: useTLS,
	}

	if len(certPEM) > 0 {
		pool, err := certificates.SystemCertPoolWithPEM(certPEM, "MILVUS_SERVER_CERT")
		if err != nil {
			return nil, fmt.Errorf("milvus: %w", err)
		}
		creds := credentials.NewTLS(&tls.Config{RootCAs: pool})
		cfg.DialOptions = append(cfg.DialOptions, grpc.WithTransportCredentials(creds))
		cfg.EnableTLSAuth = false
	}

	operationCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	c, err := newClient(operationCtx, cfg)
	if err != nil {
		return nil, fmt.Errorf("milvus connect: %w", classifyMilvusError(ctx, operationCtx, err))
	}
	return &milvusDB{client: c}, nil
}

func (m *milvusDB) Search(ctx context.Context, collection string, queryVec []float32, query string, topK int, alpha float32, hybrid bool) ([]SearchResult, error) {
	if hybrid {
		return nil, fmt.Errorf("%w: Milvus hybrid search is not supported", ErrUnsupportedSearch)
	}
	sp, _ := entity.NewIndexFlatSearchParam()

	timeout := m.operationTimeout
	if timeout <= 0 {
		timeout = MilvusOperationTimeout
	}
	operationCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	results, err := m.client.Search(operationCtx, collection, nil, "", []string{milvusTextField},
		[]entity.Vector{entity.FloatVector(queryVec)}, milvusDenseVectorField, entity.COSINE, topK, sp)
	if err != nil {
		return nil, fmt.Errorf("milvus dense search: %w", classifyMilvusError(ctx, operationCtx, err))
	}
	return extractMilvusResults(results, topK), nil
}

func extractMilvusResults(results []milvusclient.SearchResult, topK int) []SearchResult {
	out := make([]SearchResult, 0, topK)
	for _, r := range results {
		for i := range r.Scores {
			text := ""
			for _, col := range r.Fields {
				if col.Name() == milvusTextField && i < col.Len() {
					if v, colErr := col.GetAsString(i); colErr == nil {
						text = v
					}
				}
			}
			id := ""
			if r.IDs != nil && i < r.IDs.Len() {
				if v, idErr := r.IDs.GetAsString(i); idErr == nil {
					id = v
				}
			}
			out = append(out, SearchResult{
				ID:    id,
				Text:  text,
				Score: r.Scores[i],
			})
		}
	}
	return out
}

func (m *milvusDB) Close() error {
	return m.client.Close()
}
