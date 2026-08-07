package main

import (
	"log/slog"
	"os"
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

func TestParseBoolTruthy(t *testing.T) {
	testCases := []struct {
		input    string
		expected bool
	}{
		{"true", true},
		{"True", true},
		{"TRUE", true},
		{"1", true},
		{"yes", true},
		{"YES", true},
		{"on", true},
		{"ON", true},
		{" true ", true},
		{"false", false},
		{"0", false},
		{"no", false},
		{"off", false},
		{"", false},
		{"random", false},
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			assert.Equal(t, tc.expected, parseBoolTruthy(tc.input))
		})
	}
}

func TestValidateInsecureSkipVerify(t *testing.T) {
	testCases := []struct {
		name                  string
		insecureSkipVerify    bool
		env                   string
		ci                    string
		certFile              string
		expectedError         bool
		expectedErrorContains string
	}{
		{
			name:               "InsecureSkipVerify disabled - should pass",
			insecureSkipVerify: false,
			env:                "",
			expectedError:      false,
		},
		{
			name:               "InsecureSkipVerify enabled - should pass in local dev",
			insecureSkipVerify: true,
			env:                "",
			expectedError:      false,
		},
		{
			name:               "InsecureSkipVerify enabled with ENV=dev - should pass",
			insecureSkipVerify: true,
			env:                "dev",
			expectedError:      false,
		},
		{
			name:               "InsecureSkipVerify enabled with ENV=development - should pass",
			insecureSkipVerify: true,
			env:                "development",
			expectedError:      false,
		},
		{
			name:                  "InsecureSkipVerify enabled with ENV=prod - should fail",
			insecureSkipVerify:    true,
			env:                   "prod",
			expectedError:         true,
			expectedErrorContains: "cannot be used in prod environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with ENV=production - should fail",
			insecureSkipVerify:    true,
			env:                   "production",
			expectedError:         true,
			expectedErrorContains: "cannot be used in production environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with ENV=staging - should fail",
			insecureSkipVerify:    true,
			env:                   "staging",
			expectedError:         true,
			expectedErrorContains: "cannot be used in staging environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with ENV=PRODUCTION (uppercase) - should fail",
			insecureSkipVerify:    true,
			env:                   "PRODUCTION",
			expectedError:         true,
			expectedErrorContains: "cannot be used in production environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with ENV=' production ' (whitespace) - should fail",
			insecureSkipVerify:    true,
			env:                   " production ",
			expectedError:         true,
			expectedErrorContains: "cannot be used in production environment",
		},
		// CI detection
		{
			name:                  "InsecureSkipVerify enabled with CI=true and ENV=dev - should fail",
			insecureSkipVerify:    true,
			env:                   "dev",
			ci:                    "true",
			expectedError:         true,
			expectedErrorContains: "cannot be used in dev (CI) environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with CI=true and empty ENV - should fail",
			insecureSkipVerify:    true,
			env:                   "",
			ci:                    "true",
			expectedError:         true,
			expectedErrorContains: "cannot be used in CI environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with CI=1 - should fail",
			insecureSkipVerify:    true,
			env:                   "",
			ci:                    "1",
			expectedError:         true,
			expectedErrorContains: "cannot be used in CI environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with CI=yes - should fail",
			insecureSkipVerify:    true,
			env:                   "",
			ci:                    "yes",
			expectedError:         true,
			expectedErrorContains: "cannot be used in CI environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with CI=true and ENV=production - should fail with production (CI)",
			insecureSkipVerify:    true,
			env:                   "production",
			ci:                    "true",
			expectedError:         true,
			expectedErrorContains: "cannot be used in production (CI) environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with CI=on - should fail",
			insecureSkipVerify:    true,
			env:                   "",
			ci:                    "on",
			expectedError:         true,
			expectedErrorContains: "cannot be used in CI environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with CI=' true ' (whitespace) - should fail",
			insecureSkipVerify:    true,
			env:                   "",
			ci:                    " true ",
			expectedError:         true,
			expectedErrorContains: "cannot be used in CI environment",
		},
		{
			name:               "InsecureSkipVerify enabled with CI=false - should pass",
			insecureSkipVerify: true,
			env:                "",
			ci:                 "false",
			expectedError:      false,
		},
		// cert-file detection: TLS certs mounted indicates a deployed environment
		{
			name:                  "InsecureSkipVerify enabled with cert-file set - should fail",
			insecureSkipVerify:    true,
			certFile:              "/etc/tls/tls.crt",
			expectedError:         true,
			expectedErrorContains: "TLS certificates are mounted",
		},
		{
			name:                  "InsecureSkipVerify enabled with cert-file set and ENV=dev - should fail",
			insecureSkipVerify:    true,
			env:                   "dev",
			certFile:              "/etc/tls/tls.crt",
			expectedError:         true,
			expectedErrorContains: "TLS certificates are mounted",
		},
		{
			name:               "InsecureSkipVerify disabled with cert-file set - should pass",
			insecureSkipVerify: false,
			certFile:           "/etc/tls/tls.crt",
			expectedError:      false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateInsecureSkipVerify(
				tc.insecureSkipVerify,
				tc.env,
				tc.ci,
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
