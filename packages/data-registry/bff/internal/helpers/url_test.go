package helper

import "testing"

func TestValidateUpstreamURL(t *testing.T) {
	cases := []struct {
		name    string
		raw     string
		wantErr bool
	}{
		{name: "valid https URL", raw: "https://data-registry.svc.cluster.local:8443", wantErr: false},
		{name: "valid http URL (local dev/test)", raw: "http://127.0.0.1:8080", wantErr: false},
		{name: "valid URL with a base path", raw: "https://data-registry.svc.cluster.local:8443/data-registry-api", wantErr: false},
		{name: "empty string", raw: "", wantErr: true},
		{name: "missing scheme", raw: "data-registry.svc.cluster.local", wantErr: true},
		{name: "missing host", raw: "https:///path", wantErr: true},
		{name: "not a URL at all", raw: "	not a url\n", wantErr: true},
		{name: "disallowed scheme", raw: "ftp://data-registry.svc.cluster.local", wantErr: true},
		{name: "unix socket scheme", raw: "unix:///var/run/data-registry.sock", wantErr: true},
		{name: "userinfo (credentials in URL)", raw: "https://user:pass@data-registry.svc.cluster.local", wantErr: true},
		{name: "query string in base URL", raw: "https://data-registry.svc.cluster.local?foo=bar", wantErr: true},
		{name: "fragment in base URL", raw: "https://data-registry.svc.cluster.local#frag", wantErr: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			u, err := ValidateUpstreamURL(tc.raw)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("ValidateUpstreamURL(%q) expected an error, got none (url=%v)", tc.raw, u)
				}
				if u != nil {
					t.Fatalf("ValidateUpstreamURL(%q) expected a nil URL on error, got %v", tc.raw, u)
				}
				return
			}
			if err != nil {
				t.Fatalf("ValidateUpstreamURL(%q) unexpected error: %v", tc.raw, err)
			}
			if u == nil {
				t.Fatalf("ValidateUpstreamURL(%q) expected a non-nil URL", tc.raw)
			}
		})
	}
}
