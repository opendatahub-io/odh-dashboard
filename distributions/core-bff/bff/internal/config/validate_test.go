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
		Port:                4000,
		DeploymentMode:      DeploymentModeStandalone,
		PlatformType:        PlatformXKS,
		Namespace:           "rhaii",
		DashboardConfigName: "odh-dashboard-config",
		StaticAssetsDir:     "./static",
		AuthMethod:          AuthMethodUser,
		AuthTokenHeader:     DefaultAuthTokenHeader,
		LogLevel:            slog.LevelInfo,
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
		"dev mode":        func(c *EnvConfig) { c.DevMode = true },
		"mock k8s client": func(c *EnvConfig) { c.MockK8Client = true },
	} {
		t.Run(name, func(t *testing.T) {
			cfg := productionConfig()
			mutate(&cfg)
			assert.False(t, cfg.IsProductionProfile())
		})
	}
}

// MOCK_HTTP_CLIENT and MOCK_BFF_CLIENTS replace one client each; every other
// client is still real, so on their own they must not relax the production
// rules for the whole process.
func TestValidate_SingleClientMocksKeepProductionRules(t *testing.T) {
	for name, mutate := range map[string]func(*EnvConfig){
		"mock http client": func(c *EnvConfig) { c.MockHTTPClient = true },
		"mock BFF clients": func(c *EnvConfig) { c.MockBFFClients = true },
	} {
		t.Run(name, func(t *testing.T) {
			cfg := productionConfig()
			mutate(&cfg)
			cfg.InsecureSkipVerify = true
			cfg.AllowedOrigins = []string{"*"}

			assert.True(t, cfg.IsProductionProfile())
			assert.False(t, cfg.SkipsTLSVerification(), "real clients must keep verifying certificates")

			err := cfg.Validate(TLSFiles{})
			require.Error(t, err)
			assert.Contains(t, err.Error(), "INSECURE_SKIP_VERIFY=true is not supported in a production profile")
			assert.Contains(t, err.Error(), "ALLOWED_ORIGINS entry 1")
		})
	}
}

func TestSkipsTLSVerification_OnlyInADevelopmentProfile(t *testing.T) {
	cfg := productionConfig()
	cfg.InsecureSkipVerify = true
	assert.False(t, cfg.SkipsTLSVerification())

	cfg.DevMode = true
	assert.True(t, cfg.SkipsTLSVerification())

	cfg.InsecureSkipVerify = false
	assert.False(t, cfg.SkipsTLSVerification())
}

// MOCK_K8S_CLIENT leaves the connection probes, Prometheus and the service
// proxies real, so it must neither skip verification nor accept the flag.
func TestInsecureSkipVerify_RequiresDevModeWhenOnlyKubernetesIsMocked(t *testing.T) {
	cfg := productionConfig()
	cfg.MockK8Client = true
	cfg.InsecureSkipVerify = true

	assert.False(t, cfg.IsProductionProfile())
	assert.False(t, cfg.SkipsTLSVerification(), "real outbound clients must keep verifying certificates")

	err := cfg.Validate(TLSFiles{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "INSECURE_SKIP_VERIFY=true requires DEV_MODE=true")

	cfg.DevMode = true
	require.NoError(t, cfg.Validate(TLSFiles{}))
	assert.True(t, cfg.SkipsTLSVerification())
}

func TestValidate_ServiceTargetPorts(t *testing.T) {
	cfg := productionConfig()
	cfg.ModelServingServiceHost = "https://model-serving.internal:65536"
	cfg.PrometheusInstance, cfg.PrometheusNamespace = "thanos-querier", "openshift-monitoring"
	cfg.PrometheusPort = "metrics"

	err := cfg.Validate(TLSFiles{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "MODEL_SERVING_HOST/--model-serving-host (value omitted) has a port outside 1-65535")
	assert.Contains(t, err.Error(), "PROMETHEUS_PORT/--prometheus-port (value omitted) must be a port number")
	assert.NotContains(t, err.Error(), "metrics")

	for _, port := range []string{"0", "65536", "+9092", "09092", "-1"} {
		cfg := productionConfig()
		cfg.PrometheusInstance, cfg.PrometheusNamespace = "thanos-querier", "openshift-monitoring"
		cfg.PrometheusPort = port
		assert.Error(t, cfg.Validate(TLSFiles{}), port)
	}

	// PROMETHEUS_PORT only feeds the derived target, so an explicit host wins.
	cfg = productionConfig()
	cfg.PrometheusHost = "https://thanos.internal:9091"
	cfg.PrometheusInstance, cfg.PrometheusNamespace = "thanos-querier", "openshift-monitoring"
	cfg.PrometheusPort = "metrics"
	require.NoError(t, cfg.Validate(TLSFiles{}))

	cfg = productionConfig()
	cfg.ModelServingServiceHost = "https://model-serving.internal:8443"
	cfg.PrometheusInstance, cfg.PrometheusNamespace = "thanos-querier", "openshift-monitoring"
	cfg.PrometheusPort = "9092"
	require.NoError(t, cfg.Validate(TLSFiles{}))
}

func TestValidate_AuthTokenHeaderMustBeAnHTTPFieldName(t *testing.T) {
	for _, header := range []string{"X Dashboard Token", "x-token:", "x-token\r\n", "(token)", "x-tök"} {
		cfg := productionConfig()
		cfg.AuthTokenHeader = header
		err := cfg.Validate(TLSFiles{})
		require.Error(t, err, header)
		assert.Contains(t, err.Error(), "AUTH_TOKEN_HEADER/--auth-token-header (value omitted) is not a valid HTTP field name")
	}
	for _, header := range []string{"x-forwarded-access-token", "Authorization", "X_Token.v2"} {
		cfg := productionConfig()
		cfg.AuthTokenHeader = header
		assert.NoError(t, cfg.Validate(TLSFiles{}), header)
	}
}

func TestValidate_ServiceTargets(t *testing.T) {
	settings := map[string]struct {
		set  func(*EnvConfig, string)
		name string
	}{
		"model serving": {func(c *EnvConfig, v string) { c.ModelServingServiceHost = v }, "MODEL_SERVING_HOST/--model-serving-host"},
		"prometheus":    {func(c *EnvConfig, v string) { c.PrometheusHost = v }, "PROMETHEUS_HOST/--prometheus-host"},
	}

	for name, setting := range settings {
		t.Run(name, func(t *testing.T) {
			for _, tc := range []struct {
				value  string
				dev    bool
				reason string
			}{
				// The caller's bearer token is sent to both targets.
				{"http://metrics.internal:9090", false, "must use https unless DEV_MODE=true"},
				{"https://metrics.internal?tenant=a", false, "must not carry a query string or fragment"},
				{"https://metrics.internal/prom?", false, "must not carry a query string or fragment"},
				{"https://metrics.internal#frag", false, "must not carry a query string or fragment"},
				{"https://metrics.internal?tenant=a", true, "must not carry a query string or fragment"},
				{"   ", false, "has leading or trailing whitespace"},
				{" https://metrics.internal", false, "has leading or trailing whitespace"},
				{"metrics.internal", false, "must be an absolute http(s) URL"},
				{"metrics.internal:9090", false, "must be an absolute http(s) URL"},
				{"ftp://metrics.internal", false, "must be an absolute http(s) URL"},
				{"https://", false, "has no host"},
				{"metrics.internal", true, "must be an absolute http(s) URL"},
			} {
				cfg := productionConfig()
				cfg.DevMode = tc.dev
				setting.set(&cfg, tc.value)

				err := cfg.Validate(TLSFiles{})

				require.Error(t, err, tc.value)
				assert.Contains(t, err.Error(), setting.name+" (value omitted) "+tc.reason, tc.value)
				assert.NotContains(t, err.Error(), "metrics.internal", "the rejected value must not be echoed")
			}

			for _, tc := range []struct {
				value string
				dev   bool
			}{
				{"https://metrics.internal:9091", false},
				{"https://metrics.internal/prometheus", false},
				{"http://localhost:9090", true},
				{"", false},
			} {
				cfg := productionConfig()
				cfg.DevMode = tc.dev
				setting.set(&cfg, tc.value)

				assert.NoError(t, cfg.Validate(TLSFiles{}), tc.value)
			}
		})
	}
}

// Mocking only Kubernetes is not a dev profile for the upstream services: an
// explicit target still receives the caller's real bearer token.
func TestValidate_ServiceTargetsNeedHTTPSWhenOnlyKubernetesIsMocked(t *testing.T) {
	cfg := productionConfig()
	cfg.MockK8Client = true
	cfg.PrometheusHost = "http://metrics.internal:9090"
	cfg.ModelServingServiceHost = "http://model-serving.internal:8080"

	err := cfg.Validate(TLSFiles{})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "PROMETHEUS_HOST/--prometheus-host (value omitted) must use https unless DEV_MODE=true")
	assert.Contains(t, err.Error(), "MODEL_SERVING_HOST/--model-serving-host (value omitted) must use https unless DEV_MODE=true")

	// The loopback mock Prometheus is started after validation, only when no
	// host is configured, so it never meets this rule.
	cfg.PrometheusHost = ""
	cfg.ModelServingServiceHost = ""
	require.NoError(t, cfg.Validate(TLSFiles{}))
}

// Without PROMETHEUS_HOST the repository calls a URL assembled from the
// instance, namespace and port; that URL is what startup must validate.
func TestValidate_DerivedPrometheusTarget(t *testing.T) {
	for _, tc := range []struct{ instance, namespace string }{
		{"thanos querier", "openshift-monitoring"},
		{"thanos-querier", "openshift-monitoring?tenant=a"},
		{"thanos-querier#x", "openshift-monitoring"},
	} {
		cfg := productionConfig()
		cfg.PrometheusInstance, cfg.PrometheusNamespace, cfg.PrometheusPort = tc.instance, tc.namespace, "9092"
		err := cfg.Validate(TLSFiles{})
		require.Error(t, err, tc)
		assert.Contains(t, err.Error(), "PROMETHEUS_INSTANCE, PROMETHEUS_NAMESPACE and PROMETHEUS_PORT (values omitted) derive a Prometheus URL that")
		assert.NotContains(t, err.Error(), "thanos")
	}

	cfg := productionConfig()
	cfg.PrometheusInstance, cfg.PrometheusNamespace, cfg.PrometheusPort = "thanos-querier", "openshift-monitoring", "9092"
	require.NoError(t, cfg.Validate(TLSFiles{}))
	assert.Equal(t, "https://thanos-querier.openshift-monitoring.svc.cluster.local:9092",
		PrometheusTarget("", cfg.PrometheusInstance, cfg.PrometheusNamespace, cfg.PrometheusPort))
	assert.Equal(t, "https://explicit", PrometheusTarget("https://explicit", "a", "b", "1"))
	assert.Empty(t, PrometheusTarget("", "thanos-querier", "", "9092"))
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
		// Browsers omit the default port from Origin, so these could never match either.
		"https://dashboard.example.com:443",
		"http://dashboard.example.com:80",
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
		"https://dashboard.example.com:8443",
		"http://dashboard.example.com:443",
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

// Every setting that names a Kubernetes object ends up in an API path, a
// selector or an in-cluster DNS name. PROMETHEUS_INSTANCE=monitoring/thanos-querier
// used to turn the derived https://<instance>.<namespace>.svc... URL into host
// "monitoring" on port 443 with the intended service in the path.
func TestValidate_KubernetesNameSettings(t *testing.T) {
	settings := []struct {
		name string
		set  func(*EnvConfig, string)
	}{
		{"NAMESPACE/--namespace", func(c *EnvConfig, v string) { c.Namespace = v }},
		{"OPERATOR_NAMESPACE/--operator-namespace", func(c *EnvConfig, v string) { c.OperatorNamespace = v }},
		{"WORKBENCH_NAMESPACE/--workbench-namespace", func(c *EnvConfig, v string) { c.WorkbenchNamespace = v }},
		{"DASHBOARD_CONFIG_NAME/--dashboard-config-name", func(c *EnvConfig, v string) { c.DashboardConfigName = v }},
		{"ENABLED_APPS_CM/--enabled-apps-cm", func(c *EnvConfig, v string) { c.EnabledAppsCM = v }},
		{"PROMETHEUS_NAMESPACE/--prometheus-namespace", func(c *EnvConfig, v string) { c.PrometheusNamespace = v }},
		{"PROMETHEUS_INSTANCE/--prometheus-instance", func(c *EnvConfig, v string) { c.PrometheusInstance = v }},
	}
	for _, s := range settings {
		for _, bad := range []string{"monitoring/thanos-querier", "Upper", " padded", "a.b:9092", "x?y"} {
			cfg := productionConfig()
			cfg.PrometheusPort = "9092"
			s.set(&cfg, bad)
			err := cfg.Validate(TLSFiles{})
			require.Error(t, err, s.name+"="+bad)
			assert.Contains(t, err.Error(), s.name+" (value omitted) is not a valid Kubernetes", bad)
			assert.NotContains(t, err.Error(), "thanos-querier")
		}
	}

	cfg := productionConfig()
	cfg.Namespace, cfg.OperatorNamespace, cfg.WorkbenchNamespace = "redhat-ods-applications", "redhat-ods-operator", "rhods-notebooks"
	cfg.DashboardConfigName, cfg.EnabledAppsCM = "odh-dashboard-config", "odh-enabled-applications-config"
	cfg.PrometheusNamespace, cfg.PrometheusInstance, cfg.PrometheusPort = "openshift-monitoring", "thanos-querier", "9092"
	require.NoError(t, cfg.Validate(TLSFiles{}))
}

// Blank settings: a required one fails startup, an optional one may be empty
// but not whitespace, and the derived Prometheus target is all-or-nothing.
func TestValidate_BlankSettings(t *testing.T) {
	for _, v := range []string{"", "   "} {
		cfg := productionConfig()
		cfg.DashboardConfigName = v
		err := cfg.Validate(TLSFiles{})
		require.Error(t, err, "%q", v)
		assert.Contains(t, err.Error(), "DASHBOARD_CONFIG_NAME/--dashboard-config-name is empty")
	}

	cfg := productionConfig()
	cfg.OperatorNamespace, cfg.EnabledAppsCM = "  ", "\t"
	err := cfg.Validate(TLSFiles{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "OPERATOR_NAMESPACE/--operator-namespace (value omitted) is not a valid Kubernetes namespace name")
	assert.Contains(t, err.Error(), "ENABLED_APPS_CM/--enabled-apps-cm (value omitted) is not a valid Kubernetes ConfigMap name")

	for _, parts := range [][3]string{
		{"thanos-querier", "", "9092"},
		{"", "openshift-monitoring", "9092"},
		{"thanos-querier", "openshift-monitoring", ""},
	} {
		cfg := productionConfig()
		cfg.PrometheusInstance, cfg.PrometheusNamespace, cfg.PrometheusPort = parts[0], parts[1], parts[2]
		err := cfg.Validate(TLSFiles{})
		require.Error(t, err, parts)
		assert.Contains(t, err.Error(), "are only partly set")
	}

	cfg = productionConfig() // all three empty: Prometheus off
	require.NoError(t, cfg.Validate(TLSFiles{}))
	cfg.PrometheusHost = "https://thanos.internal:9091" // an explicit host makes the parts irrelevant
	cfg.PrometheusNamespace = "openshift-monitoring"
	require.NoError(t, cfg.Validate(TLSFiles{}))
}

// Origins that could never equal a browser's serialized Origin are rejected,
// like the default-port form already was.
func TestValidate_ProductionRejectsNonCanonicalOrigins(t *testing.T) {
	for _, origin := range []string{
		"https://dash.example:0443",
		"https://dash.example:",
		"https://dash.example:99999",
		"https://dash.example:00080",
		"https://dash.example.",
		"https://dásh.example",
	} {
		cfg := productionConfig()
		cfg.AllowedOrigins = []string{origin}
		err := cfg.Validate(TLSFiles{})
		require.Error(t, err, origin)
		assert.Contains(t, err.Error(), "ALLOWED_ORIGINS entry 1 (1-based, value omitted) is not an exact origin")
	}
	for _, origin := range []string{"https://dash.example:8443", "https://Dashboard.Example.com", "https://xn--dsh-yla.example"} {
		cfg := productionConfig()
		cfg.AllowedOrigins = []string{origin}
		assert.NoError(t, cfg.Validate(TLSFiles{}), origin)
	}
}

func TestValidate_ServiceTargetsRejectUserInfoAndAnEmptyPort(t *testing.T) {
	for value, reason := range map[string]string{
		"https://user:secret@prom.example": "must not carry user info",
		"https://prom.example:":            "has an empty port",
	} {
		cfg := productionConfig()
		cfg.PrometheusHost = value
		err := cfg.Validate(TLSFiles{})
		require.Error(t, err, value)
		assert.Contains(t, err.Error(), "PROMETHEUS_HOST/--prometheus-host (value omitted) "+reason)
		assert.NotContains(t, err.Error(), "secret")
	}
	cfg := productionConfig()
	cfg.PrometheusHost = "https://thanos-querier.openshift-monitoring.svc.cluster.local.:9091"
	assert.NoError(t, cfg.Validate(TLSFiles{}), "a fully qualified name with a trailing dot is a valid service target")
}
