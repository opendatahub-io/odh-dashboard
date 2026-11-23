package callerauth

import (
	"errors"
	"net/http"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	tokenA = "eyJ.caller-a.sig" //nolint:gosec // G101: test fixture, not a credential
	tokenB = "eyJ.caller-b.sig" //nolint:gosec // G101: test fixture, not a credential
)

// xksOrder is the precedence the xKS gateway contract under discussion uses.
var xksOrder = Ordered("Authorization", "x-forwarded-access-token")

func headers(kv ...string) http.Header {
	h := http.Header{}
	for i := 0; i+1 < len(kv); i += 2 {
		h.Add(kv[i], kv[i+1])
	}
	return h
}

func TestNew_SelectsMode(t *testing.T) {
	legacy := New(config.EnvConfig{AuthTokenHeader: "x-forwarded-access-token"}) //nolint:gosec // G101: header name, not a credential
	assert.Equal(t, []string{"X-Forwarded-Access-Token"}, legacy.Headers())

	ordered := New(config.EnvConfig{ //nolint:gosec // G101: header names, not credentials
		AuthTokenHeader:  "x-forwarded-access-token",
		AuthTokenHeaders: []string{"authorization", " x-forwarded-access-token "},
	})
	assert.Equal(t, []string{"Authorization", "X-Forwarded-Access-Token"}, ordered.Headers(),
		"the ordered list wins and names are canonicalized and trimmed")
}

func TestHeaders_ReturnsCopy(t *testing.T) {
	h := xksOrder.Headers()
	h[0] = "Mutated"
	assert.Equal(t, "Authorization", xksOrder.Headers()[0])
}

func TestOrdered_Precedence(t *testing.T) {
	tests := []struct {
		name       string
		in         http.Header
		wantToken  string
		wantHeader string
	}{
		{"authorization only", headers("Authorization", "Bearer "+tokenA), tokenA, "Authorization"},
		{"forwarded only", headers("X-Forwarded-Access-Token", tokenA), tokenA, "X-Forwarded-Access-Token"},
		{"both agree, authorization reported", headers("Authorization", "Bearer "+tokenA, "X-Forwarded-Access-Token", tokenA), tokenA, "Authorization"},
		{"scheme is case-insensitive", headers("Authorization", "bearer "+tokenA), tokenA, "Authorization"},
		{"surrounding whitespace trimmed", headers("Authorization", "  Bearer   "+tokenA+"  "), tokenA, "Authorization"},
		{"empty authorization skipped", headers("Authorization", "", "X-Forwarded-Access-Token", tokenA), tokenA, "X-Forwarded-Access-Token"},
		{"lowercase header keys on the wire", http.Header{"x-forwarded-access-token": nil, "X-Forwarded-Access-Token": {tokenA}}, tokenA, "X-Forwarded-Access-Token"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cred, err := xksOrder.Extract(tc.in)
			require.NoError(t, err)
			assert.Equal(t, tc.wantToken, cred.Token)
			assert.Equal(t, tc.wantHeader, cred.Header)
		})
	}
}

func TestOrdered_Rejections(t *testing.T) {
	tests := []struct {
		name string
		in   http.Header
		want error
	}{
		{"no header", http.Header{}, httpcontract.ErrCredentialsMissing},
		{"only unrelated headers", headers("Cookie", "session="+tokenA), httpcontract.ErrCredentialsMissing},
		{"both empty", headers("Authorization", "", "X-Forwarded-Access-Token", ""), httpcontract.ErrCredentialsMissing},
		{"whitespace-only authorization", headers("Authorization", "   "), httpcontract.ErrCredentialsInvalid},
		{"whitespace-only forwarded", headers("X-Forwarded-Access-Token", " \t "), httpcontract.ErrCredentialsInvalid},
		{"basic scheme", headers("Authorization", "Basic dXNlcjpwYXNz"), httpcontract.ErrCredentialsInvalid},
		{"bearer without token", headers("Authorization", "Bearer "), httpcontract.ErrCredentialsInvalid},
		{"bare token in authorization", headers("Authorization", tokenA), httpcontract.ErrCredentialsInvalid},
		{"two tokens in authorization", headers("Authorization", "Bearer "+tokenA+" "+tokenB), httpcontract.ErrCredentialsInvalid},
		{"comma-joined tokens in forwarded header", headers("X-Forwarded-Access-Token", tokenA+","+tokenB), httpcontract.ErrCredentialsInvalid},
		{"comma-joined bearer tokens", headers("Authorization", "Bearer "+tokenA+","+tokenB), httpcontract.ErrCredentialsInvalid},
		{"scheme in forwarded header", headers("X-Forwarded-Access-Token", "Bearer "+tokenA), httpcontract.ErrCredentialsInvalid},
		{"repeated authorization", headers("Authorization", "Bearer "+tokenA, "Authorization", "Bearer "+tokenA), httpcontract.ErrCredentialsInvalid},
		{"repeated forwarded", headers("X-Forwarded-Access-Token", tokenA, "X-Forwarded-Access-Token", tokenB), httpcontract.ErrCredentialsInvalid},
		{"conflicting tokens", headers("Authorization", "Bearer "+tokenA, "X-Forwarded-Access-Token", tokenB), httpcontract.ErrCredentialsInvalid},
		// A malformed higher-precedence header never falls through to a valid
		// lower one: the edge may have authenticated exactly that header.
		{"malformed authorization does not fall through", headers("Authorization", "Basic dXNlcjpwYXNz", "X-Forwarded-Access-Token", tokenA), httpcontract.ErrCredentialsInvalid},
		{"malformed forwarded still rejected", headers("Authorization", "Bearer "+tokenA, "X-Forwarded-Access-Token", " "), httpcontract.ErrCredentialsInvalid},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := xksOrder.Extract(tc.in)
			require.Error(t, err)
			assert.True(t, errors.Is(err, tc.want), "got %v, want %v", err, tc.want)
			assert.NotContains(t, err.Error(), tokenA, "errors must never carry a token")
			assert.NotContains(t, err.Error(), tokenB, "errors must never carry a token")
			assert.NotContains(t, err.Error(), "dXNlcjpwYXNz", "errors must never carry a credential")
		})
	}
}

func TestOrdered_ForwardedFirst(t *testing.T) {
	e := Ordered("x-forwarded-access-token", "Authorization")
	cred, err := e.Extract(headers("Authorization", "Bearer "+tokenA, "X-Forwarded-Access-Token", tokenA))
	require.NoError(t, err)
	assert.Equal(t, "X-Forwarded-Access-Token", cred.Header, "the configured order decides the reported source")
}

// The legacy mode is the OpenShift contract; these pin its existing behaviour.
func TestLegacy_UnchangedBehaviour(t *testing.T) {
	forwarded := Legacy("x-forwarded-access-token", "")
	withPrefix := Legacy("Authorization", "Bearer ")

	tests := []struct {
		name      string
		e         Extractor
		in        http.Header
		wantToken string
		wantErr   error
	}{
		{"forwarded token", forwarded, headers("X-Forwarded-Access-Token", tokenA), tokenA, nil},
		{"forwarded ignores authorization", forwarded, headers("Authorization", "Bearer "+tokenA), "", httpcontract.ErrCredentialsMissing},
		{"forwarded empty", forwarded, headers("X-Forwarded-Access-Token", ""), "", httpcontract.ErrCredentialsMissing},
		{"forwarded whitespace", forwarded, headers("X-Forwarded-Access-Token", "   "), "", httpcontract.ErrCredentialsInvalid},
		{"forwarded first value wins", forwarded, headers("X-Forwarded-Access-Token", tokenA, "X-Forwarded-Access-Token", tokenB), tokenA, nil},
		{"prefix stripped", withPrefix, headers("Authorization", "Bearer "+tokenA), tokenA, nil},
		{"prefix required", withPrefix, headers("Authorization", tokenA), "", httpcontract.ErrCredentialsInvalid},
		{"prefix is case-sensitive", withPrefix, headers("Authorization", "bearer "+tokenA), "", httpcontract.ErrCredentialsInvalid},
		{"prefix only", withPrefix, headers("Authorization", "Bearer "), "", httpcontract.ErrCredentialsInvalid},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cred, err := tc.e.Extract(tc.in)
			if tc.wantErr != nil {
				require.Error(t, err)
				assert.True(t, errors.Is(err, tc.wantErr), "got %v", err)
				assert.NotContains(t, err.Error(), tokenA)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantToken, cred.Token)
		})
	}
}

func TestExtract_NoHeaderConfigured(t *testing.T) {
	_, err := Legacy("", "").Extract(headers("X-Forwarded-Access-Token", tokenA))
	assert.ErrorIs(t, err, httpcontract.ErrCredentialsMissing)
	_, err = Extractor{}.Extract(headers("Authorization", "Bearer "+tokenA))
	assert.ErrorIs(t, err, httpcontract.ErrCredentialsMissing)
}

// Review (liday-rh): a padded legacy header name still matches requests.
func TestLegacy_TrimsHeaderName(t *testing.T) {
	cred, err := Legacy(" x-forwarded-access-token ", "").Extract(headers("X-Forwarded-Access-Token", tokenA))
	require.NoError(t, err)
	assert.Equal(t, tokenA, cred.Token)
	assert.Equal(t, []string{"X-Forwarded-Access-Token"}, Legacy(" x-forwarded-access-token ", "").Headers())
}
