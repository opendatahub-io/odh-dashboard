package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"flag"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Go flag parsing stops at the first positional argument, so any flag after a
// stray word would be silently ignored. The TLS flags are the dangerous case:
// ignoring them would start the plaintext listener.
func TestParseStartupConfig_RejectsPositionalArguments(t *testing.T) {
	certFile, keyFile := writeKeyPair(t)

	t.Run("positional argument before TLS flags", func(t *testing.T) {
		isolateEnv(t)
		_, err := parse(t, "s3cret-word", "-cert-file="+certFile, "-key-file="+keyFile)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "3 unexpected positional argument(s)")
		assert.NotContains(t, err.Error(), "s3cret-word", "positional values are never echoed")
		assert.NotContains(t, err.Error(), certFile)
	})

	t.Run("trailing positional argument", func(t *testing.T) {
		isolateEnv(t)
		_, err := parse(t, "-cert-file="+certFile, "-key-file="+keyFile, "extra")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "1 unexpected positional argument(s)")
	})

	t.Run("well-formed TLS invocation starts", func(t *testing.T) {
		isolateEnv(t)
		sc, err := parse(t, "-cert-file="+certFile, "-key-file="+keyFile)
		require.NoError(t, err)
		assert.True(t, sc.TLS.Enabled())
	})

	t.Run("separated flag values are not positional", func(t *testing.T) {
		isolateEnv(t)
		sc, err := parse(t, "-cert-file", certFile, "-key-file", keyFile)
		require.NoError(t, err)
		assert.True(t, sc.TLS.Enabled())
	})
}

func TestParseStartupConfig_ParseErrorsDoNotEchoArguments(t *testing.T) {
	cases := []struct {
		name     string
		args     []string
		wantText string
	}{
		{"invalid int value", []string{"-port=s3cret"}, "invalid value for flag -port"},
		{"invalid bool value", []string{"-dev-mode=s3cret"}, "invalid value for flag -dev-mode"},
		{"invalid enum value", []string{"-platform-type=s3cret"}, "invalid value for flag -platform-type"},
		{"undefined flag", []string{"-token=s3cret"}, "invalid command-line arguments"},
		{"undefined flag name carries the secret", []string{"--s3cret"}, "invalid command-line arguments"},
		{"missing value", []string{"-prometheus-host"}, "flag -prometheus-host needs a value"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			isolateEnv(t)
			var out strings.Builder
			_, err := parseStartupConfig(tc.args, &out)
			require.Error(t, err)
			assert.Contains(t, err.Error(), tc.wantText)
			assert.NotContains(t, err.Error(), "s3cret")
			assert.NotContains(t, out.String(), "s3cret", "the FlagSet's raw diagnostic is suppressed")
			assert.Contains(t, out.String(), "Usage of core-bff", "safe usage is still printed")
		})
	}
}

func TestParseStartupConfig_HelpIsNotARefusal(t *testing.T) {
	isolateEnv(t)
	var out strings.Builder
	_, err := parseStartupConfig([]string{"-h"}, &out)
	assert.True(t, errors.Is(err, flag.ErrHelp))
	assert.Contains(t, out.String(), "-port")
}

func TestParseStartupConfig_PortEnvironment(t *testing.T) {
	t.Run("absent PORT keeps the default", func(t *testing.T) {
		isolateEnv(t)
		sc, err := parse(t)
		require.NoError(t, err)
		assert.Equal(t, 4000, sc.Env.Port)
	})

	t.Run("malformed PORT is rejected without echoing it", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("PORT", "40o0")
		_, err := parse(t)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid PORT")
		assert.NotContains(t, err.Error(), "40o0")
	})

	t.Run("out-of-range PORT is rejected by validation", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("PORT", "70000")
		_, err := parse(t)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "between 1 and 65535")
	})

	t.Run("valid -port overrides a malformed PORT", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("PORT", "not-a-port")
		sc, err := parse(t, "-port=8443")
		require.NoError(t, err)
		assert.Equal(t, 8443, sc.Env.Port)
	})
}

func TestParseStartupConfig_RejectsServingCertificateOutsideValidity(t *testing.T) {
	now := time.Now()
	cases := []struct {
		name                string
		notBefore, notAfter time.Time
		wantErr             string
	}{
		{"expired", now.Add(-2 * time.Hour), now.Add(-time.Hour), "has expired"},
		{"not yet valid", now.Add(time.Hour), now.Add(2 * time.Hour), "is not valid yet"},
		{"currently valid", now.Add(-time.Hour), now.Add(time.Hour), ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			isolateEnv(t)
			certFile, keyFile := writeKeyPairValidity(t, tc.notBefore, tc.notAfter)
			_, err := parse(t, "-cert-file="+certFile, "-key-file="+keyFile)
			if tc.wantErr == "" {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Contains(t, err.Error(), tc.wantErr)
		})
	}
}

func writeKeyPairValidity(t *testing.T, notBefore, notAfter time.Time) (string, string) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)
	template := x509.Certificate{
		SerialNumber: big.NewInt(time.Now().UnixNano()),
		Subject:      pkix.Name{CommonName: "core-bff-validity-test"},
		NotBefore:    notBefore,
		NotAfter:     notAfter,
	}
	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	require.NoError(t, err)
	keyDER, err := x509.MarshalECPrivateKey(key)
	require.NoError(t, err)

	dir := t.TempDir()
	certFile := filepath.Join(dir, "tls.crt")
	keyFile := filepath.Join(dir, "tls.key")
	require.NoError(t, os.WriteFile(certFile, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0o600))
	require.NoError(t, os.WriteFile(keyFile, pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER}), 0o600))
	return certFile, keyFile
}
