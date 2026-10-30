package vectordb

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	neo4jconfig "github.com/neo4j/neo4j-go-driver/v5/neo4j/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/certificates"
)

const (
	Neo4jOperationTimeout = 30 * time.Second

	neo4jDefaultUsername = "neo4j"
	neo4jDefaultDatabase = "neo4j"
	neo4jDefaultPort     = "7687"
	neo4jCACertKey       = "NEO4J_CA_CERT"

	// Graph expansion defaults mirror ai4rag's Neo4jGraphRetrievalConfig.
	neo4jIncludeEntityNeighbors    = true
	neo4jEntityNeighborLimit       = 5
	neo4jEntityPivotLimit          = 3
	neo4jEntityRelationshipHops    = 1
	neo4jRelationshipNeighborLimit = 5

	// Node labels and properties written by ai4rag's Neo4j graph store.
	neo4jChunkLabel            = "Chunk"
	neo4jEntityLabel           = "__Entity__"
	neo4jFromChunkRelationship = "FROM_CHUNK"
	neo4jCollectionProperty    = "collection"
	neo4jIDProperty            = "id"
	neo4jTextProperty          = "text"
	neo4jEmbeddingProperty     = "embedding"
	neo4jKGCollectionsProperty = "ai4rag_kg_collections"
)

// neo4jDriver is the subset of neo4j.DriverWithContext used by the adapter so
// connection and query behavior can be exercised with a fake driver.
type neo4jDriver interface {
	VerifyConnectivity(context.Context) error
	VerifyAuthentication(context.Context, *neo4j.AuthToken) error
	NewSession(context.Context, neo4j.SessionConfig) neo4jSession
	Close(context.Context) error
}

type neo4jDriverFactory func(context.Context, string, neo4j.AuthToken, func(*neo4jconfig.Config)) (neo4jDriver, error)

type neo4jSession interface {
	Run(context.Context, string, map[string]any, ...func(*neo4j.TransactionConfig)) (neo4jResult, error)
	Close(context.Context) error
}

type neo4jResult interface {
	Collect(context.Context) ([]*neo4j.Record, error)
}

// neo4jDriverWrapper narrows the driver's SessionWithContext/ResultWithContext
// types, whose interfaces contain unexported methods, to the small surface the
// adapter uses so tests can substitute a fake driver.
type neo4jDriverWrapper struct {
	inner neo4j.DriverWithContext
}

func (w neo4jDriverWrapper) VerifyConnectivity(ctx context.Context) error {
	return w.inner.VerifyConnectivity(ctx)
}

func (w neo4jDriverWrapper) VerifyAuthentication(ctx context.Context, auth *neo4j.AuthToken) error {
	return w.inner.VerifyAuthentication(ctx, auth)
}

func (w neo4jDriverWrapper) NewSession(ctx context.Context, config neo4j.SessionConfig) neo4jSession {
	return neo4jSessionWrapper{inner: w.inner.NewSession(ctx, config)}
}

func (w neo4jDriverWrapper) Close(ctx context.Context) error {
	return w.inner.Close(ctx)
}

type neo4jSessionWrapper struct {
	inner neo4j.SessionWithContext
}

func (w neo4jSessionWrapper) Run(ctx context.Context, cypher string, params map[string]any, configurers ...func(*neo4j.TransactionConfig)) (neo4jResult, error) {
	return w.inner.Run(ctx, cypher, params, configurers...)
}

func (w neo4jSessionWrapper) Close(ctx context.Context) error {
	return w.inner.Close(ctx)
}

func newNeo4jDriver(_ context.Context, uri string, auth neo4j.AuthToken, configure func(*neo4jconfig.Config)) (neo4jDriver, error) {
	driver, err := neo4j.NewDriverWithContext(uri, auth, configure)
	if err != nil {
		return nil, err
	}
	return neo4jDriverWrapper{inner: driver}, nil
}

type neo4jDB struct {
	driver           neo4jDriver
	database         string
	operationTimeout time.Duration
}

type neo4jEndpoint struct {
	scheme    string
	host      string
	port      string
	inCluster bool
	loopback  bool
	tls       bool
}

// parseNeo4jEndpoint validates a Neo4j URI and returns the normalized endpoint.
// Neo4j is reached over Bolt, so the HTTP-oriented Milvus endpoint parser does
// not apply. Only the schemes supported by the Go driver are accepted; the
// verification-disabling +ssc schemes are rejected outright.
func parseNeo4jEndpointWithLoopback(raw string, allowLoopback bool, hasCA bool) (neo4jEndpoint, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Host == "" {
		return neo4jEndpoint{}, fmt.Errorf("neo4j URI must include a host")
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || parsed.Opaque != "" || (parsed.Path != "" && parsed.Path != "/") {
		return neo4jEndpoint{}, fmt.Errorf("neo4j URI contains unsupported credentials, query, fragment, or path")
	}

	scheme := strings.ToLower(parsed.Scheme)
	var useTLS bool
	switch scheme {
	case "neo4j", "bolt":
		useTLS = false
	case "neo4j+s", "bolt+s":
		useTLS = true
	default:
		return neo4jEndpoint{}, fmt.Errorf("neo4j URI must use neo4j, neo4j+s, bolt, or bolt+s")
	}

	host := parsed.Hostname()
	inCluster, loopback, err := validateVectorHost(host, allowLoopback)
	if err != nil {
		return neo4jEndpoint{}, err
	}

	port := parsed.Port()
	if port == "" {
		port = neo4jDefaultPort
	}
	if n, portErr := strconv.Atoi(port); portErr != nil || n < 1 || n > 65535 {
		return neo4jEndpoint{}, fmt.Errorf("neo4j URI contains an invalid port")
	}
	// Secrets produced by the RAG DB tooling keep the plain neo4j:// scheme and
	// ship NEO4J_CA_CERT for the TLS-terminating endpoint, so a CA bundle
	// promotes the connection to TLS instead of being rejected.
	if hasCA {
		useTLS = true
	}
	if useTLS && !strings.HasSuffix(scheme, "+s") {
		scheme += "+s"
	}
	if !inCluster && !loopback && !useTLS {
		return neo4jEndpoint{}, fmt.Errorf("neo4j external endpoints must use neo4j+s or bolt+s")
	}

	return neo4jEndpoint{scheme: scheme, host: host, port: port, inCluster: inCluster, loopback: loopback, tls: useTLS}, nil
}

func (e neo4jEndpoint) uri() string {
	return e.scheme + "://" + net.JoinHostPort(e.host, e.port)
}

func classifyNeo4jError(parentCtx, operationCtx context.Context, err error) error {
	if parentErr := parentCtx.Err(); parentErr != nil {
		return fmt.Errorf("%w: %w", parentErr, err)
	}
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(operationCtx.Err(), context.DeadlineExceeded) {
		return fmt.Errorf("%w: %w", ErrDatabaseTimeout, err)
	}
	return fmt.Errorf("%w: %w", ErrDatabaseUnavailable, err)
}

func newNeo4jFromSecret(ctx context.Context, data map[string][]byte) (VectorDB, error) {
	return newNeo4jFromSecretWithDriver(ctx, data, 0, newNeo4jDriver)
}

func newNeo4jFromSecretWithDriver(
	ctx context.Context,
	data map[string][]byte,
	timeout time.Duration,
	newDriver neo4jDriverFactory,
) (VectorDB, error) {
	uri := strings.TrimSpace(string(data["NEO4J_URI"]))
	password := string(data["NEO4J_PASSWORD"])
	username := strings.TrimSpace(string(data["NEO4J_USERNAME"]))
	database := strings.TrimSpace(string(data["NEO4J_DATABASE"]))
	certPEM := data[neo4jCACertKey]

	if uri == "" {
		return nil, fmt.Errorf("neo4j secret missing NEO4J_URI")
	}
	if strings.TrimSpace(password) == "" {
		return nil, fmt.Errorf("neo4j secret missing NEO4J_PASSWORD")
	}
	if username == "" {
		username = neo4jDefaultUsername
	}
	if database == "" {
		database = neo4jDefaultDatabase
	}
	if timeout <= 0 {
		timeout = Neo4jOperationTimeout
	}

	endpoint, err := parseNeo4jEndpointWithLoopback(uri, false, len(certPEM) > 0)
	if err != nil {
		return nil, fmt.Errorf("neo4j: %w", err)
	}

	var tlsConfig *tls.Config
	if len(certPEM) > 0 {
		pool, poolErr := certificates.SystemCertPoolWithPEM(certPEM, neo4jCACertKey)
		if poolErr != nil {
			return nil, fmt.Errorf("neo4j: %w", poolErr)
		}
		tlsConfig = &tls.Config{RootCAs: pool, MinVersion: tls.VersionTLS12}
	}

	if newDriver == nil {
		newDriver = newNeo4jDriver
	}

	driver, err := newDriver(ctx, endpoint.uri(), neo4j.BasicAuth(username, password, ""), func(config *neo4jconfig.Config) {
		if tlsConfig != nil {
			config.TlsConfig = tlsConfig
		}
	})
	if err != nil {
		return nil, fmt.Errorf("neo4j create driver: %w", err)
	}

	operationCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	if err := driver.VerifyConnectivity(operationCtx); err != nil {
		_ = driver.Close(context.WithoutCancel(operationCtx))
		return nil, fmt.Errorf("neo4j connect: %w", classifyNeo4jError(ctx, operationCtx, err))
	}
	if err := driver.VerifyAuthentication(operationCtx, nil); err != nil {
		_ = driver.Close(context.WithoutCancel(operationCtx))
		return nil, fmt.Errorf("neo4j authenticate: %w", classifyNeo4jError(ctx, operationCtx, err))
	}

	return &neo4jDB{driver: driver, database: database, operationTimeout: timeout}, nil
}

// neo4jGraphSearchQuery builds the Cypher query used by ai4rag's
// VectorCypherRetriever for Neo4j graph search. Seed chunks come from the
// collection-scoped vector index, then entity and relationship neighbors are
// ranked by query similarity and graph support. Numeric limits are clamped to
// non-negative integers before interpolation so caller-controlled values cannot
// alter the query shape.
func neo4jGraphSearchQuery(includeEntityNeighbors bool, entityNeighborLimit, entityPivotLimit, entityRelationshipHops, relationshipNeighborLimit int) string {
	var builder strings.Builder
	builder.WriteString("CALL db.index.vector.queryNodes($index_name, $route_k, $query_vector) YIELD node, score ")
	builder.WriteString("WHERE node.")
	builder.WriteString(neo4jCollectionProperty)
	builder.WriteString(" = $col ")

	if includeEntityNeighbors && entityNeighborLimit > 0 {
		fmt.Fprintf(&builder, "CALL (node) { OPTIONAL MATCH (entity:%s)-[:%s]->(node) OPTIONAL MATCH (entity)-[:%s]->(ent_nb:%s) ",
			neo4jEntityLabel, neo4jFromChunkRelationship, neo4jFromChunkRelationship, neo4jChunkLabel)
		fmt.Fprintf(&builder, "WHERE ent_nb <> node AND ent_nb.%s = $col ", neo4jCollectionProperty)
		builder.WriteString("WITH ent_nb, count(DISTINCT entity) AS overlap ")
		fmt.Fprintf(&builder, "WHERE ent_nb IS NOT NULL AND ent_nb.%s IS NOT NULL ", neo4jEmbeddingProperty)
		fmt.Fprintf(&builder, "WITH ent_nb, overlap, vector.similarity.cosine(ent_nb.%s, $query_vector) AS similarity ", neo4jEmbeddingProperty)
		fmt.Fprintf(&builder, "ORDER BY similarity DESC, overlap DESC, ent_nb.%s ASC LIMIT %d ", neo4jIDProperty, entityNeighborLimit)
		builder.WriteString("RETURN collect({chunk: ent_nb, strength: toFloat(overlap)}) AS ent_hits } ")
	} else {
		builder.WriteString("WITH node, [] AS ent_hits ")
	}

	if entityPivotLimit > 0 && entityRelationshipHops > 0 && relationshipNeighborLimit > 0 {
		fmt.Fprintf(&builder, "CALL (node) { MATCH (pivot:%s)-[:%s]->(node) OPTIONAL MATCH (pivot)-[:%s]->(pivot_chunk:%s) ",
			neo4jEntityLabel, neo4jFromChunkRelationship, neo4jFromChunkRelationship, neo4jChunkLabel)
		fmt.Fprintf(&builder, "WHERE pivot_chunk.%s = $col ", neo4jCollectionProperty)
		builder.WriteString("WITH node, pivot, count(DISTINCT pivot_chunk) AS degree ")
		fmt.Fprintf(&builder, "ORDER BY degree DESC, pivot.name ASC, pivot.%s ASC LIMIT %d ", neo4jIDProperty, entityPivotLimit)
		fmt.Fprintf(&builder, "MATCH path = (pivot)-[*1..%d]-(related:%s) ", entityRelationshipHops, neo4jEntityLabel)
		fmt.Fprintf(&builder, "WHERE ALL(rel IN relationships(path) WHERE type(rel) <> '%s' AND $col IN COALESCE(rel.%s, [])) ",
			neo4jFromChunkRelationship, neo4jKGCollectionsProperty)
		fmt.Fprintf(&builder, "MATCH (related)-[:%s]->(rel_nb:%s) ", neo4jFromChunkRelationship, neo4jChunkLabel)
		fmt.Fprintf(&builder, "WHERE rel_nb <> node AND rel_nb.%s = $col AND rel_nb.%s IS NOT NULL ",
			neo4jCollectionProperty, neo4jEmbeddingProperty)
		builder.WriteString("WITH rel_nb, count(DISTINCT path) AS path_count, min(length(path)) AS hops ")
		fmt.Fprintf(&builder, "WITH rel_nb, path_count, hops, vector.similarity.cosine(rel_nb.%s, $query_vector) AS similarity ", neo4jEmbeddingProperty)
		fmt.Fprintf(&builder, "ORDER BY similarity DESC, path_count DESC, hops ASC, rel_nb.%s ASC LIMIT %d ", neo4jIDProperty, relationshipNeighborLimit)
		builder.WriteString("RETURN collect({chunk: rel_nb, strength: toFloat(path_count) / toFloat(hops)}) AS rel_hits } ")
	} else {
		builder.WriteString("WITH node, ent_hits, [] AS rel_hits ")
	}

	builder.WriteString("WITH node, ent_hits + rel_hits AS graph_hits ")
	builder.WriteString("WITH CASE WHEN size(graph_hits) = 0 THEN [{chunk: node, strength: 0.0}] ELSE graph_hits END AS hits ")
	builder.WriteString("UNWIND hits AS hit ")
	builder.WriteString("WITH hit.chunk AS candidate, sum(hit.strength) AS graph_strength ")
	fmt.Fprintf(&builder, "WITH candidate, graph_strength, coalesce(vector.similarity.cosine(candidate.%s, $query_vector), 0.0) AS semantic_score ", neo4jEmbeddingProperty)
	builder.WriteString("WITH candidate, graph_strength, 0.8 * semantic_score + 0.2 * graph_strength / (1.0 + graph_strength) AS score ")
	builder.WriteString("WITH candidate, score, graph_strength ")
	fmt.Fprintf(&builder, "ORDER BY score DESC, graph_strength DESC, candidate.%s ASC LIMIT $top_k ", neo4jIDProperty)
	fmt.Fprintf(&builder, "RETURN candidate.%s AS text, score, candidate.%s AS id", neo4jTextProperty, neo4jIDProperty)
	return builder.String()
}

func (n *neo4jDB) Search(ctx context.Context, collection string, queryVec []float32, _ string, options SearchOptions) ([]SearchResult, error) {
	if options.Ranker != "" {
		return nil, fmt.Errorf("%w: neo4j graph search does not support hybrid ranking", ErrUnsupportedSearch)
	}
	if options.TopK <= 0 {
		return nil, nil
	}

	vector := make([]float64, len(queryVec))
	for i, value := range queryVec {
		vector[i] = float64(value)
	}

	timeout := n.operationTimeout
	if timeout <= 0 {
		timeout = Neo4jOperationTimeout
	}
	operationCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	session := n.driver.NewSession(operationCtx, neo4j.SessionConfig{DatabaseName: n.database, AccessMode: neo4j.AccessModeRead})
	defer func() { _ = session.Close(context.WithoutCancel(operationCtx)) }()

	result, err := session.Run(operationCtx, neo4jGraphSearchQuery(
		neo4jIncludeEntityNeighbors,
		neo4jEntityNeighborLimit,
		neo4jEntityPivotLimit,
		neo4jEntityRelationshipHops,
		neo4jRelationshipNeighborLimit,
	), map[string]any{
		"index_name":   collection + "__embedding",
		"query_vector": vector,
		"col":          collection,
		"route_k":      max(options.TopK*2, 10),
		"top_k":        options.TopK,
	})
	if err != nil {
		return nil, fmt.Errorf("neo4j search: %w", classifyNeo4jError(ctx, operationCtx, err))
	}

	records, err := result.Collect(operationCtx)
	if err != nil {
		return nil, fmt.Errorf("neo4j search: %w", classifyNeo4jError(ctx, operationCtx, err))
	}

	out := make([]SearchResult, 0, len(records))
	totalBytes := 0
	for _, record := range records {
		text, _, textErr := neo4j.GetRecordValue[string](record, "text")
		if textErr != nil {
			return nil, fmt.Errorf("neo4j search result: %w", textErr)
		}
		id, _, idErr := neo4j.GetRecordValue[string](record, "id")
		if idErr != nil {
			return nil, fmt.Errorf("neo4j search result: %w", idErr)
		}
		rawScore, found := record.Get("score")
		if !found {
			return nil, fmt.Errorf("neo4j search result: score not found")
		}
		score, scoreErr := neo4jScore(rawScore)
		if scoreErr != nil {
			return nil, fmt.Errorf("neo4j search result: %w", scoreErr)
		}

		var sizeErr error
		totalBytes, sizeErr = validateResultTextSize(totalBytes, text)
		if sizeErr != nil {
			return nil, sizeErr
		}
		out = append(out, SearchResult{ID: id, Text: text, Score: score})
	}
	return out, nil
}

func neo4jScore(value any) (float32, error) {
	switch typed := value.(type) {
	case float64:
		return float32(typed), nil
	case float32:
		return typed, nil
	case int64:
		return float32(typed), nil
	default:
		return 0, fmt.Errorf("unexpected score type %T", value)
	}
}

func (n *neo4jDB) Close() error {
	return n.driver.Close(context.Background())
}
