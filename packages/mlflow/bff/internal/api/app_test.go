package api

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/opendatahub-io/mlflow/bff/internal/config"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow/mlflowmocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// writeSelfSignedCert generates a minimal self-signed PEM certificate in a temp file.
func writeSelfSignedCert(t *testing.T, dir string) string {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{Organization: []string{"test"}},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().Add(time.Hour),
	}
	derBytes, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	require.NoError(t, err)

	certFile := filepath.Join(dir, "test.pem")
	f, err := os.Create(certFile)
	require.NoError(t, err)
	defer f.Close()

	require.NoError(t, pem.Encode(f, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes}))
	return certFile
}

// --- initRootCAs tests ---

func TestInitRootCAs_NoBundlePaths(t *testing.T) {
	pool := initRootCAs(nil, testLogger())
	assert.Nil(t, pool)
}

func TestInitRootCAs_EmptyBundlePaths(t *testing.T) {
	pool := initRootCAs([]string{}, testLogger())
	assert.Nil(t, pool)
}

func TestInitRootCAs_WhitespaceOnlyPaths(t *testing.T) {
	pool := initRootCAs([]string{"  ", "\t", ""}, testLogger())
	assert.Nil(t, pool)
}

func TestInitRootCAs_NonExistentFile(t *testing.T) {
	pool := initRootCAs([]string{"/nonexistent/ca.pem"}, testLogger())
	assert.Nil(t, pool)
}

func TestInitRootCAs_InvalidPEMContent(t *testing.T) {
	dir := t.TempDir()
	badFile := filepath.Join(dir, "bad.pem")
	require.NoError(t, os.WriteFile(badFile, []byte("not a PEM certificate"), 0o644))

	pool := initRootCAs([]string{badFile}, testLogger())
	assert.Nil(t, pool)
}

func TestInitRootCAs_ValidCert(t *testing.T) {
	dir := t.TempDir()
	certFile := writeSelfSignedCert(t, dir)

	pool := initRootCAs([]string{certFile}, testLogger())
	assert.NotNil(t, pool)
}

func TestInitRootCAs_MixedValidAndInvalid(t *testing.T) {
	dir := t.TempDir()
	certFile := writeSelfSignedCert(t, dir)

	pool := initRootCAs([]string{"/nonexistent/ca.pem", certFile, "  "}, testLogger())
	assert.NotNil(t, pool)
}

// --- initMLflowFactory tests ---

func TestInitMLflowFactory_MockWithExternalURL(t *testing.T) {
	cfg := config.EnvConfig{
		MockHTTPClient: true,
		MLflowURL:      "http://127.0.0.1:5001",
		DevMode:        true,
	}

	factory, state, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	assert.Nil(t, state)
	assert.IsType(t, &mlflowmocks.MockClientFactory{}, factory)
}

func TestInitMLflowFactory_StaticMockFlag(t *testing.T) {
	cfg := config.EnvConfig{MockHTTPClient: true, StaticMLflowMock: true}

	factory, state, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	assert.Nil(t, state)
	assert.IsType(t, &mlflowmocks.StaticMockClientFactory{}, factory)
}

func TestInitMLflowFactory_MockWithoutURL_SetupMLflowSucceeds(t *testing.T) {
	// MLFLOW_TRACKING_URI makes SetupMLflow return immediately (no real server started).
	t.Setenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:9999")
	cfg := config.EnvConfig{MockHTTPClient: true}

	factory, state, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	require.NotNil(t, state)
	assert.Equal(t, "http://127.0.0.1:9999", state.TrackingURI)
	assert.IsType(t, &mlflowmocks.MockClientFactory{}, factory)
}

func TestInitMLflowFactory_MockWithoutURL_FallsBackToStatic(t *testing.T) {
	// Force SetupMLflow to fail:
	// - MLFLOW_PORT on an unused port so the health check won't find a running instance
	// - Clear PATH so exec.LookPath can't find uv
	// - Chdir to temp so resolveUVBinary can't walk up to the project's bin/uv
	t.Setenv("MLFLOW_TRACKING_URI", "")
	t.Setenv("MLFLOW_PORT", "59999")
	t.Setenv("PATH", "")
	t.Chdir(t.TempDir())

	cfg := config.EnvConfig{MockHTTPClient: true}

	factory, state, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	assert.Nil(t, state)
	assert.IsType(t, &mlflowmocks.StaticMockClientFactory{}, factory)
}

func TestInitMLflowFactory_RealWithURL(t *testing.T) {
	cfg := config.EnvConfig{
		MLflowURL: "https://mlflow.example.com",
	}

	factory, state, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	assert.Nil(t, state)
	assert.IsType(t, &mlflowpkg.RealClientFactory{}, factory)
}

func TestInitMLflowFactory_NothingConfigured(t *testing.T) {
	cfg := config.EnvConfig{}

	factory, state, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	assert.Nil(t, state)
	assert.IsType(t, &mlflowpkg.UnavailableClientFactory{}, factory)
}
