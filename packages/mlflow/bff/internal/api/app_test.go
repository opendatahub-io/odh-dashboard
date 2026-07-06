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
