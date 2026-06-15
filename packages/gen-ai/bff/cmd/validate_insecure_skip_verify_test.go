package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

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
