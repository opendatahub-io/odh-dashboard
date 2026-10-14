package database

import "strings"

const (
	Milvus   = "milvus"
	PGVector = "pgvector"
	Neo4j    = "neo4j"
)

var providerOrder = []string{Milvus, PGVector, Neo4j}

var requiredKeys = map[string][]string{
	Milvus:   {"MILVUS_URI"},
	PGVector: {"PGVECTOR_HOST", "PGVECTOR_PORT", "PGVECTOR_DB", "PGVECTOR_USER", "PGVECTOR_PASSWORD"},
	Neo4j:    {"NEO4J_URI", "NEO4J_PASSWORD"},
}

// Classify returns every provider whose required values are present and non-empty.
// MILVUS_SERVER_CERT is a legacy marker that excludes only Milvus.
func Classify(data map[string][]byte) []string {
	providers := make([]string, 0, len(providerOrder))
	for _, provider := range providerOrder {
		if provider == Milvus && hasKey(data, "MILVUS_SERVER_CERT") {
			continue
		}
		if hasAllNonEmptyValues(data, requiredKeys[provider]) {
			providers = append(providers, provider)
		}
	}
	if len(providers) == 0 {
		return nil
	}
	return providers
}

func ClassifyStrings(data map[string]string) []string {
	values := make(map[string][]byte, len(data))
	for key, value := range data {
		values[key] = []byte(value)
	}
	return Classify(values)
}

func hasKey(data map[string][]byte, key string) bool {
	_, ok := data[key]
	return ok
}

func hasAllNonEmptyValues(data map[string][]byte, keys []string) bool {
	for _, key := range keys {
		if strings.TrimSpace(string(data[key])) == "" {
			return false
		}
	}
	return true
}
