package helper

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRequestLogValuerRedactsCredentialBodies(t *testing.T) {
	tests := []struct {
		name string
		path string
	}{
		{name: "inbound create", path: "/data-connect-hub/api/v1/connections"},
		{name: "inbound credential test", path: "/data-connect-hub/api/v1/test/credentials"},
		{name: "upstream create", path: "/api/v1alpha1/data/connections"},
		{name: "upstream credential test", path: "/api/v1alpha1/data/test/credentials"},
		{name: "mixed case credential test", path: "/api/v1/test/CREDENTIALS/"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(
				http.MethodPost,
				tt.path,
				strings.NewReader(`{"future_secret_field":"must-not-leak"}`),
			)

			attrs := RequestLogValuer{Request: req}.LogValue().Group()
			for _, attr := range attrs {
				if attr.Key == "body" {
					require.Equal(t, "[REDACTED]", attr.Value.String())
					return
				}
			}
			t.Fatal("body log attribute was not found")
		})
	}
}
