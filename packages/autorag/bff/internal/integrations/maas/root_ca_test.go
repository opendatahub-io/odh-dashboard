package maas

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestTLSServer(t *testing.T, response string) *httptest.Server {
	t.Helper()
	certificate, _ := newTestCertificate(t)
	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(response))
	}))
	server.TLS = &tls.Config{Certificates: []tls.Certificate{certificate}}
	server.StartTLS()
	t.Cleanup(server.Close)
	return server
}

func newRotatingTestTLSServer(t *testing.T, response string) (*httptest.Server, func(tls.Certificate)) {
	t.Helper()
	firstCertificate, _ := newTestCertificate(t)
	var current atomic.Pointer[tls.Certificate]
	current.Store(&firstCertificate)
	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(response))
	}))
	server.TLS = &tls.Config{
		Certificates: []tls.Certificate{firstCertificate},
		GetCertificate: func(*tls.ClientHelloInfo) (*tls.Certificate, error) {
			return current.Load(), nil
		},
	}
	server.StartTLS()
	t.Cleanup(server.Close)
	return server, func(certificate tls.Certificate) {
		current.Store(&certificate)
	}
}

func newTestCertificate(t *testing.T) (tls.Certificate, *x509.Certificate) {
	t.Helper()
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)
	serialNumber, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	require.NoError(t, err)
	certificateTemplate := &x509.Certificate{
		SerialNumber:          serialNumber,
		Subject:               pkix.Name{CommonName: "maas.apps.cluster"},
		NotBefore:             time.Now().Add(-time.Minute),
		NotAfter:              time.Now().Add(time.Hour),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		DNSNames:              []string{"maas.apps.cluster", "maas-ui.test-ns.svc.cluster.local"},
		IPAddresses:           nil,
		BasicConstraintsValid: true,
	}
	certificateDER, err := x509.CreateCertificate(rand.Reader, certificateTemplate, certificateTemplate, &privateKey.PublicKey, privateKey)
	require.NoError(t, err)
	certificate := tls.Certificate{
		Certificate: [][]byte{certificateDER},
		PrivateKey:  privateKey,
	}
	parsedCertificate, err := x509.ParseCertificate(certificateDER)
	require.NoError(t, err)
	return certificate, parsedCertificate
}

func TestDynamicRootCAPoolReplacesRotatedCertificate(t *testing.T) {
	firstServer := newTestTLSServer(t, "first response")
	secondServer := newTestTLSServer(t, "second response")
	pool := NewDynamicRootCAPool(x509.NewCertPool())

	firstCertificate := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: firstServer.Certificate().Raw})
	secondCertificate := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: secondServer.Certificate().Raw})
	require.NoError(t, pool.Update(firstCertificate))
	firstPublished := pool.Current()

	require.NoError(t, pool.Update(secondCertificate))
	secondPublished := pool.Current()

	assert.False(t, firstPublished.Equal(secondPublished))
	assertCertificateTrusted(t, firstServer.Certificate(), firstPublished)
	assertCertificateTrusted(t, secondServer.Certificate(), secondPublished)
	assertCertificateNotTrusted(t, firstServer.Certificate(), secondPublished)
}

func TestDynamicRootCAPoolRejectsInvalidCertificate(t *testing.T) {
	pool := NewDynamicRootCAPool(x509.NewCertPool())

	err := pool.Update([]byte("not a certificate"))

	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse")
}

func assertCertificateTrusted(t *testing.T, certificate *x509.Certificate, pool *x509.CertPool) {
	t.Helper()
	_, err := certificate.Verify(x509.VerifyOptions{
		Roots:     pool,
		DNSName:   "maas.apps.cluster",
		KeyUsages: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	})
	require.NoError(t, err)
}

func assertCertificateNotTrusted(t *testing.T, certificate *x509.Certificate, pool *x509.CertPool) {
	t.Helper()
	_, err := certificate.Verify(x509.VerifyOptions{
		Roots:     pool,
		DNSName:   "maas.apps.cluster",
		KeyUsages: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	})
	assert.Error(t, err)
}
