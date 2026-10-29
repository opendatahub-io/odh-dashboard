package vectordb

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"math/big"
	"net"
	"strings"
	"testing"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeNeo4jLookup returns a lookup function that resolves every host to the
// given IPs, standing in for DNS in driver-construction tests.
func fakeNeo4jLookup(ips ...string) func(context.Context, string) ([]net.IP, error) {
	return func(context.Context, string) ([]net.IP, error) {
		resolved := make([]net.IP, 0, len(ips))
		for _, ip := range ips {
			resolved = append(resolved, net.ParseIP(ip))
		}
		return resolved, nil
	}
}

type fakeNeo4jDriver struct {
	verifyErr  error
	session    neo4jSession
	uri        string
	auth       neo4j.AuthToken
	config     *config.Config
	sessionCfg neo4j.SessionConfig
	closed     bool
}

func (f *fakeNeo4jDriver) VerifyConnectivity(context.Context) error { return f.verifyErr }

func (f *fakeNeo4jDriver) VerifyAuthentication(context.Context, *neo4j.AuthToken) error {
	return f.verifyErr
}

func (f *fakeNeo4jDriver) NewSession(_ context.Context, config neo4j.SessionConfig) neo4jSession {
	f.sessionCfg = config
	return f.session
}

func (f *fakeNeo4jDriver) Close(context.Context) error {
	f.closed = true
	return nil
}

type fakeNeo4jSession struct {
	result   neo4jResult
	err      error
	query    string
	params   map[string]any
	closed   bool
	runCalls int
}

func (f *fakeNeo4jSession) Run(_ context.Context, query string, params map[string]any, _ ...func(*neo4j.TransactionConfig)) (neo4jResult, error) {
	f.runCalls++
	f.query = query
	f.params = params
	if f.err != nil {
		return nil, f.err
	}
	return f.result, nil
}

func (f *fakeNeo4jSession) Close(context.Context) error {
	f.closed = true
	return nil
}

type fakeNeo4jResult struct {
	records []*neo4j.Record
	err     error
}

func (f *fakeNeo4jResult) Collect(context.Context) ([]*neo4j.Record, error) {
	return f.records, f.err
}

func neo4jRecord(text string, score float64, id string) *neo4j.Record {
	return &neo4j.Record{Keys: []string{"text", "score", "id"}, Values: []any{text, score, id}}
}

func validNeo4jSecret() map[string][]byte {
	return map[string][]byte{
		"NEO4J_URI":      []byte("neo4j+s://neo4j.example.com:7687"),
		"NEO4J_USERNAME": []byte("neo4j"),
		"NEO4J_PASSWORD": []byte("password"),
		"NEO4J_DATABASE": []byte("neo4j"),
	}
}

func generateTestCA(t *testing.T) []byte {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)
	template := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "neo4j-test-ca"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		IsCA:                  true,
		KeyUsage:              x509.KeyUsageCertSign,
		BasicConstraintsValid: true,
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	require.NoError(t, err)
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}

func TestParseNeo4jEndpoint(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		hasCA   bool
		wantErr string
		check   func(*testing.T, neo4jEndpoint)
	}{
		{
			name: "in-cluster plaintext",
			raw:  "neo4j://neo4j.team-a.svc.cluster.local",
			check: func(t *testing.T, endpoint neo4jEndpoint) {
				assert.Equal(t, "7687", endpoint.port)
				assert.True(t, endpoint.inCluster)
				assert.False(t, endpoint.tls)
			},
		},
		{
			name: "external with TLS",
			raw:  "bolt+s://neo4j.example.com:7688",
			check: func(t *testing.T, endpoint neo4jEndpoint) {
				assert.Equal(t, "7688", endpoint.port)
				assert.True(t, endpoint.tls)
			},
		},
		{name: "external plaintext", raw: "neo4j://neo4j.example.com", wantErr: "must use neo4j+s or bolt+s"},
		{name: "verification-disabled scheme", raw: "neo4j+ssc://neo4j.example.com", wantErr: "must use neo4j, neo4j+s, bolt, or bolt+s"},
		{name: "unsupported scheme", raw: "https://neo4j.example.com", wantErr: "must use neo4j, neo4j+s, bolt, or bolt+s"},
		{name: "literal IP", raw: "neo4j://10.0.0.5:7687", wantErr: "must be a DNS name"},
		{name: "credentials", raw: "neo4j+s://user:pass@neo4j.example.com", wantErr: "unsupported credentials"},
		{name: "query", raw: "neo4j+s://neo4j.example.com?x=1", wantErr: "unsupported credentials"},
		{name: "missing host", raw: "neo4j+s://", wantErr: "must include a host"},
		{name: "invalid port", raw: "neo4j+s://neo4j.example.com:70000", wantErr: "invalid port"},
		{
			name:  "CA promotes in-cluster plain scheme to TLS",
			raw:   "neo4j://neo4j.team-a.svc.cluster.local",
			hasCA: true,
			check: func(t *testing.T, endpoint neo4jEndpoint) {
				assert.True(t, endpoint.tls)
				assert.Equal(t, "bolt+s://neo4j.team-a.svc.cluster.local:7687", endpoint.uri())
			},
		},
		{
			name:  "CA promotes external plain scheme to TLS",
			raw:   "neo4j://neo4j.example.com:7687",
			hasCA: true,
			check: func(t *testing.T, endpoint neo4jEndpoint) {
				assert.True(t, endpoint.tls)
				assert.Equal(t, "bolt+s://neo4j.example.com:7687", endpoint.uri())
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			endpoint, err := parseNeo4jEndpointWithLoopback(test.raw, false, test.hasCA)
			if test.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), test.wantErr)
				return
			}
			require.NoError(t, err)
			test.check(t, endpoint)
		})
	}
}

func TestNewNeo4jFromSecretRequiresFields(t *testing.T) {
	_, err := newNeo4jFromSecret(context.Background(), map[string][]byte{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "missing NEO4J_URI")

	_, err = newNeo4jFromSecret(context.Background(), map[string][]byte{"NEO4J_URI": []byte("neo4j+s://db.example.com")})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "missing NEO4J_PASSWORD")
}

func TestNewNeo4jFromSecretConfiguresDriver(t *testing.T) {
	secret := validNeo4jSecret()
	secret["NEO4J_CA_CERT"] = generateTestCA(t)
	secret["NEO4J_USERNAME"] = nil
	secret["NEO4J_DATABASE"] = nil
	var captured *fakeNeo4jDriver

	db, err := newNeo4jFromSecretWithDriver(context.Background(), secret, time.Second, func(_ context.Context, uri string, auth neo4j.AuthToken, configure func(*config.Config)) (neo4jDriver, error) {
		config := &config.Config{}
		configure(config)
		captured = &fakeNeo4jDriver{uri: uri, auth: auth, config: config, session: &fakeNeo4jSession{result: &fakeNeo4jResult{}}}
		return captured, nil
	}, fakeNeo4jLookup("93.184.216.34"))
	require.NoError(t, err)
	require.NotNil(t, captured)
	assert.Equal(t, "bolt+s://neo4j.example.com:7687", captured.uri)
	assert.Equal(t, "neo4j", captured.auth.Tokens["principal"])
	require.NotNil(t, captured.config.TlsConfig)
	assert.NotNil(t, captured.config.TlsConfig.RootCAs)
	assert.Equal(t, uint16(tls.VersionTLS12), captured.config.TlsConfig.MinVersion)
	require.NoError(t, db.Close())
	assert.True(t, captured.closed)
}

func TestNewNeo4jFromSecretRejectsMalformedCA(t *testing.T) {
	secret := validNeo4jSecret()
	secret["NEO4J_CA_CERT"] = []byte("not a certificate")
	_, err := newNeo4jFromSecretWithDriver(context.Background(), secret, time.Second, newNeo4jDriver, fakeNeo4jLookup("93.184.216.34"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "NEO4J_CA_CERT")
}

func TestNewNeo4jFromSecretClassifiesConnectivityErrors(t *testing.T) {
	_, err := newNeo4jFromSecretWithDriver(context.Background(), validNeo4jSecret(), time.Nanosecond, func(context.Context, string, neo4j.AuthToken, func(*config.Config)) (neo4jDriver, error) {
		return &fakeNeo4jDriver{verifyErr: context.DeadlineExceeded}, nil
	}, fakeNeo4jLookup("93.184.216.34"))
	require.ErrorIs(t, err, ErrDatabaseTimeout)

	_, err = newNeo4jFromSecretWithDriver(context.Background(), validNeo4jSecret(), time.Second, func(context.Context, string, neo4j.AuthToken, func(*config.Config)) (neo4jDriver, error) {
		return &fakeNeo4jDriver{verifyErr: errors.New("connection refused")}, nil
	}, fakeNeo4jLookup("93.184.216.34"))
	require.ErrorIs(t, err, ErrDatabaseUnavailable)
}

func TestNewNeo4jFromSecretRejectsBlockedResolution(t *testing.T) {
	// An external host resolving to the link-local metadata range must be
	// rejected before any driver is created.
	_, err := newNeo4jFromSecretWithDriver(context.Background(), validNeo4jSecret(), time.Second, func(context.Context, string, neo4j.AuthToken, func(*config.Config)) (neo4jDriver, error) {
		return nil, errors.New("driver must not be created")
	}, fakeNeo4jLookup("169.254.169.254"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "blocked address")

	// One blocked address among several rejects the whole host, mirroring the
	// dial-time behavior of the Milvus and pgvector adapters.
	_, err = newNeo4jFromSecretWithDriver(context.Background(), validNeo4jSecret(), time.Second, func(context.Context, string, neo4j.AuthToken, func(*config.Config)) (neo4jDriver, error) {
		return nil, errors.New("driver must not be created")
	}, fakeNeo4jLookup("93.184.216.34", "192.0.2.1"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "blocked address")
}

func TestNewNeo4jFromSecretAllowsClusterPrivateResolution(t *testing.T) {
	// Cluster-local hostnames may resolve to the private ranges that are
	// blocked for external hosts.
	secret := validNeo4jSecret()
	secret["NEO4J_URI"] = []byte("neo4j://neo4j.team-a.svc.cluster.local:7687")
	db, err := newNeo4jFromSecretWithDriver(context.Background(), secret, time.Second, func(context.Context, string, neo4j.AuthToken, func(*config.Config)) (neo4jDriver, error) {
		return &fakeNeo4jDriver{session: &fakeNeo4jSession{result: &fakeNeo4jResult{}}}, nil
	}, fakeNeo4jLookup("10.1.2.3"))
	require.NoError(t, err)
	require.NoError(t, db.Close())
}

func TestNewNeo4jFromSecretRejectsUnresolvableHost(t *testing.T) {
	_, err := newNeo4jFromSecretWithDriver(context.Background(), validNeo4jSecret(), time.Second, func(context.Context, string, neo4j.AuthToken, func(*config.Config)) (neo4jDriver, error) {
		return nil, errors.New("driver must not be created")
	}, func(context.Context, string) ([]net.IP, error) {
		return nil, errors.New("no such host")
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot be resolved")
}

func TestNewNeo4jFromSecretPinsPlainDialAddress(t *testing.T) {
	// Plain in-cluster endpoints dial the validated literal IP, not the
	// hostname, so the connection cannot be re-resolved to another address.
	secret := validNeo4jSecret()
	secret["NEO4J_URI"] = []byte("neo4j://neo4j.team-a.svc.cluster.local:7687")
	var captured *fakeNeo4jDriver

	db, err := newNeo4jFromSecretWithDriver(context.Background(), secret, time.Second, func(_ context.Context, uri string, _ neo4j.AuthToken, _ func(*config.Config)) (neo4jDriver, error) {
		captured = &fakeNeo4jDriver{uri: uri, session: &fakeNeo4jSession{result: &fakeNeo4jResult{}}}
		return captured, nil
	}, fakeNeo4jLookup("10.1.2.3"))
	require.NoError(t, err)
	require.NotNil(t, captured)
	assert.Equal(t, "bolt://10.1.2.3:7687", captured.uri)
	require.NoError(t, db.Close())

	// TLS endpoints keep the hostname: the driver derives the TLS server name
	// from the dialed address, so a pinned IP would fail certificate
	// validation.
	secret = validNeo4jSecret()
	captured = nil
	db, err = newNeo4jFromSecretWithDriver(context.Background(), secret, time.Second, func(_ context.Context, uri string, _ neo4j.AuthToken, _ func(*config.Config)) (neo4jDriver, error) {
		captured = &fakeNeo4jDriver{uri: uri, session: &fakeNeo4jSession{result: &fakeNeo4jResult{}}}
		return captured, nil
	}, fakeNeo4jLookup("93.184.216.34"))
	require.NoError(t, err)
	require.NotNil(t, captured)
	assert.Equal(t, "bolt+s://neo4j.example.com:7687", captured.uri)
	require.NoError(t, db.Close())
}

func TestNewNeo4jFromSecretFallsBackToNextPinnedAddress(t *testing.T) {
	// An in-cluster endpoint can resolve to several addresses (headless or
	// dual-stack service); when the first has no listener, the next validated
	// address must be tried instead of failing with ErrDatabaseUnavailable.
	secret := validNeo4jSecret()
	secret["NEO4J_URI"] = []byte("neo4j://neo4j.team-a.svc.cluster.local:7687")
	var created []*fakeNeo4jDriver

	db, err := newNeo4jFromSecretWithDriver(context.Background(), secret, time.Second, func(_ context.Context, uri string, _ neo4j.AuthToken, _ func(*config.Config)) (neo4jDriver, error) {
		driver := &fakeNeo4jDriver{uri: uri, session: &fakeNeo4jSession{result: &fakeNeo4jResult{}}}
		if len(created) == 0 {
			// First address accepts the driver but fails verification, as a
			// dual-stack service with no listener on the first family would.
			driver.verifyErr = errors.New("connection refused")
		}
		created = append(created, driver)
		return driver, nil
	}, fakeNeo4jLookup("10.1.2.3", "10.1.2.4"))
	require.NoError(t, err)
	require.Len(t, created, 2)
	assert.Equal(t, "bolt://10.1.2.3:7687", created[0].uri)
	assert.Equal(t, "bolt://10.1.2.4:7687", created[1].uri)
	assert.True(t, created[0].closed, "failed attempt must close its driver before the next address is tried")
	require.NoError(t, db.Close())
}

func TestNewNeo4jFromSecretFailsWhenAllPinnedAddressesFail(t *testing.T) {
	secret := validNeo4jSecret()
	secret["NEO4J_URI"] = []byte("neo4j://neo4j.team-a.svc.cluster.local:7687")
	var created []*fakeNeo4jDriver

	_, err := newNeo4jFromSecretWithDriver(context.Background(), secret, time.Second, func(_ context.Context, uri string, _ neo4j.AuthToken, _ func(*config.Config)) (neo4jDriver, error) {
		driver := &fakeNeo4jDriver{uri: uri, verifyErr: errors.New("connection refused")}
		created = append(created, driver)
		return driver, nil
	}, fakeNeo4jLookup("10.1.2.3", "10.1.2.4"))
	require.Error(t, err)
	assert.Len(t, created, 2)
	assert.True(t, created[0].closed)
	assert.True(t, created[1].closed)
	assert.ErrorIs(t, err, ErrDatabaseUnavailable)
}

func TestNeo4jSearchUsesCollectionVectorIndex(t *testing.T) {
	driver := &fakeNeo4jDriver{verifyErr: nil}
	session := &fakeNeo4jSession{result: &fakeNeo4jResult{records: []*neo4j.Record{
		neo4jRecord("first chunk", 0.91, "chunk-1"),
		neo4jRecord("second chunk", 0.42, "chunk-2"),
	}}}
	driver.session = session
	db, err := newNeo4jFromSecretWithDriver(context.Background(), validNeo4jSecret(), time.Second, func(context.Context, string, neo4j.AuthToken, func(*config.Config)) (neo4jDriver, error) {
		return driver, nil
	}, fakeNeo4jLookup("93.184.216.34"))
	require.NoError(t, err)

	results, err := db.Search(context.Background(), "ai4rag_20261026195239_muw95df4", []float32{0.1, 0.2}, "query", SearchOptions{TopK: 3})
	require.NoError(t, err)
	assert.Equal(t, []SearchResult{
		{ID: "chunk-1", Text: "first chunk", Score: float32(0.91)},
		{ID: "chunk-2", Text: "second chunk", Score: float32(0.42)},
	}, results)

	assert.Equal(t, 1, session.runCalls)
	assert.Equal(t, "neo4j", driver.sessionCfg.DatabaseName)
	assert.Equal(t, neo4j.AccessModeRead, driver.sessionCfg.AccessMode)
	assert.Contains(t, session.query, "db.index.vector.queryNodes($index_name, $route_k, $query_vector)")
	assert.Equal(t, "ai4rag_20261026195239_muw95df4__embedding", session.params["index_name"])
	assert.Equal(t, "ai4rag_20261026195239_muw95df4", session.params["col"])
	assert.Equal(t, 10, session.params["route_k"])
	assert.Equal(t, 3, session.params["top_k"])
	assert.Equal(t, []float64{float64(float32(0.1)), float64(float32(0.2))}, session.params["query_vector"])
	assert.True(t, session.closed)
}

func TestNeo4jSearchRejectsHybridRanking(t *testing.T) {
	driver := &fakeNeo4jDriver{session: &fakeNeo4jSession{result: &fakeNeo4jResult{}}}
	db, err := newNeo4jFromSecretWithDriver(context.Background(), validNeo4jSecret(), time.Second, func(context.Context, string, neo4j.AuthToken, func(*config.Config)) (neo4jDriver, error) {
		return driver, nil
	}, fakeNeo4jLookup("93.184.216.34"))
	require.NoError(t, err)

	_, err = db.Search(context.Background(), "collection", nil, "", SearchOptions{TopK: 3, Ranker: "rrf", RankerK: 60})
	require.ErrorIs(t, err, ErrUnsupportedSearch)
}

func TestNeo4jSearchClassifiesQueryErrors(t *testing.T) {
	driver := &fakeNeo4jDriver{session: &fakeNeo4jSession{err: errors.New("index not found")}}
	db, err := newNeo4jFromSecretWithDriver(context.Background(), validNeo4jSecret(), time.Second, func(context.Context, string, neo4j.AuthToken, func(*config.Config)) (neo4jDriver, error) {
		return driver, nil
	}, fakeNeo4jLookup("93.184.216.34"))
	require.NoError(t, err)

	_, err = db.Search(context.Background(), "collection", []float32{1}, "", SearchOptions{TopK: 1})
	require.ErrorIs(t, err, ErrDatabaseUnavailable)
}

func TestNeo4jGraphSearchQueryTogglesExpansion(t *testing.T) {
	full := neo4jGraphSearchQuery(true, 5, 3, 1, 5)
	assert.Contains(t, full, "CALL (node) { OPTIONAL MATCH (entity:__Entity__)")
	assert.Contains(t, full, "MATCH path = (pivot)-[*1..1]-(related:__Entity__)")
	assert.Contains(t, full, "LIMIT 5 RETURN collect({chunk: ent_nb")
	assert.Contains(t, full, "ORDER BY similarity DESC, path_count DESC, hops ASC, rel_nb.id ASC LIMIT 5")

	minimal := neo4jGraphSearchQuery(false, 0, 0, 0, 0)
	assert.NotContains(t, minimal, "OPTIONAL MATCH (entity:")
	assert.NotContains(t, minimal, "MATCH path =")
	assert.Contains(t, minimal, "WITH node, [] AS ent_hits")
	assert.Contains(t, minimal, "WITH node, ent_hits, [] AS rel_hits")
}

func TestNeo4jSearchResultContentLimit(t *testing.T) {
	driver := &fakeNeo4jDriver{session: &fakeNeo4jSession{result: &fakeNeo4jResult{records: []*neo4j.Record{
		neo4jRecord(strings.Repeat("x", MaxVectorResultBytes+1), 0.5, "chunk-1"),
	}}}}
	db, err := newNeo4jFromSecretWithDriver(context.Background(), validNeo4jSecret(), time.Second, func(context.Context, string, neo4j.AuthToken, func(*config.Config)) (neo4jDriver, error) {
		return driver, nil
	}, fakeNeo4jLookup("93.184.216.34"))
	require.NoError(t, err)

	_, err = db.Search(context.Background(), "collection", []float32{1}, "", SearchOptions{TopK: 1})
	require.ErrorIs(t, err, ErrResultContentLimit)
}
