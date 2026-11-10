package api

import (
	"testing"

	"github.com/opendatahub-io/data-registry/bff/internal/integrations/bffclient"
)

func TestConfigureBFFClientTLSRequiresBothDevelopmentOptOuts(t *testing.T) {
	tests := []struct {
		name              string
		devMode           bool
		allowInsecureHTTP bool
		wantPlaintextHTTP bool
	}{
		{name: "secure default"},
		{name: "flag alone", allowInsecureHTTP: true},
		{name: "development mode alone", devMode: true},
		{name: "explicit development opt-out", devMode: true, allowInsecureHTTP: true, wantPlaintextHTTP: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := bffclient.NewDefaultBFFClientConfig()
			configured := configureBFFClientTLS(cfg, tt.devMode, tt.allowInsecureHTTP)
			if configured != tt.wantPlaintextHTTP {
				t.Fatalf("configureBFFClientTLS() = %t, want %t", configured, tt.wantPlaintextHTTP)
			}
			for _, target := range []bffclient.BFFTarget{
				bffclient.BFFTargetMaaS,
				bffclient.BFFTargetGenAI,
				bffclient.BFFTargetModelRegistry,
				bffclient.BFFTargetMLflow,
			} {
				wantTLS := !tt.wantPlaintextHTTP
				if got := cfg.GetServiceConfig(target).TLSEnabled; got != wantTLS {
					t.Errorf("%s TLS enabled = %t, want %t", target, got, wantTLS)
				}
			}
		})
	}
}
