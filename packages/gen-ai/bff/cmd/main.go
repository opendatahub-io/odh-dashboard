package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/api"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/pgvector"
	"github.com/opendatahub-io/gen-ai/internal/telemetry"
	tlsprofile "github.com/opendatahub-io/odh-dashboard/pkg/tls"
	"k8s.io/klog/v2"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
)

func distributionNameDefault() string {
	return getEnvAsString("DISTRIBUTION_NAME", "rh")
}

func main() {
	var cfg config.EnvConfig
	var certFile, keyFile string

	// General BFF configuration
	flag.IntVar(&cfg.Port, "port", getEnvAsInt("PORT", 8080), "API server port")
	flag.StringVar(&cfg.Host, "host", getEnvAsString("HOST", ""), "API server listen host (empty binds all interfaces)")
	flag.BoolVar(&cfg.DevMode, "dev-mode", getEnvAsBool("DEV_MODE", false), "Explicit local-development mode (required for --allow-local-model-endpoints)")
	flag.StringVar(&certFile, "cert-file", "", "Path to TLS certificate file")
	flag.StringVar(&keyFile, "key-file", "", "Path to TLS key file")
	flag.StringVar(&cfg.StaticAssetsDir, "static-assets-dir", "./static", "Configure frontend static assets root directory")
	flag.TextVar(&cfg.LogLevel, "log-level", parseLevel(getEnvAsString("LOG_LEVEL", "INFO")), "Sets server log level, possible values: error, warn, info, debug")
	flag.Func("allowed-origins", "Sets allowed origins for CORS purposes, accepts a comma separated list of origins or * to allow all, default none", newOriginParser(&cfg.AllowedOrigins, getEnvAsString("ALLOWED_ORIGINS", "")))
	flag.BoolVar(&cfg.MockLSClient, "mock-ls-client", getEnvAsBool("MOCK_LS_CLIENT", false), "Use mock Llama Stack client")
	flag.BoolVar(&cfg.MockK8sClient, "mock-k8s-client", getEnvAsBool("MOCK_K8S_CLIENT", false), "Use mock Kubernetes client")
	flag.BoolVar(&cfg.MockMCPClient, "mock-mcp-client", getEnvAsBool("MOCK_MCP_CLIENT", false), "Use mock MCP client")
	flag.BoolVar(&cfg.MockMLflowClient, "mock-mlflow-client", getEnvAsBool("MOCK_MLFLOW_CLIENT", false), "Use mock MLflow client")
	flag.StringVar(&cfg.AuthMethod, "auth-method", "user_token", "Authentication method (disabled or user_token)")
	flag.StringVar(&cfg.AuthTokenHeader, "auth-token-header", getEnvAsString("AUTH_TOKEN_HEADER", config.DefaultAuthTokenHeader), "Header used to extract the token (e.g., Authorization)")
	flag.StringVar(&cfg.AuthTokenPrefix, "auth-token-prefix", getEnvAsString("AUTH_TOKEN_PREFIX", config.DefaultAuthTokenPrefix), "Prefix used in the token header (e.g., 'Bearer ')")
	flag.StringVar(&cfg.APIPathPrefix, "api-path-prefix", getEnvAsString("API_PATH_PREFIX", "/api/v1"), "API path prefix for BFF endpoints (e.g., /api/v1)")
	flag.StringVar(&cfg.PathPrefix, "path-prefix", getEnvAsString("PATH_PREFIX", "/gen-ai"), "Path prefix for BFF endpoints (e.g., /gen-ai)")
	flag.StringVar(&cfg.DistributionName, "distribution-name", distributionNameDefault(), "Custom distribution name/image")

	// Llama Stack configuration
	flag.StringVar(&cfg.LlamaStackURL, "llama-stack-url", getEnvAsString("LLAMA_STACK_URL", ""), "Llama Stack server URL for proxying requests")

	// ASR model configuration
	flag.StringVar(&cfg.AsrModelURL, "asr-model-url", getEnvAsString("ASR_MODEL_URL", ""), "ASR model endpoint URL override for local development")

	// NeMo Guardrails configuration
	flag.StringVar(&cfg.NemoGuardrailsURL, "nemo-guardrails-url", getEnvAsString("NEMO_GUARDRAILS_URL", ""), "NeMo Guardrails server URL for content moderation")
	flag.BoolVar(&cfg.MockNemoClient, "mock-nemo", getEnvAsBool("MOCK_NEMO_CLIENT", false), "Use mock NeMo Guardrails client")

	// MLflow configuration
	flag.StringVar(&cfg.MLflowURL, "mlflow-url", getEnvAsString("MLFLOW_URL", ""), "MLflow tracking server URL")

	// Filter models configuration
	flag.Func("filtered-model-keywords", "Filter models by keywords (comma-separated list)", newKeywordParser(&cfg.FilteredModelKeywords, getEnvAsString("FILTERED_MODEL_KEYWORDS", "")))

	// TLS configuration
	flag.Func("bundle-paths", "CA bundle file paths (comma-separated list)", newBundlePathParser(&cfg.BundlePaths, getEnvAsString("BUNDLE_PATHS", "")))
	flag.BoolVar(&cfg.InsecureSkipVerify, "insecure-skip-verify", getEnvAsBool("INSECURE_SKIP_VERIFY", false), "Skip TLS certificate verification")
	flag.BoolVar(&cfg.AllowLocalModelEndpoints, "allow-local-model-endpoints", getEnvAsBool("ALLOW_LOCAL_MODEL_ENDPOINTS", false), "Allow verifying model endpoints on localhost/loopback (local development only)")

	// RBAC configuration
	flag.BoolVar(&cfg.EnableLlamaStackRBAC, "enable-llamastack-rbac", getEnvAsBool("ENABLE_LLAMASTACK_RBAC", false), "Enable RBAC endpoint filtering on LlamaStack configurations")

	// pgvector (default vector store) configuration
	flag.StringVar(&cfg.PgvectorHost, "pgvector-host", getEnvAsString("PGVECTOR_HOST", ""), "Hostname of pgvector-enabled PostgreSQL (enables remote::pgvector as default vector_io provider)")
	flag.IntVar(&cfg.PgvectorPort, "pgvector-port", getEnvAsInt("PGVECTOR_PORT", 5432), "PostgreSQL port for pgvector")
	flag.StringVar(&cfg.PgvectorDB, "pgvector-db", getEnvAsString("PGVECTOR_DB", "vectordb"), "PostgreSQL database name for pgvector")
	flag.StringVar(&cfg.PgvectorUser, "pgvector-user", getEnvAsString("PGVECTOR_USER", "vectoruser"), "PostgreSQL user for pgvector")
	flag.StringVar(&cfg.PgvectorPasswordSecretName, "pgvector-password-secret-name", getEnvAsString("PGVECTOR_PASSWORD_SECRET_NAME", ""), "Kubernetes Secret name containing the pgvector password")
	flag.StringVar(&cfg.PgvectorPasswordSecretKey, "pgvector-password-secret-key", getEnvAsString("PGVECTOR_PASSWORD_SECRET_KEY", pgvector.DefaultPasswordKey), "Key in the pgvector password Secret")
	flag.StringVar(&cfg.PgvectorImage, "pgvector-image", getEnvAsString(pgvector.RelatedImageEnvVar, ""), "Container image for auto-provisioned pgvector (set via RELATED_IMAGE_POSTGRESQL_16_IMAGE)")
	flag.StringVar(&cfg.OGXCoreImage, "ogx-core-image", getEnvAsString("RELATED_IMAGE_ODH_OGX_CORE_IMAGE", ""), "OGX core container image for Sandbox CR creation (set via RELATED_IMAGE_ODH_OGX_CORE_IMAGE)")

	// Gateway configuration
	flag.StringVar(&cfg.GatewayDomain, "gateway-domain", getEnvAsString("GATEWAY_DOMAIN", ""), "External gateway domain for BFF proxy URL (used by remote::passthrough provider)")
	flag.StringVar(&cfg.RelayTargetURL, "relay-target-url", getEnvAsString("RELAY_TARGET_URL", ""), "Scheme-qualified base URL the responses relay forwards to (local development only; GATEWAY_DOMAIN is used when unset)")

	// BFF inter-communication configuration
	flag.BoolVar(&cfg.MockBFFClients, "mock-bff-clients", getEnvAsBool("MOCK_BFF_CLIENTS", false), "Use mock BFF clients for inter-BFF communication")
	flag.StringVar(&cfg.BFFMaaSServiceName, "bff-maas-service-name", getEnvAsString("BFF_MAAS_SERVICE_NAME", "odh-dashboard"), "Kubernetes service name for MaaS BFF")
	flag.IntVar(&cfg.BFFMaaSServicePort, "bff-maas-service-port", getEnvAsInt("BFF_MAAS_SERVICE_PORT", 8243), "Port for MaaS BFF service")
	flag.BoolVar(&cfg.BFFMaaSTLSEnabled, "bff-maas-tls-enabled", getEnvAsBool("BFF_MAAS_TLS_ENABLED", false), "Enable TLS for MaaS BFF communication")
	flag.StringVar(&cfg.BFFMaaSDevURL, "bff-maas-dev-url", getEnvAsString("BFF_MAAS_DEV_URL", ""), "Developer override URL for MaaS BFF (e.g., http://localhost:4000/api/v1)")
	flag.StringVar(&cfg.BFFMaaSAuthMethod, "bff-maas-auth-method", getEnvAsString("BFF_MAAS_AUTH_METHOD", "user_token"), "Auth method for MaaS BFF: 'user_token' (default) or 'internal' (Kubeflow)")
	flag.StringVar(&cfg.BFFMaaSAuthTokenHeader, "bff-maas-auth-token-header", getEnvAsString("BFF_MAAS_AUTH_TOKEN_HEADER", "x-forwarded-access-token"), "Header to send auth token to MaaS BFF")
	flag.StringVar(&cfg.BFFMaaSAuthTokenPrefix, "bff-maas-auth-token-prefix", getEnvAsString("BFF_MAAS_AUTH_TOKEN_PREFIX", ""), "Prefix for auth token header (e.g., 'Bearer ')")
	flag.StringVar(&cfg.BFFMLflowServiceName, "bff-mlflow-service-name", getEnvAsString("BFF_MLFLOW_SERVICE_NAME", "odh-dashboard"), "Kubernetes service name for MLflow BFF")
	flag.IntVar(&cfg.BFFMLflowServicePort, "bff-mlflow-service-port", getEnvAsInt("BFF_MLFLOW_SERVICE_PORT", 8343), "Port for MLflow BFF service")
	flag.BoolVar(&cfg.BFFMLflowTLSEnabled, "bff-mlflow-tls-enabled", getEnvAsBool("BFF_MLFLOW_TLS_ENABLED", true), "Enable TLS for MLflow BFF communication")
	flag.StringVar(&cfg.BFFMLflowDevURL, "bff-mlflow-dev-url", getEnvAsString("BFF_MLFLOW_DEV_URL", ""), "Developer override URL for MLflow BFF (e.g., http://localhost:8443/api/v1)")
	flag.StringVar(&cfg.BFFMLflowAuthMethod, "bff-mlflow-auth-method", getEnvAsString("BFF_MLFLOW_AUTH_METHOD", "user_token"), "Auth method for MLflow BFF: 'user_token' (default) or 'internal' (Kubeflow)")
	flag.StringVar(&cfg.BFFMLflowAuthTokenHeader, "bff-mlflow-auth-token-header", getEnvAsString("BFF_MLFLOW_AUTH_TOKEN_HEADER", "x-forwarded-access-token"), "Header to send auth token to MLflow BFF")
	flag.StringVar(&cfg.BFFMLflowAuthTokenPrefix, "bff-mlflow-auth-token-prefix", getEnvAsString("BFF_MLFLOW_AUTH_TOKEN_PREFIX", ""), "Prefix for auth token header (e.g., 'Bearer ')")

	// Initialize klog flags before parsing
	klog.InitFlags(nil)

	flag.Parse()

	// Validate InsecureSkipVerify before logger setup - this is a security-critical check
	// that must run as early as possible (fail-fast). The validation uses slog.Error with
	// Go's default formatter, which is acceptable since the process exits immediately on
	// failure and never reaches normal operation.
	if err := validateInsecureSkipVerify(cfg.InsecureSkipVerify, certFile); err != nil {
		os.Exit(1)
	}
	bindHost, err := validateAllowLocalModelEndpoints(cfg.AllowLocalModelEndpoints, cfg.DevMode, cfg.Host, certFile)
	if err != nil {
		os.Exit(1)
	}
	if err := validateListenHost(cfg.Host); err != nil {
		os.Exit(1)
	}

	if cfg.LogLevel == slog.LevelDebug {
		log.SetLogger(zap.New(zap.UseDevMode(true)))
		klog.SetLogger(log.Log)
		if err := flag.Set("v", "4"); err != nil {
			slog.Error("failed to set klog verbosity", "error", err)
		}
	} else {
		log.SetLogger(zap.New(zap.UseDevMode(false)))
		klog.SetLogger(log.Log)
		if err := flag.Set("v", "1"); err != nil {
			slog.Error("failed to set klog verbosity", "error", err)
		}
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))

	// Only use for logging errors about logging configuration.
	slog.SetDefault(logger)

	shutdownTelemetry := telemetry.Setup(logger)

	app, err := api.NewApp(cfg, slog.New(logger.Handler()))
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:         net.JoinHostPort(bindHost, strconv.Itoa(cfg.Port)),
		Handler:      app.Routes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  8 * time.Minute, // Allow larger file uploads (up to 10MB)
		WriteTimeout: 8 * time.Minute, // Allow longer processing time for large PDFs
		ErrorLog:     slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}

	tlsEnabled := certFile != "" && keyFile != ""

	// signalCtx is cancelled on the first shutdown signal; both the HTTPS reload
	// loop and the graceful-shutdown sequence below key off it.
	signalCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGINT, syscall.SIGTERM, syscall.SIGHUP)
	defer stop()

	var serveErr error
	serverClosed := make(chan struct{})
	go func() {
		defer close(serverClosed)
		logger.Info("starting server", "addr", net.JoinHostPort(sanitizedHost(bindHost), strconv.Itoa(cfg.Port)), "TLS enabled", tlsEnabled, "path_prefix", cfg.PathPrefix, "swagger_ui", constants.SwaggerUIPath)
		if tlsEnabled {
			serveErr = tlsprofile.ListenAndServeTLSWithReload(signalCtx, logger, srv, certFile, keyFile)
		} else {
			serveErr = srv.ListenAndServe()
		}
		if serveErr != nil && serveErr != http.ErrServerClosed {
			logger.Error("HTTP server failed", "error", serveErr)
			stop()
		}
	}()

	<-signalCtx.Done()
	logger.Info("shutting down gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if !tlsEnabled {
		if err := srv.Shutdown(ctx); err != nil {
			logger.Error("server shutdown failed", "error", err)
		}
	}
	<-serverClosed

	// Shutdown telemetry (with its own deadline so span flush isn't starved
	// by a slow HTTP drain consuming the shared 30s budget above)
	telCtx, telCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer telCancel()
	if err := shutdownTelemetry(telCtx); err != nil {
		logger.Error("telemetry shutdown failed", "error", err)
	}

	// Shutdown the App gracefully
	if err := app.Shutdown(); err != nil {
		logger.Error("failed to shutdown Kubernetes manager", "error", err)
	}

	logger.Info("server stopped")
	if serveErr != nil && serveErr != http.ErrServerClosed {
		os.Exit(1)
	}
	os.Exit(0)

}

// validateInsecureSkipVerify validates the InsecureSkipVerify configuration at startup.
// Returns an error if the configuration is invalid or poses a security risk.
func validateInsecureSkipVerify(insecureSkipVerify bool, certFile string) error {
	if !insecureSkipVerify {
		return nil
	}

	if certFile != "" {
		slog.Error("SECURITY: InsecureSkipVerify cannot be used when TLS certificates are mounted",
			"cert_file", certFile,
			"insecure_skip_verify", insecureSkipVerify,
			"fix", "Remove --insecure-skip-verify flag and INSECURE_SKIP_VERIFY env var",
		)
		return errors.New("InsecureSkipVerify cannot be used when TLS certificates are mounted (deployed environment detected)")
	}

	slog.Warn("SECURITY WARNING: TLS certificate verification is DISABLED (InsecureSkipVerify=true)",
		"use_case", "local development only - NEVER use in production",
	)
	return nil
}

// validateAllowLocalModelEndpoints validates the AllowLocalModelEndpoints
// configuration at startup, mirroring the InsecureSkipVerify fail-fast check.
// An empty certFile alone is not evidence of local development: the setting is
// accepted only when dev mode is explicitly enabled and the server is bound to
// a loopback interface. It returns the address the listener should bind: the
// validated loopback IP when local model endpoints are enabled (so the
// listener does not re-resolve the hostname and can never bind a different,
// non-loopback address), and the configured host unchanged otherwise.
func validateAllowLocalModelEndpoints(allowLocalModelEndpoints bool, devMode bool, host string, certFile string) (string, error) {
	if !allowLocalModelEndpoints {
		return host, nil
	}

	if certFile != "" {
		slog.Error("SECURITY: AllowLocalModelEndpoints cannot be used when TLS certificates are mounted",
			"cert_file", certFile,
			"allow_local_model_endpoints", allowLocalModelEndpoints,
			"fix", "Remove --allow-local-model-endpoints flag and ALLOW_LOCAL_MODEL_ENDPOINTS env var",
		)
		return "", errors.New("AllowLocalModelEndpoints cannot be used when TLS certificates are mounted (deployed environment detected)")
	}

	if !devMode {
		slog.Error("SECURITY: AllowLocalModelEndpoints is only allowed in local development mode",
			"allow_local_model_endpoints", allowLocalModelEndpoints,
			"fix", "Remove --allow-local-model-endpoints flag and ALLOW_LOCAL_MODEL_ENDPOINTS env var, or enable --dev-mode for local development",
		)
		return "", errors.New("AllowLocalModelEndpoints is only allowed in local development mode (--dev-mode)")
	}

	loopbackIP, ok := resolveLoopbackIP(host)
	if !ok {
		slog.Error("SECURITY: AllowLocalModelEndpoints requires the BFF to be bound to a loopback interface",
			"host", sanitizedHost(host),
			"fix", "Pass --host localhost (or 127.0.0.1) when using --allow-local-model-endpoints",
		)
		return "", errors.New("AllowLocalModelEndpoints requires the BFF to be bound to a loopback interface (--host)")
	}

	slog.Warn("SECURITY WARNING: verifying localhost/loopback model endpoints is ENABLED (AllowLocalModelEndpoints=true)",
		"use_case", "local development only - NEVER use in production",
	)
	return loopbackIP.String(), nil
}

// isPlausibleHost reports whether h is a value the listener could reasonably
// bind: empty (all interfaces), an IP literal, a scoped IPv6 address
// (fe80::1%eth0), or a DNS hostname (letters, digits, dots, hyphens). A zone
// is only valid on IPv6 addresses, which contain a colon.
func isPlausibleHost(h string) bool {
	if h == "" {
		return true
	}
	if net.ParseIP(h) != nil {
		return true
	}
	if zone := strings.Index(h, "%"); zone > 0 {
		return strings.Contains(h[:zone], ":") &&
			net.ParseIP(h[:zone]) != nil &&
			strings.Trim(h[zone+1:], "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._") == ""
	}
	return strings.Trim(h, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-") == ""
}

// stripLeadingScheme removes a scheme prefix ("https://") only when it starts
// the value and the prefix is composed of valid scheme characters, so
// scheme-like text embedded in path or query data is not mistaken for a
// prefix and mangled.
func stripLeadingScheme(host string) string {
	i := strings.Index(host, "://")
	if i <= 0 {
		return host
	}
	for _, r := range host[:i] {
		if !strings.ContainsRune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-.", r) {
			return host
		}
	}
	return host[i+3:]
}

// sanitizedHost strips any scheme prefix and userinfo credentials from a
// configured host before logging, so a password-bearing HOST or --host value
// never appears in logs. A value that still carries path or query data after
// scheme stripping cannot be summarized safely — the path or query may hold a
// token, possibly one containing "@" or scheme-like text that would otherwise
// drive the stripping — and neither can a malformed value; both are replaced
// with a redacted marker before userinfo is considered.
func sanitizedHost(host string) string {
	host = stripLeadingScheme(host)
	if strings.ContainsAny(host, "/?#") {
		return "[redacted]"
	}
	if at := strings.LastIndex(host, "@"); at >= 0 {
		host = host[at+1:]
	}
	if !isPlausibleHost(host) {
		return "[redacted]"
	}
	return host
}

// validateListenHost rejects listen hosts that carry a scheme prefix, embed
// userinfo credentials or path/query data, or are not a valid IP or DNS
// hostname. Such hosts can never work as listen addresses, and their raw
// values would otherwise leak through net/http listener errors when startup
// fails. Scheme prefixes are rejected rather than stripped so validation and
// the bound address cannot disagree.
func validateListenHost(host string) error {
	h := host
	if strings.Contains(h, "://") {
		slog.Error("SECURITY: --host must not include a scheme",
			"host", sanitizedHost(host),
			"fix", "Pass a plain host or IP, e.g. --host localhost",
		)
		return errors.New("--host must not include a scheme")
	}
	if at := strings.LastIndex(h, "@"); at >= 0 {
		slog.Error("SECURITY: --host must not contain userinfo credentials",
			"host", sanitizedHost(host),
			"fix", "Pass a plain host or IP, e.g. --host localhost",
		)
		return errors.New("--host must not contain userinfo credentials")
	}
	if strings.ContainsAny(h, "/?#") {
		slog.Error("SECURITY: --host must not contain path or query data",
			"host", sanitizedHost(host),
			"fix", "Pass a plain host or IP, e.g. --host localhost",
		)
		return errors.New("--host must not contain path or query data")
	}
	// An empty host binds all interfaces; anything else must be an IP literal
	// (optionally scoped, e.g. fe80::1%eth0) or a DNS hostname so a malformed
	// value — including colon-bearing values that are not IP literals, like
	// "host:port" — fails here instead of inside the listener, whose error
	// echoes the raw value into the logs.
	if !isPlausibleHost(h) {
		slog.Error("SECURITY: --host must be a valid hostname or IP address",
			"host", sanitizedHost(host),
			"fix", "Pass a plain host or IP, e.g. --host localhost",
		)
		return errors.New("--host must be a valid hostname or IP address")
	}
	return nil
}

// lookupHostFn resolves a hostname to its addresses; a variable so tests can
// inject deterministic results instead of depending on the environment's DNS.
var lookupHostFn = net.LookupHost

// resolveLoopbackIP reports whether host is an IP literal that is loopback or
// a hostname that resolves exclusively to loopback addresses, and returns that
// loopback address so callers can bind the validated address instead of
// re-resolving the hostname. Hostnames are resolved rather than trusted, so a
// hosts-file entry pointing "localhost" at a non-loopback address does not
// bypass the check.
func resolveLoopbackIP(host string) (net.IP, bool) {
	if ip := net.ParseIP(host); ip != nil {
		return ip, ip.IsLoopback()
	}
	addrs, err := lookupHostFn(host)
	if err != nil {
		return nil, false
	}
	if len(addrs) == 0 {
		return nil, false
	}
	var first net.IP
	for _, addr := range addrs {
		ip := net.ParseIP(addr)
		if ip == nil || !ip.IsLoopback() {
			return nil, false
		}
		if first == nil {
			first = ip
		}
	}
	return first, true
}
