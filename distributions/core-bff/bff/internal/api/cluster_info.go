package api

import (
	"context"
	"log/slog"
	"time"

	"gopkg.in/yaml.v3"
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
}

func queryClusterInfo(client kubernetes.Interface, dynClient dynamic.Interface, logger *slog.Logger) clusterInfo {
	info := clusterInfo{clusterBranding: defaultClusterBranding}
	info.clusterID = queryClusterID(dynClient, logger)
	info.clusterBranding = queryClusterBranding(client, logger)
	return info
}

func queryClusterID(dynClient dynamic.Interface, logger *slog.Logger) string {
	if dynClient == nil {
		return ""
	}
	ctx, cancel := context.WithTimeout(context.Background(), clusterInfoQueryTimeout)
	defer cancel()

	obj, err := dynClient.Resource(clusterVersionGVR).Get(ctx, clusterVersionName, metav1.GetOptions{})
	if err != nil {
		logger.Warn("ClusterVersion not available (expected on non-OpenShift clusters)", slog.Any("error", err))
		return ""
	}

	spec, ok := obj.Object["spec"].(map[string]interface{})
	if !ok {
		logger.Warn("ClusterVersion spec field missing or unexpected type")
		return ""
	}
	clusterID, _ := spec["clusterID"].(string)
	return clusterID
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
		logger.Warn("console-config ConfigMap not available (expected on non-OpenShift clusters)", slog.Any("error", err))
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
