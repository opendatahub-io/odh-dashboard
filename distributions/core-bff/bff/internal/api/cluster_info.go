package api

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/k8sutil"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"gopkg.in/yaml.v3"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
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
}

func (ci clusterInfo) GetClusterID() string       { return ci.clusterID }
func (ci clusterInfo) GetClusterBranding() string { return ci.clusterBranding }
func (ci clusterInfo) GetServerURL() string       { return ci.serverURL }
func (ci clusterInfo) GetCurrentContext() string  { return ci.currentContext }

func queryClusterInfo(client kubernetes.Interface, dynClient dynamic.Interface, logger *slog.Logger) (clusterInfo, error) {
	info := clusterInfo{clusterBranding: defaultClusterBranding}
	var err error
	info.clusterID, err = queryClusterID(dynClient, logger)
	if err != nil {
		return info, err
	}
	info.clusterBranding = queryClusterBranding(client, logger)
	return info, nil
}

func queryClusterID(dynClient dynamic.Interface, logger *slog.Logger) (string, error) {
	if dynClient == nil {
		return "", nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), clusterInfoQueryTimeout)
	defer cancel()

	obj, err := dynClient.Resource(models.ClusterVersionGVR).Get(ctx, clusterVersionName, metav1.GetOptions{})
	if err != nil {
		if k8sutil.IsResourceUnavailable(err) {
			logger.Debug("ClusterVersion CRD not available (non-OpenShift cluster)", slog.Any("error", err))
			return "", nil
		}
		return "", fmt.Errorf("ClusterVersion probe failed: %w", err)
	}

	spec, ok := obj.Object["spec"].(map[string]any)
	if !ok {
		logger.Warn("ClusterVersion spec field missing or unexpected type")
		return "", nil
	}
	clusterID, _ := spec["clusterID"].(string)
	return clusterID, nil
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

// resolveStartupPlatform determines the runtime platform.
// Policy: explicit configuration is always trusted. When the probe result disagrees
// with the configured value, a warning is logged but the configured value wins.
// This lets operators force a platform for testing or mixed environments.
func resolveStartupPlatform(ci clusterInfo, probeErr error, explicit bool, configured config.PlatformType, logger *slog.Logger) config.PlatformType {
	if !explicit && probeErr != nil {
		logger.Warn("ClusterVersion probe returned ambiguous error, defaulting to XKS (least privilege); set PLATFORM_TYPE to override",
			slog.Any("error", probeErr))
		return config.PlatformXKS
	}

	detected := inferPlatform(ci)

	if !explicit {
		logger.Info("Auto-detected platform", slog.String("platform", detected.String()))
		return detected
	}

	if probeErr == nil && detected != configured {
		logger.Warn("Configured platform does not match detected platform; trusting configuration",
			slog.String("configured", configured.String()),
			slog.String("detected", detected.String()))
	}
	return configured
}

func inferPlatform(ci clusterInfo) config.PlatformType {
	if ci.clusterID != "" {
		return config.PlatformOpenShift
	}
	return config.PlatformXKS
}

func initStartupClusterInfo(cfg config.EnvConfig, k8sResult k8sSetupResult, logger *slog.Logger) (clusterInfo, config.PlatformType) {
	ci := clusterInfo{clusterBranding: defaultClusterBranding}
	explicitPlatform := cfg.PlatformType != ""

	if explicitPlatform {
		logger.Info("Using configured platform type", slog.String("platform", cfg.PlatformType.String()))
	}

	if cfg.PlatformType.IsXKS() {
		if cfg.MockK8Client {
			ci.serverURL = k8sResult.testEnv.Config.Host
		} else if kubeconfig, err := helpers.GetKubeconfig(); err == nil {
			ci.serverURL = kubeconfig.Host
		}
		ci.currentContext = helpers.GetCurrentContext()
		return ci, cfg.PlatformType
	}

	if cfg.MockK8Client {
		dynClient, dynErr := dynamic.NewForConfig(k8sResult.testEnv.Config)
		if dynErr != nil {
			logger.Warn("Failed to create dynamic client for startup queries", slog.Any("error", dynErr))
			return ci, resolveStartupPlatform(ci, dynErr, explicitPlatform, cfg.PlatformType, logger)
		}
		ci, probeErr := queryClusterInfo(k8sResult.clientset, dynClient, logger)
		ci.serverURL = k8sResult.testEnv.Config.Host
		ci.currentContext = helpers.GetCurrentContext()
		return ci, resolveStartupPlatform(ci, probeErr, explicitPlatform, cfg.PlatformType, logger)
	}

	kubeconfig, kcErr := helpers.GetKubeconfig()
	if kcErr != nil {
		logger.Warn("Failed to get kubeconfig for startup queries", slog.Any("error", kcErr))
		return ci, resolveStartupPlatform(ci, kcErr, explicitPlatform, cfg.PlatformType, logger)
	}

	typedClient, tcErr := kubernetes.NewForConfig(kubeconfig)
	dynClient, dcErr := dynamic.NewForConfig(kubeconfig)
	if tcErr != nil || dcErr != nil {
		logger.Warn("Failed to create clients for startup queries",
			slog.Any("typedErr", tcErr), slog.Any("dynamicErr", dcErr))
		clientErr := tcErr
		if clientErr == nil {
			clientErr = dcErr
		}
		return ci, resolveStartupPlatform(ci, clientErr, explicitPlatform, cfg.PlatformType, logger)
	}
	ci, probeErr := queryClusterInfo(typedClient, dynClient, logger)
	ci.serverURL = kubeconfig.Host
	ci.currentContext = helpers.GetCurrentContext()
	return ci, resolveStartupPlatform(ci, probeErr, explicitPlatform, cfg.PlatformType, logger)
}
