package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
)

// defaultCABundlePaths is the implicit trust bundle set. Because it is a
// default rather than an operator choice, missing files are tolerated: see
// EnvConfig.BundlePathsRequired for the explicit case.
const defaultCABundlePaths = "/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem," +
	"/var/run/secrets/kubernetes.io/serviceaccount/ca.crt," +
	"/var/run/secrets/kubernetes.io/serviceaccount/service-ca.crt," +
	"/etc/pki/tls/certs/odh-ca-bundle.crt," +
	"/etc/pki/tls/certs/odh-trusted-ca-bundle.crt"

// startupConfig is everything the process needs to build and serve the app.
type startupConfig struct {
	Env config.EnvConfig
	TLS config.TLSFiles
}

// parseStartupConfig resolves the runtime contract from CLI arguments and the
// environment, then validates it.
//
// Precedence is CLI flag > environment variable > built-in default, for every
// setting. The function owns its own FlagSet and never calls os.Exit, so the
// real parser is exercised directly by tests.
func parseStartupConfig(args []string, errOut io.Writer) (startupConfig, error) {
	var sc startupConfig
	cfg := &sc.Env

	fs := flag.NewFlagSet("core-bff", flag.ContinueOnError)
	fs.SetOutput(errOut)

	fs.IntVar(&cfg.Port, "port", getEnvAsInt("PORT", 4000), "API server port")
	fs.StringVar(&sc.TLS.CertFile, "cert-file", getEnvAsString("CERT_FILE", ""), "Path to TLS certificate file")
	fs.StringVar(&sc.TLS.KeyFile, "key-file", getEnvAsString("KEY_FILE", ""), "Path to TLS key file")
	fs.BoolVar(&cfg.MockK8Client, "mock-k8s-client", getEnvAsBool("MOCK_K8S_CLIENT", false), "Use mock Kubernetes client")
	fs.BoolVar(&cfg.MockHTTPClient, "mock-http-client", getEnvAsBool("MOCK_HTTP_CLIENT", false), "Use mock HTTP client")
	fs.BoolVar(&cfg.DevMode, "dev-mode", getEnvAsBool("DEV_MODE", false), "Use development mode for access to local K8s cluster")
	fs.IntVar(&cfg.DevModeClientPort, "dev-mode-client-port", getEnvAsInt("DEV_MODE_CLIENT_PORT", 8080), "Use port when in development mode for client")

	// Enum settings are applied from the environment *after* parsing, and only
	// when the matching flag was absent. Validating the environment value here
	// would reject an invalid one the CLI was about to override, breaking the
	// documented CLI > environment > default precedence.
	envDeploymentMode := getEnvAsString("DEPLOYMENT_MODE", "standalone")
	fs.Var(&cfg.DeploymentMode, "deployment-mode", "Deployment mode (federated or standalone; default standalone)")

	fs.StringVar(&cfg.StaticAssetsDir, "static-assets-dir",
		getEnvAsString("STATIC_ASSETS_DIR", "./static"),
		"Configure frontend static assets root directory")
	fs.TextVar(&cfg.LogLevel, "log-level", parseLevel(getEnvAsString("LOG_LEVEL", "INFO")),
		"Sets server log level, possible values: error, warn, info, debug")

	// List-valued settings resolve their environment default eagerly, because
	// a flag.Func callback only runs when the flag is present on the command
	// line. Seeding here and replacing in the callback keeps CLI > env > default.
	cfg.AllowedOrigins = splitList(getEnvAsString("ALLOWED_ORIGINS", ""))
	fs.Func("allowed-origins", "Sets allowed origins for CORS purposes, accepts a comma separated list of origins or * to allow all, default none",
		newListParser(&cfg.AllowedOrigins))

	bundlePaths, bundlePathsExplicit := lookupEnv("BUNDLE_PATHS")
	if !bundlePathsExplicit {
		bundlePaths = defaultCABundlePaths
	}
	cfg.BundlePaths = splitList(bundlePaths)
	cfg.BundlePathsRequired = bundlePathsExplicit
	fs.Func("bundle-paths", "Comma-separated list of PEM CA bundle file paths to trust for outbound TLS (optional)",
		func(s string) error {
			cfg.BundlePathsRequired = true
			return newListParser(&cfg.BundlePaths)(s)
		})

	fs.StringVar(&cfg.AuthMethod, "auth-method", getEnvAsString("AUTH_METHOD", config.AuthMethodUser), "Authentication method (disabled or user_token)")
	fs.StringVar(&cfg.AuthTokenHeader, "auth-token-header", getEnvAsString("AUTH_TOKEN_HEADER", config.DefaultAuthTokenHeader), "Header used to extract the token (default: x-forwarded-access-token)")
	fs.StringVar(&cfg.AuthTokenPrefix, "auth-token-prefix", getEnvAsString("AUTH_TOKEN_PREFIX", config.DefaultAuthTokenPrefix), "Prefix to strip from the token header value (default: none)")

	// TLS configuration flags
	fs.BoolVar(&cfg.InsecureSkipVerify, "insecure-skip-verify", getEnvAsBool("INSECURE_SKIP_VERIFY", false), "Skip TLS certificate verification (development profiles only, default: false)")

	// ─── BFF Inter-Communication ─────────────────────────────────
	fs.BoolVar(&cfg.MockBFFClients, "mock-bff-clients",
		getEnvAsBool("MOCK_BFF_CLIENTS", false),
		"Enable mock BFF clients (no real HTTP calls to other BFFs)")

	// ─── Core BFF ─────────────────────────────────────────────
	envPlatformType := getEnvAsString("ODH_PLATFORM_TYPE", "")
	fs.Var(&cfg.PlatformType, "platform-type", "Platform type: OpenShift, XKS, or empty (auto-detect)")

	envAdmissionMode := getEnvAsString("ADMISSION_MODE", "")
	fs.Var(&cfg.AdmissionMode, "admission-mode",
		"Dashboard admission contract: auth-resource, authenticated, or empty to resolve from the platform")

	fs.StringVar(&cfg.Namespace, "namespace",
		getEnvAsString("NAMESPACE", getEnvAsString("OC_PROJECT", "opendatahub")),
		"Kubernetes namespace where the dashboard is deployed (falls back to OC_PROJECT env var)")
	fs.StringVar(&cfg.OperatorNamespace, "operator-namespace", getEnvAsString("OPERATOR_NAMESPACE", ""), "Preferred namespace of the installed data science operator subscription")
	fs.StringVar(&cfg.WorkbenchNamespace, "workbench-namespace",
		getEnvAsString("WORKBENCH_NAMESPACE", ""),
		"Kubernetes namespace for workbenches (defaults to dashboard namespace if empty)")
	fs.StringVar(&cfg.DashboardConfigName, "dashboard-config-name",
		getEnvAsString("DASHBOARD_CONFIG_NAME", "odh-dashboard-config"),
		"Name of the OdhDashboardConfig CR")
	fs.StringVar(&cfg.EnabledAppsCM, "enabled-apps-cm",
		getEnvAsString("ENABLED_APPS_CM", ""),
		"Name of the ConfigMap that tracks enabled applications")
	fs.StringVar(&cfg.MFRemotesConfig, "mf-remotes-config",
		getEnvAsString("MF_REMOTES_CONFIG", ""),
		"Path to module federation remotes config file")
	fs.StringVar(&cfg.DevUser, "dev-user",
		getEnvAsString("DEV_USER", "developer"),
		"Username for dev-mode identity fallback")
	fs.StringVar(&cfg.DevGroups, "dev-groups",
		getEnvAsString("DEV_GROUPS", ""),
		"Comma-separated groups for dev-mode identity fallback")

	// ─── Model Serving ──────────────────────────────────────────
	fs.StringVar(&cfg.ModelServingServiceHost, "model-serving-host",
		getEnvAsString("MODEL_SERVING_HOST", ""),
		"Override for model-serving service proxy target URL")

	// ─── Prometheus ─────────────────────────────────────────────
	fs.StringVar(&cfg.PrometheusHost, "prometheus-host",
		getEnvAsString("PROMETHEUS_HOST", ""),
		"Full Prometheus/Thanos host URL override")
	fs.StringVar(&cfg.PrometheusNamespace, "prometheus-namespace",
		getEnvAsString("PROMETHEUS_NAMESPACE", "openshift-monitoring"),
		"Prometheus/Thanos namespace")
	fs.StringVar(&cfg.PrometheusInstance, "prometheus-instance",
		getEnvAsString("PROMETHEUS_INSTANCE", "thanos-querier"),
		"Prometheus/Thanos instance name")
	fs.StringVar(&cfg.PrometheusPort, "prometheus-port",
		getEnvAsString("PROMETHEUS_PORT", "9092"),
		"Prometheus/Thanos RBAC port")

	if err := fs.Parse(args); err != nil {
		return sc, err
	}

	// Apply environment values for the enum settings the CLI did not set.
	setOnCLI := map[string]bool{}
	fs.Visit(func(f *flag.Flag) { setOnCLI[f.Name] = true })

	for _, e := range []struct {
		flagName, envName, value string
		apply                    func(string) error
	}{
		{"deployment-mode", "DEPLOYMENT_MODE", envDeploymentMode, cfg.DeploymentMode.Set},
		{"platform-type", "ODH_PLATFORM_TYPE", envPlatformType, cfg.PlatformType.Set},
		{"admission-mode", "ADMISSION_MODE", envAdmissionMode, cfg.AdmissionMode.Set},
	} {
		if setOnCLI[e.flagName] {
			continue
		}
		if err := e.apply(e.value); err != nil {
			return sc, fmt.Errorf("invalid %s: %w", e.envName, err)
		}
	}

	if err := sc.Env.Validate(sc.TLS); err != nil {
		return sc, err
	}

	return sc, nil
}

func lookupEnv(name string) (string, bool) {
	return os.LookupEnv(name)
}

// splitList parses a comma-separated setting into a trimmed, non-empty slice.
func splitList(value string) []string {
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if item := strings.TrimSpace(p); item != "" {
			out = append(out, item)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// newListParser replaces the target with the parsed flag value, so a CLI flag
// overrides the environment-seeded default instead of appending to it.
func newListParser(target *[]string) func(string) error {
	return func(s string) error {
		*target = splitList(s)
		return nil
	}
}
