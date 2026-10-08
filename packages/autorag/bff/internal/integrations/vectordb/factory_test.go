package vectordb

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewFromSecretData_Unsupported(t *testing.T) {
	_, err := NewFromSecretData(context.Background(), map[string][]byte{})
	require.ErrorIs(t, err, ErrUnsupportedVectorDB)
}

func TestNewFromSecretData_DispatchesToMilvus(t *testing.T) {
	_, err := NewFromSecretData(context.Background(), map[string][]byte{
		"MILVUS_URI": []byte("http://milvus.apps.example.com:19530"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "external endpoints must use https")
}

func TestNewFromSecretData_DispatchesToPgvector(t *testing.T) {
	_, err := NewFromSecretData(context.Background(), map[string][]byte{
		"PGVECTOR_HOST": []byte("127.0.0.1"),
		"PGVECTOR_DB":   []byte("db"),
		"PGVECTOR_USER": []byte("user"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "literal IP")
}

func TestNewFromSecretData_AllowsDirectLocalhost(t *testing.T) {
	assert.NoError(t, ValidateMilvusEndpoint("http://localhost:4321"))
}

func TestNewFromSecretDataWithForwarderValidatesBeforeCallingForwarder(t *testing.T) {
	called := false
	_, err := NewFromSecretDataWithForwarder(context.Background(), map[string][]byte{
		"MILVUS_URI":     []byte("http://localhost:19530"),
		"MILVUS_CA_CERT": []byte("not a certificate"),
	}, func(context.Context, string) (string, error) {
		called = true
		return "http://localhost:4321", nil
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse MILVUS_CA_CERT")
	assert.False(t, called)
}

func TestNewFromSecretDataWithForwarderRejectsUntrustedDestinations(t *testing.T) {
	for _, forwarded := range []string{
		"http://public.example.com:4321",
		"https://localhost:4321",
		"http://localhost:80",
		"http://127.0.0.1:4321",
	} {
		t.Run(forwarded, func(t *testing.T) {
			_, err := NewFromSecretDataWithForwarder(context.Background(), map[string][]byte{
				"MILVUS_URI": []byte("http://milvus.milvus.svc.cluster.local:19530"),
			}, func(context.Context, string) (string, error) {
				return forwarded, nil
			})
			require.Error(t, err)
		})
	}
}
