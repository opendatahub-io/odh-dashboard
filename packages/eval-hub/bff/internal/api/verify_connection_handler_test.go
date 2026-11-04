package api

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"io"
	"log/slog"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/connectionprobe"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testCertificateAuthority creates a separate CA so each trust-pool case has a known signer.
func testCertificateAuthority(t *testing.T, name string) (*x509.Certificate, ed25519.PrivateKey, []byte) {
	t.Helper()

	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	template := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: name},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		KeyUsage:              x509.KeyUsageCertSign,
		BasicConstraintsValid: true,
		IsCA:                  true,
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, publicKey, privateKey)
	require.NoError(t, err)
	cert, err := x509.ParseCertificate(der)
	require.NoError(t, err)

	return cert, privateKey, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}

// testServerCertificate creates a localhost leaf certificate signed by the test CA.
func testServerCertificate(t *testing.T, ca *x509.Certificate, caKey ed25519.PrivateKey) (tls.Certificate, []byte) {
	t.Helper()

	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	template := &x509.Certificate{
		SerialNumber: big.NewInt(2),
		Subject:      pkix.Name{CommonName: "localhost"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		DNSNames:     []string{"localhost"},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")},
	}
	der, err := x509.CreateCertificate(rand.Reader, template, ca, publicKey, caKey)
	require.NoError(t, err)

	return tls.Certificate{Certificate: [][]byte{der, ca.Raw}, PrivateKey: privateKey},
		pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}

// TestRootCAsWithSecretCert covers how Secret PEM data changes the probe's trusted CA pool.
func TestRootCAsWithSecretCert(t *testing.T) {
	existingCA, _, _ := testCertificateAuthority(t, "existing CA")
	secretCA, secretCAKey, secretPEM := testCertificateAuthority(t, "secret CA")
	otherCA, _, otherPEM := testCertificateAuthority(t, "other secret CA")
	_, leafPEM := testServerCertificate(t, secretCA, secretCAKey)

	configured := x509.NewCertPool()
	configured.AddCert(existingCA)

	// Without ca_cert, the probe should keep using the configured pool as-is.
	t.Run("empty bundle keeps configured roots", func(t *testing.T) {
		roots, err := rootCAsWithSecretCert(configured, nil)
		require.NoError(t, err)
		assert.Same(t, configured, roots)
	})

	// A mixed bundle should add both CAs, skip the leaf, and leave shared roots untouched.
	t.Run("adds every CA and ignores leaf certificates without changing configured roots", func(t *testing.T) {
		bundle := bytes.Join([][]byte{leafPEM, secretPEM, otherPEM}, nil)
		original := configured.Clone()
		roots, err := rootCAsWithSecretCert(configured, bundle)
		require.NoError(t, err)

		expected := x509.NewCertPool()
		expected.AddCert(existingCA)
		expected.AddCert(secretCA)
		expected.AddCert(otherCA)
		assert.True(t, roots.Equal(expected))
		assert.True(t, configured.Equal(original), "configured roots must not be mutated")
	})

	tests := []struct {
		name    string
		bundle  []byte
		message string
	}{
		// A leaf alone cannot establish CA trust.
		{"leaf only", leafPEM, "does not contain a CA certificate"},
		// Text without a PEM block must be rejected.
		{"invalid PEM", []byte("not PEM"), "invalid PEM data"},
		// A certificate block with invalid DER must be rejected.
		{"invalid certificate", pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: []byte("bad")}), "invalid certificate"},
		// A PEM block of another type must not be treated as a certificate.
		{"non-certificate block", pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: []byte("bad")}), "non-certificate PEM block"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := rootCAsWithSecretCert(configured, tc.bundle)
			require.Error(t, err)
			assert.ErrorContains(t, err, tc.message)
		})
	}
}

// TestConnectionProbeWithSecretCA proves a Secret CA enables a real TLS probe to an otherwise untrusted server.
func TestConnectionProbeWithSecretCA(t *testing.T) {
	ca, caKey, caPEM := testCertificateAuthority(t, "probe CA")
	serverCertificate, _ := testServerCertificate(t, ca, caKey)
	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"chatcmpl-123","choices":[{"message":{"role":"assistant","content":"ok"}}]}`))
	}))
	server.TLS = &tls.Config{Certificates: []tls.Certificate{serverCertificate}}
	server.StartTLS()
	defer server.Close()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	request := models.VerifyConnectionRequest{ModelID: "test-model"}
	// This control ensures the successful probe below depends on certificate verification.
	untrustedClient, err := connectionprobe.NewConnectionProbeClient(
		logger,
		server.URL+"/v1",
		"test-api-key",
		"model",
		&connectionprobe.ClientOptions{SkipSSRFValidation: true, RootCAs: x509.NewCertPool()},
	)
	require.NoError(t, err)
	_, err = untrustedClient.Probe(context.Background(), request)
	require.Error(t, err, "the probe must reject the server without its CA")

	// Trusting the Secret CA should let the same HTTPS endpoint pass the probe.
	roots, err := rootCAsWithSecretCert(x509.NewCertPool(), caPEM)
	require.NoError(t, err)
	client, err := connectionprobe.NewConnectionProbeClient(
		logger,
		server.URL+"/v1",
		"test-api-key",
		"model",
		&connectionprobe.ClientOptions{SkipSSRFValidation: true, RootCAs: roots},
	)
	require.NoError(t, err)

	response, err := client.Probe(context.Background(), request)
	require.NoError(t, err)
	assert.True(t, response.Success)
	require.NotNil(t, response.OpenAICompat)
	assert.True(t, *response.OpenAICompat)
}

func TestVerifyConnectionHandler_MissingBaseURL(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	body := models.VerifyConnectionRequest{
		SourceType: "model",
		BaseURL:    "",
	}

	result, response, err := setupApiTest[HTTPError](
		http.MethodPost,
		VerifyConnectionPath+"?namespace=test-ns",
		body, nil, identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
	assert.Contains(t, result.Error.Message, "base_url is required")
}

func TestVerifyConnectionHandler_MissingSourceType(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	body := models.VerifyConnectionRequest{
		SourceType: "",
		BaseURL:    "https://api.example.com",
	}

	result, response, err := setupApiTest[HTTPError](
		http.MethodPost,
		VerifyConnectionPath+"?namespace=test-ns",
		body, nil, identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
	assert.Contains(t, result.Error.Message, "source_type is required")
}

func TestVerifyConnectionHandler_InvalidSourceType(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	body := models.VerifyConnectionRequest{
		SourceType: "invalid",
		BaseURL:    "https://api.example.com",
	}

	result, response, err := setupApiTest[HTTPError](
		http.MethodPost,
		VerifyConnectionPath+"?namespace=test-ns",
		body, nil, identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
	assert.Contains(t, result.Error.Message, "invalid source_type")
}

func TestVerifyConnectionHandler_EmptyBody(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	result, response, err := setupApiTest[HTTPError](
		http.MethodPost,
		VerifyConnectionPath+"?namespace=test-ns",
		nil, nil, identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
	assert.NotEmpty(t, result.Error.Message)
}
