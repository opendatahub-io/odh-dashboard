package vectordb

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/opendatahub-io/autorag-library/bff/internal/database"
)

var ErrUnsupportedVectorDB = errors.New("unsupported vector DB: secret must contain MILVUS_URI, PGVECTOR_HOST, or NEO4J_URI")

var ErrUnsupportedSearch = errors.New("unsupported vector DB search options")

var ErrDatabaseUnavailable = errors.New("vector database unavailable")

var ErrDatabaseTimeout = errors.New("vector database operation timed out")

// ErrDatabaseQueryFailed reports that the database server itself rejected a
// query or its configuration (invalid query, missing index, wrong schema) — as
// opposed to ErrDatabaseUnavailable, which is reserved for connectivity and
// authentication failures.
var ErrDatabaseQueryFailed = errors.New("vector database query failed")

var ErrResultContentLimit = errors.New("vector result content limit exceeded")

const (
	MaxVectorResultBytes      = 1 << 20
	MaxVectorResultTotalBytes = 4 << 20
	MaxMilvusRRFK             = 16384
)

// ValidMilvusRRFK reports whether a Milvus RRF constant is within Milvus's
// supported range.
func ValidMilvusRRFK(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0) && value > 0 && value < MaxMilvusRRFK
}

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
	if len(providers) != 1 || (providers[0] != database.Milvus && providers[0] != database.PGVector && providers[0] != database.Neo4j) {
		return fmt.Errorf("%w: unsupported or ambiguous provider classification", ErrUnsupportedVectorDB)
	}
	if providers[0] == database.Neo4j {
		if options.Ranker != "" {
			return fmt.Errorf("%w: neo4j graph search does not support hybrid ranking", ErrUnsupportedSearch)
		}
		return nil
	}
	milvus := providers[0] == database.Milvus
	if !milvus && options.Ranker == "weighted" {
		return fmt.Errorf("%w: pgvector weighted hybrid search is not supported", ErrUnsupportedSearch)
	}
	if options.Ranker == "rrf" {
		if milvus {
			if !ValidMilvusRRFK(options.RankerK) {
				return fmt.Errorf("%w: Milvus RRF ranker_k must be greater than 0 and less than %d", ErrUnsupportedSearch, MaxMilvusRRFK)
			}
			if options.AlphaSpecified {
				return fmt.Errorf("%w: Milvus RRF does not use alpha; omit alpha or select weighted ranking", ErrUnsupportedSearch)
			}
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
