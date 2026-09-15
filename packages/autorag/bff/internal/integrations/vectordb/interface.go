package vectordb

import (
	"context"
	"errors"
)

var ErrUnsupportedVectorDB = errors.New("unsupported vector DB: secret must contain MILVUS_URI or PGVECTOR_HOST")

// SearchResult is a single chunk returned by a search.
type SearchResult struct {
	ID    string
	Text  string
	Score float32
}

// VectorDB is an abstraction over Milvus and pgvector backends.
type VectorDB interface {
	// Search performs vector search against collection.
	// When hybrid is true, dense + sparse (Milvus) or vector + full-text (pgvector) are combined.
	// alpha weights the dense component (0 = sparse only, 1 = dense only); ignored when hybrid is false.
	Search(ctx context.Context, collection string, queryVec []float32, query string, topK int, alpha float32, hybrid bool) ([]SearchResult, error)
	Close() error
}
