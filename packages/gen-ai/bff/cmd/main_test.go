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
