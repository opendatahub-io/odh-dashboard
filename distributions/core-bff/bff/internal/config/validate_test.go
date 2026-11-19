package config

import (
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// productionConfig is the smallest configuration that validates cleanly in a
// production profile. Tests mutate one field at a time from here.
func productionConfig() EnvConfig {
	return EnvConfig{
		Port:            4000,
		DeploymentMode:  DeploymentModeStandalone,
		PlatformType:    PlatformXKS,
		Namespace:       "rhaii",
		StaticAssetsDir: "./static",
		AuthMethod:      AuthMethodUser,
		AuthTokenHeader: DefaultAuthTokenHeader,
		LogLevel:        slog.LevelInfo,
	}
}

func TestValidate_AcceptsAProductionConfiguration(t *testing.T) {
	require.NoError(t, productionConfig().Validate(TLSFiles{}))
}

func TestValidate_ReportsEveryProblemAtOnce(t *testing.T) {
	cfg := productionConfig()
	cfg.Port = 0
	cfg.Namespace = ""
	cfg.AuthMethod = "basic"
	cfg.InsecureSkipVerify = true

	err := cfg.Validate(TLSFiles{})

	var ve *ValidationError
	require.ErrorAs(t, err, &ve)
	assert.Len(t, ve.Problems, 4, "one restart should surface the whole list: %v", ve.Problems)
	assert.Contains(t, err.Error(), "invalid configuration (4 problems)")
}

func TestValidate_SingleProblemReadsCleanly(t *testing.T) {
	cfg := productionConfig()
	cfg.Port = 70000

	err := cfg.Validate(TLSFiles{})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid configuration: PORT/--port is 70000")
	assert.NotContains(t, err.Error(), "problems)")
}

func TestIsProductionProfile(t *testing.T) {
	assert.True(t, productionConfig().IsProductionProfile())

	for name, mutate := range map[string]func(*EnvConfig){
		"dev mode":         func(c *EnvConfig) { c.DevMode = true },
		"mock k8s client":  func(c *EnvConfig) { c.MockK8Client = true },
		"mock http client": func(c *EnvConfig) { c.MockHTTPClient = true },
		"mock BFF clients": func(c *EnvConfig) { c.MockBFFClients = true },
	} {
		t.Run(name, func(t *testing.T) {
			cfg := productionConfig()
			mutate(&cfg)
			assert.False(t, cfg.IsProductionProfile())
		})
	}
}

func TestTLSFiles_EnabledNeedsBothHalves(t *testing.T) {
	assert.False(t, TLSFiles{}.Enabled())
	assert.False(t, TLSFiles{CertFile: "tls.crt"}.Enabled())
	assert.False(t, TLSFiles{KeyFile: "tls.key"}.Enabled())
	assert.True(t, TLSFiles{CertFile: "tls.crt", KeyFile: "tls.key"}.Enabled())
}

func TestValidate_AuthTokenHeaderRequiredForUserToken(t *testing.T) {
	cfg := productionConfig()
	cfg.AuthTokenHeader = "  "

	err := cfg.Validate(TLSFiles{})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "AUTH_TOKEN_HEADER/--auth-token-header is empty")
}

// The disabled-auth method is only rejected on a production profile; a
// development profile is free to use it.
func TestValidate_DisabledAuthIsProfileDependent(t *testing.T) {
	cfg := productionConfig()
	cfg.AuthMethod = AuthMethodDisabled
	require.Error(t, cfg.Validate(TLSFiles{}))

	cfg.MockK8Client = true
	require.NoError(t, cfg.Validate(TLSFiles{}))
}

func TestValidate_ProductionRejectsWildcardAndInexactOrigins(t *testing.T) {
	for _, origin := range []string{
		"*",
		"https://*",
		"http://*",
		"https://*.example.com",
		"*.example.com",
		"example.com",
		"ftp://dashboard.example.com",
		"https://user@dashboard.example.com",
		"https://dashboard.example.com/app",
		"https://dashboard.example.com?x=1",
		"https://",
		// Browsers send Origin without a trailing slash, so this could never match.
		"https://dashboard.example.com/",
	} {
		t.Run(origin, func(t *testing.T) {
			cfg := productionConfig()
			cfg.AllowedOrigins = []string{"https://dashboard.example.com", origin}

			err := cfg.Validate(TLSFiles{})

			require.Error(t, err)
			assert.Contains(t, err.Error(), "ALLOWED_ORIGINS entry 2 (1-based, value omitted)")
			if len(origin) > len("https://") {
				assert.NotContains(t, err.Error(), origin, "rejected origins are reported by index, not value")
			}
		})
	}
}

func TestValidate_ProductionAcceptsExactOrigins(t *testing.T) {
	cfg := productionConfig()
	cfg.AllowedOrigins = []string{
		"https://dashboard.example.com",
		" http://localhost:9000 ",
		"",
	}

	require.NoError(t, cfg.Validate(TLSFiles{}))
}

func TestValidate_DevelopmentProfileKeepsWildcardOrigins(t *testing.T) {
	cfg := productionConfig()
	cfg.DevMode = true
	cfg.AllowedOrigins = []string{"*"}

	require.NoError(t, cfg.Validate(TLSFiles{}))
}

func TestHasWildcardOrigin_FlagsEmbeddedWildcards(t *testing.T) {
	assert.True(t, hasWildcardOrigin([]string{"https://*.example.com"}))
	assert.True(t, hasWildcardOrigin([]string{" * "}))
	assert.False(t, hasWildcardOrigin([]string{"https://dashboard.example.com"}))
}

func TestValidate_EnumErrorsDoNotEchoValues(t *testing.T) {
	const rejected = "sekret-looking-value"
	for name, tc := range map[string]struct {
		mutate  func(*EnvConfig)
		setting string
	}{
		"deployment mode": {func(c *EnvConfig) { c.DeploymentMode = rejected }, "DEPLOYMENT_MODE/--deployment-mode"},
		"platform type":   {func(c *EnvConfig) { c.PlatformType = rejected }, "ODH_PLATFORM_TYPE/--platform-type"},
		"admission mode":  {func(c *EnvConfig) { c.AdmissionMode = rejected }, "ADMISSION_MODE/--admission-mode"},
		"auth method":     {func(c *EnvConfig) { c.AuthMethod = rejected }, "AUTH_METHOD/--auth-method"},
	} {
		t.Run(name, func(t *testing.T) {
			cfg := productionConfig()
			tc.mutate(&cfg)

			err := cfg.Validate(TLSFiles{})

			require.Error(t, err)
			assert.Contains(t, err.Error(), tc.setting+" is not a supported value (value omitted)")
			assert.NotContains(t, err.Error(), rejected)
		})
	}
}

func TestValidate_AuthTokenHeaders(t *testing.T) {
	ok := []struct {
		name    string
		headers []string
	}{
		{"xks dual header", []string{"Authorization", "x-forwarded-access-token"}},
		{"single entry", []string{"x-forwarded-access-token"}},
		{"custom header", []string{"X-Entra-Access-Token"}},
	}
	for _, tc := range ok {
		t.Run("accepts "+tc.name, func(t *testing.T) {
			cfg := productionConfig()
			cfg.AuthTokenHeaders = tc.headers
			require.NoError(t, cfg.Validate(TLSFiles{}))
		})
	}

	t.Run("list replaces the single header requirement", func(t *testing.T) {
		cfg := productionConfig()
		cfg.AuthTokenHeader = ""
		cfg.AuthTokenHeaders = []string{"Authorization"}
		require.NoError(t, cfg.Validate(TLSFiles{}))
	})

	bad := []struct {
		name    string
		mutate  func(*EnvConfig)
		message string
	}{
		{"prefix with list", func(c *EnvConfig) {
			c.AuthTokenHeaders = []string{"Authorization"}
			c.AuthTokenPrefix = "Bearer "
		}, "AUTH_TOKEN_PREFIX"},
		{"invalid name", func(c *EnvConfig) { c.AuthTokenHeaders = []string{"Bad Header"} }, "not a valid HTTP header name"},
		{"blank entry", func(c *EnvConfig) { c.AuthTokenHeaders = []string{" "} }, "not a valid HTTP header name"},
		{"duplicate ignoring case", func(c *EnvConfig) {
			c.AuthTokenHeaders = []string{"Authorization", "authorization"}
		}, "more than once"},
		{"cookie", func(c *EnvConfig) { c.AuthTokenHeaders = []string{"Cookie"} }, "identity or session header"},
		{"impersonation", func(c *EnvConfig) { c.AuthTokenHeaders = []string{"Impersonate-User"} }, "identity or session header"},
		{"impersonation extra", func(c *EnvConfig) { c.AuthTokenHeaders = []string{"Impersonate-Extra-Scopes"} }, "identity or session header"},
		{"front-proxy user", func(c *EnvConfig) { c.AuthTokenHeaders = []string{"X-Remote-User"} }, "identity or session header"},
		{"forwarded user", func(c *EnvConfig) { c.AuthTokenHeaders = []string{"X-Forwarded-User"} }, "identity or session header"},
	}
	for _, tc := range bad {
		t.Run("rejects "+tc.name, func(t *testing.T) {
			cfg := productionConfig()
			tc.mutate(&cfg)
			err := cfg.Validate(TLSFiles{})
			require.Error(t, err)
			assert.Contains(t, err.Error(), tc.message)
		})
	}
}
