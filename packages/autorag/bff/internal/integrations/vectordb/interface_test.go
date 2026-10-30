package vectordb

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateSearchOptionsByProvider(t *testing.T) {
	milvus := map[string][]byte{"MILVUS_URI": []byte("https://milvus.example.com")}
	pgvector := map[string][]byte{
		"PGVECTOR_HOST":     []byte("postgres.example.com"),
		"PGVECTOR_PORT":     []byte("5432"),
		"PGVECTOR_DB":       []byte("db"),
		"PGVECTOR_USER":     []byte("user"),
		"PGVECTOR_PASSWORD": []byte("password"),
	}
	neo4j := map[string][]byte{
		"NEO4J_URI":      []byte("neo4j+s://neo4j.example.com:7687"),
		"NEO4J_PASSWORD": []byte("password"),
	}
	for _, tc := range []struct {
		name    string
		secret  map[string][]byte
		options SearchOptions
		wantErr bool
	}{
		{name: "milvus rrf", secret: milvus, options: SearchOptions{Ranker: "rrf", RankerK: 42}},
		{name: "milvus rrf at maximum", secret: milvus, options: SearchOptions{Ranker: "rrf", RankerK: MaxMilvusRRFK}, wantErr: true},
		{name: "milvus rrf below maximum", secret: milvus, options: SearchOptions{Ranker: "rrf", RankerK: MaxMilvusRRFK - 0.001}},
		{name: "milvus weighted", secret: milvus, options: SearchOptions{Ranker: "weighted", Alpha: 0.3}},
		{name: "milvus rrf alpha", secret: milvus, options: SearchOptions{Ranker: "rrf", RankerK: 60, AlphaSpecified: true}, wantErr: true},
		{name: "pgvector rrf", secret: pgvector, options: SearchOptions{Ranker: "rrf", RankerK: 60, AlphaSpecified: true}},
		{name: "pgvector custom k", secret: pgvector, options: SearchOptions{Ranker: "rrf", RankerK: 42}, wantErr: true},
		{name: "pgvector weighted", secret: pgvector, options: SearchOptions{Ranker: "weighted"}, wantErr: true},
		{name: "neo4j graph search", secret: neo4j, options: SearchOptions{TopK: 5}},
		{name: "neo4j rrf", secret: neo4j, options: SearchOptions{Ranker: "rrf", RankerK: 60}, wantErr: true},
		{name: "neo4j weighted", secret: neo4j, options: SearchOptions{Ranker: "weighted", Alpha: 0.5}, wantErr: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateSearchOptions(tc.secret, tc.options)
			if tc.wantErr {
				require.ErrorIs(t, err, ErrUnsupportedSearch)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
