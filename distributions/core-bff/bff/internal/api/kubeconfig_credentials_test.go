package api

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/pem"
	"math/big"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/client-go/rest"
)

// clientCertPEM returns a self-signed client certificate and its key.
func clientCertPEM(t *testing.T) (certPEM, keyPEM []byte) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)
	template := &x509.Certificate{
		SerialNumber: big.NewInt(2),
		Subject:      pkix.Name{CommonName: "system:admin"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	require.NoError(t, err)
	keyDER, err := x509.MarshalECPrivateKey(key)
	require.NoError(t, err)
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}),
		pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})
}

// useKubeconfig points KUBECONFIG at a kubeconfig whose user authenticates with
// a client certificate. When insecure is true the cluster entry disables
// certificate verification instead of carrying a CA.
func useKubeconfig(t *testing.T, insecure bool) {
	t.Helper()
	dir := t.TempDir()
	certPEM, keyPEM := clientCertPEM(t)
	b64 := base64.StdEncoding.EncodeToString

	cluster := "    certificate-authority-data: " + b64(readPEM(t, writeSelfSignedCert(t, dir, "cluster-ca"))) + "\n"
	if insecure {
		cluster = "    insecure-skip-tls-verify: true\n"
	}
	kubeconfig := "apiVersion: v1\nkind: Config\n" +
		"clusters:\n- name: c\n  cluster:\n    server: https://api.cluster.example:6443\n" + cluster +
		"users:\n- name: u\n  user:\n" +
		"    client-certificate-data: " + b64(certPEM) + "\n" +
		"    client-key-data: " + b64(keyPEM) + "\n" +
		"contexts:\n- name: ctx\n  context:\n    cluster: c\n    user: u\n" +
		"current-context: ctx\n"

	path := filepath.Join(dir, "kubeconfig")
	require.NoError(t, os.WriteFile(path, []byte(kubeconfig), 0600))
	t.Setenv("KUBECONFIG", path)
}

// The Kubernetes proxies forward the caller's token, so the BFF's kubeconfig
// client certificate must not ride along outside DEV_MODE: the API server does
// not define which credential wins when a request carries both.
func TestLoadKubeconfigTLS_KeepsTheClientCertificateOffCallerScopedProxies(t *testing.T) {
	useKubeconfig(t, false)
	app := &App{logger: testLogger()}

	pool := x509.NewCertPool()
	certs, err := app.loadKubeconfigTLS(pool, false)
	require.NoError(t, err)
	assert.Empty(t, certs, "a production proxy must authenticate with the caller's token only")
	assert.False(t, pool.Equal(x509.NewCertPool()), "the cluster CA is still trusted")

	certs, err = app.loadKubeconfigTLS(x509.NewCertPool(), true)
	require.NoError(t, err)
	assert.Len(t, certs, 1, "DEV_MODE keeps the developer's kubeconfig identity")
}

func TestRequireVerifiedKubeconfig(t *testing.T) {
	production := config.EnvConfig{}
	dev := config.EnvConfig{DevMode: true}
	insecure := &rest.Config{TLSClientConfig: rest.TLSClientConfig{Insecure: true}}

	err := requireVerifiedKubeconfig(production, insecure)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not supported in a production profile")

	assert.NoError(t, requireVerifiedKubeconfig(dev, insecure))
	assert.NoError(t, requireVerifiedKubeconfig(production, &rest.Config{}))
}

// INSECURE_SKIP_VERIFY=false must not be undone by the kubeconfig: client-go
// honours insecure-skip-tls-verify for the service-account client, and
// rest.AnonymousClientConfig carries it into every per-caller client.
func TestInitKubernetesClients_RejectsAnInsecureKubeconfigInProduction(t *testing.T) {
	useKubeconfig(t, true)
	cfg := newTestApp().config
	cfg.MockK8Client = false
	cfg.DevMode = false

	_, err := initKubernetesClients(cfg, testLogger())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "insecure-skip-tls-verify")
}
