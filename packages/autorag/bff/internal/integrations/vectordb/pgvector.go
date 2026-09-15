package vectordb

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	pgvector "github.com/pgvector/pgvector-go"
	pgxvec "github.com/pgvector/pgvector-go/pgx"
)

type pgvectorDB struct {
	conn *pgx.Conn
}

func newPgvectorFromSecret(ctx context.Context, data map[string][]byte) (VectorDB, error) {
	host := strings.TrimSpace(string(data["PGVECTOR_HOST"]))
	portStr := strings.TrimSpace(string(data["PGVECTOR_PORT"]))
	db := strings.TrimSpace(string(data["PGVECTOR_DB"]))
	user := strings.TrimSpace(string(data["PGVECTOR_USER"]))
	password := strings.TrimSpace(string(data["PGVECTOR_PASSWORD"]))

	if host == "" || db == "" || user == "" {
		return nil, fmt.Errorf("pgvector secret missing required fields (PGVECTOR_HOST, PGVECTOR_DB, PGVECTOR_USER)")
	}

	port := 5432
	if portStr != "" {
		p, err := strconv.Atoi(portStr)
		if err != nil {
			return nil, fmt.Errorf("pgvector invalid PGVECTOR_PORT: %w", err)
		}
		port = p
	}

	sslMode := strings.TrimSpace(string(data["PGVECTOR_SSLMODE"]))
	if sslMode == "" {
		sslMode = "disable"
	}
	dsn := fmt.Sprintf("host=%s port=%d dbname=%s user=%s password=%s sslmode=%s",
		host, port, db, user, password, sslMode)

	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("pgvector connect: %w", err)
	}

	if err := pgxvec.RegisterTypes(ctx, conn); err != nil {
		conn.Close(ctx)
		return nil, fmt.Errorf("pgvector register types: %w", err)
	}

	return &pgvectorDB{conn: conn}, nil
}

func (p *pgvectorDB) Search(ctx context.Context, collection string, queryVec []float32, query string, topK int, alpha float32, hybrid bool) ([]SearchResult, error) {
	// Sanitize table name — only allow alphanumeric and underscore.
	table := sanitizeIdentifier(collection)

	vec := pgvector.NewVector(queryVec)

	var rows pgx.Rows
	var err error

	if hybrid {
		// RRF combining cosine similarity and pre-computed tokenized_content tsvector.
		// Each sub-rank uses RRF formula: 1/(k + rank). k=60 is standard.
		sql := fmt.Sprintf(`
WITH vector_ranked AS (
    SELECT id, content_text,
           ROW_NUMBER() OVER (ORDER BY embedding <=> $1) AS rank
    FROM %s
),
text_ranked AS (
    SELECT id, content_text,
           ROW_NUMBER() OVER (ORDER BY ts_rank(tokenized_content, plainto_tsquery('english', $2)) DESC) AS rank
    FROM %s
    WHERE tokenized_content @@ plainto_tsquery('english', $2)
),
combined AS (
    SELECT COALESCE(vr.id, tr.id) AS id,
           COALESCE(vr.content_text, tr.content_text) AS content_text,
           COALESCE(1.0 / (60 + vr.rank), 0) * $3 + COALESCE(1.0 / (60 + tr.rank), 0) * $4 AS score
    FROM vector_ranked vr
    FULL OUTER JOIN text_ranked tr ON vr.id = tr.id
)
SELECT id, content_text, score
FROM combined
ORDER BY score DESC
LIMIT $5`, table, table)

		rows, err = p.conn.Query(ctx, sql, vec, query, alpha, 1-alpha, topK)
	} else {
		sql := fmt.Sprintf(`
SELECT id, content_text, 1 - (embedding <=> $1) AS score
FROM %s
ORDER BY embedding <=> $1
LIMIT $2`, table)

		rows, err = p.conn.Query(ctx, sql, vec, topK)
	}

	if err != nil {
		return nil, fmt.Errorf("pgvector search: %w", err)
	}
	defer rows.Close()

	var out []SearchResult
	for rows.Next() {
		var id, content string
		var score float32
		if scanErr := rows.Scan(&id, &content, &score); scanErr != nil {
			return nil, fmt.Errorf("pgvector scan: %w", scanErr)
		}
		out = append(out, SearchResult{ID: id, Text: content, Score: score})
	}
	return out, rows.Err()
}

func (p *pgvectorDB) Close() error {
	return p.conn.Close(context.Background())
}

// sanitizeIdentifier keeps only alphanumeric characters and underscores, replacing
// everything else with underscores, so the result is safe to use as a SQL identifier.
func sanitizeIdentifier(s string) string {
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('_')
		}
	}
	return b.String()
}
