package kubernetes

import (
	"strings"
	"testing"
)

func TestParseServiceHostname(t *testing.T) {
	tests := []struct {
		name    string
		host    string
		service string
		ns      string
		full    bool
		valid   bool
	}{
		{name: "short", host: "minio.namespace.svc", service: "minio", ns: "namespace", valid: true},
		{name: "full", host: "minio.namespace.svc.cluster.local", service: "minio", ns: "namespace", full: true, valid: true},
		{name: "case and root dot", host: "MINIO.NAMESPACE.SVC.CLUSTER.LOCAL.", service: "minio", ns: "namespace", full: true, valid: true},
		{name: "numeric labels", host: "123.456.svc", service: "123", ns: "456", valid: true},
		{name: "bare service", host: "minio.namespace", valid: false},
		{name: "wrong suffix", host: "minio.namespace.svc.cluster.example", valid: false},
		{name: "too many labels", host: "a.b.c.svc", valid: false},
		{name: "empty service label", host: ".namespace.svc", valid: false},
		{name: "empty namespace label", host: "service..svc", valid: false},
		{name: "underscore in service label", host: "service_name.namespace.svc", valid: false},
		{name: "leading hyphen", host: "-service.namespace.svc", valid: false},
		{name: "trailing hyphen", host: "service-.namespace.svc", valid: false},
		{name: "overlong namespace label", host: "service." + strings.Repeat("n", 64) + ".svc", valid: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := ParseServiceHostname(tt.host)
			if ok != tt.valid {
				t.Fatalf("ParseServiceHostname(%q) valid = %v, want %v", tt.host, ok, tt.valid)
			}
			if !ok {
				return
			}
			if got.Service != tt.service || got.Namespace != tt.ns || got.Full != tt.full {
				t.Errorf("ParseServiceHostname(%q) = %+v, want service=%q namespace=%q full=%v", tt.host, got, tt.service, tt.ns, tt.full)
			}
		})
	}
}
