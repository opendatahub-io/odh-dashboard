package httpcontract

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSameOriginRedirects(t *testing.T) {
	via := func(raw string) []*http.Request {
		return []*http.Request{httptest.NewRequest(http.MethodGet, raw, nil)}
	}
	next := func(raw string) *http.Request { return httptest.NewRequest(http.MethodGet, raw, nil) }

	for _, tc := range []struct{ from, to string }{
		{"https://thanos.internal/api/v1/query", "https://thanos.internal:443/moved"},
		{"https://thanos.internal:9091/api/v1/query", "https://thanos.internal:9091/moved"},
		{"http://localhost/api", "http://localhost:80/moved"},
	} {
		assert.NoError(t, SameOriginRedirects(next(tc.to), via(tc.from)), tc)
	}
	for _, tc := range []struct{ from, to string }{
		{"https://thanos.internal:9091/api", "https://thanos.internal:9092/x"},
		{"https://thanos.internal/api", "https://thanos.internal:8443/x"},
		{"https://thanos.internal/api", "http://thanos.internal/x"},
		{"https://thanos.internal/api", "https://evil.example/x"},
	} {
		assert.ErrorIs(t, SameOriginRedirects(next(tc.to), via(tc.from)), ErrCrossOriginRedirect, tc)
	}

	long := make([]*http.Request, maxRedirects)
	for i := range long {
		long[i] = httptest.NewRequest(http.MethodGet, "https://a/", nil)
	}
	assert.Error(t, SameOriginRedirects(next("https://a/"), long))
}
