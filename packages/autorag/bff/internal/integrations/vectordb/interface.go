package vectordb

import (
	"context"
	"errors"
	"fmt"

	"github.com/opendatahub-io/autorag-library/bff/internal/database"
)

var ErrUnsupportedVectorDB = errors.New("unsupported vector DB: secret must contain MILVUS_URI or PGVECTOR_HOST")

var ErrUnsupportedSearch = errors.New("unsupported vector DB search options")

var ErrDatabaseUnavailable = errors.New("vector database unavailable")

var ErrDatabaseTimeout = errors.New("vector database operation timed out")

var ErrResultContentLimit = errors.New("vector result content limit exceeded")

const (
	MaxVectorResultBytes      = 1 << 20
	MaxVectorResultTotalBytes = 4 << 20
)

func validateResultTextSize(totalBytes int, text string) (int, error) {
	if len(text) > MaxVectorResultBytes || totalBytes > MaxVectorResultTotalBytes-len(text) {
		return totalBytes, ErrResultContentLimit
	}
	return totalBytes + len(text), nil
}

// SearchOptions describes the retrieval strategy requested by file_search.
type SearchOptions struct {
	TopK           int
	Ranker         string // empty means dense search
	Alpha          float32
	AlphaSpecified bool
	RankerK        float64
}

// ValidateSearchOptions rejects combinations that the selected backend cannot support.
func ValidateSearchOptions(data map[string][]byte, options SearchOptions) error {
	providers := database.Classify(data)
	if len(providers) != 1 || (providers[0] != database.Milvus && providers[0] != database.PGVector) {
		return fmt.Errorf("%w: unsupported or ambiguous provider classification", ErrUnsupportedVectorDB)
	}
	milvus := providers[0] == database.Milvus
	if !milvus && options.Ranker == "weighted" {
		return fmt.Errorf("%w: pgvector weighted hybrid search is not supported", ErrUnsupportedSearch)
	}
	if options.Ranker == "rrf" {
		if milvus && options.AlphaSpecified {
			return fmt.Errorf("%w: Milvus RRF does not use alpha; omit alpha or select weighted ranking", ErrUnsupportedSearch)
		}
		if !milvus && options.RankerK != 60 {
			return fmt.Errorf("%w: pgvector RRF uses a fixed ranker_k of 60", ErrUnsupportedSearch)
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
	// A nonempty ranker combines dense and sparse results.
	Search(ctx context.Context, collection string, queryVec []float32, query string, options SearchOptions) ([]SearchResult, error)
	Close() error
}
