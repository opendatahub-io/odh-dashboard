package config

import (
	"log/slog"
	"strings"
)

// Redacted is the placeholder written in place of any value that could carry a
// credential or otherwise sensitive material.
const Redacted = "[REDACTED]"

// LogValue implements slog.LogValuer so that logging the resolved configuration
// never emits credentials or credential-shaped values.
//
// Settings whose *name* is operationally useful but whose *value* could be
// sensitive (token headers, upstream hosts supplied by an installer) are
// reported as presence flags rather than values. Everything reported here is
// safe to ship to a log aggregator.
func (c EnvConfig) LogValue() slog.Value {
	return slog.GroupValue(
		slog.Int("port", c.Port),
		slog.String("deploymentMode", c.DeploymentMode.String()),
		slog.String("platformType", c.PlatformType.String()),
		slog.String("admissionMode", c.AdmissionMode.String()),
		slog.String("namespace", c.Namespace),
		slog.String("operatorNamespace", c.OperatorNamespace),
		slog.String("workbenchNamespace", c.WorkbenchNamespace),
		slog.String("dashboardConfigName", c.DashboardConfigName),
		slog.String("enabledAppsCM", c.EnabledAppsCM),
		slog.String("staticAssetsDir", c.StaticAssetsDir),
		slog.String("logLevel", c.LogLevel.String()),
		slog.Bool("productionProfile", c.IsProductionProfile()),

		slog.Group("auth",
			slog.String("method", c.AuthMethod),
			slog.String("tokenHeader", c.AuthTokenHeader),
			slog.Bool("tokenPrefixSet", c.AuthTokenPrefix != ""),
			slog.String("tokenHeaders", strings.Join(c.AuthTokenHeaders, ",")),
		),

		slog.Group("transport",
			slog.Bool("insecureSkipVerify", c.InsecureSkipVerify),
			slog.Int("caBundlePaths", countNonEmpty(c.BundlePaths)),
			slog.Bool("caBundlesRequired", c.BundlePathsRequired),
			slog.Int("allowedOrigins", countNonEmpty(c.AllowedOrigins)),
			slog.Bool("allowedOriginsWildcard", hasWildcardOrigin(c.AllowedOrigins)),
		),

		slog.Group("development",
			slog.Bool("devMode", c.DevMode),
			slog.Bool("mockK8sClient", c.MockK8Client),
			slog.Bool("mockHTTPClient", c.MockHTTPClient),
			slog.Bool("mockBFFClients", c.MockBFFClients),
		),

		slog.Group("services",
			slog.Bool("modelServingHostSet", c.ModelServingServiceHost != ""),
			slog.Bool("prometheusHostSet", c.PrometheusHost != ""),
			slog.String("prometheusNamespace", c.PrometheusNamespace),
			slog.String("prometheusInstance", c.PrometheusInstance),
			slog.String("prometheusPort", c.PrometheusPort),
			slog.Bool("mfRemotesConfigSet", c.MFRemotesConfig != ""),
		),
	)
}

func countNonEmpty(values []string) int {
	var n int
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			n++
		}
	}
	return n
}

func hasWildcardOrigin(origins []string) bool {
	for _, o := range origins {
		if strings.Contains(o, "*") {
			return true
		}
	}
	return false
}
