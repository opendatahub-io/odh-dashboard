package vectordb

import (
	"context"
	"fmt"
	"strings"

	milvusclient "github.com/milvus-io/milvus/client/v2/milvusclient"
	"github.com/opendatahub-io/autorag-library/bff/internal/database"
)

// NewFromSecretData detects the vector DB type from the secret keys and returns
// the appropriate VectorDB implementation using the strict endpoint policy.
func NewFromSecretData(ctx context.Context, data map[string][]byte) (VectorDB, error) {
	return newFromSecretData(ctx, data, nil)
}

// NewFromSecretDataWithForwarder is the only forwarding-aware construction
// path. The original endpoint is validated before forwardURL is called, and
// the resulting endpoint is validated before the local dial policy is enabled.
func NewFromSecretDataWithForwarder(ctx context.Context, data map[string][]byte, forwardURL func(context.Context, string) (string, error)) (VectorDB, error) {
	return newFromSecretData(ctx, data, forwardURL)
}

type milvusClientFactory func(context.Context, *milvusclient.ClientConfig) (milvusClient, error)

func newFromSecretData(ctx context.Context, data map[string][]byte, forwardURL func(context.Context, string) (string, error)) (VectorDB, error) {
	return newFromSecretDataWithClient(ctx, data, forwardURL, func(connectCtx context.Context, cfg *milvusclient.ClientConfig) (milvusClient, error) {
		return milvusclient.New(connectCtx, cfg)
	})
}

func newFromSecretDataWithClient(
	ctx context.Context,
	data map[string][]byte,
	forwardURL func(context.Context, string) (string, error),
	newClient milvusClientFactory,
) (VectorDB, error) {
	providers := database.Classify(data)
	if len(providers) != 1 || (providers[0] != database.Milvus && providers[0] != database.PGVector && providers[0] != database.Neo4j) {
		return nil, fmt.Errorf("%w: expected exactly one supported vector database provider", ErrUnsupportedVectorDB)
	}

	allowLoopbackForOriginal := forwardURL != nil
	if providers[0] == database.Milvus {
		if forwardURL != nil {
			original := strings.TrimSpace(string(data["MILVUS_URI"]))
			originalEndpoint, err := parseMilvusEndpointWithLoopback(original, allowLoopbackForOriginal)
			if err != nil {
				return nil, err
			}
			// localhost is already an internal endpoint; it must not be replaced
			// by a dev port-forward target.
			if originalEndpoint.loopback {
				return newMilvusFromSecretWithTimeoutPolicy(ctx, data, true, "", MilvusOperationTimeout, newClient)
			}
			forwarded, err := forwardURL(ctx, original)
			if err != nil {
				return nil, err
			}
			if forwarded != original {
				if err := ValidateForwardedMilvusEndpoint(original, forwarded); err != nil {
					return nil, fmt.Errorf("invalid forwarded Milvus endpoint: %w", err)
				}
				forwardedData := make(map[string][]byte, len(data))
				for key, value := range data {
					forwardedData[key] = value
				}
				forwardedData["MILVUS_URI"] = []byte(forwarded)
				return newMilvusFromSecretWithTimeoutPolicy(ctx, forwardedData, true, originalEndpoint.host, MilvusOperationTimeout, newClient)
			}
		}
		// An unchanged external endpoint must retain the normal safe-dial policy.
		// A configured forwarder alone is not evidence that loopback is trusted.
		return newMilvusFromSecretWithTimeoutPolicy(ctx, data, false, "", MilvusOperationTimeout, newClient)
	}
	if providers[0] == database.PGVector {
		host := strings.TrimSuffix(strings.TrimSpace(string(data["PGVECTOR_HOST"])), ".")
		allowLoopback := forwardURL != nil && strings.EqualFold(host, "localhost")
		return newPgvectorFromSecretWithLoopback(ctx, data, allowLoopback)
	}
	if providers[0] == database.Neo4j {
		return newNeo4jFromSecret(ctx, data)
	}
	return nil, fmt.Errorf("%w", ErrUnsupportedVectorDB)
}
