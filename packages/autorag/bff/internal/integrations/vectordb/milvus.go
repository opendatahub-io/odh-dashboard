package vectordb

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"strings"

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
)

type milvusDB struct {
	client milvusclient.Client
}

func newMilvusFromSecret(ctx context.Context, data map[string][]byte) (VectorDB, error) {
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

	c, err := milvusclient.NewClient(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("milvus connect: %w", err)
	}
	return &milvusDB{client: c}, nil
}

func (m *milvusDB) Search(ctx context.Context, collection string, queryVec []float32, query string, topK int, alpha float32, hybrid bool) ([]SearchResult, error) {
	sp, _ := entity.NewIndexFlatSearchParam()

	denseReq := milvusclient.NewANNSearchRequest(
		milvusDenseVectorField,
		entity.COSINE,
		"",
		[]entity.Vector{entity.FloatVector(queryVec)},
		sp,
		topK,
	)

	if hybrid {
		// Hybrid search requires a pre-built sparse vector. Without one, we attempt
		// HybridSearch with a single ANN request (weighted reranker on dense only).
		// If the collection lacks a sparse field the call degrades to dense search.
		reranker := milvusclient.NewWeightedReranker([]float64{1.0})
		results, err := m.client.HybridSearch(ctx, collection, nil, topK, []string{milvusTextField}, reranker,
			[]*milvusclient.ANNSearchRequest{denseReq})
		if err != nil {
			// Fall back to plain dense search if hybrid is unsupported.
			results, err = m.client.Search(ctx, collection, nil, "", []string{milvusTextField},
				[]entity.Vector{entity.FloatVector(queryVec)}, milvusDenseVectorField, entity.COSINE, topK, sp)
			if err != nil {
				return nil, fmt.Errorf("milvus dense search fallback: %w", err)
			}
		}
		return extractMilvusResults(results, topK), nil
	}

	results, err := m.client.Search(ctx, collection, nil, "", []string{milvusTextField},
		[]entity.Vector{entity.FloatVector(queryVec)}, milvusDenseVectorField, entity.COSINE, topK, sp)
	if err != nil {
		return nil, fmt.Errorf("milvus dense search: %w", err)
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
