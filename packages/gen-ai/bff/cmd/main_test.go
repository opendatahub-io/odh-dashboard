package main

import (
	"bytes"
	"errors"
	"log/slog"
	"net"
	"os"
	"strconv"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestGeneralBffConfiguration(t *testing.T) {
	testCases := []struct {
		name            string
		envVar          string
		varType         string // "int", "string", "loglevel"
		defaultValue    interface{}
		testValue       string
		expectedDefault interface{}
		expectedSet     interface{}
	}{
		{
			name:            "PORT environment variable",
			envVar:          "PORT",
			varType:         "int",
			defaultValue:    8080,
			testValue:       "3000",
			expectedDefault: 8080,
			expectedSet:     3000,
		},
		{
			name:            "STATIC_ASSETS_DIR environment variable",
			envVar:          "STATIC_ASSETS_DIR",
			varType:         "string",
			defaultValue:    "./static",
			testValue:       "/custom/static",
			expectedDefault: "./static",
			expectedSet:     "/custom/static",
		},
		{
			name:            "ALLOWED_ORIGINS environment variable",
			envVar:          "ALLOWED_ORIGINS",
			varType:         "string",
			defaultValue:    "",
			testValue:       "https://example.com,https://example.org",
			expectedDefault: "",
			expectedSet:     "https://example.com,https://example.org",
		},
		{
			name:            "LLAMA_STACK_URL environment variable",
			envVar:          "LLAMA_STACK_URL",
			varType:         "string",
			defaultValue:    "",
			testValue:       testutil.GetTestLlamaStackURL(),
			expectedDefault: "",
			expectedSet:     testutil.GetTestLlamaStackURL(),
		},
		{
			name:            "LOG_LEVEL environment variable",
			envVar:          "LOG_LEVEL",
			varType:         "loglevel",
			defaultValue:    "DEBUG",
			testValue:       "INFO",
			expectedDefault: slog.LevelDebug,
			expectedSet:     slog.LevelInfo,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Clean up environment variable
			os.Unsetenv(tc.envVar)
			defer os.Unsetenv(tc.envVar)

			// Test default value
			switch tc.varType {
			case "int":
				result := getEnvAsInt(tc.envVar, tc.defaultValue.(int))
				assert.Equal(t, tc.expectedDefault, result)
			case "string":
				result := getEnvAsString(tc.envVar, tc.defaultValue.(string))
				assert.Equal(t, tc.expectedDefault, result)
			case "loglevel":
				levelStr := getEnvAsString(tc.envVar, tc.defaultValue.(string))
				level := parseLevel(levelStr)
				assert.Equal(t, tc.expectedDefault, level)
			}

			// Test with environment variable set
			os.Setenv(tc.envVar, tc.testValue)
			switch tc.varType {
			case "int":
				result := getEnvAsInt(tc.envVar, tc.defaultValue.(int))
				assert.Equal(t, tc.expectedSet, result)
			case "string":
				result := getEnvAsString(tc.envVar, tc.defaultValue.(string))
				assert.Equal(t, tc.expectedSet, result)
			case "loglevel":
				levelStr := getEnvAsString(tc.envVar, tc.defaultValue.(string))
				level := parseLevel(levelStr)
				assert.Equal(t, tc.expectedSet, level)
			}
		})
	}
}

func TestDistributionNameDefault(t *testing.T) {
	t.Setenv("DISTRIBUTION_NAME", "")
	assert.NoError(t, os.Unsetenv("DISTRIBUTION_NAME"))
	assert.Equal(t, "rh", distributionNameDefault())

	t.Setenv("DISTRIBUTION_NAME", "custom")
	assert.Equal(t, "custom", distributionNameDefault())
}

func TestValidateInsecureSkipVerify(t *testing.T) {
	testCases := []struct {
		name                  string
		insecureSkipVerify    bool
		certFile              string
		expectedError         bool
		expectedErrorContains string
	}{
		{
			name:               "InsecureSkipVerify disabled - should pass",
			insecureSkipVerify: false,
			expectedError:      false,
		},
		{
			name:               "InsecureSkipVerify enabled without cert-file - should pass with warning",
			insecureSkipVerify: true,
			expectedError:      false,
		},
		{
			name:                  "InsecureSkipVerify enabled with cert-file - should fail",
			insecureSkipVerify:    true,
			certFile:              "/etc/tls/tls.crt",
			expectedError:         true,
			expectedErrorContains: "TLS certificates are mounted",
		},
		{
			name:               "InsecureSkipVerify disabled with cert-file - should pass",
			insecureSkipVerify: false,
			certFile:           "/etc/tls/tls.crt",
			expectedError:      false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateInsecureSkipVerify(
				tc.insecureSkipVerify,
				tc.certFile,
			)

			if tc.expectedError {
				assert.Error(t, err, "Expected validation to fail")
				if tc.expectedErrorContains != "" {
					assert.Contains(t, err.Error(), tc.expectedErrorContains)
				}
			} else {
				assert.NoError(t, err, "Expected validation to pass")
			}
		})
	}
}

func TestValidateAllowLocalModelEndpoints(t *testing.T) {
	testCases := []struct {
		name                     string
		allowLocalModelEndpoints bool
		devMode                  bool
		host                     string
		certFile                 string
		expectedError            bool
		expectedErrorContains    string
	}{
		{
			name:                     "AllowLocalModelEndpoints disabled - should pass",
			allowLocalModelEndpoints: false,
			expectedError:            false,
		},
		{
			name:                     "AllowLocalModelEndpoints enabled without dev-mode - should fail",
			allowLocalModelEndpoints: true,
			expectedError:            true,
			expectedErrorContains:    "local development mode",
		},
		{
			name:                     "AllowLocalModelEndpoints enabled in dev-mode on non-loopback host - should fail",
			allowLocalModelEndpoints: true,
			devMode:                  true,
			host:                     "0.0.0.0",
			expectedError:            true,
			expectedErrorContains:    "loopback interface",
		},
		{
			name:                     "AllowLocalModelEndpoints enabled in dev-mode on all-interfaces bind - should fail",
			allowLocalModelEndpoints: true,
			devMode:                  true,
			expectedError:            true,
			expectedErrorContains:    "loopback interface",
		},
		{
			name:                     "AllowLocalModelEndpoints enabled in dev-mode on localhost - should pass with warning",
			allowLocalModelEndpoints: true,
			devMode:                  true,
			host:                     "localhost",
			expectedError:            false,
		},
		{
			name:                     "AllowLocalModelEndpoints enabled in dev-mode on 127.0.0.1 - should pass with warning",
			allowLocalModelEndpoints: true,
			devMode:                  true,
			host:                     "127.0.0.1",
			expectedError:            false,
		},
		{
			name:                     "AllowLocalModelEndpoints enabled in dev-mode on unresolvable host - should fail",
			allowLocalModelEndpoints: true,
			devMode:                  true,
			host:                     "nonexistent-host.invalid",
			expectedError:            true,
			expectedErrorContains:    "loopback interface",
		},
		{
			name:                     "AllowLocalModelEndpoints enabled with cert-file - should fail",
			allowLocalModelEndpoints: true,
			devMode:                  true,
			host:                     "localhost",
			certFile:                 "/etc/tls/tls.crt",
			expectedError:            true,
			expectedErrorContains:    "TLS certificates are mounted",
		},
		{
			name:                     "AllowLocalModelEndpoints disabled with cert-file - should pass",
			allowLocalModelEndpoints: false,
			certFile:                 "/etc/tls/tls.crt",
			expectedError:            false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := validateAllowLocalModelEndpoints(
				tc.allowLocalModelEndpoints,
				tc.devMode,
				tc.host,
				tc.certFile,
			)

			if tc.expectedError {
				assert.Error(t, err, "Expected validation to fail")
				if tc.expectedErrorContains != "" {
					assert.Contains(t, err.Error(), tc.expectedErrorContains)
				}
			} else {
				assert.NoError(t, err, "Expected validation to pass")
			}
		})
	}
}

func TestValidateAllowLocalModelEndpointsBindHost(t *testing.T) {
	t.Run("loopback IP literal is returned as the bind address", func(t *testing.T) {
		bindHost, err := validateAllowLocalModelEndpoints(true, true, "127.0.0.1", "")
		assert.NoError(t, err)
		assert.Equal(t, "127.0.0.1", bindHost)
	})

	t.Run("loopback hostname is resolved to a validated loopback IP", func(t *testing.T) {
		bindHost, err := validateAllowLocalModelEndpoints(true, true, "localhost", "")
		assert.NoError(t, err)
		ip := net.ParseIP(bindHost)
		assert.NotNil(t, ip, "bind host must be an IP literal, got %q", bindHost)
		assert.True(t, ip.IsLoopback(), "bind host must be loopback, got %q", bindHost)
	})

	t.Run("configured host is returned unchanged when local endpoints are disabled", func(t *testing.T) {
		bindHost, err := validateAllowLocalModelEndpoints(false, false, "0.0.0.0", "")
		assert.NoError(t, err)
		assert.Equal(t, "0.0.0.0", bindHost)
	})
}

func TestResolveLoopbackIP(t *testing.T) {
	original := lookupHostFn
	defer func() { lookupHostFn = original }()

	t.Run("mixed loopback and non-loopback results are rejected", func(t *testing.T) {
		lookupHostFn = func(string) ([]string, error) { return []string{"127.0.0.1", "10.0.0.5"}, nil }
		_, ok := resolveLoopbackIP("localhost")
		assert.False(t, ok, "a hostname resolving to mixed addresses must not be trusted as loopback")
	})

	t.Run("non-loopback-only results are rejected", func(t *testing.T) {
		lookupHostFn = func(string) ([]string, error) { return []string{"10.0.0.5", "192.168.1.1"}, nil }
		_, ok := resolveLoopbackIP("localhost")
		assert.False(t, ok, "a hostname resolving only to non-loopback addresses must not be trusted as loopback")
	})

	t.Run("loopback-only hostname is accepted and returns its address", func(t *testing.T) {
		lookupHostFn = func(string) ([]string, error) { return []string{"127.0.0.1", "::1"}, nil }
		ip, ok := resolveLoopbackIP("localhost")
		assert.True(t, ok)
		assert.True(t, ip.IsLoopback())
	})

	t.Run("::1 literal is accepted when local endpoints are enabled", func(t *testing.T) {
		lookupHostFn = func(string) ([]string, error) { return nil, errors.New("must not be called for IP literals") }
		bindHost, err := validateAllowLocalModelEndpoints(true, true, "::1", "")
		assert.NoError(t, err)
		assert.Equal(t, "::1", bindHost)
	})

	t.Run("lookup failure is rejected", func(t *testing.T) {
		lookupHostFn = func(string) ([]string, error) { return nil, errors.New("no such host") }
		_, ok := resolveLoopbackIP("localhost")
		assert.False(t, ok)
	})
}

func TestSanitizedHost(t *testing.T) {
	testCases := []struct {
		name string
		host string
		want string
	}{
		{name: "plain hostname is unchanged", host: "localhost", want: "localhost"},
		{name: "IP literal is unchanged", host: "127.0.0.1", want: "127.0.0.1"},
		{name: "userinfo credentials are stripped", host: "user:secret-pw@localhost", want: "localhost"},
		{name: "scheme and userinfo credentials are stripped", host: "https://user:secret-pw@localhost", want: "localhost"},
		{name: "path data is redacted", host: "localhost/api", want: "[redacted]"},
		{name: "query data is redacted", host: "localhost?token=secret-pw", want: "[redacted]"},
		{name: "fragment data is redacted", host: "localhost#token", want: "[redacted]"},
		{name: "scheme, userinfo, and path data are redacted", host: "https://user:secret-pw@localhost/api?token=secret-pw", want: "[redacted]"},
		{name: "malformed host with space is redacted", host: "local host", want: "[redacted]"},
		{name: "colon-bearing non-IP is redacted", host: "localhost:8080", want: "[redacted]"},
		{name: "scoped IPv6 address is unchanged", host: "fe80::1%eth0", want: "fe80::1%eth0"},
		{name: "IPv4 with a zone is redacted", host: "127.0.0.1%eth0", want: "[redacted]"},
		{name: "query data containing an at-sign is redacted", host: "localhost?token=secret-pw@example", want: "[redacted]"},
		{name: "scheme-like text in query data is redacted", host: "localhost?next=http://evil.example", want: "[redacted]"},
		{name: "path data containing scheme-like text is redacted", host: "example.com/http://evil", want: "[redacted]"},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, sanitizedHost(tc.host))
		})
	}
}

// captureDefaultLog redirects the package-level slog default logger for the
// duration of fn and returns everything it wrote.
func captureDefaultLog(t *testing.T, fn func()) string {
	t.Helper()
	var buf bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, nil)))
	defer slog.SetDefault(previous)
	fn()
	return buf.String()
}

func TestHostValuesAreSanitizedInLogs(t *testing.T) {
	passwordHost := "user:super-secret-pw@0.0.0.0"

	t.Run("validation error log omits the password", func(t *testing.T) {
		logs := captureDefaultLog(t, func() {
			_, err := validateAllowLocalModelEndpoints(true, true, passwordHost, "")
			assert.Error(t, err)
		})
		assert.Contains(t, logs, "loopback interface")
		assert.NotContains(t, logs, "super-secret-pw")
	})

	t.Run("loopback-check error log redacts a malformed host", func(t *testing.T) {
		logs := captureDefaultLog(t, func() {
			_, err := validateAllowLocalModelEndpoints(true, true, "local host secret-token", "")
			assert.Error(t, err)
		})
		assert.Contains(t, logs, "loopback interface")
		assert.NotContains(t, logs, "local host secret-token")
		assert.NotContains(t, logs, "secret-token")
	})

	t.Run("loopback-check error log redacts query data containing an at-sign", func(t *testing.T) {
		original := lookupHostFn
		defer func() { lookupHostFn = original }()
		lookupHostFn = func(string) ([]string, error) { return nil, errors.New("no such host") }
		logs := captureDefaultLog(t, func() {
			_, err := validateAllowLocalModelEndpoints(true, true, "localhost?token=super-secret-pw@evil", "")
			assert.Error(t, err)
		})
		assert.Contains(t, logs, "loopback interface")
		assert.NotContains(t, logs, "super-secret-pw")
		assert.NotContains(t, logs, "evil")
	})

	t.Run("loopback-check error log redacts scheme-like text in query data", func(t *testing.T) {
		original := lookupHostFn
		defer func() { lookupHostFn = original }()
		lookupHostFn = func(string) ([]string, error) { return nil, errors.New("no such host") }
		logs := captureDefaultLog(t, func() {
			_, err := validateAllowLocalModelEndpoints(true, true, "localhost?next=http://user:super-secret-pw@evil", "")
			assert.Error(t, err)
		})
		assert.NotContains(t, logs, "super-secret-pw")
	})

	t.Run("startup addr omits the password", func(t *testing.T) {
		addr := net.JoinHostPort(sanitizedHost(passwordHost), strconv.Itoa(8080))
		assert.Equal(t, "0.0.0.0:8080", addr)
		assert.NotContains(t, addr, "super-secret-pw")
	})
}

func TestListenHostRejected(t *testing.T) {
	t.Run("userinfo-bearing host is rejected before the listener starts", func(t *testing.T) {
		logs := captureDefaultLog(t, func() {
			err := validateListenHost("user:super-secret-pw@0.0.0.0")
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "userinfo credentials")
		})
		assert.Contains(t, logs, "SECURITY")
		assert.NotContains(t, logs, "super-secret-pw")
	})

	t.Run("path-bearing host is rejected before the listener starts", func(t *testing.T) {
		logs := captureDefaultLog(t, func() {
			err := validateListenHost("0.0.0.0/api?token=super-secret-pw")
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "path or query data")
		})
		assert.Contains(t, logs, "SECURITY")
		assert.NotContains(t, logs, "super-secret-pw")
	})

	t.Run("malformed host is rejected before the listener starts", func(t *testing.T) {
		logs := captureDefaultLog(t, func() {
			err := validateListenHost("localhost:8080")
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "valid hostname or IP")
		})
		assert.Contains(t, logs, "SECURITY")
		assert.NotContains(t, logs, "localhost:8080")
	})

	t.Run("colon-bearing value that is not an IP literal is rejected", func(t *testing.T) {
		assert.Error(t, validateListenHost("::zz"))
		assert.Error(t, validateListenHost("host:port"))
	})

	t.Run("scheme-prefixed host is rejected", func(t *testing.T) {
		logs := captureDefaultLog(t, func() {
			err := validateListenHost("http://localhost")
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "must not include a scheme")
			assert.Error(t, validateListenHost("http://"))
		})
		assert.Contains(t, logs, "SECURITY")
	})

	t.Run("plain host is accepted", func(t *testing.T) {
		assert.NoError(t, validateListenHost("localhost"))
		assert.NoError(t, validateListenHost("0.0.0.0"))
		assert.NoError(t, validateListenHost("::1"))
		assert.NoError(t, validateListenHost("fe80::1%eth0"))
		assert.NoError(t, validateListenHost(""))
	})
}
