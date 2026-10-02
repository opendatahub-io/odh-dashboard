package config

import (
	"strings"
	"testing"
)

func TestEnvConfigValidateDisabledAuthRequiresDevMode(t *testing.T) {
	tests := []struct {
		name    string
		config  EnvConfig
		wantErr string
	}{
		{name: "production disabled auth", config: EnvConfig{AuthMethod: AuthMethodDisabled}, wantErr: "disabled authentication"},
		{name: "development disabled auth", config: EnvConfig{AuthMethod: AuthMethodDisabled, DevMode: true}},
		{name: "production secure auth", config: EnvConfig{AuthMethod: AuthMethodUser}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("Validate() error = %v", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("Validate() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}
