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
		allowInsecureTLS      string
		env                   string
		ci                    string
		expectedError         bool
		expectedErrorContains string
	}{
		{
			name:               "InsecureSkipVerify disabled - should pass",
			insecureSkipVerify: false,
			allowInsecureTLS:   "",
			env:                "",
			expectedError:      false,
		},
		{
			name:               "InsecureSkipVerify disabled with ALLOW_INSECURE_TLS - should pass",
			insecureSkipVerify: false,
			allowInsecureTLS:   "true",
			env:                "",
			expectedError:      false,
		},
		{
			name:                  "InsecureSkipVerify enabled without ALLOW_INSECURE_TLS - should fail",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "",
			env:                   "",
			expectedError:         true,
			expectedErrorContains: "requires ALLOW_INSECURE_TLS=true",
		},
		{
			name:                  "InsecureSkipVerify enabled with ALLOW_INSECURE_TLS=false - should fail",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "false",
			env:                   "",
			expectedError:         true,
			expectedErrorContains: "requires ALLOW_INSECURE_TLS=true",
		},
		{
			name:               "InsecureSkipVerify enabled with ALLOW_INSECURE_TLS=true - should pass",
			insecureSkipVerify: true,
			allowInsecureTLS:   "true",
			env:                "",
			expectedError:      false,
		},
		{
			name:               "InsecureSkipVerify enabled with ALLOW_INSECURE_TLS=true and ENV=dev - should pass",
			insecureSkipVerify: true,
			allowInsecureTLS:   "true",
			env:                "dev",
			expectedError:      false,
		},
		{
			name:               "InsecureSkipVerify enabled with ALLOW_INSECURE_TLS=true and ENV=development - should pass",
			insecureSkipVerify: true,
			allowInsecureTLS:   "true",
			env:                "development",
			expectedError:      false,
		},
		{
			name:                  "InsecureSkipVerify enabled with ENV=prod - should fail",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "true",
			env:                   "prod",
			expectedError:         true,
			expectedErrorContains: "cannot be used in prod environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with ENV=production - should fail",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "true",
			env:                   "production",
			expectedError:         true,
			expectedErrorContains: "cannot be used in production environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with ENV=staging - should fail",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "true",
			env:                   "staging",
			expectedError:         true,
			expectedErrorContains: "cannot be used in staging environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with ENV=PRODUCTION (uppercase) - should fail",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "true",
			env:                   "PRODUCTION",
			expectedError:         true,
			expectedErrorContains: "cannot be used in production environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with ENV=' production ' (whitespace) - should fail",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "true",
			env:                   " production ",
			expectedError:         true,
			expectedErrorContains: "cannot be used in production environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with CI=true and ENV=dev - should fail",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "true",
			env:                   "dev",
			ci:                    "true",
			expectedError:         true,
			expectedErrorContains: "cannot be used in dev (CI) environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with CI=true and empty ENV - should fail",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "true",
			env:                   "",
			ci:                    "true",
			expectedError:         true,
			expectedErrorContains: "cannot be used in CI environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with CI=1 - should fail",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "true",
			env:                   "",
			ci:                    "1",
			expectedError:         true,
			expectedErrorContains: "cannot be used in CI environment",
		},
		{
			name:                  "InsecureSkipVerify enabled with CI=true and ENV=production - should fail with production (CI)",
			insecureSkipVerify:    true,
			allowInsecureTLS:      "true",
			env:                   "production",
			ci:                    "true",
			expectedError:         true,
			expectedErrorContains: "cannot be used in production (CI) environment",
		},
		{
			name:               "InsecureSkipVerify enabled with CI=false - should pass",
			insecureSkipVerify: true,
			allowInsecureTLS:   "true",
			env:                "",
			ci:                 "false",
			expectedError:      false,
		},
		{
			name:               "InsecureSkipVerify enabled with ALLOW_INSECURE_TLS=True (case variant) - should pass",
			insecureSkipVerify: true,
			allowInsecureTLS:   "True",
			env:                "",
			expectedError:      false,
		},
		{
			name:               "InsecureSkipVerify enabled with ALLOW_INSECURE_TLS=TRUE (uppercase) - should pass",
			insecureSkipVerify: true,
			allowInsecureTLS:   "TRUE",
			env:                "",
			expectedError:      false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("ALLOW_INSECURE_TLS", tc.allowInsecureTLS)
			t.Setenv("ENV", tc.env)
			t.Setenv("CI", tc.ci)

			err := validateInsecureSkipVerify(tc.insecureSkipVerify)

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
