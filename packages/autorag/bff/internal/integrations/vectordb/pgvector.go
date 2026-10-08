package vectordb

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
	"net"
	"net/url"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/certificates"
	pgvector "github.com/pgvector/pgvector-go"
	pgxvec "github.com/pgvector/pgvector-go/pgx"
)

const maxHybridCandidates = 1000

func hybridCandidateLimit(topK int) int {
	if topK <= 0 || topK > maxHybridCandidates/10 {
		return maxHybridCandidates
	}
	return topK * 10
}

func pgvectorHybridSearchSQL(table string) string {
	return fmt.Sprintf(`
WITH vector_candidates AS (
    SELECT id, content_text, embedding
    FROM %s
    WHERE octet_length(content_text) <= $5
    ORDER BY embedding <=> $1
    LIMIT $6
),
vector_ranked AS (
    SELECT id, content_text,
           ROW_NUMBER() OVER (ORDER BY embedding <=> $1) AS rank
    FROM vector_candidates
),
text_candidates AS (
    SELECT id, content_text, tokenized_content
    FROM %s
    WHERE tokenized_content @@ plainto_tsquery('english', $2)
      AND octet_length(content_text) <= $5
    ORDER BY ts_rank(tokenized_content, plainto_tsquery('english', $2)) DESC
    LIMIT $6
),
text_ranked AS (
    SELECT id, content_text,
           ROW_NUMBER() OVER (ORDER BY ts_rank(tokenized_content, plainto_tsquery('english', $2)) DESC) AS rank
    FROM text_candidates
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
LIMIT $7`, table, table)
}

type pgvectorDB struct {
	conn *pgx.Conn
}

func defaultPgvectorSSLMode(inCluster, loopback, hasCustomCA bool) string {
	if hasCustomCA || (!inCluster && !loopback) {
		return "verify-full"
	}
	return "disable"
}

func newPgvectorFromSecret(ctx context.Context, data map[string][]byte) (VectorDB, error) {
	host := strings.TrimSpace(string(data["PGVECTOR_HOST"]))
	portStr := strings.TrimSpace(string(data["PGVECTOR_PORT"]))
	db := strings.TrimSpace(string(data["PGVECTOR_DB"]))
	user := strings.TrimSpace(string(data["PGVECTOR_USER"]))
	password := strings.TrimSpace(string(data["PGVECTOR_PASSWORD"]))
	certPEM := data["PGVECTOR_CA_CERT"]

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
	if port < 1 || port > 65535 {
		return nil, fmt.Errorf("pgvector invalid PGVECTOR_PORT: %d (must be 1-65535)", port)
	}

	inCluster, loopback, err := validateVectorHost(host)
	if err != nil {
		return nil, fmt.Errorf("pgvector: %w", err)
	}
	sslMode := strings.TrimSpace(string(data["PGVECTOR_SSLMODE"]))
	if sslMode == "" {
		sslMode = defaultPgvectorSSLMode(inCluster, loopback, len(certPEM) > 0)
	}
	switch sslMode {
	case "disable", "allow", "prefer", "require", "verify-ca", "verify-full":
	default:
		return nil, fmt.Errorf("pgvector invalid PGVECTOR_SSLMODE: %q", sslMode)
	}
	endpoint, err := parsePgvectorEndpoint(host, port, sslMode)
	if err != nil {
		return nil, fmt.Errorf("pgvector: %w", err)
	}

	// Parse the config with the validated endpoint already present so pgx can
	// derive host-dependent TLS behavior from the real destination. Credentials
	// are still assigned as fields to avoid DSN interpolation.
	connConfig, err := pgx.ParseConfig("postgres://" + net.JoinHostPort(endpoint.host, endpoint.port) + "/?sslmode=" + url.QueryEscape(sslMode))
	if err != nil {
		return nil, fmt.Errorf("pgvector parse config: %w", err)
	}
	connConfig.Host = endpoint.host
	connConfig.Port = uint16(port)
	connConfig.Database = db
	connConfig.User = user
	connConfig.Password = password
	lookupIP := func(connectCtx context.Context, lookupHost string) ([]net.IP, error) {
		return net.DefaultResolver.LookupIP(connectCtx, "ip", lookupHost)
	}
	dialer := &net.Dialer{}
	// Keep pgx from resolving the hostname before DialFunc. The safe dialer must
	// perform the authoritative lookup and validate every returned address.
	connConfig.LookupFunc = func(_ context.Context, lookupHost string) ([]string, error) {
		return []string{lookupHost}, nil
	}
	connConfig.DialFunc = vectorSafeDialContext(dialer.DialContext, lookupIP, endpoint.inCluster, endpoint.loopback)

	if len(certPEM) > 0 {
		pool, err := certificates.SystemCertPoolWithPEM(certPEM, "PGVECTOR_CA_CERT")
		if err != nil {
			return nil, fmt.Errorf("pgvector: %w", err)
		}
		connConfig.TLSConfig = &tls.Config{
			RootCAs:    pool,
			ServerName: endpoint.host,
			MinVersion: tls.VersionTLS12,
		}
	}

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		if !endpoint.inCluster && !endpoint.loopback && len(certPEM) == 0 {
			slog.Warn("Secret is missing the CA certificate for an external vector database and connection with the system trust store failed; add the CA to the connection Secret or mount it in the AutoRAG BFF pod trust store", "db_type", "pgvector")
		}
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
		sql := pgvectorHybridSearchSQL(table)

		rows, err = p.conn.Query(ctx, sql, vec, query, alpha, 1-alpha, MaxVectorResultBytes, hybridCandidateLimit(topK), topK)
	} else {
		sql := fmt.Sprintf(`
SELECT id, content_text, 1 - (embedding <=> $1) AS score
FROM %s
WHERE octet_length(content_text) <= $3
ORDER BY embedding <=> $1
LIMIT $2`, table)

		rows, err = p.conn.Query(ctx, sql, vec, topK, MaxVectorResultBytes)
	}

	if err != nil {
		return nil, fmt.Errorf("pgvector search: %w", err)
	}
	defer rows.Close()

	var out []SearchResult
	totalBytes := 0
	for rows.Next() {
		var id, content string
		var score float32
		if scanErr := rows.Scan(&id, &content, &score); scanErr != nil {
			return nil, fmt.Errorf("pgvector scan: %w", scanErr)
		}
		var sizeErr error
		totalBytes, sizeErr = validateResultTextSize(totalBytes, content)
		if sizeErr != nil {
			return nil, sizeErr
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
