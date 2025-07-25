package config

import "log/slog"

type EnvConfig struct {
	// General BFF configuration
	Port            int
	StaticAssetsDir string
	LogLevel        slog.Level
	AllowedOrigins  []string
	MockLSClient    bool

	// Llama Stack Configuration
	LlamaStackURL string

	// OAuth Configuration
	OAuthEnabled          bool
	OAuthClientID         string
	OAuthClientSecret     string
	OAuthRedirectURI      string
	OAuthServerURL        string
	OpenShiftApiServerUrl string
	OAuthUserInfoEndpoint string
}
