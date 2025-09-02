package main

import (
	"log/slog"
	"os"
	"testing"

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
			testValue:       "http://localhost:8321",
			expectedDefault: "",
			expectedSet:     "http://localhost:8321",
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
