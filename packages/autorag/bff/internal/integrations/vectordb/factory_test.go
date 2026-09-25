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
	assert.Contains(t, err.Error(), "plaintext (http://) is only allowed")
}

func TestNewFromSecretData_DispatchesToPgvector(t *testing.T) {
	_, err := NewFromSecretData(context.Background(), map[string][]byte{
		"PGVECTOR_HOST": []byte("db.apps.example.com"),
		"PGVECTOR_DB":   []byte("db"),
		"PGVECTOR_USER": []byte("user"),
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "sslmode=disable is only allowed")
}
