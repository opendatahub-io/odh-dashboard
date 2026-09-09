package vectordb

import (
	"context"
	"fmt"
)

// NewFromSecretData detects the vector DB type from the secret keys and returns
// the appropriate VectorDB implementation.
func NewFromSecretData(ctx context.Context, data map[string][]byte) (VectorDB, error) {
	if _, ok := data["MILVUS_URI"]; ok {
		return newMilvusFromSecret(ctx, data)
	}
	if _, ok := data["PGVECTOR_HOST"]; ok {
		return newPgvectorFromSecret(ctx, data)
	}
	return nil, fmt.Errorf("%w", ErrUnsupportedVectorDB)
}
