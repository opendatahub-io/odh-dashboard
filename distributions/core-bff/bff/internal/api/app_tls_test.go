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
	"k8s.io/client-go/rest"
)

func writeSelfSignedCert(t *testing.T, dir, name string) string {
	t.Helper()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: name},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		IsCA:         true,
	}
	certDER, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	require.NoError(t, err)

	certPath := filepath.Join(dir, name+".pem")
	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER})
	require.NoError(t, os.WriteFile(certPath, certPEM, 0600))
	return certPath
}

func TestInitRootCAs_NoPaths(t *testing.T) {
	pool := initRootCAs(nil, testLogger())
	assert.Nil(t, pool)
}

func TestInitRootCAs_ValidBundle(t *testing.T) {
	dir := t.TempDir()
	writeSelfSignedCert(t, dir, "test-ca")

	pool := initRootCAs([]string{filepath.Join(dir, "test-ca.pem")}, testLogger())
	require.NotNil(t, pool)
}

func TestInitRootCAs_NonExistentPath(t *testing.T) {
	pool := initRootCAs([]string{"/nonexistent/path.pem"}, testLogger())
	assert.Nil(t, pool, "should fall back to nil when no certs load")
}

func TestInitRootCAs_InvalidPEM(t *testing.T) {
	dir := t.TempDir()
	badPath := filepath.Join(dir, "bad.pem")
	require.NoError(t, os.WriteFile(badPath, []byte("not a cert"), 0600))

	pool := initRootCAs([]string{badPath}, testLogger())
	assert.Nil(t, pool, "should fall back to nil when PEM contains no certs")
}

func TestInitRootCAs_EmptyStringSkipped(t *testing.T) {
	dir := t.TempDir()
	certPath := writeSelfSignedCert(t, dir, "real-ca")

	pool := initRootCAs([]string{"", "  ", certPath}, testLogger())
	require.NotNil(t, pool, "should skip empty strings and load valid cert")
}

func TestKubernetesProxyRootCAs_CreatesPoolWhenNil(t *testing.T) {
	app := &App{}

	assert.NotNil(t, app.kubernetesProxyRootCAs())
	assert.Nil(t, app.rootCAs, "building the proxy pool must not install a shared pool")
}

// The kubeconfig CA is trusted for the Kubernetes proxies only. Appending it
// to the proxy pool must leave the shared outbound pool untouched, or the
// model-serving, module, inter-BFF and Prometheus transports would trust it too.
func TestKubernetesProxyRootCAs_IsACopyOfTheSharedPool(t *testing.T) {
	shared := x509.NewCertPool()
	app := &App{rootCAs: shared, logger: testLogger()}
	before := shared.Clone()

	pool := app.kubernetesProxyRootCAs()
	require.NotSame(t, shared, pool)
	require.NoError(t, app.appendCACerts(pool, readPEM(t, writeSelfSignedCert(t, t.TempDir(), "kubeconfig-ca")), "test"))

	assert.True(t, shared.Equal(before), "the shared pool must not gain the kubeconfig CA")
	assert.False(t, pool.Equal(before), "the proxy pool must carry the kubeconfig CA")
}

// End to end through the proxy initialisation, with the envtest CA standing in
// for the kubeconfig CA: the shared pool other transports use stays unchanged.
func TestInitK8sProxy_DoesNotAddTheClusterCAToTheSharedPool(t *testing.T) {
	shared := x509.NewCertPool()
	require.NoError(t, (&App{logger: testLogger()}).appendCACerts(shared,
		readPEM(t, writeSelfSignedCert(t, t.TempDir(), "service-ca")), "test"))
	before := shared.Clone()

	app := newTestApp(func(a *App) { a.rootCAs = shared })
	cfg := app.config
	cfg.MockK8Client = true
	require.NoError(t, app.initK8sProxy(cfg, k8sSetupResult{testEnv: testEnvInstance}))
	t.Cleanup(app.wsTracker.Stop)

	assert.True(t, app.rootCAs.Equal(before), "the envtest CA must reach only the Kubernetes proxies")
}

func readPEM(t *testing.T, path string) []byte {
	t.Helper()
	pemBytes, err := os.ReadFile(path)
	require.NoError(t, err)
	return pemBytes
}

func TestAppendCACerts_InvalidPEM_ReturnsError(t *testing.T) {
	app := &App{logger: testLogger()}
	err := app.appendCACerts(x509.NewCertPool(), []byte("not valid PEM"), "test-source")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "no valid certificates")
}

func TestAppendCAFromTLSConfig_UnreadableCAFile_ReturnsError(t *testing.T) {
	app := &App{logger: testLogger()}
	err := app.appendCAFromTLSConfig(x509.NewCertPool(), rest.TLSClientConfig{
		CAFile: "/nonexistent/ca.pem",
	}, "test")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to read")
}

func TestAppendCAFromTLSConfig_InvalidInlineCA_ReturnsError(t *testing.T) {
	app := &App{logger: testLogger()}
	err := app.appendCAFromTLSConfig(x509.NewCertPool(), rest.TLSClientConfig{
		CAData: []byte("not valid PEM"),
	}, "test")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "no valid certificates")
}

func TestAppendCAFromTLSConfig_ValidInlineCA_Succeeds(t *testing.T) {
	dir := t.TempDir()
	certPath := writeSelfSignedCert(t, dir, "test-ca")
	pemBytes, err := os.ReadFile(certPath)
	require.NoError(t, err)

	app := &App{logger: testLogger()}
	pool := x509.NewCertPool()
	err = app.appendCAFromTLSConfig(pool, rest.TLSClientConfig{
		CAData: pemBytes,
	}, "test")
	require.NoError(t, err)
	assert.False(t, pool.Equal(x509.NewCertPool()), "the CA must land in the pool it was given")
}

func TestLoadClientCert_PartialInline_CertWithoutKey(t *testing.T) {
	app := &App{logger: testLogger()}
	_, err := app.loadClientCert(rest.TLSClientConfig{
		CertData: []byte("cert-data"),
	}, "test")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "incomplete")
}

func TestLoadClientCert_PartialInline_KeyWithoutCert(t *testing.T) {
	app := &App{logger: testLogger()}
	_, err := app.loadClientCert(rest.TLSClientConfig{
		KeyData: []byte("key-data"),
	}, "test")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "incomplete")
}

func TestLoadClientCert_PartialFile_CertWithoutKey(t *testing.T) {
	app := &App{logger: testLogger()}
	_, err := app.loadClientCert(rest.TLSClientConfig{
		CertFile: "/path/to/cert.pem",
	}, "test")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "incomplete")
}

func TestLoadClientCert_PartialFile_KeyWithoutCert(t *testing.T) {
	app := &App{logger: testLogger()}
	_, err := app.loadClientCert(rest.TLSClientConfig{
		KeyFile: "/path/to/key.pem",
	}, "test")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "incomplete")
}

func TestLoadClientCert_NoPairs_ReturnsNil(t *testing.T) {
	app := &App{logger: testLogger()}
	certs, err := app.loadClientCert(rest.TLSClientConfig{}, "test")
	require.NoError(t, err)
	assert.Nil(t, certs)
}
