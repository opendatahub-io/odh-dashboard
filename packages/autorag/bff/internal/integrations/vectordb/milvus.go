package vectordb

import (
	"context"
	"crypto/tls"
	"crypto/x509"
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
	return newMilvusFromSecretWithTimeoutPolicy(ctx, data, false, timeout, newClient)
}

func newMilvusFromSecretWithTimeoutPolicy(
	ctx context.Context,
	data map[string][]byte,
	allowLoopback bool,
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
	var apiKey string
	if parts := strings.SplitN(token, ":", 2); len(parts) == 2 {
		username = parts[0]
		password = parts[1]
	} else if token != "" {
		apiKey = token
	}

	var endpoint vectorEndpoint
	var err error
	if allowLoopback {
		endpoint, err = parseMilvusEndpointWithLoopback(uri, true)
	} else {
		endpoint, err = parseMilvusEndpoint(uri)
	}
	if err != nil {
		return nil, fmt.Errorf("milvus: %w", err)
	}
	addr := endpoint.address
	useTLS := endpoint.useTLS

	cfg := milvusclient.Config{
		Address:       addr,
		Username:      username,
		Password:      password,
		APIKey:        apiKey,
		EnableTLSAuth: useTLS,
	}

	lookupIP := func(connectCtx context.Context, host string) ([]net.IP, error) {
		return net.DefaultResolver.LookupIP(connectCtx, "ip", host)
	}
	dialer := &net.Dialer{}
	safeDial := vectorSafeDialContext(dialer.DialContext, lookupIP, endpoint.inCluster, allowLoopback)
	cfg.DialOptions = append(cfg.DialOptions, grpc.WithContextDialer(func(connectCtx context.Context, address string) (net.Conn, error) {
		return safeDial(connectCtx, "tcp", address)
	}))

	if len(certPEM) > 0 {
		pool, err := certificates.SystemCertPoolWithPEM(certPEM, "MILVUS_SERVER_CERT")
		if err != nil {
			return nil, fmt.Errorf("milvus: %w", err)
		}
		creds := credentials.NewTLS(milvusTLSConfig(pool))
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

func milvusTLSConfig(pool *x509.CertPool) *tls.Config {
	return &tls.Config{RootCAs: pool, MinVersion: tls.VersionTLS12}
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
	parsed, err := extractMilvusResults(results, topK)
	if err != nil {
		return nil, err
	}
	return parsed, nil
}

func extractMilvusResults(results []milvusclient.SearchResult, topK int) ([]SearchResult, error) {
	out := make([]SearchResult, 0, topK)
	totalBytes := 0
	for _, r := range results {
		for i := range r.Scores {
			text := ""
			for _, col := range r.Fields {
				if col.Name() == milvusTextField && i < col.Len() {
					if v, colErr := col.GetAsString(i); colErr == nil {
						var sizeErr error
						totalBytes, sizeErr = validateResultTextSize(totalBytes, v)
						if sizeErr != nil {
							return nil, sizeErr
						}
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
	return out, nil
}

func (m *milvusDB) Close() error {
	return m.client.Close()
}
