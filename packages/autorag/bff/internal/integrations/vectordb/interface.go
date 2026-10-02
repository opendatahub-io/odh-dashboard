package vectordb

import (
	"context"
	"errors"
	"fmt"
)

var ErrUnsupportedVectorDB = errors.New("unsupported vector DB: secret must contain MILVUS_URI or PGVECTOR_HOST")

var ErrUnsupportedSearch = errors.New("unsupported vector DB search options")

var ErrDatabaseUnavailable = errors.New("vector database unavailable")

var ErrDatabaseTimeout = errors.New("vector database operation timed out")

// ValidateSearchOptions rejects combinations that the selected backend cannot support.
func ValidateSearchOptions(data map[string][]byte, hybrid bool) error {
	if _, milvus := data["MILVUS_URI"]; !milvus {
		if _, pgvector := data["PGVECTOR_HOST"]; !pgvector {
			return fmt.Errorf("%w", ErrUnsupportedVectorDB)
		}
	}
	if hybrid {
		if _, ok := data["MILVUS_URI"]; ok {
			return fmt.Errorf("%w: Milvus hybrid search is not supported", ErrUnsupportedSearch)
		}
	}
	return nil
}

// SearchResult is a single chunk returned by a search.
type SearchResult struct {
	ID    string
	Text  string
	Score float32
}

// VectorDB is an abstraction over Milvus and pgvector backends.
type VectorDB interface {
	// Search performs vector search against collection.
	// When hybrid is true, pgvector combines vector + full-text results with RRF.
	// Milvus rejects hybrid requests because sparse hybrid retrieval is not implemented.
	// alpha weights the dense component (0 = sparse only, 1 = dense only); ignored when hybrid is false.
	Search(ctx context.Context, collection string, queryVec []float32, query string, topK int, alpha float32, hybrid bool) ([]SearchResult, error)
	Close() error
}
