package vectordb

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"strconv"
	"strings"
	"time"

	"github.com/milvus-io/milvus/client/v2/entity"
	milvusclient "github.com/milvus-io/milvus/client/v2/milvusclient"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/certificates"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

const (
	milvusTextField        = "content"
	milvusDenseVectorField = "vector"
	milvusSparseField      = "sparse"
	MilvusOperationTimeout = 15 * time.Second
	milvusCACertKey        = "MILVUS_CA_CERT"
	milvusLegacyCertKey    = "MILVUS_SERVER_CERT"
)

type milvusDB struct {
	client           milvusClient
	operationTimeout time.Duration
}

type milvusClient interface {
	Close(context.Context) error
	Search(context.Context, milvusclient.SearchOption, ...grpc.CallOption) ([]milvusclient.ResultSet, error)
	HybridSearch(context.Context, milvusclient.HybridSearchOption, ...grpc.CallOption) ([]milvusclient.ResultSet, error)
}

func resolveMilvusCertificate(data map[string][]byte) ([]byte, string) {
	if value := data[milvusCACertKey]; strings.TrimSpace(string(value)) != "" {
		return value, milvusCACertKey
	}
	if value := data[milvusLegacyCertKey]; strings.TrimSpace(string(value)) != "" {
		return value, milvusLegacyCertKey
	}
	return nil, ""
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
	return newMilvusFromSecretWithTimeout(ctx, data, MilvusOperationTimeout, func(connectCtx context.Context, cfg *milvusclient.ClientConfig) (milvusClient, error) {
		client, err := milvusclient.New(connectCtx, cfg)
		return client, err
	})
}

func newMilvusFromSecretWithTimeout(
	ctx context.Context,
	data map[string][]byte,
	timeout time.Duration,
	newClient func(context.Context, *milvusclient.ClientConfig) (milvusClient, error),
) (VectorDB, error) {
	return newMilvusFromSecretWithTimeoutPolicy(ctx, data, false, "", timeout, newClient)
}

func newMilvusFromSecretWithTimeoutPolicy(
	ctx context.Context,
	data map[string][]byte,
	allowLoopback bool,
	tlsServerName string,
	timeout time.Duration,
	newClient func(context.Context, *milvusclient.ClientConfig) (milvusClient, error),
) (VectorDB, error) {
	uri := strings.TrimSpace(string(data["MILVUS_URI"]))
	token := string(data["MILVUS_TOKEN"])
	certPEM, certKey := resolveMilvusCertificate(data)

	if uri == "" {
		return nil, fmt.Errorf("milvus secret missing MILVUS_URI")
	}
	if token != "" && strings.TrimSpace(token) == "" {
		return nil, fmt.Errorf("milvus secret MILVUS_TOKEN cannot be blank")
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

	cfg := &milvusclient.ClientConfig{
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
	safeDial := vectorSafeDialContext(dialer.DialContext, lookupIP, endpoint.inCluster, allowLoopback || endpoint.loopback)
	cfg.DialOptions = append(cfg.DialOptions, grpc.WithContextDialer(func(connectCtx context.Context, address string) (net.Conn, error) {
		return safeDial(connectCtx, "tcp", address)
	}))
	cfg.DialOptions = append(cfg.DialOptions, milvusclient.DefaultGrpcOpts...)
	if len(certPEM) > 0 || (useTLS && tlsServerName != "") {
		var pool *x509.CertPool
		if len(certPEM) > 0 {
			pool, err = certificates.SystemCertPoolWithPEM(certPEM, certKey)
			if err != nil {
				return nil, fmt.Errorf("milvus: %w", err)
			}
		}
		creds := credentials.NewTLS(milvusTLSConfig(pool, tlsServerName))
		cfg.DialOptions = append(cfg.DialOptions, grpc.WithTransportCredentials(creds))
		cfg.EnableTLSAuth = false
	}

	operationCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	c, err := newClient(operationCtx, cfg)
	if err != nil {
		if !endpoint.inCluster && !endpoint.loopback && len(certPEM) == 0 {
			slog.Warn("Secret is missing the CA certificate for an external vector database and connection with the system trust store failed; add the CA to the connection Secret or mount it in the AutoRAG BFF pod trust store", "db_type", "milvus")
		}
		return nil, fmt.Errorf("milvus connect: %w", classifyMilvusError(ctx, operationCtx, err))
	}
	return &milvusDB{client: c}, nil
}

func milvusTLSConfig(pool *x509.CertPool, serverName string) *tls.Config {
	return &tls.Config{RootCAs: pool, ServerName: serverName, MinVersion: tls.VersionTLS12}
}

func (m *milvusDB) Search(ctx context.Context, collection string, queryVec []float32, query string, options SearchOptions) ([]SearchResult, error) {
	if options.Ranker == "rrf" && options.AlphaSpecified {
		return nil, fmt.Errorf("%w: Milvus RRF does not use alpha; omit alpha or select weighted ranking", ErrUnsupportedSearch)
	}
	timeout := m.operationTimeout
	if timeout <= 0 {
		timeout = MilvusOperationTimeout
	}
	operationCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	var results []milvusclient.ResultSet
	var err error
	if options.Ranker == "" {
		search := milvusclient.NewSearchOption(collection, options.TopK, []entity.Vector{entity.FloatVector(queryVec)}).
			WithANNSField(milvusDenseVectorField).
			WithOutputFields(milvusTextField).
			WithSearchParam("metric_type", string(entity.COSINE))
		results, err = m.client.Search(operationCtx, search)
	} else {
		candidateLimit := hybridCandidateLimit(options.TopK)
		dense := milvusclient.NewAnnRequest(milvusDenseVectorField, candidateLimit, entity.FloatVector(queryVec)).
			WithSearchParam("metric_type", string(entity.COSINE))
		sparse := milvusclient.NewAnnRequest(milvusSparseField, candidateLimit, entity.Text(query)).
			WithSearchParam("metric_type", string(entity.BM25))
		search := milvusclient.NewHybridSearchOption(collection, options.TopK, dense, sparse).
			WithOutputFields(milvusTextField)
		switch options.Ranker {
		case "rrf":
			search.WithReranker(milvusclient.NewRRFReranker().WithK(options.RankerK))
		case "weighted":
			search.WithReranker(milvusclient.NewWeightedReranker([]float64{float64(options.Alpha), float64(1 - options.Alpha)}))
		default:
			return nil, fmt.Errorf("%w: unknown Milvus ranker %q", ErrUnsupportedSearch, options.Ranker)
		}
		results, err = m.client.HybridSearch(operationCtx, search)
	}
	if err != nil {
		return nil, fmt.Errorf("milvus search: %w", classifyMilvusError(ctx, operationCtx, err))
	}
	parsed, err := extractMilvusResults(results, options.TopK)
	if err != nil {
		return nil, err
	}
	return parsed, nil
}

func extractMilvusResults(results []milvusclient.ResultSet, topK int) ([]SearchResult, error) {
	out := make([]SearchResult, 0, topK)
	totalBytes := 0
	for _, r := range results {
		if r.Err != nil {
			return nil, r.Err
		}
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
				} else if v, idErr := r.IDs.GetAsInt64(i); idErr == nil {
					id = strconv.FormatInt(v, 10)
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
	return m.client.Close(context.Background())
}
