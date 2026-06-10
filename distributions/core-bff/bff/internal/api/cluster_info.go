package api

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
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

var clusterVersionGVR = schema.GroupVersionResource{
	Group:    "config.openshift.io",
	Version:  "v1",
	Resource: "clusterversions",
}

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

	obj, err := dynClient.Resource(clusterVersionGVR).Get(ctx, clusterVersionName, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) || isClusterVersionDiscoveryError(err) {
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

func isClusterVersionDiscoveryError(err error) bool {
	if k8serrors.IsMethodNotSupported(err) {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "no matches for kind") ||
		strings.Contains(msg, "the server could not find the requested resource")
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
