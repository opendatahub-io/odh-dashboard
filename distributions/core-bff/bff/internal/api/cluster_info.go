package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/k8sutil"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"gopkg.in/yaml.v3"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

const (
	clusterVersionName      = "version"
	consoleConfigName       = "console-config"
	consoleConfigNamespace  = "openshift-console"
	consoleConfigKey        = "console-config.yaml"
	defaultClusterBranding  = "okd"
	clusterInfoQueryTimeout = 10 * time.Second
)

type clusterInfo struct {
	clusterID       string
	clusterBranding string
	serverURL       string
	currentContext  string
	// openShiftConfirmed is true when the ClusterVersion singleton was read
	// successfully. That alone establishes OpenShift: the cluster ID is
	// metadata and may be absent or malformed without changing the platform.
	openShiftConfirmed bool
}

func (ci clusterInfo) GetClusterID() string       { return ci.clusterID }
func (ci clusterInfo) GetClusterBranding() string { return ci.clusterBranding }
func (ci clusterInfo) GetServerURL() string       { return ci.serverURL }
func (ci clusterInfo) GetCurrentContext() string  { return ci.currentContext }

func queryClusterInfo(client kubernetes.Interface, dynClient dynamic.Interface, logger *slog.Logger) (clusterInfo, error) {
	info := clusterInfo{clusterBranding: defaultClusterBranding}
	var disc discovery.DiscoveryInterface
	if client != nil {
		disc = client.Discovery()
	}
	probe, err := queryClusterVersion(dynClient, disc, logger)
	if err != nil {
		return info, err
	}
	info.clusterID = probe.clusterID
	info.openShiftConfirmed = probe.outcome == clusterVersionFound
	info.clusterBranding = queryClusterBranding(client, logger)
	return info, nil
}

// clusterVersionOutcome is what the ClusterVersion probe established. Only the
// two conclusive outcomes are values: everything else (instance missing,
// forbidden, timeout, no client) is returned as an error, because none of it
// shows that the OpenShift configuration API is absent.
type clusterVersionOutcome int

const (
	// clusterVersionAPIAbsent: the GET found no ClusterVersion API and
	// discovery confirms it is not served. This is the positive evidence for a
	// non-OpenShift cluster.
	clusterVersionAPIAbsent clusterVersionOutcome = iota + 1
	// clusterVersionFound: the singleton was read, so this is OpenShift.
	clusterVersionFound
)

type clusterVersionProbe struct {
	outcome   clusterVersionOutcome
	clusterID string
}

// errClusterVersionInstanceMissing marks the inconclusive case where the
// ClusterVersion API is served but the "version" singleton is not there.
var errClusterVersionInstanceMissing = errors.New("ClusterVersion API is served but the cluster version singleton is missing")

func queryClusterVersion(dynClient dynamic.Interface, disc discovery.DiscoveryInterface, logger *slog.Logger) (clusterVersionProbe, error) {
	if dynClient == nil {
		return clusterVersionProbe{}, errors.New("ClusterVersion probe failed: no client available")
	}
	ctx, cancel := context.WithTimeout(context.Background(), clusterInfoQueryTimeout)
	defer cancel()

	obj, err := dynClient.Resource(models.ClusterVersionGVR).Get(ctx, clusterVersionName, metav1.GetOptions{})
	switch {
	case err == nil:
	case k8serrors.IsMethodNotSupported(err):
		// Checked before IsDiscoveryError, which counts 405 as absence. A
		// rejected GET does not show the ClusterVersion API is missing, so it
		// must not confirm xKS (as in AuthRepository.Lookup).
		return clusterVersionProbe{}, fmt.Errorf("ClusterVersion probe inconclusive: method not supported: %w", err)
	case k8sutil.IsDiscoveryError(err):
		// Checked before IsNotFound: a discovery 404 carries no resource name,
		// an instance 404 does. An intermediary can return the same bare 404
		// on OpenShift, and xKS relaxes admission, so the GET alone is not
		// proof: discovery must confirm the API is not served.
		absent, confirmErr := k8sutil.ConfirmAPIAbsent(ctx, disc, models.ClusterVersionGVR)
		if !absent {
			return clusterVersionProbe{}, fmt.Errorf("ClusterVersion probe inconclusive: %w", confirmErr)
		}
		logger.Debug("ClusterVersion API not served (non-OpenShift cluster)")
		return clusterVersionProbe{outcome: clusterVersionAPIAbsent}, nil
	case k8serrors.IsNotFound(err):
		return clusterVersionProbe{}, fmt.Errorf("ClusterVersion probe inconclusive: %w", errClusterVersionInstanceMissing)
	default:
		return clusterVersionProbe{}, fmt.Errorf("ClusterVersion probe failed: %w", err)
	}

	probe := clusterVersionProbe{outcome: clusterVersionFound}
	spec, ok := obj.Object["spec"].(map[string]any)
	if !ok {
		logger.Warn("ClusterVersion spec field missing or unexpected type; platform is still OpenShift")
		return probe, nil
	}
	clusterID, ok := spec["clusterID"].(string)
	if !ok {
		logger.Warn("ClusterVersion spec.clusterID missing or unexpected type; platform is still OpenShift")
	}
	probe.clusterID = clusterID
	return probe, nil
}

// consoleConfig is the minimal structure needed to extract branding from the console-config ConfigMap.
type consoleConfig struct {
	Customization struct {
		Branding string `yaml:"branding"`
	} `yaml:"customization"`
}

func queryClusterBranding(client kubernetes.Interface, logger *slog.Logger) string {
	if client == nil {
		return defaultClusterBranding
	}
	ctx, cancel := context.WithTimeout(context.Background(), clusterInfoQueryTimeout)
	defer cancel()

	cm, err := client.CoreV1().ConfigMaps(consoleConfigNamespace).Get(ctx, consoleConfigName, metav1.GetOptions{})
	if err != nil {
		logger.Debug("console-config ConfigMap not available (non-OpenShift cluster)", slog.Any("error", err))
		return defaultClusterBranding
	}

	raw, ok := cm.Data[consoleConfigKey]
	if !ok {
		logger.Warn("console-config ConfigMap missing key", slog.String("key", consoleConfigKey))
		return defaultClusterBranding
	}

	var cc consoleConfig
	if err := yaml.Unmarshal([]byte(raw), &cc); err != nil {
		logger.Warn("Failed to parse console-config YAML", slog.Any("error", err))
		return defaultClusterBranding
	}

	if cc.Customization.Branding == "" {
		return defaultClusterBranding
	}
	return cc.Customization.Branding
}

// resolveStartupPlatform determines the runtime platform and reports whether
// that determination is trustworthy.
//
// Policy: explicit configuration is always trusted. When the probe result
// disagrees with the configured value, a warning is logged but the configured
// value wins. This lets operators force a platform for testing or mixed
// environments.
//
// The second return value is false only when the platform was *guessed*
// because the probe failed. The guess is XKS, which is the least-privilege
// answer for deciding which API calls to make, but it must not be treated as
// positive evidence of xKS for anything security-relevant: a transient
// forbidden or timed-out probe on a real OpenShift cluster lands here. See
// config.ResolveAdmissionMode, which keeps the restrictive admission contract
// when confidence is false.
func resolveStartupPlatform(
	ci clusterInfo, probeErr error, explicit bool, configured config.PlatformType, logger *slog.Logger,
) (config.PlatformType, bool) {
	if !explicit && probeErr != nil {
		logger.Warn("ClusterVersion probe returned ambiguous error, defaulting to XKS (least privilege) but treating the platform as unconfirmed; set ODH_PLATFORM_TYPE to override",
			slog.Any("error", probeErr))
		return config.PlatformXKS, false
	}

	detected := inferPlatform(ci)

	if !explicit {
		logger.Info("Auto-detected platform", slog.String("platform", detected.String()))
		return detected, true
	}

	if probeErr == nil && detected != configured {
		logger.Warn("Configured platform does not match detected platform; trusting configuration",
			slog.String("configured", configured.String()),
			slog.String("detected", detected.String()))
	}
	return configured, true
}

// inferPlatform maps a successful probe to a platform. A probe that read the
// ClusterVersion object is OpenShift even without a cluster ID; only a probe
// that found the API absent yields XKS. Inconclusive probes never get here:
// resolveStartupPlatform handles them as unconfirmed.
func inferPlatform(ci clusterInfo) config.PlatformType {
	if ci.openShiftConfirmed || ci.clusterID != "" {
		return config.PlatformOpenShift
	}
	return config.PlatformXKS
}

// clusterInfoQuery probes OpenShift-only configuration APIs (ClusterVersion and
// the console-config ConfigMap). It is a seam so tests can assert that an xKS
// startup never reaches it.
type clusterInfoQuery func(kubernetes.Interface, dynamic.Interface, *slog.Logger) (clusterInfo, error)

func initStartupClusterInfo(
	cfg config.EnvConfig, k8sResult k8sSetupResult, logger *slog.Logger,
) (clusterInfo, config.PlatformType, bool) {
	return initStartupClusterInfoWith(cfg, k8sResult, logger, queryClusterInfo)
}

// initStartupClusterInfoWith resolves cluster metadata and the effective platform.
//
// On xKS the OpenShift configuration probe is skipped entirely: the dashboard
// service account is not expected to hold permissions on config.openshift.io,
// and issuing the request anyway would make startup depend on RBAC the xKS
// profile deliberately omits.
//
// The third return value reports whether the resolved platform is confirmed
// rather than guessed after a failed probe. See resolveStartupPlatform.
func initStartupClusterInfoWith(
	cfg config.EnvConfig, k8sResult k8sSetupResult, logger *slog.Logger, query clusterInfoQuery,
) (clusterInfo, config.PlatformType, bool) {
	ci := clusterInfo{clusterBranding: defaultClusterBranding}
	explicitPlatform := cfg.PlatformType != ""

	if explicitPlatform {
		logger.Info("Using configured platform type", slog.String("platform", cfg.PlatformType.String()))
	}

	if cfg.PlatformType.IsXKS() {
		if cfg.MockK8Client {
			ci.serverURL = k8sResult.testEnv.Config.Host
		} else if kubeconfig, err := k8sResult.restConfig(); err == nil {
			ci.serverURL = reportedServerURL(kubeconfig)
		}
		ci.currentContext = helpers.GetCurrentContext()
		return ci, cfg.PlatformType, true
	}

	if cfg.MockK8Client {
		dynClient, dynErr := dynamic.NewForConfig(k8sResult.testEnv.Config)
		if dynErr != nil {
			logger.Warn("Failed to create dynamic client for startup queries", slog.Any("error", dynErr))
			platform, confirmed := resolveStartupPlatform(ci, dynErr, explicitPlatform, cfg.PlatformType, logger)
			return ci, platform, confirmed
		}
		ci, probeErr := query(k8sResult.clientset, dynClient, logger)
		ci.serverURL = k8sResult.testEnv.Config.Host
		ci.currentContext = helpers.GetCurrentContext()
		platform, confirmed := resolveStartupPlatform(ci, probeErr, explicitPlatform, cfg.PlatformType, logger)
		return ci, platform, confirmed
	}

	// The probes run on the service-account clients initKubernetesClients built
	// from the validated kubeconfig, never on a second read of the file.
	typedClient, dynClient := k8sResult.saClientset, k8sResult.saDynClient
	kubeconfig, kcErr := k8sResult.restConfig()
	if kcErr != nil || typedClient == nil || dynClient == nil {
		clientErr := kcErr
		if clientErr == nil {
			clientErr = errors.New("service-account clients are not initialized")
		}
		logger.Warn("Startup queries have no validated Kubernetes clients", slog.Any("error", clientErr))
		platform, confirmed := resolveStartupPlatform(ci, clientErr, explicitPlatform, cfg.PlatformType, logger)
		return ci, platform, confirmed
	}
	ci, probeErr := query(typedClient, dynClient, logger)
	ci.serverURL = reportedServerURL(kubeconfig)
	ci.currentContext = helpers.GetCurrentContext()
	platform, confirmed := resolveStartupPlatform(ci, probeErr, explicitPlatform, cfg.PlatformType, logger)
	return ci, platform, confirmed
}

// reportedServerURL is the API server URL the clients and proxies use
// (kubeconfigServerURL), or the raw Host when client-go cannot resolve it.
func reportedServerURL(kubeconfig *rest.Config) string {
	if u, err := kubeconfigServerURL(kubeconfig); err == nil {
		return u
	}
	return kubeconfig.Host
}
