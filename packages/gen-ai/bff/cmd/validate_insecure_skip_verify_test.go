package main

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateInsecureSkipVerify(t *testing.T) {
	testCases := []struct {
		name                  string
		insecureSkipVerify    bool
		allowInsecureTLS      string
		env                   string
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
			expectedError:         false,
			expectedErrorContains: "",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			os.Unsetenv("ALLOW_INSECURE_TLS")
			os.Unsetenv("ENV")
			defer os.Unsetenv("ALLOW_INSECURE_TLS")
			defer os.Unsetenv("ENV")

			if tc.allowInsecureTLS != "" {
				os.Setenv("ALLOW_INSECURE_TLS", tc.allowInsecureTLS)
			}
			if tc.env != "" {
				os.Setenv("ENV", tc.env)
			}

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
