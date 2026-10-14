package database

import (
	"reflect"
	"testing"
)

func TestClassify(t *testing.T) {
	tests := []struct {
		name string
		data map[string][]byte
		want []string
	}{
		{name: "empty", data: map[string][]byte{}, want: nil},
		{name: "milvus", data: map[string][]byte{"MILVUS_URI": []byte(" https://milvus.example.com ")}, want: []string{Milvus}},
		{name: "pgvector", data: map[string][]byte{
			"PGVECTOR_HOST": []byte("host"), "PGVECTOR_PORT": []byte("5432"),
			"PGVECTOR_DB": []byte("db"), "PGVECTOR_USER": []byte("user"), "PGVECTOR_PASSWORD": []byte("password"),
		}, want: []string{PGVector}},
		{name: "neo4j requires password", data: map[string][]byte{"NEO4J_URI": []byte("neo4j://db")}, want: nil},
		{name: "ambiguous", data: map[string][]byte{
			"MILVUS_URI": []byte("https://milvus.example.com"), "NEO4J_URI": []byte("neo4j://db"), "NEO4J_PASSWORD": []byte("password"),
		}, want: []string{Milvus, Neo4j}},
		{name: "pgvector survives legacy Milvus key", data: map[string][]byte{
			"MILVUS_URI": []byte("https://milvus.example.com"), "MILVUS_SERVER_CERT": []byte("legacy"),
			"PGVECTOR_HOST": []byte("host"), "PGVECTOR_PORT": []byte("5432"), "PGVECTOR_DB": []byte("db"),
			"PGVECTOR_USER": []byte("user"), "PGVECTOR_PASSWORD": []byte("password"),
		}, want: []string{PGVector}},
		{name: "legacy Milvus is excluded", data: map[string][]byte{
			"MILVUS_URI": []byte("https://milvus.example.com"), "MILVUS_SERVER_CERT": []byte("legacy"),
		}, want: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Classify(tt.data); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("Classify() = %v, want %v", got, tt.want)
			}
		})
	}
}
