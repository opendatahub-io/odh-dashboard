package vectordb

import (
	"context"
	"fmt"
	"strings"

	milvusclient "github.com/milvus-io/milvus-sdk-go/v2/client"
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

func newFromSecretData(ctx context.Context, data map[string][]byte, forwardURL func(context.Context, string) (string, error)) (VectorDB, error) {
	allowLoopback := forwardURL != nil
	if _, ok := data["MILVUS_URI"]; ok {
		if forwardURL != nil {
			original := strings.TrimSpace(string(data["MILVUS_URI"]))
			originalEndpoint, err := parseMilvusEndpointWithLoopback(original, allowLoopback)
			if err != nil {
				return nil, err
			}
			// localhost is already an internal endpoint; it must not be replaced
			// by a dev port-forward target.
			if originalEndpoint.loopback {
				return newMilvusFromSecretWithTimeoutPolicy(ctx, data, allowLoopback, MilvusOperationTimeout, func(connectCtx context.Context, cfg milvusclient.Config) (milvusClient, error) {
					return milvusclient.NewClient(connectCtx, cfg)
				})
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
				return newMilvusFromSecretWithTimeoutPolicy(ctx, forwardedData, true, MilvusOperationTimeout, func(connectCtx context.Context, cfg milvusclient.Config) (milvusClient, error) {
					return milvusclient.NewClient(connectCtx, cfg)
				})
			}
		}
		return newMilvusFromSecretWithTimeoutPolicy(ctx, data, allowLoopback, MilvusOperationTimeout, func(connectCtx context.Context, cfg milvusclient.Config) (milvusClient, error) {
			return milvusclient.NewClient(connectCtx, cfg)
		})
	}
	if _, ok := data["PGVECTOR_HOST"]; ok {
		return newPgvectorFromSecretWithLoopback(ctx, data, allowLoopback)
	}
	return nil, fmt.Errorf("%w", ErrUnsupportedVectorDB)
}
