package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"io"
	"log/slog"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These tests drive the real startup parser (parseStartupConfig), not a copy of
// its rules, so the defaults, precedence and rejections below are the ones the
// container actually applies. See docs/runtime-contract.md.

// isolateEnv clears every setting the parser reads so a test starts from the
// documented defaults regardless of the developer's shell.
func isolateEnv(t *testing.T) {
	t.Helper()
	for _, name := range []string{
		"PORT", "CERT_FILE", "KEY_FILE", "MOCK_K8S_CLIENT", "MOCK_HTTP_CLIENT", "MOCK_BFF_CLIENTS",
		"DEV_MODE", "DEV_MODE_CLIENT_PORT", "DEPLOYMENT_MODE", "STATIC_ASSETS_DIR", "LOG_LEVEL",
		"ALLOWED_ORIGINS", "BUNDLE_PATHS", "AUTH_METHOD", "AUTH_TOKEN_HEADER", "AUTH_TOKEN_PREFIX", "AUTH_TOKEN_HEADERS",
		"INSECURE_SKIP_VERIFY", "ODH_PLATFORM_TYPE", "ADMISSION_MODE", "NAMESPACE", "OC_PROJECT",
		"OPERATOR_NAMESPACE", "WORKBENCH_NAMESPACE", "DASHBOARD_CONFIG_NAME", "ENABLED_APPS_CM",
		"MF_REMOTES_CONFIG", "DEV_USER", "DEV_GROUPS", "MODEL_SERVING_HOST",
		"PROMETHEUS_HOST", "PROMETHEUS_NAMESPACE", "PROMETHEUS_INSTANCE", "PROMETHEUS_PORT",
	} {
		t.Setenv(name, "")
		require.NoError(t, os.Unsetenv(name))
	}
}

func parse(t *testing.T, args ...string) (startupConfig, error) {
	t.Helper()
	return parseStartupConfig(args, io.Discard)
}

func TestParseStartupConfig_Defaults(t *testing.T) {
	isolateEnv(t)

	sc, err := parse(t)
	require.NoError(t, err)

	assert.Equal(t, 4000, sc.Env.Port)
	assert.Equal(t, config.DeploymentModeStandalone, sc.Env.DeploymentMode)
	assert.Equal(t, config.PlatformType(""), sc.Env.PlatformType, "platform auto-detects when unset")
	assert.Equal(t, config.AdmissionMode(""), sc.Env.AdmissionMode, "admission resolves from the platform when unset")
	assert.Equal(t, "opendatahub", sc.Env.Namespace)
	assert.Equal(t, "./static", sc.Env.StaticAssetsDir)
	assert.Equal(t, config.AuthMethodUser, sc.Env.AuthMethod)
	assert.Equal(t, config.DefaultAuthTokenHeader, sc.Env.AuthTokenHeader)
	assert.Equal(t, slog.LevelInfo, sc.Env.LogLevel)
	assert.False(t, sc.Env.InsecureSkipVerify)
	assert.False(t, sc.TLS.Enabled())
	assert.True(t, sc.Env.IsProductionProfile())

	assert.Empty(t, sc.Env.AllowedOrigins, "CORS is closed by default")
	assert.Equal(t, splitList(defaultCABundlePaths), sc.Env.BundlePaths)
	assert.False(t, sc.Env.BundlePathsRequired, "the default bundle set is best-effort")
}

// Regression: ALLOWED_ORIGINS, BUNDLE_PATHS and STATIC_ASSETS_DIR used to be
// ignored unless the matching CLI flag was also passed.
func TestParseStartupConfig_EnvironmentOnly(t *testing.T) {
	isolateEnv(t)

	bundle := writeCABundle(t)
	t.Setenv("PORT", "8943")
	t.Setenv("ALLOWED_ORIGINS", "https://a.example.com, https://b.example.com")
	t.Setenv("BUNDLE_PATHS", bundle)
	t.Setenv("STATIC_ASSETS_DIR", "/opt/app-root/static")
	t.Setenv("NAMESPACE", "redhat-ods-applications")
	t.Setenv("ODH_PLATFORM_TYPE", "XKS")
	t.Setenv("ADMISSION_MODE", "authenticated")
	t.Setenv("DEPLOYMENT_MODE", "federated")
	t.Setenv("LOG_LEVEL", "debug")
	t.Setenv("AUTH_TOKEN_HEADER", "Authorization")
	t.Setenv("AUTH_TOKEN_PREFIX", "Bearer ")

	sc, err := parse(t)
	require.NoError(t, err)

	assert.Equal(t, 8943, sc.Env.Port)
	assert.Equal(t, []string{"https://a.example.com", "https://b.example.com"}, sc.Env.AllowedOrigins)
	assert.Equal(t, []string{bundle}, sc.Env.BundlePaths)
	assert.True(t, sc.Env.BundlePathsRequired, "an explicit bundle must not silently fall back")
	assert.Equal(t, "/opt/app-root/static", sc.Env.StaticAssetsDir)
	assert.Equal(t, "redhat-ods-applications", sc.Env.Namespace)
	assert.Equal(t, config.PlatformXKS, sc.Env.PlatformType)
	assert.Equal(t, config.AdmissionModeAuthenticated, sc.Env.AdmissionMode)
	assert.Equal(t, config.DeploymentModeFederated, sc.Env.DeploymentMode)
	assert.Equal(t, slog.LevelDebug, sc.Env.LogLevel)
	assert.Equal(t, "Authorization", sc.Env.AuthTokenHeader)
	assert.Equal(t, "Bearer ", sc.Env.AuthTokenPrefix)
}

func TestParseStartupConfig_CLIOnly(t *testing.T) {
	isolateEnv(t)

	bundle := writeCABundle(t)
	sc, err := parse(t,
		"-port", "9000",
		"-allowed-origins", "https://cli.example.com",
		"-bundle-paths", bundle,
		"-static-assets-dir", "/cli/static",
		"-namespace", "cli-ns",
		"-platform-type", "OpenShift",
		"-admission-mode", "auth-resource",
		"-deployment-mode", "federated",
	)
	require.NoError(t, err)

	assert.Equal(t, 9000, sc.Env.Port)
	assert.Equal(t, []string{"https://cli.example.com"}, sc.Env.AllowedOrigins)
	assert.Equal(t, []string{bundle}, sc.Env.BundlePaths)
	assert.True(t, sc.Env.BundlePathsRequired)
	assert.Equal(t, "/cli/static", sc.Env.StaticAssetsDir)
	assert.Equal(t, "cli-ns", sc.Env.Namespace)
	assert.Equal(t, config.PlatformOpenShift, sc.Env.PlatformType)
	assert.Equal(t, config.AdmissionModeAuthResource, sc.Env.AdmissionMode)
	assert.Equal(t, config.DeploymentModeFederated, sc.Env.DeploymentMode)
}

// Conflicting inputs: the CLI flag wins over the environment variable for every
// kind of setting, including the comma-separated lists.
func TestParseStartupConfig_CLIOverridesEnvironment(t *testing.T) {
	isolateEnv(t)

	envBundle := writeCABundle(t)
	cliBundle := writeCABundle(t)

	t.Setenv("PORT", "8943")
	t.Setenv("ALLOWED_ORIGINS", "https://env.example.com")
	t.Setenv("BUNDLE_PATHS", envBundle)
	t.Setenv("STATIC_ASSETS_DIR", "/env/static")
	t.Setenv("NAMESPACE", "env-ns")
	t.Setenv("ODH_PLATFORM_TYPE", "OpenShift")
	t.Setenv("ADMISSION_MODE", "auth-resource")
	t.Setenv("DEPLOYMENT_MODE", "federated")

	sc, err := parse(t,
		"-port", "9000",
		"-allowed-origins", "https://cli.example.com",
		"-bundle-paths", cliBundle,
		"-static-assets-dir", "/cli/static",
		"-namespace", "cli-ns",
		"-platform-type", "XKS",
		"-admission-mode", "authenticated",
		"-deployment-mode", "standalone",
	)
	require.NoError(t, err)

	assert.Equal(t, 9000, sc.Env.Port)
	assert.Equal(t, []string{"https://cli.example.com"}, sc.Env.AllowedOrigins,
		"the CLI list replaces the environment list instead of appending to it")
	assert.Equal(t, []string{cliBundle}, sc.Env.BundlePaths)
	assert.Equal(t, "/cli/static", sc.Env.StaticAssetsDir)
	assert.Equal(t, "cli-ns", sc.Env.Namespace)
	assert.Equal(t, config.PlatformXKS, sc.Env.PlatformType)
	assert.Equal(t, config.AdmissionModeAuthenticated, sc.Env.AdmissionMode)
	assert.Equal(t, config.DeploymentModeStandalone, sc.Env.DeploymentMode)
}

// Precedence is CLI > environment > default for enums too. An invalid
// environment value that the CLI overrides must not fail startup: the losing
// value is never applied, so validating it would make a lower-precedence
// setting veto a valid deployment argument.
func TestParseStartupConfig_InvalidEnumEnvironmentIsOverriddenByCLI(t *testing.T) {
	cases := []struct {
		name    string
		envName string
		flag    string
		value   string
		check   func(*testing.T, startupConfig)
	}{
		{
			name: "admission mode", envName: "ADMISSION_MODE", flag: "-admission-mode", value: "authenticated",
			check: func(t *testing.T, sc startupConfig) {
				assert.Equal(t, config.AdmissionModeAuthenticated, sc.Env.AdmissionMode)
			},
		},
		{
			name: "deployment mode", envName: "DEPLOYMENT_MODE", flag: "-deployment-mode", value: "federated",
			check: func(t *testing.T, sc startupConfig) {
				assert.Equal(t, config.DeploymentModeFederated, sc.Env.DeploymentMode)
			},
		},
		{
			name: "platform type", envName: "ODH_PLATFORM_TYPE", flag: "-platform-type", value: "XKS",
			check: func(t *testing.T, sc startupConfig) {
				assert.Equal(t, config.PlatformXKS, sc.Env.PlatformType)
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			isolateEnv(t)
			t.Setenv(tc.envName, "nonsense-value")

			sc, err := parse(t, tc.flag, tc.value)

			require.NoError(t, err, "a valid CLI flag must override an invalid environment value")
			tc.check(t, sc)
		})
	}
}

// The same invalid value with no CLI override still fails, because then it is
// the value that wins.
func TestParseStartupConfig_InvalidEnumEnvironmentFailsWhenItWins(t *testing.T) {
	for envName, wantSub := range map[string]string{
		"ADMISSION_MODE":    "ADMISSION_MODE",
		"DEPLOYMENT_MODE":   "DEPLOYMENT_MODE",
		"ODH_PLATFORM_TYPE": "ODH_PLATFORM_TYPE",
	} {
		t.Run(envName, func(t *testing.T) {
			isolateEnv(t)
			t.Setenv(envName, "nonsense-value")

			_, err := parse(t)

			require.Error(t, err)
			assert.Contains(t, err.Error(), wantSub)
		})
	}
}

func TestParseStartupConfig_RejectsUnsupportedEnumValues(t *testing.T) {
	cases := []struct {
		name    string
		env     map[string]string
		args    []string
		wantSub string
	}{
		{"bad deployment mode", map[string]string{"DEPLOYMENT_MODE": "sidecar"}, nil, "DEPLOYMENT_MODE"},
		{"bad platform type", map[string]string{"ODH_PLATFORM_TYPE": "EKS"}, nil, "ODH_PLATFORM_TYPE"},
		{"bad admission mode", map[string]string{"ADMISSION_MODE": "anonymous"}, nil, "ADMISSION_MODE"},
		{"bad auth method", map[string]string{"AUTH_METHOD": "basic"}, nil, "AUTH_METHOD"},
		{"port out of range", map[string]string{"PORT": "70000"}, nil, "PORT"},
		{"empty namespace", map[string]string{"NAMESPACE": "x"}, []string{"-namespace", ""}, "NAMESPACE"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			isolateEnv(t)
			for k, v := range tc.env {
				t.Setenv(k, v)
			}
			_, err := parse(t, tc.args...)
			require.Error(t, err)
			assert.Contains(t, err.Error(), tc.wantSub)
		})
	}
}

// A production profile must not start with development, mock, disabled-auth or
// insecure-transport settings, and the diagnostic must say how to fix it.
func TestParseStartupConfig_RejectsInsecureProductionCombinations(t *testing.T) {
	cases := []struct {
		name    string
		env     map[string]string
		wantSub string
	}{
		{"disabled auth", map[string]string{"AUTH_METHOD": "disabled"}, "AUTH_METHOD=disabled is not supported in a production profile"},
		{"insecure skip verify", map[string]string{"INSECURE_SKIP_VERIFY": "true"}, "INSECURE_SKIP_VERIFY=true is not supported in a production profile"},
		{"wildcard CORS", map[string]string{"ALLOWED_ORIGINS": "*"}, "ALLOWED_ORIGINS entry 1 (1-based, value omitted) is not an exact origin"},
		{"embedded https wildcard", map[string]string{"ALLOWED_ORIGINS": "https://*"}, "ALLOWED_ORIGINS entry 1 (1-based, value omitted) is not an exact origin"},
		{"embedded http wildcard", map[string]string{"ALLOWED_ORIGINS": "http://*"}, "ALLOWED_ORIGINS entry 1 (1-based, value omitted) is not an exact origin"},
		{"wildcard subdomain", map[string]string{"ALLOWED_ORIGINS": "https://dashboard.example.com,https://*.example.com"}, "ALLOWED_ORIGINS entry 2 (1-based, value omitted) is not an exact origin"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			isolateEnv(t)
			for k, v := range tc.env {
				t.Setenv(k, v)
			}
			_, err := parse(t)
			require.Error(t, err)
			assert.Contains(t, err.Error(), tc.wantSub)
		})
	}
}

// The same settings are legitimate once a development profile is selected.
func TestParseStartupConfig_AllowsInsecureCombinationsInDevelopmentProfile(t *testing.T) {
	isolateEnv(t)
	t.Setenv("DEV_MODE", "true")
	t.Setenv("AUTH_METHOD", "disabled")
	t.Setenv("INSECURE_SKIP_VERIFY", "true")
	t.Setenv("ALLOWED_ORIGINS", "*")

	sc, err := parse(t)
	require.NoError(t, err)
	assert.False(t, sc.Env.IsProductionProfile())
}

func TestParseStartupConfig_RejectsHalfConfiguredTLSPair(t *testing.T) {
	certFile, keyFile := writeKeyPair(t)

	t.Run("cert without key", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("CERT_FILE", certFile)
		_, err := parse(t)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "CERT_FILE/--cert-file is set but KEY_FILE/--key-file is not")
		assert.Contains(t, err.Error(), "must not fall back to plaintext HTTP")
	})

	t.Run("key without cert", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("KEY_FILE", keyFile)
		_, err := parse(t)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "KEY_FILE/--key-file is set but CERT_FILE/--cert-file is not")
	})

	t.Run("complete pair starts", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("CERT_FILE", certFile)
		t.Setenv("KEY_FILE", keyFile)
		sc, err := parse(t)
		require.NoError(t, err)
		assert.True(t, sc.TLS.Enabled())
	})
}

func TestParseStartupConfig_RejectsUnusableTLSInput(t *testing.T) {
	certFile, keyFile := writeKeyPair(t)
	dir := t.TempDir()
	garbage := filepath.Join(dir, "garbage.pem")
	require.NoError(t, os.WriteFile(garbage, []byte("not a certificate"), 0o600))

	t.Run("missing cert file", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("CERT_FILE", filepath.Join(dir, "absent.crt"))
		t.Setenv("KEY_FILE", keyFile)
		_, err := parse(t)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "serving certificate and key could not be loaded")
	})

	t.Run("mismatched pair", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("CERT_FILE", certFile)
		t.Setenv("KEY_FILE", garbage)
		_, err := parse(t)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "serving certificate and key could not be loaded")
		assert.NotContains(t, err.Error(), "-----BEGIN", "diagnostics must not echo PEM material")
	})
}

func TestParseStartupConfig_RejectsUnusableRequiredCABundle(t *testing.T) {
	dir := t.TempDir()
	empty := filepath.Join(dir, "empty.pem")
	require.NoError(t, os.WriteFile(empty, []byte("# no certificates here\n"), 0o600))

	t.Run("explicit bundle that loads nothing fails startup", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("BUNDLE_PATHS", empty+","+filepath.Join(dir, "absent.pem"))
		_, err := parse(t)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "BUNDLE_PATHS was set explicitly but no CA certificates could be loaded")
		assert.Contains(t, err.Error(), "no PEM certificates")
		assert.Contains(t, err.Error(), "not found")
	})

	t.Run("default bundle set tolerates absent files", func(t *testing.T) {
		isolateEnv(t)
		sc, err := parse(t)
		require.NoError(t, err)
		assert.False(t, sc.Env.BundlePathsRequired)
	})

	t.Run("explicit bundle with one usable file starts", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("BUNDLE_PATHS", filepath.Join(dir, "absent.pem")+","+writeCABundle(t))
		_, err := parse(t)
		require.NoError(t, err)
	})
}

// An explicit but empty value parses to no paths at all. Accepting it would let
// the requested trust bundle silently become the system pool, which is the same
// downgrade the unreadable-file check exists to prevent.
func TestParseStartupConfig_RejectsExplicitlyEmptyCABundle(t *testing.T) {
	const wantSub = "BUNDLE_PATHS was set explicitly but contains no usable path"

	t.Run("empty environment value", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("BUNDLE_PATHS", "")
		_, err := parse(t)
		require.Error(t, err)
		assert.Contains(t, err.Error(), wantSub)
	})

	t.Run("separator-only environment value", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("BUNDLE_PATHS", ",, ,")
		_, err := parse(t)
		require.Error(t, err)
		assert.Contains(t, err.Error(), wantSub)
	})

	t.Run("empty CLI value", func(t *testing.T) {
		isolateEnv(t)
		_, err := parse(t, "-bundle-paths", "")
		require.Error(t, err)
		assert.Contains(t, err.Error(), wantSub)
	})

	t.Run("separator-only CLI value overriding a usable environment value", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("BUNDLE_PATHS", writeCABundle(t))
		_, err := parse(t, "-bundle-paths", ", ,")
		require.Error(t, err)
		assert.Contains(t, err.Error(), wantSub)
	})
}

// AC: resolved configuration diagnostics exclude credentials.
func TestResolvedConfigDiagnosticsAreRedacted(t *testing.T) {
	isolateEnv(t)
	t.Setenv("AUTH_TOKEN_PREFIX", "Bearer ")
	t.Setenv("MODEL_SERVING_HOST", "https://model-serving-api.internal:443")
	t.Setenv("PROMETHEUS_HOST", "https://thanos.internal:9092")

	sc, err := parse(t)
	require.NoError(t, err)

	var sb strings.Builder
	slog.New(slog.NewTextHandler(&sb, nil)).Info("resolved runtime configuration", slog.Any("config", sc.Env))
	out := sb.String()

	assert.Contains(t, out, "config.auth.tokenPrefixSet=true")
	assert.Contains(t, out, "config.services.modelServingHostSet=true")
	assert.Contains(t, out, "config.services.prometheusHostSet=true")
	assert.Contains(t, out, "config.productionProfile=true")

	// Values that an installer may consider sensitive are reported as presence
	// flags, never echoed.
	assert.NotContains(t, out, "model-serving-api.internal")
	assert.NotContains(t, out, "thanos.internal")
	assert.NotContains(t, out, "Bearer")
}

func writeCABundle(t *testing.T) string {
	t.Helper()
	certPEM, _ := keyPairPEM(t)
	path := filepath.Join(t.TempDir(), "ca.pem")
	require.NoError(t, os.WriteFile(path, certPEM, 0o600))
	return path
}

func writeKeyPair(t *testing.T) (string, string) {
	t.Helper()
	certPEM, keyPEM := keyPairPEM(t)
	dir := t.TempDir()
	certFile := filepath.Join(dir, "tls.crt")
	keyFile := filepath.Join(dir, "tls.key")
	require.NoError(t, os.WriteFile(certFile, certPEM, 0o600))
	require.NoError(t, os.WriteFile(keyFile, keyPEM, 0o600))
	return certFile, keyFile
}

func keyPairPEM(t *testing.T) ([]byte, []byte) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	template := x509.Certificate{
		SerialNumber:          big.NewInt(time.Now().UnixNano()),
		Subject:               pkix.Name{CommonName: "core-bff-test"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		IsCA:                  true,
		BasicConstraintsValid: true,
	}
	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	require.NoError(t, err)

	keyDER, err := x509.MarshalECPrivateKey(key)
	require.NoError(t, err)

	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}),
		pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})
}

// Flag defaults come from the environment, so parser diagnostics must not echo
// them: PROMETHEUS_HOST may carry credentials in its URL.
func TestParseStartupConfig_UsageDoesNotPrintResolvedDefaults(t *testing.T) {
	isolateEnv(t)
	t.Setenv("PROMETHEUS_HOST", "https://user:s3cret@thanos.example.com")

	var out strings.Builder
	_, err := parseStartupConfig([]string{"--no-such-flag"}, &out)

	require.Error(t, err)
	assert.Contains(t, out.String(), "-prometheus-host")
	assert.NotContains(t, out.String(), "s3cret")
	assert.NotContains(t, out.String(), "thanos.example.com")
}

// AUTH_TOKEN_HEADERS is off by default, so the OpenShift single-header contract
// is what an unconfigured deployment gets.
func TestParseStartupConfig_AuthTokenHeaders(t *testing.T) {
	t.Run("default is single-header mode", func(t *testing.T) {
		isolateEnv(t)
		sc, err := parse(t)
		require.NoError(t, err)
		assert.Empty(t, sc.Env.AuthTokenHeaders)
		assert.Equal(t, config.DefaultAuthTokenHeader, sc.Env.AuthTokenHeader)
	})

	t.Run("environment sets an ordered list", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("AUTH_TOKEN_HEADERS", "Authorization, x-forwarded-access-token")
		sc, err := parse(t)
		require.NoError(t, err)
		assert.Equal(t, []string{"Authorization", "x-forwarded-access-token"}, sc.Env.AuthTokenHeaders)
	})

	t.Run("CLI list replaces the environment list", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("AUTH_TOKEN_HEADERS", "Authorization,x-forwarded-access-token")
		sc, err := parse(t, "-auth-token-headers", "x-forwarded-access-token")
		require.NoError(t, err)
		assert.Equal(t, []string{"x-forwarded-access-token"}, sc.Env.AuthTokenHeaders)
	})

	t.Run("a prefix next to the list fails startup", func(t *testing.T) {
		isolateEnv(t)
		t.Setenv("AUTH_TOKEN_HEADERS", "Authorization,x-forwarded-access-token")
		t.Setenv("AUTH_TOKEN_PREFIX", "Bearer ")
		_, err := parse(t)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "AUTH_TOKEN_PREFIX")
	})
}
